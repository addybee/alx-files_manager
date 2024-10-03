import dbClient from './db';

class UserUtils {
  async setCollection() {
    // Create a helper function for retrying
    const waitForConnection = async () => {
      if (dbClient.isAlive()) {
        this.collection = dbClient.db.collection('users');
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms before retrying
        waitForConnection(); // Recursively retry
      }
    };

    // Call the helper function to wait until the connection is alive
    await waitForConnection();
  }

  async getUserByFilter(filterObject) {
    await this.setCollection();
    const users = await this.collection.find(filterObject).toArray();
    return users;
  }

  async createUser(user) {
    await this.setCollection();
    const { insertedId } = await this.collection.insertOne(user);
    return insertedId;
  }
}

const userUtils = new UserUtils();
export default userUtils;
