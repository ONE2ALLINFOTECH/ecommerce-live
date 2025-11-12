// controllers/likeController.js
const ProductLike = require('../models/ProductLike');
const Product = require('../models/Product');
const jwt = require('jsonwebtoken');

// Try-auth (user optional)
const getIdentity = async (req) => {
  let user = null;
  try {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = { _id: decoded.id || decoded._id || decoded.userId };
    }
  } catch (e) { /* ignore */ }

  // 🔧 FIX: req_headers ❌ -> req.headers ✅
  const visitorId = (req.headers['x-visitor-id'] || '').toString().slice(0, 100) || null;
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().slice(0, 100);
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 200);

  return { user, visitorId, ip, userAgent };
};

const ensureProduct = async (productId) => {
  const exists = await Product.exists({ _id: productId });
  if (!exists) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }
};

// GET /products/:id/likes
exports.getLikes = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureProduct(id);

    const { user, visitorId } = await getIdentity(req);

    const count = await ProductLike.countDocuments({ product: id });

    // 🔧 optional chaining compatible fallback
    const liked = user && user._id
      ? !!(await ProductLike.findOne({ product: id, user: user._id }))
      : visitorId
        ? !!(await ProductLike.findOne({ product: id, visitorId }))
        : false;

    res.json({ count, liked });
  } catch (error) {
    console.error('GetLikes Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// POST /products/:id/like
exports.likeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureProduct(id);

    const { user, visitorId, ip, userAgent } = await getIdentity(req);

    if (!(user && user._id) && !visitorId) {
      return res.status(400).json({ message: 'Missing identity. Send Authorization bearer token or x-visitor-id header.' });
    }

    const filter = (user && user._id)
      ? { product: id, user: user._id }
      : { product: id, visitorId };

    await ProductLike.findOneAndUpdate(
      filter,
      { $setOnInsert: { product: id, user: user?._id, visitorId: visitorId || undefined, ip, userAgent } },
      { new: true, upsert: true }
    );

    const count = await ProductLike.countDocuments({ product: id });
    res.json({ count, liked: true });
  } catch (error) {
    console.error('LikeProduct Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// DELETE /products/:id/like
exports.unlikeProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await ensureProduct(id);

    const { user, visitorId } = await getIdentity(req);
    if (!(user && user._id) && !visitorId) {
      return res.status(400).json({ message: 'Missing identity. Send Authorization bearer token or x-visitor-id header.' });
    }

    const filter = (user && user._id)
      ? { product: id, user: user._id }
      : { product: id, visitorId };

    await ProductLike.findOneAndDelete(filter);

    const count = await ProductLike.countDocuments({ product: id });
    res.json({ count, liked: false });
  } catch (error) {
    console.error('UnlikeProduct Error:', error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
