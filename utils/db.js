import MongoClient from 'mongodb';

class DBClient {
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
    return users.countDocuments();
  }

  async nbFiles() {
    const files = this.db.collection('files');
    return files.countDocuments();
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
}

const dbclient = new DBClient();

export default dbclient;
