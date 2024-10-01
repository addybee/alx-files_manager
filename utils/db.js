import MongoClient from 'mongodb';

export class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const dbname = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.alive = false;
    MongoClient.connect(url, (err, client) => {
      if (err) {
        this.alive = false;
      } else {
        this.db = client.db(dbname);
        this.alive = true;
        this.client = client;
      }
    });
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

  async getUserByFilter(filterObject) {
    const users = this.db.collection('users');
    const user = await users.findOne(filterObject);
    return user;
  }

  async createUser(user) {
    const users = this.db.collection('users');
    const { insertedId } = await users.insertOne(user);
    return insertedId;
  }

  async getFileByFilter(filterObject) {
    try {
      const files = this.db.collection('files');
      const fileList = await files.find(filterObject).toArray();
      return fileList;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async createFile(file) {
    try {
      const files = this.db.collection('files');
      const { insertedId } = await files.insertOne(file);
      return insertedId;
    } catch (error) {
      return null;
    }
  }
}

const dbclient = new DBClient();

export default dbclient;
