const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    logo: { type: String }, // Cloudinary URL
    description: { type: String },
    productCount: { type: Number, default: 0 }, // Auto-calculated
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Brand', brandSchema);