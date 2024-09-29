import { createClient } from 'redis';
import util from 'util';

/**
 * Class representing a Redis client.
 * 
 * @constructor
 */
class RedisClient {

  constructor() {
    this.client = createClient();
    this.alive = true;
    this.client.on('error', (err) => {
      this.alive = false;
      console.log(err);
    });
    this.client.on('ready', () => {
      this.alive = true;
    });
    this.client.on('end', () => {
      this.alive = false;
    });

    // Promisify Redis functions inside the constructor, binding to this.client
    this.getAsync = util.promisify(this.client.get).bind(this.client);
    this.setAsync = util.promisify(this.client.set).bind(this.client);
    this.delAsync = util.promisify(this.client.del).bind(this.client);
  }

  /**
   *https://afr.score808.tv/football/2590949-arsenal-vs-leicester-city.html# Checks if the Redis client connection is alive by pinging the server.
   * @returns {boolean} - Returns true if the client connection is alive, false otherwise.
   */
  isAlive() {
    return this.alive;
  }


  /**
   * Asynchronously retrieves the value stored in Redis corresponding to the provided key.
   * 
   * @param {string} key - The key to look up in the Redis database.
   * @returns {Promise<any>} - A promise that resolves with the value associated with the key.
   */
  async get(key) {
    try {
      return await this.getAsync(key);
    } catch (err) {
      console.error(`Error getting key "${key}":`, err);
      return null;  // Return null if key retrieval fails
    }
  }

  /**
   * Asynchronously sets a key-value pair in the Redis database with an expiration time.
   * 
   * @param {string} key - The key under which the value will be stored.
   * @param {any} value - The value to be stored in Redis.
   * @param {number} duration - The expiration time for the key-value pair in seconds.
   */
  async set(key, value, duration) {
    try {
      await this.setAsync(key, value, 'EX', duration);
    } catch (err) {
      console.error(`Error setting key "${key}":`, err);
    }
  }

  /**
   * Asynchronously deletes a key from the Redis database.
   * 
   * @param {string} key - The key to be deleted from the Redis database.
   */
  async del(key) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.error(`Error deleting key "${key}":`, err);
    }
  }
};

const redisClient = new RedisClient();

export default redisClient;
