const express = require('express');
const { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory, getCategoryBySlug } = require('../controllers/categoryController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getCategories); // Removed protect for public access
router.get('/:id', getCategoryById); // Removed protect
router.get('/slug/:slug', getCategoryBySlug); // New public route for slug
router.post('/', protect, createCategory);
router.put('/:id', protect, updateCategory);
router.delete('/:id', protect, deleteCategory);

module.exports = router;