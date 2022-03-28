const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const isAuthenticated = require('../isAuthenticated');
const Order = require('./models/Order');
const app = express();

const PORT = process.env.APP_PORT || 9090;
const MONGO_CREDENTIALS = {
  USER: process.env.MONGODB_USERNAME || 'root',
  PASS: process.env.MONGODB_PASSWORD || 'example',
};
const AMQP_SERVER =
  process.env.AMQP_SERVER ||
  `amqp://${MONGO_CREDENTIALS.USER}:${MONGO_CREDENTIALS.PASS}@host.docker.internal:5672`; // Queue's port
const MONGO_URL =
  process.env.MONGO_DB_URL ||
  `mongodb://${MONGO_CREDENTIALS.USER}:${MONGO_CREDENTIALS.PASS}@host.docker.internal:27019/products-service?authSource=admin`;

let channel, connection;

mongoose.connect(MONGO_URL, {
  useNewUrlParser: true,
});
mongoose.connection.once('open', () => {
  console.log('Orders-Service DB Connected');
});
mongoose.connection.on('error', (err) => {
  console.error(err);
});

async function connectToEventBus() {
  connection = await amqp.connect(AMQP_SERVER);
  channel = await connection.createChannel();
  await channel.assertQueue('ORDER'); /// IF IT DOEN'T EXIST, SO IT'S CREATED
  console.log('AMPQ-Server Connected');
}

connectToEventBus()
  .then(() => {
    // ***** WATCHING THE EVENT OF THE EVENT-BUS (RabbitMQ) *****
    channel.consume('ORDER', async (data) => {
      // Recieves - data.content
      const { products, userEmail } = JSON.parse(data.content);
      const newOrder = await createOrder(products, userEmail);
      channel.ack(data);

      // Returns
      const preparedData = Buffer.from(JSON.stringify(newOrder));
      channel.sendToQueue('PRODUCT', preparedData);
    });
    // ***** --------------------------- *****
  })
  .catch((err) => console.error('Error AMQP Connection:', err));

async function createOrder(products, userEmail) {
  let totalPrice = 0;
  for (let i = 0; i < products.length; i++) {
    totalPrice += products[i].price;
  }

  const newOrder = new Order({
    products,
    user: userEmail,
    total_price: totalPrice,
  });
  await newOrder.save();
  return newOrder;
}

app.use(express.json());

app.listen(PORT, () => console.log(`Orders-Service listening on port ${PORT}`));
