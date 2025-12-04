// routes/orderRoutes.js - COMPLETE WITH ADMIN ROUTES
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { protectCustomer } = require('../middlewares/authCustomerMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const User = require('../models/User'); // Adjust path as needed
const stripe = require('../config/stripe');
const EkartService = require('../services/ekartService');

const protectAdmin = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ SIMPLE: Just check if user exists (no role check)
    const User = require('../models/User');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('✅ User authenticated:', user.email);
    req.admin = user;
    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return res.status(401).json({ 
      message: 'Not authorized',
      error: error.message 
    });
  }
};
// ================== CUSTOMER ROUTES ==================

// CREATE ORDER
router.post('/create', protectCustomer, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 NEW ORDER REQUEST');
    console.log('👤 User ID:', userId);
    console.log('💳 Payment Method:', paymentMethod);
    console.log('📍 Pincode:', shippingAddress?.pincode);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Validation
    if (!shippingAddress?.name || !shippingAddress?.mobile || !shippingAddress?.pincode || 
        !shippingAddress?.locality || !shippingAddress?.address || !shippingAddress?.city || 
        !shippingAddress?.state) {
      return res.status(400).json({ message: 'Please provide complete shipping address' });
    }

    if (!/^\d{10}$/.test(shippingAddress.mobile)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit mobile number' });
    }

    if (!['online', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method. Use "online" or "cod"' });
    }

    // Serviceability check
    let serviceabilityCheck = { serviceable: true, warning: null };
    try {
      console.log('📍 Checking Ekart serviceability for pincode:', shippingAddress.pincode);
      serviceabilityCheck = await EkartService.checkServiceability(shippingAddress.pincode);
      console.log('✅ Serviceability:', serviceabilityCheck.serviceable);
      
      if (serviceabilityCheck.serviceable === false && !serviceabilityCheck.error) {
        return res.status(400).json({
          message: 'Sorry, we do not deliver to this pincode.',
          pincode: shippingAddress.pincode
        });
      }
    } catch (serviceError) {
      console.error('⚠️ Serviceability check failed (non-blocking):', serviceError.message);
      serviceabilityCheck.warning = 'Serviceability check unavailable';
    }

    // Get cart
    const cart = await Cart.findOne({ user: userId }).populate(
      'items.productId',
      'enableOnlinePayment enableCashOnDelivery name sellingPrice'
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    console.log('🛒 Cart items:', cart.items.length);

    // Validate payment method vs product settings
    if (paymentMethod === 'online') {
      const invalid = cart.items.filter(item => !item.productId?.enableOnlinePayment);
      if (invalid.length > 0) {
        return res.status(400).json({
          message: 'Some products do not support online payment',
          productNames: invalid.map(item => item.productId?.name || 'Unknown')
        });
      }
    } else if (paymentMethod === 'cod') {
      const invalid = cart.items.filter(item => !item.productId?.enableCashOnDelivery);
      if (invalid.length > 0) {
        return res.status(400).json({
          message: 'Some products do not support COD',
          productNames: invalid.map(item => item.productId?.name || 'Unknown')
        });
      }
    }

    // Calculate amounts
    const totalAmount = cart.totalAmount;
    const discount = Math.round(totalAmount * 0.3);
    const shippingCharge = 29;
    const finalAmount = totalAmount - discount + shippingCharge;

    console.log('💰 Amounts:', { totalAmount, discount, shippingCharge, finalAmount });

    // Order items
    const orderItems = cart.items.map(item => ({
      productId: item.productId._id || item.productId,
      name: item.name,
      sellingPrice: item.sellingPrice,
      image: item.image,
      quantity: item.quantity,
      totalPrice: item.sellingPrice * item.quantity
    }));

    // Create order
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
      expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    };

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order created:', order.orderId);

    // ========== ONLINE PAYMENT ==========
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

        console.log('🔄 Creating Stripe session...');
        const stripeResponse = await stripe.createCheckoutSession(stripeOrderData);

        order.stripeSessionId = stripeResponse.session_id;
        order.paymentStatus = 'processing';
        await order.save();

        console.log('✅ Stripe session created:', stripeResponse.session_id);

        return res.json({
          orderId: order.orderId,
          sessionId: stripeResponse.session_id,
          checkoutUrl: stripeResponse.url,
          orderAmount: finalAmount,
          currency: stripeResponse.currency,
          serviceabilityWarning: serviceabilityCheck.warning
        });
      } catch (stripeError) {
        order.paymentStatus = 'failed';
        order.orderStatus = 'cancelled';
        await order.save();

        console.error('❌ Stripe error:', stripeError);
        return res.status(500).json({
          message: 'Payment gateway error. Try COD instead.',
          error: stripeError.message
        });
      }
    }

    // ========== COD ==========
    order.paymentStatus = 'pending';
    order.orderStatus = 'confirmed';
    await order.save();

    // Create shipment for COD immediately
    try {
      console.log('\n🚚 Creating Ekart shipment for COD order...');
      const ekartResponse = await EkartService.createShipment(
        order,
        order.shippingAddress,
        order.items
      );

      if (ekartResponse.success) {
        order.ekartTrackingId = ekartResponse.tracking_id;
        order.ekartShipmentData = ekartResponse.raw_response;
        order.ekartAWB = ekartResponse.awb_number;
        await order.save();
        console.log('✅ COD Shipment created:', ekartResponse.tracking_id);
      }
    } catch (ekartError) {
      console.error('❌ COD Shipment failed:', ekartError.message);
    }

    await Cart.findOneAndUpdate(
      { user: userId },
      { items: [], totalQuantity: 0, totalAmount: 0 }
    );

    console.log('✅ COD order completed\n');

    res.json({
      orderId: order.orderId,
      message: 'Order placed successfully with COD',
      orderAmount: finalAmount,
      paymentMethod: 'cod',
      trackingId: order.ekartTrackingId,
      serviceabilityWarning: serviceabilityCheck.warning
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    res.status(500).json({
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// VERIFY PAYMENT
router.get('/verify-payment/:sessionId', protectCustomer, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { order_id } = req.query;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 PAYMENT VERIFICATION START');
    console.log('🎫 Session ID:', sessionId);
    console.log('📦 Order ID:', order_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const session = await stripe.retrieveSession(sessionId);
    console.log('💳 Stripe Status:', session.payment_status);

    const order = await Order.findOne({ orderId: order_id, user: req.user._id });
    if (!order) {
      console.error('❌ Order not found:', order_id);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('📦 Order found:', order.orderId);

    if (session.payment_status !== 'paid') {
      console.log('❌ Payment not completed:', session.payment_status);
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      await order.save();

      return res.json({
        success: false,
        orderId: order.orderId,
        paymentStatus: 'failed'
      });
    }

    console.log('✅ Payment successful! Updating order...');
    order.paymentStatus = 'success';
    order.orderStatus = 'confirmed';
    order.stripePaymentStatus = 'paid';
    order.stripePaymentIntentId = session.payment_intent;
    await order.save();

    console.log('✅ Order status updated to confirmed');

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalQuantity: 0, totalAmount: 0 }
    );

    console.log('🛒 Cart cleared');

    // Create Ekart shipment
    let shipmentCreated = false;
    let trackingId = null;
    let shipmentError = null;

    if (!order.ekartTrackingId) {
      try {
        console.log('\n🚚 Creating Ekart shipment...');
        const ekartResponse = await EkartService.createShipment(
          order,
          order.shippingAddress,
          order.items
        );

        if (ekartResponse.success && ekartResponse.tracking_id) {
          order.ekartTrackingId = ekartResponse.tracking_id;
          order.ekartShipmentData = ekartResponse.raw_response;
          order.ekartAWB = ekartResponse.awb_number;
          await order.save();

          shipmentCreated = true;
          trackingId = ekartResponse.tracking_id;
          console.log('✅ Ekart shipment created:', trackingId);
        } else {
          shipmentError = 'Ekart returned unsuccessful response';
        }
      } catch (ekartError) {
        shipmentError = ekartError.message;
        console.error('❌ Ekart shipment failed:', ekartError.message);
      }
    } else {
      shipmentCreated = true;
      trackingId = order.ekartTrackingId;
    }

    console.log('\n✅ PAYMENT VERIFICATION COMPLETE\n');

    return res.json({
      success: true,
      orderId: order.orderId,
      paymentStatus: 'success',
      amount: order.finalAmount,
      trackingId,
      shipmentCreated,
      shipmentError
    });
  } catch (error) {
    console.error('\n❌ Verify payment error:', error);
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

// MANUALLY CREATE SHIPMENT
router.post('/create-shipment/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('\n🚚 Manual shipment creation for:', orderId);

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.ekartTrackingId) {
      return res.status(400).json({
        message: 'Shipment already exists',
        trackingId: order.ekartTrackingId
      });
    }

    const ekartResponse = await EkartService.createShipment(
      order,
      order.shippingAddress,
      order.items
    );

    if (!ekartResponse.success) {
      return res.status(500).json({
        message: 'Failed to create shipment',
        error: ekartResponse.message
      });
    }

    order.ekartTrackingId = ekartResponse.tracking_id;
    order.ekartShipmentData = ekartResponse.raw_response;
    order.ekartAWB = ekartResponse.awb_number;
    order.orderStatus = 'confirmed';
    await order.save();

    console.log('✅ Manual shipment created:', order.ekartTrackingId);

    res.json({
      success: true,
      message: 'Shipment created successfully',
      trackingId: order.ekartTrackingId,
      awb: order.ekartAWB,
      orderStatus: order.orderStatus
    });
  } catch (error) {
    console.error('❌ Manual shipment error:', error);
    res.status(500).json({
      message: 'Failed to create shipment',
      error: error.message
    });
  }
});

// TRACK ORDER
router.get('/track/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.ekartTrackingId) {
      return res.status(200).json({
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        message: 'Shipment being prepared. Tracking available soon.',
        trackingAvailable: false
      });
    }

    const trackingInfo = await EkartService.trackShipment(order.ekartTrackingId);

    res.json({
      orderId: order.orderId,
      trackingId: order.ekartTrackingId,
      awb: order.ekartAWB,
      orderStatus: order.orderStatus,
      trackingInfo,
      trackingAvailable: true,
      publicTrackingUrl: `https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`
    });
  } catch (error) {
    console.error('❌ Track error:', error);
    res.status(500).json({
      message: 'Failed to track shipment',
      error: error.message
    });
  }
});

