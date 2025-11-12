const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/authCustomerMiddleware');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const cashfree = require('../config/cashfree');

// Create Order and Payment Session
router.post('/create', protectCustomer, async (req, res) => {
  try {
    // Validate environment variables first
    if (!process.env.FRONTEND_URL || !process.env.BACKEND_URL) {
      console.error('❌ Missing environment variables:', {
        FRONTEND_URL: process.env.FRONTEND_URL || 'MISSING',
        BACKEND_URL: process.env.BACKEND_URL || 'MISSING'
      });
      return res.status(500).json({ 
        message: 'Server configuration error. Please add FRONTEND_URL and BACKEND_URL to .env file' 
      });
    }

    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    console.log('📦 Creating order for user:', userId);
    console.log('💳 Payment method:', paymentMethod);

    // Validate required shipping address fields
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

    // Validate mobile number
    if (!/^\d{10}$/.test(shippingAddress.mobile)) {
      return res.status(400).json({ 
        message: 'Please provide a valid 10-digit mobile number' 
      });
    }

    // Get user's cart with product details including payment settings
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
    } else {
      return res.status(400).json({ 
        message: 'Invalid payment method. Use "online" or "cod"' 
      });
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

    // If payment is online, create Cashfree session
    if (paymentMethod === 'online') {
      try {
        const cashfreeOrderData = {
          order_id: order.orderId,
          order_amount: finalAmount,
          order_currency: 'INR',
          customer_details: {
            customer_id: userId.toString(),
            customer_email: req.user.email,
            customer_phone: shippingAddress.mobile,
            customer_name: shippingAddress.name
          },
          order_meta: {
            return_url: `${process.env.FRONTEND_URL}/order-status?order_id={order_id}`,
            notify_url: `${process.env.BACKEND_URL}/api/orders/webhook`
          },
          order_note: 'Order from E-commerce Store'
        };

        console.log('🔄 Creating Cashfree order with data:', {
          order_id: cashfreeOrderData.order_id,
          order_amount: cashfreeOrderData.order_amount,
          return_url: cashfreeOrderData.order_meta.return_url,
          notify_url: cashfreeOrderData.order_meta.notify_url
        });

        const cashfreeResponse = await cashfree.createOrder(cashfreeOrderData);
        
        console.log('✅ Cashfree order created successfully');

        // Update order with Cashfree details
        order.cashfreeOrderId = cashfreeResponse.cf_order_id;
        await order.save();

        res.json({
          orderId: order.orderId,
          paymentSessionId: cashfreeResponse.payment_session_id,
          orderAmount: finalAmount,
          paymentLink: cashfreeResponse.payment_link
        });

      } catch (cashfreeError) {
        // If Cashfree fails, update order status
        order.paymentStatus = 'failed';
        order.orderStatus = 'cancelled';
        await order.save();
        
        console.error('❌ Cashfree error:', cashfreeError);
        return res.status(500).json({ 
          message: 'Payment gateway error. Please try again or use Cash on Delivery.', 
          error: cashfreeError.message 
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

// Cashfree Webhook Handler
router.post('/webhook', async (req, res) => {
  try {
    console.log('📨 Webhook received:', req.body);

    const { orderId, paymentStatus, referenceId, txStatus, txMsg, txTime } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findOne({ cashfreeOrderId: orderId });
    if (!order) {
      console.error('❌ Order not found for webhook:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('📦 Processing webhook for order:', order.orderId);

    // Update order based on payment status
    if (txStatus === 'SUCCESS') {
      order.paymentStatus = 'success';
      order.orderStatus = 'confirmed';
      order.cashfreePaymentId = referenceId;
      order.cashfreePaymentStatus = txStatus;
      
      // Clear user's cart on successful payment
      await Cart.findOneAndUpdate(
        { user: order.user },
        { items: [], totalQuantity: 0, totalAmount: 0 }
      );

      console.log('✅ Payment successful, cart cleared');
    } else if (txStatus === 'FAILED') {
      order.paymentStatus = 'failed';
      order.orderStatus = 'cancelled';
      order.cashfreePaymentStatus = txStatus;
      console.log('❌ Payment failed');
    } else if (txStatus === 'USER_DROPPED') {
      order.paymentStatus = 'cancelled';
      order.orderStatus = 'cancelled';
      order.cashfreePaymentStatus = txStatus;
      console.log('⚠️ Payment cancelled by user');
    } else {
      order.cashfreePaymentStatus = txStatus;
      console.log('⚠️ Unknown payment status:', txStatus);
    }

    await order.save();
    console.log('✅ Order updated successfully');

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ message: 'Webhook processing failed', error: error.message });
  }
});

// Get Order Status by Order ID
router.get('/status/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('🔍 Fetching order status:', orderId);

    const order = await Order.findOne({ orderId, user: userId })
      .populate('items.productId', 'name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('❌ Get order status error:', error);
    res.status(500).json({ message: 'Failed to fetch order status', error: error.message });
  }
});

// Get All User Orders
router.get('/my-orders', protectCustomer, async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('🔍 Fetching orders for user:', userId);

    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-cashfreeOrderId -cashfreePaymentId')
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

    console.log('🔍 Fetching order details:', orderId);

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

// Cancel Order (only if payment is pending or COD)
router.put('/cancel/:orderId', protectCustomer, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    console.log('🚫 Cancelling order:', orderId);

    const order = await Order.findOne({ orderId, user: userId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order can be cancelled
    if (order.orderStatus === 'shipped' || order.orderStatus === 'delivered') {
      return res.status(400).json({ 
        message: 'Cannot cancel order. It has already been shipped or delivered.' 
      });
    }

    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Update order status
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

// Admin: Get All Orders (add this if you have admin routes)
router.get('/admin/all-orders', async (req, res) => {
  try {
    // Add your admin authentication middleware here
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username email')
      .populate('items.productId', 'name');

    const totalOrders = await Order.countDocuments();

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
    console.error('❌ Get all orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

module.exports = router;