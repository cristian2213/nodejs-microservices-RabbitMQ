const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret';
const PORT = process.env.APP_PORT || 7070;
const MONGO_CREDENTIALS = {
  USER: process.env.MONGODB_USERNAME || 'root',
  PASS: process.env.MONGODB_PASSWORD || 'example',
};
const MONGO_URL = `mongodb://${MONGO_CREDENTIALS.USER}:${MONGO_CREDENTIALS.PASS}@host.docker.internal:27017/auth-service?authSource=admin`;

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
});
mongoose.connection.once('open', () => {
  console.log('Auth-Service DB Connected');
});
mongoose.connection.on('error', (err) => {
  console.error(err);
});

app.use(express.json());

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ statusCode: 404, message: "User doesn't exist" });

    // CHECK PASSWORD QUICKLY
    if (password !== user.password)
      return res.status(400).json({
        statusCode: 400,
        message: 'Passwords do not match',
      });

    const payload = { sub: user.id, name: user.name, email: user.email };
    const { token, ttl } = generateJWT(payload, JWT_SECRET);

    return res.status(200).json({
      token: {
        token,
        ttl,
      },
    });
  } catch (err) {
    return res.status(500).json({
      statusCode: 500,
      message: err.message,
    });
  }
});

function generateJWT(payload, jwtSecret, ttl = '1h') {
  const token = jwt.sign(payload, jwtSecret, {
    expiresIn: ttl,
  });
  return { token, ttl };
}

app.post('/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  console.log(req.body);
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(404).json({ message: 'User already exists' });

    const newUser = await new User({ name, email, password });
    await newUser.save();

    return res.status(200).json(newUser);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      statusCode: 500,
      message: err.message,
    });
  }
});

app.listen(PORT, () => console.log(`Auth-Service listening on port ${PORT}`));
