const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: { type: String },
  cartItems: [{ name: String, price: Number, quantity: Number, image: String }],
  payment_status: { type: String },
  payment_intent: { type: String },
  totalAmount: { type: Number },
  status: { type: String, default: 'PROCESSING' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);