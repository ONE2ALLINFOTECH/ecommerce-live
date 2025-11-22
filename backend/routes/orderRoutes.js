const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/authCustomerMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const stripe = require('../config/stripe');
const EkartService = require('../services/ekartService');

// Create Order and Get Stripe Checkout URL
router.post('/create', protectCustomer, async (req, res) => {
  try {
    // Validate environment variables
    if (!process.env.STRIPE_PUBLISHABLE_KEY || !process.env.STRIPE_SECRET_KEY) {
      console.error('❌ Missing Stripe environment variables');
      return res.status(500).json({ 
        message: 'Payment gateway configuration error' 
      });
    }

    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    console.log('📦 Creating order for user:', userId);
    console.log('💳 Payment method:', paymentMethod);

    // Validate shipping address
    if (!shippingAddress || 
        !shippingAddress.name || 
        !shippingAddress.mobile || 
        !shippingAddress.pincode || 
        !shippingAddress.locality ||
        !shippingAddress.address || 
        !shippingAddress.city || 
        !shippingAddress.state) {
      return res.status(400).json({ 
        message: 'Please provide complete shipping address including locality' 
      });
    }

    if (!/^\d{10}$/.test(shippingAddress.mobile)) {
      return res.status(400).json({ 
        message: 'Please provide a valid 10-digit mobile number' 
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({ 
        message: 'Invalid payment method. Use "online" or "cod"' 
      });
    }

    // Check Ekart serviceability before creating order
    try {
      console.log('📍 Checking Ekart serviceability for pincode:', shippingAddress.pincode);
      const serviceability = await EkartService.checkServiceability(shippingAddress.pincode);
      
      if (!serviceability.forward_drop) {
        return res.status(400).json({
          message: 'Sorry, we do not deliver to this pincode. Please check your shipping address.'
        });
      }
      console.log('✅ Pincode is serviceable');
    } catch (serviceabilityError) {
      console.error('❌ Serviceability check failed:', serviceabilityError.message);
      return res.status(400).json({
        message: 'Service not available for this pincode. Please try a different address.'
      });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: userId })
      .populate('items.productId', 'enableOnlinePayment enableCashOnDelivery name sellingPrice');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    console.log('🛒 Cart items:', cart.items.length);

    // Validate payment method against product settings
    if (paymentMethod === 'online') {
      const productsWithoutOnlinePayment = cart.items.filter(
        item => item.productId && !item.productId.enableOnlinePayment
      );
      if (productsWithoutOnlinePayment.length > 0) {
        return res.status(400).json({ 
          message: 'Some products in your cart do not support online payment',
          productNames: productsWithoutOnlinePayment.map(item => item.productId?.name || 'Unknown Product')
        });
      }
    } else if (paymentMethod === 'cod') {
      const productsWithoutCOD = cart.items.filter(
        item => item.productId && !item.productId.enableCashOnDelivery
      );
      if (productsWithoutCOD.length > 0) {
        return res.status(400).json({ 
          message: 'Some products in your cart do not support cash on delivery',
          productNames: productsWithoutCOD.map(item => item.productId?.name || 'Unknown Product')
        });
      }
    }

    // Calculate amounts
    const totalAmount = cart.totalAmount;
    const discount = Math.round(totalAmount * 0.3);
    const shippingCharge = 29;
    const finalAmount = totalAmount - discount + shippingCharge;

    console.log('💰 Order amounts:', {
      totalAmount,
      discount,
      shippingCharge,
      finalAmount
    });

    // Create order items
    const orderItems = cart.items.map(item => ({
      productId: item.productId._id || item.productId,
      name: item.name,
      sellingPrice: item.sellingPrice,
      image: item.image,
      quantity: item.quantity,
      totalPrice: item.sellingPrice * item.quantity
    }));

    // Create order object
    const orderData = {
      user: userId,
      items: orderItems,
      shippingAddress: {
        name: shippingAddress.name,
        mobile: shippingAddress.mobile,
        pincode: shippingAddress.pincode,
        locality: shippingAddress.locality,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        landmark: shippingAddress.landmark || '',
        alternatePhone: shippingAddress.alternatePhone || ''
      },
      totalAmount,
      discount,
      shippingCharge,
      finalAmount,
      paymentMethod,
      expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    };

    // Create order in database
    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order created in database:', order.orderId);

    // If payment is online, create Stripe Checkout Session
    if (paymentMethod === 'online') {
      try {
        const stripeOrderData = {
          order_id: order.orderId,
          amount: finalAmount,
          currency: 'inr',
          customer_id: userId.toString(),
          customer_email: req.user.email,
          customer_phone: shippingAddress.mobile,
          customer_name: shippingAddress.name
        };

        console.log('🔄 Creating Stripe checkout session for order:', order.orderId);

        const stripeResponse = await stripe.createCheckoutSession(stripeOrderData);
        
        console.log('✅ Stripe checkout session created successfully');

        // Update order with Stripe details
        order.stripeSessionId = stripeResponse.session_id;
        order.paymentStatus = 'processing';
        await order.save();

        res.json({
          orderId: order.orderId,
          sessionId: stripeResponse.session_id,
          checkoutUrl: stripeResponse.url,
          orderAmount: finalAmount,
          currency: stripeResponse.currency
        });

      } catch (stripeError) {
        // If Stripe fails, update order status
        order.paymentStatus = 'failed';
        order.orderStatus = 'cancelled';
        await order.save();
        
        console.error('❌ Stripe error:', stripeError);
        return res.status(500).json({ 
          message: 'Payment gateway error. Please try again or use Cash on Delivery.', 
          error: stripeError.message 
        });
      }
    } else {
      // COD order - Update order status immediately
      order.paymentStatus = 'pending';
      order.orderStatus = 'confirmed';
      await order.save();

      // Clear cart for COD orders
      await Cart.findOneAndUpdate(
        { user: userId },
        { items: [], totalQuantity: 0, totalAmount: 0 }
      );

      console.log('✅ COD order placed successfully');

      res.json({
        orderId: order.orderId,
        message: 'Order placed successfully with Cash on Delivery',
        orderAmount: finalAmount,
        paymentMethod: 'cod'
      });
    }

  } catch (error) {
    console.error('❌ Create order error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to create order', 
      error: error.message 
    });
  }
});

