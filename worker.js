import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import { promisify } from 'util';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

const writeFile = promisify(fs.writeFile).bind(fs);
const fileQueue = new Queue('fileQueue');
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const dbname = process.env.DB_DATABASE || 'files_manager';
const mongoUri = `mongodb://${host}:${port}/${dbname}`;

let db;

// Function to connect to MongoDB and set the db variable
async function connectDB() {
  const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    db = client.db(); // Store the database instance globally
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Call connectDB once when the application starts
connectDB().catch(console.error);

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  try {
    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    // Use the global db instance
    const file = await db.collection('files').findOne({
      _id: new ObjectId(fileId),
      userId: new ObjectId(userId),
    });

    if (!file) {
      throw new Error('File not found');
    }

    const createThumbnail = async (localPath, sizes, len) => {
      if (len === 0) {
        return;
      }
      const thumbnail = await imageThumbnail(localPath, { width: sizes[len - 1] });

      // Build the thumbnail file path
      const thumbnailPath = `${localPath}_${sizes[len - 1]}`;

      // Save the thumbnail to the local file system
      await writeFile(thumbnailPath, thumbnail);
      await createThumbnail(localPath, sizes, len - 1); // Await the recursive call
    };

    // Create thumbnails with different sizes (500, 250, 100)
    const sizes = [500, 250, 100];
    await createThumbnail(file.localPath, sizes, sizes.length);
  } catch (error) {
    console.error(error);
  }
});

export default fileQueue;
