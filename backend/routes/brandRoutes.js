const express = require('express');
const { getBrands, createBrand, updateBrand, deleteBrand } = require('../controllers/brandController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', getBrands); // ✅ This line onlyrouter.post('/', protect, createBrand);
router.put('/:id', protect, updateBrand);
router.delete('/:id', protect, deleteBrand);

module.exports = router;