// Create Ekart Shipment after successful payment
router.post('/create-shipment/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('🚚 Creating Ekart shipment for order:', orderId);

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if shipment already exists
    if (order.ekartTrackingId) {
      return res.status(400).json({ 
        message: 'Shipment already created for this order',
        trackingId: order.ekartTrackingId
      });
    }

    // Create shipment with Ekart
    const ekartResponse = await EkartService.createShipment(
      order,
      order.shippingAddress,
      order.items
    );

    // Update order with Ekart tracking details
    order.ekartTrackingId = ekartResponse.tracking_id;
    order.ekartShipmentData = ekartResponse;
    order.ekartAWB = ekartResponse.awb_number;
    order.orderStatus = 'confirmed';
    await order.save();

    console.log('✅ Ekart shipment created successfully:', order.ekartTrackingId);

    res.json({
      success: true,
      message: 'Shipment created successfully',
      trackingId: order.ekartTrackingId,
      awb: order.ekartAWB,
      orderStatus: order.orderStatus
    });

  } catch (error) {
    console.error('❌ Create shipment error:', error);
    res.status(500).json({ 
      message: 'Failed to create shipment', 
      error: error.message 
    });
  }
});

// Verify Payment After Stripe Redirect
router.get('/verify-payment/:sessionId', protectCustomer, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { order_id } = req.query;

    console.log('🔍 Verifying payment for session:', sessionId);

    const session = await stripe.retrieveSession(sessionId);
    const order = await Order.findOne({ orderId: order_id, user: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (session.payment_status === 'paid') {
      order.paymentStatus = 'success';
      order.orderStatus = 'confirmed';
      order.stripePaymentStatus = 'paid';
      order.stripePaymentIntentId = session.payment_intent;
      await order.save();

      // Clear user's cart
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { items: [], totalQuantity: 0, totalAmount: 0 }
      );

      console.log('✅ Payment verified successfully');

      // Automatically create Ekart shipment for successful online payments
      try {
        const ekartResponse = await EkartService.createShipment(
          order,
          order.shippingAddress,
          order.items
        );

        order.ekartTrackingId = ekartResponse.tracking_id;
        order.ekartShipmentData = ekartResponse;
        order.ekartAWB = ekartResponse.awb_number;
        await order.save();

        console.log('✅ Ekart shipment created automatically');
      } catch (ekartError) {
        console.error('❌ Automatic Ekart shipment creation failed:', ekartError.message);
        // Don't fail the payment verification if shipment creation fails
      }

      res.json({
        success: true,
        orderId: order.orderId,
        paymentStatus: 'success',
        amount: order.finalAmount,
        trackingId: order.ekartTrackingId
      });
    } else {
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      await order.save();

      res.json({
        success: false,
        orderId: order.orderId,
        paymentStatus: 'failed'
      });
    }
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    res.status(500).json({ message: 'Failed to verify payment', error: error.message });
  }
});

