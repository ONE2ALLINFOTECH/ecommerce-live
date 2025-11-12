// ProductImage Model
const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  url: { type: String, required: true }, // Cloudinary URL
  altText: { type: String },
  isMain: { type: Boolean, default: false },
  mediaType: { 
    type: String, 
    enum: ['image', 'video'], 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('ProductImage', productImageSchema);



