import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from './redis';
import userUtils from './users';

class BasicAuth {
  static extractBase64AuthorizationHeader(req) {
    if (!req) {
      return null;
    }

    const authorizationHeader = req.get('Authorization');

    if (!authorizationHeader) {
      return null;
    }
    return authorizationHeader;
  }

  // Decode base64 encoded token
  static decodeAndExtractCredential(base64AuthorizationHeader) {
    if (!base64AuthorizationHeader) {
      return [null, null];
    }

    if (!base64AuthorizationHeader.startsWith('Basic ')) {
      return [null, null];
    }

    const decodedToken = Buffer.from(base64AuthorizationHeader.slice(6), 'base64').toString('utf-8');
    if (!decodedToken.includes(':')) {
      return [null, null];
    }

    return decodedToken.split(':'); // Split into email and password
  }

  static extractToken(req, res) {
    // Extract the X-Token from the request header
    const xToken = req.get('X-Token');

    if (!xToken) return res.status(401).json({ error: 'Unauthorized' });
    return xToken;
  }

  static async userObjectFromCredentials(email, password) {
    if (!email || !password) {
      return null;
    }
    // Check if user exists
    const user = await userUtils.getUserByFilter({ email });
    if (!user || !user.length) {
      return null;
    }

    // verify the password
    if (user[0].password !== sha1(password)) {
      return null;
    }
    return user[0];
  }

  static async createSession(authorizationHeader) {
    const token = uuidv4();
    await redisClient.set(`auth_${token}`, token, 86400); // Store the token with a TTL of 24hrs
    await redisClient.set(`me_${token}`, authorizationHeader, 86400);
    return token;
  }

  static async currentUser(req, res) {
    const token = this.extractToken(req, res);
    const userSession = await redisClient.get(`auth_${token}`);

    if (!userSession) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const authorizationHeader = await redisClient.get(`me_${token}`);
    const [email, password] = this.decodeAndExtractCredential(authorizationHeader);
    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await this.userObjectFromCredentials(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return user;
  }
}

export default BasicAuth;
