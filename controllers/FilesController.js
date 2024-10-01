import { join } from 'path';
// import { ObjectId } from 'mongodb';
import fs from 'fs';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import BasicAuth from '../utils/basicAuth';
import dbclient from '../utils/db';

const mkdir = promisify(fs.mkdir).bind(fs);
const writeFile = promisify(fs.writeFile).bind(fs);

class FilesController {
  static async postUpload(req, res) {
    // Extract the X-Token from the request header
    const xToken = req.get('X-Token');

    if (!xToken) return res.status(401).json({ error: 'Unauthorized' });

    // Validate the user based on the X-Token
    const user = await BasicAuth.currentUser(xToken);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

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

    // Validate the parentId if provided
    if (parentId) {
      const parentFiles = await dbclient.getFileByFilter({ parentId });
      console.log(parentFiles);
      if (!parentFiles || !parentFiles.length) return res.status(400).json({ error: 'Parent not found' });
      const file = parentFiles.every((val) => val.type !== 'folder');
      if (!file) return res.status(400).json({ error: 'Parent is not a folder' });
    }

    // Initialize the document with the user ID
    const doc = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId || '0',
    };

    // Handle folder creation
    if (type === 'folder') {
      await dbclient.createFile(doc);
      const { localPath, _id, ...rest } = doc;
      return res.status(201).json({ id: _id, ...rest });
    }

    // Handle file or image creation
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    try {
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
      await dbclient.createFile(doc);
      const { localPath, _id, ...rest } = doc;
      return res.status(201).json({ id: _id, ...rest });
    } catch (err) {
      console.error('Error creating file:', err);
      return res.status(500).json({ error: 'Error processing file' });
    }
  }
}

export default FilesController;
