const mongoose = require('mongoose');

const productAttributeSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  attributes: { type: Map, of: String }, // Dynamic, e.g., { language: 'Hindi', author: 'XYZ' }
}, { timestamps: true });

module.exports = mongoose.model('ProductAttribute', productAttributeSchema);