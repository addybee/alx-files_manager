import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const dbname = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.alive = false;

    // Make the connection asynchronous by returning a promise
    this.connect(url, dbname);
  }

  async connect(url, dbname) {
    try {
      const client = await MongoClient.connect(url, { useUnifiedTopology: true });
      this.db = client.db(dbname);
      this.alive = true;
      this.client = client;
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err);
      this.alive = false;
    }
  }

  isAlive() {
    return this.alive;
  }

  async nbUsers() {
    const users = this.db.collection('users');
    const res = await users.find({}).toArray();
    return res.length;
  }

  async nbFiles() {
    const files = this.db.collection('files');
    const res = await files.find({}).toArray();
    return res.length;
  }
}

const dbClient = new DBClient();
export default dbClient;