// CANCEL ORDER
router.put('/cancel/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId, user: req.user._id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        message: 'Cannot cancel. Already shipped/delivered.'
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Already cancelled' });
    }

    if (order.ekartTrackingId) {
      try {
        await EkartService.cancelShipment(order.ekartTrackingId);
        console.log('✅ Ekart shipment cancelled');
      } catch (error) {
        console.error('❌ Ekart cancel failed:', error.message);
      }
    }

    order.orderStatus = 'cancelled';
    order.paymentStatus = 'cancelled';
    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('❌ Cancel error:', error);
    res.status(500).json({
      message: 'Failed to cancel',
      error: error.message
    });
  }
});

// CHECK SERVICEABILITY
router.get('/serviceability/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ message: 'Invalid pincode' });
    }

    const result = await EkartService.checkServiceability(pincode);

    res.json({
      pincode,
      serviceable: result.serviceable,
      codAvailable: result.cod_available,
      prepaidAvailable: result.prepaid_available,
      maxCodAmount: result.max_cod_amount,
      estimatedDeliveryDays: result.estimated_delivery_days,
      message: result.serviceable ? 'Available' : 'Not available'
    });
  } catch (error) {
    res.json({
      pincode: req.params.pincode,
      serviceable: true,
      warning: 'Check temporarily unavailable'
    });
  }
});

