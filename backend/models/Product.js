const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    short: { type: String, trim: true },
    long: { type: String, trim: true },
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: [true, 'Category is required']
  },
  secondaryCategory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category' 
  },
  sku: { 
    type: String, 
    required: [true, 'SKU is required'], 
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: { 
    type: String,
    trim: true
  },
  originalPrice: { 
    type: Number, 
    required: [true, 'Original price is required'],
    min: [0, 'Price cannot be negative']
  },
  sellingPrice: { 
    type: Number, 
    required: [true, 'Selling price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPercentage: { 
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },
  taxRate: { 
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 0
  },
  shippingCharges: { 
    type: Number,
    min: [0, 'Shipping charges cannot be negative'],
    default: 0
  },
  stockQuantity: { 
    type: Number, 
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock quantity cannot be negative'],
    default: 0
  },
  lowStockAlert: { 
    type: Number, 
    default: 5,
    min: [0, 'Low stock alert cannot be negative']
  },
  stockStatus: { 
    type: String, 
    enum: {
      values: ['In Stock', 'Out of Stock', 'Pre-order', 'Coming Soon'],
      message: '{VALUE} is not a valid stock status'
    },
    default: 'In Stock' 
  },
  warehouseLocation: { 
    type: String,
    trim: true
  },
  supplierInfo: { 
    type: String,
    trim: true
  },
  brand: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Brand' 
  },
  model: { 
    type: String,
    trim: true
  },
  colorOptions: [{
    type: String,
    trim: true
  }],
  sizeVariants: [{
    type: String,
    trim: true
  }],
  weight: { 
    type: String,
    trim: true
  },
  dimensions: { 
    type: String,
    trim: true
  },
  material: { 
    type: String,
    trim: true
  },
  metaTitle: { 
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters']
  },
  metaDescription: { 
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters']
  },
  keywords: [{
    type: String,
    trim: true
  }],
  urlSlug: { 
    type: String, 
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true
  },
  featured: { 
    type: Boolean, 
    default: false 
  },
  dealTags: [{
    type: String,
    trim: true
  }],
  warrantyDetails: { 
    type: String,
    trim: true
  },
  returnPolicy: { 
    type: String,
    trim: true
  },
  shippingInfo: { 
    type: String,
    trim: true
  },
  careInstructions: { 
    type: String,
    trim: true
  },
  specifications: { 
    type: String,
    trim: true
  },
  productDescription: [{
    title: { type: String, trim: true },
    content: { type: String, trim: true },
    image: { type: String },
  }],
  relatedProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  crossSellProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product' 
  }],
  status: { 
    type: String, 
    enum: {
      values: ['Draft', 'Published', 'Inactive'],
      message: '{VALUE} is not a valid status'
    },
    default: 'Draft' 
  },
  visibility: { 
    type: String, 
    enum: {
      values: ['Public', 'Private'],
      message: '{VALUE} is not a valid visibility option'
    },
    default: 'Public' 
  },
  publicationDate: { 
    type: Date 
  },
  featuredCategory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category' 
  },
  searchVisibility: { 
    type: Boolean, 
    default: true 
  },
  ageRestriction: { 
    type: String,
    trim: true
  },
  highlights: [{
    type: String,
    trim: true
  }],
  offers: [{
    type: String,
    trim: true
  }],
  coupons: [{
    type: String,
    trim: true
  }],
  estimatedDelivery: {
    type: String,
    trim: true
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5']
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative']
  },
  // NEW: Payment Method Controls
  enableOnlinePayment: {
    type: Boolean,
    default: true
  },
  enableCashOnDelivery: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
productSchema.index({ name: 'text', 'description.short': 'text', 'description.long': 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ urlSlug: 1 });
productSchema.index({ featured: 1, status: 1 });
productSchema.index({ status: 1, visibility: 1 });

// Virtual for calculating final price after discount
productSchema.virtual('finalPrice').get(function() {
  if (this.discountPercentage > 0) {
    return this.sellingPrice - (this.sellingPrice * this.discountPercentage / 100);
  }
  return this.sellingPrice;
});

// Pre-save middleware to auto-generate URL slug if not provided
productSchema.pre('save', function(next) {
  if (!this.urlSlug && this.name) {
    this.urlSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Auto-calculate discount percentage if not provided
  if (this.originalPrice && this.sellingPrice && !this.discountPercentage) {
    this.discountPercentage = Math.round(
      ((this.originalPrice - this.sellingPrice) / this.originalPrice) * 100
    );
  }
  
  next();
});

// Method to check if product is in stock
productSchema.methods.isInStock = function() {
  return this.stockQuantity > 0 && this.stockStatus === 'In Stock';
};

// Method to check if stock is low
productSchema.methods.isLowStock = function() {
  return this.stockQuantity > 0 && this.stockQuantity <= this.lowStockAlert;
};

// Static method to find featured products
productSchema.statics.findFeatured = function() {
  return this.find({ featured: true, status: 'Published', visibility: 'Public' });
};

// Static method to find products by category
productSchema.statics.findByCategory = function(categoryId) {
  return this.find({ 
    $or: [
      { category: categoryId },
      { secondaryCategory: categoryId },
      { featuredCategory: categoryId }
    ],
    status: 'Published',
    visibility: 'Public'
  });
};

module.exports = mongoose.model('Product', productSchema);