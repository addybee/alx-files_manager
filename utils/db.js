const MongoClient = require('mongodb').MongoClient;

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
    const res = await users.find({}).toArray()
    return res.length;
  }

  async nbFiles() {
    const files = this.db.collection('files');
    const res = await files.find({}).toArray();
    return res.length;
  }
};

const dbclient = new DBClient();

export default dbclient;