import sha1 from 'sha1';
import dbclient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    try {
      const { email, password } = req.body;

      // Check for missing email or password
      if (!email) {
        return res.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Missing password' });
      }

      // Check if the user already exists
      const existingUser = await dbclient.getUserByFilter({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Create new user
      const id = await dbclient.createUser({ email, password: sha1(password) });
      return res.status(201).json({ id, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
    const xToken = req.get('X-Token');
    if (!xToken) return res.status(401).json({ error: 'Unauthorized' });

    const userSession = await redisClient.get(`auth_${xToken}`);
    if (!userSession) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const email = await redisClient.get(`me_${userSession}`);
    const { _id } = await dbclient.getUserByFilter({ email });
    return res.json({ id: _id, email });
  }
}

export default UsersController;
