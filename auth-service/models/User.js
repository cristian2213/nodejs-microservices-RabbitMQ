//Creating a Auth Model in userModel.js
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now(),
    },
  },
  {}
);

module.exports = mongoose.model('user', userSchema);
