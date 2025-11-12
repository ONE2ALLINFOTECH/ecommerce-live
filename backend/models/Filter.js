const mongoose = require('mongoose');

const filterSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Price Range, Rating
  type: { type: String, enum: ['price', 'brand', 'rating', 'availability', 'attribute'] },
  options: { type: Map, of: String }, // Dynamic options
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
}, { timestamps: true });

module.exports = mongoose.model('Filter', filterSchema);