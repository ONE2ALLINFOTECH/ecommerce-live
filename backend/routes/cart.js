const express = require('express');
const router = express.Router();
const { protectCustomer } = require('../middlewares/authCustomerMiddleware'); // Changed import
const Cart = require('../models/Cart');

// Get Cart - UPDATED to use protectCustomer
router.get('/', protectCustomer, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ 
        user: req.user._id, 
        items: [], 
        totalQuantity: 0, 
        totalAmount: 0 
      });
    }
    
    const formattedCart = {
      items: cart.items.map(item => ({
        productId: item.productId._id || item.productId,
        name: item.name,
        sellingPrice: item.sellingPrice,
        image: item.image,
        quantity: item.quantity,
        totalPrice: item.sellingPrice * item.quantity
      })),
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.totalAmount
    };
    
    res.json(formattedCart);
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add to Cart - UPDATED to use protectCustomer
router.post('/add', protectCustomer, async (req, res) => {
  try {
    const { productId, name, sellingPrice, image, quantity = 1 } = req.body;
    
    if (!productId || !name || !sellingPrice) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ 
        user: req.user._id, 
        items: [] 
      });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId.toString()
    );
    
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += parseInt(quantity);
    } else {
      cart.items.push({ 
        productId, 
        name, 
        sellingPrice, 
        image, 
        quantity: parseInt(quantity) 
      });
    }

    cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    
    await cart.save();
    
    await cart.populate('items.productId');
    const formattedCart = {
      items: cart.items.map(item => ({
        productId: item.productId._id || item.productId,
        name: item.name,
        sellingPrice: item.sellingPrice,
        image: item.image,
        quantity: item.quantity,
        totalPrice: item.sellingPrice * item.quantity
      })),
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.totalAmount
    };
    
    res.json(formattedCart);
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Quantity - UPDATED to use protectCustomer
router.put('/update/:productId', protectCustomer, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => 
      item.productId.toString() === productId.toString()
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = parseInt(quantity);
    
    cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    
    await cart.save();
    await cart.populate('items.productId');
    
    const formattedCart = {
      items: cart.items.map(item => ({
        productId: item.productId._id || item.productId,
        name: item.name,
        sellingPrice: item.sellingPrice,
        image: item.image,
        quantity: item.quantity,
        totalPrice: item.sellingPrice * item.quantity
      })),
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.totalAmount
    };
    
    res.json(formattedCart);
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove Item - UPDATED to use protectCustomer
router.delete('/remove/:productId', protectCustomer, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => 
      item.productId.toString() !== productId.toString()
    );
    
    cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    
    await cart.save();
    await cart.populate('items.productId');
    
    const formattedCart = {
      items: cart.items.map(item => ({
        productId: item.productId._id || item.productId,
        name: item.name,
        sellingPrice: item.sellingPrice,
        image: item.image,
        quantity: item.quantity,
        totalPrice: item.sellingPrice * item.quantity
      })),
      totalQuantity: cart.totalQuantity,
      totalAmount: cart.totalAmount
    };
    
    res.json(formattedCart);
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear Cart - UPDATED to use protectCustomer
router.delete('/clear', protectCustomer, async (req, res) => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id }, 
      { 
        items: [], 
        totalQuantity: 0, 
        totalAmount: 0 
      },
      { new: true }
    );
    
    res.json({
      items: [],
      totalQuantity: 0,
      totalAmount: 0
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;