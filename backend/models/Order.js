const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  locality: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  landmark: String,
  alternatePhone: String
});

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    sparse: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserCustomer',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: addressSchema,
  totalAmount: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cod'],
    default: 'online'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled', 'processing'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  // Ekart Logistics Fields
  ekartTrackingId: String,
  ekartShipmentData: mongoose.Schema.Types.Mixed,
  ekartLabelUrl: String,
  ekartAWB: String,
  // Stripe Payment Fields
  stripeSessionId: String,
  stripePaymentIntentId: String,
  stripePaymentStatus: String,
  stripeCustomerId: String,
  expectedDelivery: Date
}, {
  timestamps: true
});

// Generate order ID
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderId = `ORD${timestamp}${random}`;
    
    const existingOrder = await this.constructor.findOne({ orderId: this.orderId });
    if (existingOrder) {
      const newRandom = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.orderId = `ORD${timestamp}${newRandom}`;
    }
  }
  next();
});

// Add index for better performance
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ ekartTrackingId: 1 });
orderSchema.index({ stripePaymentIntentId: 1 });
orderSchema.index({ stripeSessionId: 1 });

module.exports = mongoose.model('Order', orderSchema);