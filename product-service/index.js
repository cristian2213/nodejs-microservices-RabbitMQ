const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const Product = require('./models/Product');
const isAuthenticated = require('../isAuthenticated');
const app = express();

const PORT = process.env.APP_PORT || 8080;
const MONGO_CREDENTIALS = {
  USER: process.env.MONGODB_USERNAME || 'root',
  PASS: process.env.MONGODB_PASSWORD || 'example',
};
const AMQP_SERVER =
  process.env.AMQP_SERVER ||
  `amqp://${MONGO_CREDENTIALS.USER}:${MONGO_CREDENTIALS.PASS}@host.docker.internal:5672`; // Queue's port
const MONGO_URL =
  process.env.MONGO_DB_URL ||
  `mongodb://${MONGO_CREDENTIALS.USER}:${MONGO_CREDENTIALS.PASS}@host.docker.internal:27018/products-service?authSource=admin`;

var channel, connection, newOrder;

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
});
mongoose.connection.once('open', () => {
  console.log('Products-Service DB Connected');
});
mongoose.connection.on('error', (err) => {
  console.error(err);
});

async function connectToEventBus() {
  connection = await amqp.connect(AMQP_SERVER);
  channel = await connection.createChannel();
  await channel.assertQueue('PRODUCT'); /// IF IT DOEN'T EXIST, SO IT'S CREATED
  console.log('AMPQ-Server Connected');
}

connectToEventBus();
// .then(() => {
//   // ***** WATCHING THE EVENT OF THE EVENT-BUS (RabbitMQ) *****
//   // channel.consume('PRODUCT', (data) => {
//   //   const { newOrder } = JSON.parse(data.content);
//   //   console.log(newOrder);
//   // });
//   // ***** --------------------------- *****
// })
// .catch((err) => console.error('Error AMQP Connection:', err));

app.use(express.json());

// BUY PRODUCT
app.post('/product/buy', isAuthenticated, async (req, res) => {
  const { ids } = req.body;
  const { email } = req.user;
  try {
    const products = await Product.find({ _id: { $in: ids } });
    const filteredProducts = Buffer.from(
      JSON.stringify({
        products,
        userEmail: email,
      })
    );

    // ***** EMITING EVENT TO EVENT-BUS (RabbitMQ) *****
    channel.sendToQueue('ORDER', filteredProducts);
    // ***** --------------------------- *****

    // ***** WATCHING THE EVENT OF THE EVENT-BUS (RabbitMQ) *****
    channel.consume('PRODUCT', (data) => {
      console.log('Consuming PRODUCT queue');
      newOrder = JSON.parse(data.content);
      channel.ack(data);
    });
    // ***** --------------------------- *****

    return res.status(200).json(newOrder);
  } catch (err) {
    return res.status(500).json({
      statusCode: 500,
      message: err.message,
    });
  }
});

// CREATE PRODUCT
app.post('/product/create', isAuthenticated, async (req, res) => {
  const { name, description, price } = req.body;
  try {
    const newProduct = new Product({
      name,
      description,
      price,
    });
    await newProduct.save();
    return res.status(402).json(newProduct);
  } catch (err) {
    return res.status(500).json({
      statusCode: 500,
      message: err.message,
    });
  }
});

// GETS PRODUCTS
app.get('/product/', async (req, res) => {
  try {
    const products = await Product.find(
      {},
      {
        _id: 1,
        __v: 0,
      }
    );
    const ids = products.map((product) => product._id);
    return res.status(200).json({
      products,
      ids,
    });
  } catch (err) {
    return res.status(500).json({
      statusCode: 500,
      message: err.message,
    });
  }
});

app.listen(PORT, () =>
  console.log(`Products-Service listening on port ${PORT}`)
);
