// models/cart.js
const mongoose = require('mongoose');
const cartSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Cart', cartSchema);