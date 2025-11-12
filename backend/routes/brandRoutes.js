const express = require('express');
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', protect, getBrands);
router.post('/', protect, createBrand);
router.put('/:id', protect, updateBrand);
router.delete('/:id', protect, deleteBrand);

module.exports = router;