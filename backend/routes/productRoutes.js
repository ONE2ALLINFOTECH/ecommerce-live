const express = require('express');
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { protect } = require('../middlewares/authMiddleware');
const { likeProduct, unlikeProduct, getLikes } = require('../controllers/likeController');

const router = express.Router();

router.get('/', getProducts); // Removed protect
router.get('/:id', getProductById); // Removed protect
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.get('/:id/likes', getLikes);        // public
router.post('/:id/like', likeProduct);     // supports logged-in or guest via x-visitor-id
router.delete('/:id/like', unlikeProduct); 
module.exports = router;


