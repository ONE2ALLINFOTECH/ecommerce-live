// models/ProductLike.js
const mongoose = require('mongoose');

const productLikeSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    // Either user OR visitorId will exist (to support guests)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    visitorId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
      maxlength: 100,
    },
    // optional diagnostics
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true }
);

// Ensure uniqueness per identity
productLikeSchema.index({ product: 1, user: 1 }, { unique: true, sparse: true });
productLikeSchema.index({ product: 1, visitorId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ProductLike', productLikeSchema);