// Track shipment with Ekart
router.get('/track/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('📊 Tracking order:', orderId);

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.ekartTrackingId) {
      return res.status(400).json({ 
        message: 'No tracking information available yet. Shipment not created.' 
      });
    }

    // Get tracking info from Ekart
    const trackingInfo = await EkartService.trackShipment(order.ekartTrackingId);

    res.json({
      orderId: order.orderId,
      trackingId: order.ekartTrackingId,
      orderStatus: order.orderStatus,
      trackingInfo: trackingInfo,
      publicTrackingUrl: `https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`
    });

  } catch (error) {
    console.error('❌ Track shipment error:', error);
    res.status(500).json({ 
      message: 'Failed to track shipment', 
      error: error.message 
    });
  }
});

// Cancel order and Ekart shipment
router.put('/cancel/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId, user: userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ 
        message: 'Cannot cancel order. It has already been shipped or delivered.' 
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Cancel Ekart shipment if exists
    if (order.ekartTrackingId) {
      try {
        await EkartService.cancelShipment(order.ekartTrackingId);
        console.log('✅ Ekart shipment cancelled');
      } catch (cancelError) {
        console.error('❌ Ekart shipment cancellation failed:', cancelError.message);
        // Continue with order cancellation even if shipment cancellation fails
      }
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'cancelled';
    await order.save();

    console.log('✅ Order cancelled successfully');

    res.json({ 
      message: 'Order cancelled successfully',
      order 
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    res.status(500).json({ message: 'Failed to cancel order', error: error.message });
  }
});

// Check serviceability for pincode
router.get('/serviceability/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ 
        message: 'Please provide a valid 6-digit pincode' 
      });
    }

    const serviceability = await EkartService.checkServiceability(pincode);

    res.json({
      pincode,
      serviceable: serviceability.forward_drop,
      details: serviceability
    });

  } catch (error) {
    console.error('❌ Serviceability check error:', error);
    res.status(500).json({ 
      message: 'Failed to check serviceability', 
      error: error.message 
    });
  }
});

// Get shipping rates estimate
router.post('/shipping-rates', protectCustomer, async (req, res) => {
  try {
    const { pickupPincode, deliveryPincode, weight, codAmount } = req.body;

    if (!pickupPincode || !deliveryPincode) {
      return res.status(400).json({ 
        message: 'Please provide both pickup and delivery pincodes' 
      });
    }

    const rates = await EkartService.getShippingRates(
      pickupPincode,
      deliveryPincode,
      weight || 1000,
      codAmount || 0
    );

    res.json(rates);

  } catch (error) {
    console.error('❌ Shipping rates error:', error);
    res.status(500).json({ 
      message: 'Failed to get shipping rates', 
      error: error.message 
    });
  }
});

// Get All User Orders (updated to include Ekart tracking)
router.get('/my-orders', protectCustomer, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-stripePaymentIntentId -stripeSessionId -ekartShipmentData')
      .populate('items.productId', 'name');

    const totalOrders = await Order.countDocuments({ user: userId });

    res.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        ordersPerPage: limit
      }
    });
  } catch (error) {
    console.error('❌ Get user orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

// Get Single Order Details (updated to include Ekart info)
router.get('/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId, user: userId })
      .populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get latest tracking info if available
    let trackingInfo = null;
    if (order.ekartTrackingId) {
      try {
        trackingInfo = await EkartService.trackShipment(order.ekartTrackingId);
      } catch (trackError) {
        console.error('Error fetching tracking info:', trackError.message);
      }
    }

    res.json({
      ...order.toObject(),
      trackingInfo,
      publicTrackingUrl: order.ekartTrackingId 
        ? `https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`
        : null
    });

  } catch (error) {
    console.error('❌ Get order details error:', error);
    res.status(500).json({ message: 'Failed to fetch order details', error: error.message });
  }
});

module.exports = router;