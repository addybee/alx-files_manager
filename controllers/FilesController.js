import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import BasicAuth from '../utils/basicAuth';
import fileUtil from '../utils/files';

const mkdir = promisify(fs.mkdir).bind(fs);
const writeFile = promisify(fs.writeFile).bind(fs);

class FilesController {
  static async postUpload(req, res) {
    // Validate the user based on the X-Token
    const user = await BasicAuth.currentUser(req, res);

    // Destructure request body to get required fields
    const {
      name, type, parentId, isPublic = false, data,
    } = req.body;

    // Validate the name field
    if (!name) return res.status(400).json({ error: 'Missing name' });

    // Validate the type field
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    // Validate the data field if type is not folder
    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    try {
      // Validate the parentId if provided
      if (parentId) {
        const parentFiles = await fileUtil.getFileByFilter({
          parentId: (parentId && parentId !== '0') ? new ObjectId(parentId) : '0',
        });

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
        parentId: (parentId && parentId !== '0') ? new ObjectId(parentId) : '0',
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
      console.log(file);
      return res.json(file[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async getIndex(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      const { parentId, page = '0' } = req.query;
      const files = await fileUtil.getPaginatedFiles({
        userId: user._id,
        parentId: (parentId && parentId !== '0') ? new ObjectId(parentId) : '0',
        page: parseInt(page, 10),
        pageSize: 20,
      });
      return res.json(files);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }

  static async putPublish(req, res) {
    const user = await BasicAuth.currentUser(req, res);
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }
    const filter = { _id: new ObjectId(id), userId: user._id };
    let file = await fileUtil.getFileByFilter(filter);
    if (!file && !file.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    await fileUtil.updateFiles(filter, { isPublic: true });
    file = await fileUtil.getFileByFilter(filter);
    return res.json(file[0]);
  }

  static async putUnpublish(req, res) {
    const user = await BasicAuth.currentUser(req, res);
    const { id } = req.params;
    if (!id) {
      return res.status(404).json({ error: 'Not found' });
    }
    const filter = { _id: new ObjectId(id), userId: user._id };
    let file = await fileUtil.getFileByFilter(filter);
    if (!file && !file.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    await fileUtil.updateFiles(filter, { isPublic: false });
    file = await fileUtil.getFileByFilter(filter);
    return res.json(file[0]);
  }
}

export default FilesController;
