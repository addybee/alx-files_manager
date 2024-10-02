import dbClient from './db';

class FileUtil {
  async setCollection() {
    // Create a helper function for retrying
    const waitForConnection = async () => {
      if (dbClient.isAlive()) {
        this.collection = dbClient.db.collection('files');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms before retrying
        waitForConnection(); // Recursively retry
      }
    };

    // Call the helper function to wait until the connection is alive
    await waitForConnection();
  }

  async getFileByFilter(filterObject) {
    await this.setCollection();
    const files = await this.collection.find(filterObject).toArray();
    return files;
  }

  async createFile(file) {
    await this.setCollection();
    const { insertedId } = await this.collection.insertOne(file);
    return insertedId;
  }

  async getPaginatedFiles(param) {
    await this.setCollection();
    const {
      pageSize, page, ...rest
    } = param;
    const files = this.collection.aggregate([
      { $match: rest }, // filter documents
      { $skip: (page * pageSize) }, // Skip documents from previous pages
      { $limit: pageSize }, // Limit the result to page size
    ]).toArray();
    return files;
  }
}

const fileUtil = new FileUtil();
export default fileUtil;
