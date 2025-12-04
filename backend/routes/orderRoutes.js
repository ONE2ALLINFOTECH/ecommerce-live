// routes/orderRoutes.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/authCustomerMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const stripe = require('../config/stripe');
const EkartService = require('../services/ekartService');

// ================== CREATE ORDER ==================

router.get('/admin/all', protectAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'username email')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});
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
        !shippingAddress?.locality || !shippingAddress?.address || 
        !shippingAddress?.city || !shippingAddress?.state) {
      return res.status(400).json({
        message: 'Please provide complete shipping address'
      });
    }

    if (!/^\d{10}$/.test(shippingAddress.mobile)) {
      return res.status(400).json({ 
        message: 'Please provide a valid 10-digit mobile number' 
      });
    }

    if (!['online', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ 
        message: 'Invalid payment method. Use "online" or "cod"' 
      });
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
      // Don't block COD order if shipment fails
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

// ================== VERIFY PAYMENT - FIXED ==================
router.get('/verify-payment/:sessionId', protectCustomer, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { order_id } = req.query;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 PAYMENT VERIFICATION START');
    console.log('🎫 Session ID:', sessionId);
    console.log('📦 Order ID:', order_id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get Stripe session
    const session = await stripe.retrieveSession(sessionId);
    console.log('💳 Stripe Status:', session.payment_status);

    // Get order
    const order = await Order.findOne({
      orderId: order_id,
      user: req.user._id
    });

    if (!order) {
      console.error('❌ Order not found:', order_id);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('📦 Order found:', order.orderId);
    console.log('💰 Amount:', order.finalAmount);

    // Check payment status
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

    // ✅ Payment successful
    console.log('✅ Payment successful! Updating order...');

    order.paymentStatus = 'success';
    order.orderStatus = 'confirmed';
    order.stripePaymentStatus = 'paid';
    order.stripePaymentIntentId = session.payment_intent;
    await order.save();

    console.log('✅ Order status updated to confirmed');

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], totalQuantity: 0, totalAmount: 0 }
    );
    console.log('🛒 Cart cleared');

    // ========== CREATE EKART SHIPMENT ==========
    let shipmentCreated = false;
    let trackingId = null;
    let shipmentError = null;

    if (!order.ekartTrackingId) {
      try {
        console.log('\n🚚 ===== CREATING EKART SHIPMENT =====');
        console.log('📦 Order ID:', order.orderId);
        console.log('📍 Customer:', order.shippingAddress.name);
        console.log('📍 City:', order.shippingAddress.city);
        console.log('📍 Pincode:', order.shippingAddress.pincode);
        console.log('📞 Phone:', order.shippingAddress.mobile);
        console.log('💰 Amount:', order.finalAmount);
        console.log('💳 Payment: ONLINE (PAID)\n');

        const ekartResponse = await EkartService.createShipment(
          order,
          order.shippingAddress,
          order.items
        );

        console.log('\n📡 Ekart Response:', JSON.stringify(ekartResponse, null, 2));

        if (ekartResponse.success && ekartResponse.tracking_id) {
          order.ekartTrackingId = ekartResponse.tracking_id;
          order.ekartShipmentData = ekartResponse.raw_response;
          order.ekartAWB = ekartResponse.awb_number;
          await order.save();

          shipmentCreated = true;
          trackingId = ekartResponse.tracking_id;

          console.log('\n✅✅✅ EKART SHIPMENT CREATED SUCCESSFULLY');
          console.log('🎯 Tracking ID:', trackingId);
          console.log('📋 AWB:', ekartResponse.awb_number);
          console.log('=====================================\n');
        } else {
          shipmentError = 'Ekart returned unsuccessful response';
          console.error('❌ Ekart shipment unsuccessful');
        }
      } catch (ekartError) {
        shipmentError = ekartError.message;
        console.error('\n❌❌❌ EKART SHIPMENT FAILED');
        console.error('Error:', ekartError.message);
        if (ekartError.response) {
          console.error('Status:', ekartError.response.status);
          console.error('Data:', JSON.stringify(ekartError.response.data, null, 2));
        }
        console.error('=====================================\n');
      }
    } else {
      shipmentCreated = true;
      trackingId = order.ekartTrackingId;
      console.log('✅ Shipment already exists:', trackingId);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PAYMENT VERIFICATION COMPLETE');
    console.log('📦 Order:', order.orderId);
    console.log('💳 Payment: SUCCESS');
    console.log('🚚 Shipment:', shipmentCreated ? 'CREATED' : 'FAILED');
    console.log('🎯 Tracking:', trackingId || 'N/A');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

// ================== MANUALLY CREATE SHIPMENT ==================
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
      try {
        const dashboardCheck = await EkartService.checkShipmentInDashboard(
          order.ekartTrackingId
        );
        if (dashboardCheck.exists) {
          return res.status(400).json({
            message: 'Shipment already exists',
            trackingId: order.ekartTrackingId,
            existsInDashboard: true
          });
        }
      } catch (error) {
        console.log('🔄 Verifying existing shipment...');
      }
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

// ================== TRACK ORDER ==================
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

// ================== CANCEL ORDER ==================
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

    res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    console.error('❌ Cancel error:', error);
    res.status(500).json({ message: 'Failed to cancel', error: error.message });
  }
});

// ================== OTHER ROUTES ==================
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
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

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
    res.status(500).json({ message: 'Failed to fetch order', error: error.message });
  }
});

module.exports = router;