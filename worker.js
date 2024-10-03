import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import ObjectId from 'mongodb';
import fileUtil from './utils/files';

const fileQueue = new Queue('file Queue');

fileQueue.process(async function (job) {
  const { fileId, userId } = job.data;
  try {
    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const [file] = await fileUtil.getFileByFilter({
      _id: new ObjectId(job.field),
      userId: new ObjectId(userId),
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Create thumbnails with different sizes (500, 250, 100)
    const sizes = [500, 250, 100];
    for (const size of sizes) {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });

      // Build the thumbnail file path
      const thumbnailPath = `${file.localPath}_${size}`;

      // Save the thumbnail to the local file system
      fs.writeFile(thumbnailPath, thumbnail, (err) => {
        console.error(err);
      });
    }
  } catch (error) {
    console.error(error);
  }
});

export default fileQueue;
