// Inside controllers, add a file AuthController.js that contains new endpoints:
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  // GET /connect should sign-in the user by generating a new authentication token:
  static async getConnect(req, res) {
    const authorizationHeader = req.get('Authorization');

    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!authorizationHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode base64 encoded token
    const decodedToken = Buffer.from(authorizationHeader.slice(6), 'base64').toString('utf-8');
    if (!decodedToken.includes(':')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [email, password] = decodedToken.split(':'); // Split into email and password

    // Check if user exists
    const user = await dbClient.getUserByFilter({ email });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Optionally verify the password (this assumes you store hashed passwords in your DB)
    if (user.password !== sha1(password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a unique session token and store it in Redis with a TTL of 3600 seconds
    const sessionToken = uuidv4();
    await redisClient.set(`auth_${sessionToken}`, sessionToken, 3600); // Store the token with a TTL of 3600 seconds
    await redisClient.set(`me_${sessionToken}`, user.email, 3600);
    return res.json({ token: sessionToken }); // Return the generated token
  }

  static async getDisconnect(req, res) {
    const xToken = req.get('X-Token');
    if (!xToken) return res.status(401).json({ error: 'Unauthorized' });
    const userSession = await redisClient.get(`auth_${xToken}`);
    if (!userSession) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${xToken}`);
    return res.status(204).end()
  }
}

export default AuthController;
