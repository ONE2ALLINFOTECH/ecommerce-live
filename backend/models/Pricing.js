const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  originalPrice: { type: Number },
  sellingPrice: { type: Number },
  discount: { type: Number },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Pricing', pricingSchema);