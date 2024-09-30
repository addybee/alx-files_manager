// Inside controllers, add a file AuthController.js that contains new endpoints:

class AuthController {
  // GET /connect should sign-in the user by generating a new authentication token:
  static connect(req, res) {
  // By using the header Authorization and the technique of the Basic auth (Base64 of the <email>:<password>), find the user associate to this email and with this password (reminder: we are storing the SHA1 of the password)
  
  // If no user has been found, return an error Unauthorized with a status code 401
  // Otherwise:
  // Generate a random string (using uuidv4) as token
  // Create a key: auth_<token>
  // Use this key for storing in Redis (by using the redisClient create previously) the user ID for 24 hours
  // Return this token: { "token": "155342df-2399-41da-9e8c-458b6ac52a0c" } with a status code 200