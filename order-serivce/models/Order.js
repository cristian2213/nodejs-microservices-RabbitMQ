//Creating a Auth Model in userModel.js
var mongoose = require('mongoose');
var orderSchema = new mongoose.Schema({
  products: [
    {
      product_id: String,
    },
  ],
  user: { type: String },
  total_price: { type: Number },
  created_at: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model('order', orderSchema);
