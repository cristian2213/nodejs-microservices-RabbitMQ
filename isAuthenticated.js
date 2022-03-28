const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret';

async function isAuthenticated(req, res, next) {
  try {
    // "Bearer <token>"
    const rawToken = req.headers['authorization'];
    const token = rawToken.split(' ')[1];
    const decodedToken = jwt.verify(token, JWT_SECRET);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      statusCode: 401,
      message: 'The token is not valid',
    });
  }
}

module.exports = isAuthenticated;