// MY ORDERS
router.get('/my-orders', protectCustomer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-stripePaymentIntentId -stripeSessionId -ekartShipmentData')
      .populate('items.productId', 'name');

    const total = await Order.countDocuments({ user: req.user._id });

    res.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        ordersPerPage: limit
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// GET SINGLE ORDER
router.get('/:orderId', protectCustomer, async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      user: req.user._id
    }).populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let trackingInfo = null;
    if (order.ekartTrackingId) {
      try {
        trackingInfo = await EkartService.trackShipment(order.ekartTrackingId);
      } catch (error) {
        trackingInfo = {
          tracking_id: order.ekartTrackingId,
          current_status: 'Tracking unavailable',
          error: error.message
        };
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
    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// ================== ADMIN ROUTES ==================

// GET ALL ORDERS (ADMIN)
router.get('/admin/all', protectAdmin, async (req, res) => {
  try {
    console.log('📊 Admin fetching all orders...');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .populate('user', 'username email mobile')
      .populate('items.productId', 'name images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments();

    // Add tracking URLs
    const ordersWithTracking = orders.map(order => {
      const orderObj = order.toObject();
      orderObj.publicTrackingUrl = order.ekartTrackingId
        ? `https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`
        : null;
      return orderObj;
    });

    console.log(`✅ Fetched ${orders.length} orders for admin`);

    res.json({
      orders: ordersWithTracking,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        ordersPerPage: limit
      }
    });
  } catch (error) {
    console.error('❌ Admin fetch orders error:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// UPDATE ORDER STATUS (ADMIN)
router.put('/admin/update-status/:orderId', protectAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    console.log(`📝 Admin updating order ${orderId} to ${orderStatus}`);

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.orderStatus = orderStatus;
    await order.save();

    console.log(`✅ Order ${orderId} updated to ${orderStatus}`);

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// GET SINGLE ORDER (ADMIN)
router.get('/admin/order/:orderId', protectAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId })
      .populate('user', 'username email mobile')
      .populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get tracking info
    let trackingInfo = null;
    if (order.ekartTrackingId) {
      try {
        trackingInfo = await EkartService.trackShipment(order.ekartTrackingId);
      } catch (error) {
        console.error('Tracking fetch failed:', error.message);
        trackingInfo = { error: 'Tracking unavailable' };
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
    console.error('❌ Admin fetch order error:', error);
    res.status(500).json({
      message: 'Failed to fetch order',
      error: error.message
    });
  }
});

// MANUALLY CREATE SHIPMENT (ADMIN)
router.post('/admin/create-shipment/:orderId', protectAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('\n🚚 Admin creating shipment for:', orderId);

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.ekartTrackingId) {
      return res.status(400).json({
        message: 'Shipment already exists',
        trackingId: order.ekartTrackingId
      });
    }

    const ekartResponse = await EkartService.createShipment(
      order,
      order.shippingAddress,
      order.items
    );

    if (!ekartResponse.success) {
      return res.status(500).json({
        message: 'Failed to create shipment',
        error: ekartResponse.message
      });
    }

    order.ekartTrackingId = ekartResponse.tracking_id;
    order.ekartShipmentData = ekartResponse.raw_response;
    order.ekartAWB = ekartResponse.awb_number;
    order.orderStatus = 'confirmed';
    await order.save();

    console.log('✅ Admin shipment created:', order.ekartTrackingId);

    res.json({
      success: true,
      message: 'Shipment created successfully',
      trackingId: order.ekartTrackingId,
      awb: order.ekartAWB,
      orderStatus: order.orderStatus
    });
  } catch (error) {
    console.error('❌ Admin shipment error:', error);
    res.status(500).json({
      message: 'Failed to create shipment',
      error: error.message
    });
  }
});

// ADMIN STATS
router.get('/admin/stats/overview', protectAdmin, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const confirmedOrders = await Order.countDocuments({ orderStatus: 'confirmed' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'success' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    const withShipment = await Order.countDocuments({ 
      ekartTrackingId: { $exists: true, $ne: null } 
    });
    const withoutShipment = totalOrders - withShipment;

    res.json({
      totalOrders,
      ordersByStatus: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
      },
      totalRevenue: totalRevenue[0]?.total || 0,
      shipmentStats: {
        withShipment,
        withoutShipment,
        shipmentRate: totalOrders > 0 
          ? ((withShipment / totalOrders) * 100).toFixed(2) + '%'
          : '0%'
      }
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

module.exports = router;