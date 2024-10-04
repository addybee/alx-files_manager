import fs from 'fs';
import Queue from 'bull';
import { contentType } from 'mime-types';
import { join } from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import BasicAuth from '../utils/basicAuth';
import fileUtil from '../utils/files';
import userUtils from '../utils/users';

const mkdir = promisify(fs.mkdir).bind(fs);
const writeFile = promisify(fs.writeFile).bind(fs);
const readFile = promisify(fs.readFile).bind(fs);
const access = promisify(fs.access).bind(fs);

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    // Validate the user based on the X-Token
    const user = await BasicAuth.currentUser(req, res);

    // Destructure request body to get required fields
    const {
      name, type, parentId = 0, isPublic = false, data,
    } = req.body;

    // Validate the name field
    if (!name) return res.status(400).json({ error: 'Missing name' });

    // Validate the type field
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    // Validate the data field if type is not folder
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    try {
      // Validate the parentId if provided
      if (parentId) {
        const parentFiles = await fileUtil.getFileByFilter({ _id: new ObjectId(parentId) });
        if (!parentFiles || !parentFiles.length) return res.status(400).json({ error: 'Parent not found' });

        const file = parentFiles.every((val) => val.type !== 'folder');
        if (file) return res.status(400).json({ error: 'Parent is not a folder' });
      }

      // Initialize the document with the user ID
      const doc = {
        userId: user._id,
        name,
        type,
        isPublic,
        parentId: (parentId) ? new ObjectId(parentId) : 0,
      };

      // Handle folder creation
      if (type === 'folder') {
        await fileUtil.createFile(doc);
        const { localPath, _id, ...rest } = doc;
        return res.status(201).json({ id: _id, ...rest });
      }

      // Handle file or image creation
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';

      // Ensure the folder exists
      await mkdir(folderPath, { recursive: true });

      // Create a unique file path
      const fileName = uuidv4();
      const filePath = join(folderPath, fileName);

      // Decode the base64 data
      const decodedData = Buffer.from(data, 'base64');

      // Write the file to disk
      await writeFile(filePath, decodedData);

      // Update the document with the file's local path
      doc.localPath = filePath;

      // Create the file document in the database
      await fileUtil.createFile(doc);
      const { localPath, _id, ...rest } = doc;
      if (doc.type === 'image') {
        await fileQueue.add({
          userId: user._id.toString(),
          fileId: _id,
        });
      }

      return res.status(201).json({ id: _id, ...rest });
    } catch (err) {
      console.error('Error creating file:', err);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async getShow(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      const { id } = req.params;
      if (!id) {
        return res.status(404).json({ error: 'Not found' });
      }
      const file = await fileUtil.getFileByFilter({ _id: new ObjectId(id), userId: user._id });
      if (!file || !file.length) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json(file[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async getIndex(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      const { parentId = 0, page = 0 } = req.query;
      const files = await fileUtil.getPaginatedFiles({
        userId: user._id,
        parentId: (parentId) ? new ObjectId(parentId) : '0',
        page: parseInt(page, 10),
        pageSize: 20,
      });
      for (const item of files) {
        item.id = item._id;
        delete item._id;
      }
      return res.json(files);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async putPublish(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      const { id } = req.params;
      if (!id) {
        return res.status(404).json({ error: 'Not found' });
      }
      const filter = { _id: new ObjectId(id), userId: user._id };
      const [file] = await fileUtil.getFileByFilter(filter);
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }
      await fileUtil.updateFiles(filter, { isPublic: true });
      file.isPublic = true;
      return res.json(file);
    } catch (err) {
      console.error(err);
      // Check if headers were already sent
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      const { id } = req.params;
      if (!id) {
        return res.status(404).json({ error: 'Not found' });
      }

      const filter = { _id: new ObjectId(id), userId: user._id };
      const [file] = await fileUtil.getFileByFilter({ _id: new ObjectId(id), userId: user._id });
      if (!file) {
        return res.status(404).json({ error: 'Not found' });
      }
      await fileUtil.updateFiles(filter, { isPublic: false });
      file.isPublic = false;
      return res.json(file);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async getFile(req, res) {
    try {
      // const user = await BasicAuth.currentUser(req, res);
      const { id } = req.params;
      const { size } = req.query;
      const token = req.get('X-Token');

      if (!id) {
        return res.status(404).json({ error: 'Not found' });
      }

      const [fileData] = await fileUtil.getFileByFilter({ _id: new ObjectId(id) });

      // Check if file exists and is not empty
      if (!fileData) {
        return res.status(404).json({ error: 'Not found' });
      }

      if (fileData.isPublic === false) {
        const user = await userUtils.currentUser(token);
        if (!user || user._id.toString() !== fileData.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }
      // Check if the file is a folder
      if (fileData.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }
      // Check if the localPath exists
      if (!fileData.localPath) {
        return res.status(404).json({ error: 'Not found' });
      }

      let filePath = fileData.localPath;
      if (size && ['500', '250', '100'].includes(size)) {
        const thumbnailPath = `${filePath}_${size}`;

        // Check if the thumbnail exists
        await access(thumbnailPath);
        filePath = thumbnailPath;
      }
      // Read the file content
      const content = await readFile(filePath, 'utf8');

      // Get the content MIME type
      const contentMime = contentType('kop.txt');

      // Set content type and send file content
      res.set('Content-Type', contentMime);
      return res.send(content);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }
}

export default FilesController;
