const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/authCustomerMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const stripe = require('../config/stripe');

// Create Order and Payment Intent
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

    // If payment is online, create Stripe Payment Intent
    if (paymentMethod === 'online') {
      try {
        const stripeOrderData = {
          order_id: order.orderId,
          amount: finalAmount,
          currency: 'inr',
          customer_id: userId.toString(),
          customer_email: req.user.email,
          customer_phone: shippingAddress.mobile,
          customer_name: shippingAddress.name,
          shipping_address: {
            address: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: 'IN'
          }
        };

        console.log('🔄 Creating Stripe payment intent for order:', order.orderId);

        const stripeResponse = await stripe.createPaymentIntent(stripeOrderData);
        
        console.log('✅ Stripe payment intent created successfully');

        // Update order with Stripe details
        order.stripePaymentIntentId = stripeResponse.payment_intent_id;
        order.paymentStatus = 'processing';
        await order.save();

        res.json({
          orderId: order.orderId,
          clientSecret: stripeResponse.client_secret,
          paymentIntentId: stripeResponse.payment_intent_id,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          orderAmount: finalAmount,
          currency: stripeResponse.currency,
          success: true
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
        paymentMethod: 'cod',
        success: true
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

// Stripe Webhook Handler
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  let event;
  const signature = req.headers['stripe-signature'];

  try {
    event = await stripe.handleWebhook(req.body, signature);
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    console.log('📨 Stripe Webhook Event Received:', event.type);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ message: 'Webhook processing failed', error: error.message });
  }
});

// Webhook Handlers
async function handlePaymentSuccess(paymentIntent) {
  const { order_id } = paymentIntent.metadata;
  
  console.log('✅ Payment successful for order:', order_id);

  const order = await Order.findOne({ orderId: order_id });
  if (!order) {
    console.error('❌ Order not found for successful payment:', order_id);
    return;
  }

  order.paymentStatus = 'success';
  order.orderStatus = 'confirmed';
  order.stripePaymentStatus = 'succeeded';
  order.stripePaymentIntentId = paymentIntent.id;
  
  // Clear user's cart
  await Cart.findOneAndUpdate(
    { user: order.user },
    { items: [], totalQuantity: 0, totalAmount: 0 }
  );

  await order.save();
  console.log('✅ Order updated for successful payment:', order_id);
}

async function handlePaymentFailure(paymentIntent) {
  const { order_id } = paymentIntent.metadata;
  
  console.log('❌ Payment failed for order:', order_id);

  const order = await Order.findOne({ orderId: order_id });
  if (!order) {
    console.error('❌ Order not found for failed payment:', order_id);
    return;
  }

  order.paymentStatus = 'failed';
  order.orderStatus = 'cancelled';
  order.stripePaymentStatus = 'failed';
  order.stripePaymentIntentId = paymentIntent.id;

  await order.save();
  console.log('✅ Order updated for failed payment:', order_id);
}

async function handlePaymentCanceled(paymentIntent) {
  const { order_id } = paymentIntent.metadata;
  
  console.log('⚠️ Payment canceled for order:', order_id);

  const order = await Order.findOne({ orderId: order_id });
  if (!order) {
    console.error('❌ Order not found for canceled payment:', order_id);
    return;
  }

  order.paymentStatus = 'cancelled';
  order.orderStatus = 'cancelled';
  order.stripePaymentStatus = 'canceled';
  order.stripePaymentIntentId = paymentIntent.id;

  await order.save();
  console.log('✅ Order updated for canceled payment:', order_id);
}

// Check Payment Status
router.get('/payment-status/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('🔍 Checking payment status for order:', orderId);

    const order = await Order.findOne({ orderId, user: userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If it's a Stripe payment, get latest status from Stripe
    if (order.stripePaymentIntentId) {
      try {
        const paymentIntent = await stripe.retrievePaymentIntent(order.stripePaymentIntentId);
        order.stripePaymentStatus = paymentIntent.status;
        
        // Sync with our database
        if (paymentIntent.status === 'succeeded' && order.paymentStatus !== 'success') {
          order.paymentStatus = 'success';
          order.orderStatus = 'confirmed';
          await order.save();
        } else if (paymentIntent.status === 'canceled' && order.paymentStatus !== 'cancelled') {
          order.paymentStatus = 'cancelled';
          order.orderStatus = 'cancelled';
          await order.save();
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe status:', stripeError);
      }
    }

    res.json({
      orderId: order.orderId,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      stripePaymentStatus: order.stripePaymentStatus,
      finalAmount: order.finalAmount
    });
  } catch (error) {
    console.error('❌ Get payment status error:', error);
    res.status(500).json({ message: 'Failed to fetch payment status', error: error.message });
  }
});

// Get All User Orders
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
      .select('-stripePaymentIntentId')
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

// Get Single Order Details
router.get('/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ orderId, user: userId })
      .populate('items.productId', 'name images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Get order details error:', error);
    res.status(500).json({ message: 'Failed to fetch order details', error: error.message });
  }
});

// Cancel Order
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

    // If it's a Stripe payment, cancel the payment intent
    if (order.stripePaymentIntentId && order.paymentStatus === 'processing') {
      try {
        await stripe.stripe.paymentIntents.cancel(order.stripePaymentIntentId);
        console.log('✅ Stripe payment intent cancelled:', order.stripePaymentIntentId);
      } catch (stripeError) {
        console.error('Error cancelling Stripe payment:', stripeError);
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

module.exports = router;