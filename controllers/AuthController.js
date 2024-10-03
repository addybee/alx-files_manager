// Inside controllers, add a file AuthController.js that contains new endpoints:
import redisClient from '../utils/redis';
import BasicAuth from '../utils/basicAuth';

class AuthController {
  // GET /connect should sign-in the user by generating a new authentication token:
  static async getConnect(req, res) {
    const authorizationHeader = BasicAuth.extractBase64AuthorizationHeader(req);
    if (!authorizationHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode base64 encoded token
    const [email, password] = BasicAuth.decodeAndExtractCredential(authorizationHeader);
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Check if user exists
    const user = await BasicAuth.userObjectFromCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = await BasicAuth.createSession(user._id);
    // Generate a unique session token and store it in Redis with a TTL of 3600 seconds
    return res.json({ token }); // Return the generated token
  }

  static async getDisconnect(req, res) {
    const xToken = req.get('X-Token');
    if (!xToken) return res.status(401).json({ error: 'Unauthorized' });
    const userSession = await redisClient.get(`auth_${xToken}`);
    if (!userSession) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await redisClient.del(`auth_${xToken}`);
    return res.status(204).end();
  }
}

export default AuthController;
