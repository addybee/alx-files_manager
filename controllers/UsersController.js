import sha1 from 'sha1';
import userUtils from '../utils/users';
import BasicAuth from '../utils/basicAuth';

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
      const existingUser = await userUtils.getUserByFilter({ email });
      if (existingUser && existingUser.length) {
        return res.status(400).json({ error: 'Already exist' });
      }

      // Create new user
      const id = await userUtils.createUser({ email, password: sha1(password) });

      return res.status(201).json({ id, email });
    } catch (error) {
      console.error('Error creating user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await BasicAuth.currentUser(req, res);
      // Extract and return the user id and email
      const { _id, email } = user;
      return res.json({ id: _id, email });
    } catch (error) {
      console.error('Error retrieving user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default UsersController;
