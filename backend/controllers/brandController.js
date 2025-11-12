const mongoose = require('mongoose'); // Add this line
const Brand = require('../models/Brand');
const upload = require('../middlewares/upload');
const cloudinary = require('../utils/cloudinary');

const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({});
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ message: 'Failed to fetch brands' });
  }
};

const createBrand = async (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    const { name, description, status } = req.body;
    try {
      const brand = new Brand({
        name,
        logo: req.file ? req.file.path : '',
        description,
        status,
      });
      await brand.save();
      res.status(201).json(brand);
    } catch (error) {
      console.error('Error creating brand:', error);
      res.status(500).json({ message: 'Failed to create brand' });
    }
  });
};

const updateBrand = async (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message });
    }
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid brand ID' });
    }
    const updates = req.body;
    if (req.file) updates.logo = req.file.path;
    try {
      const brand = await Brand.findByIdAndUpdate(id, updates, { new: true });
      if (!brand) return res.status(404).json({ message: 'Brand not found' });
      res.json(brand);
    } catch (error) {
      console.error('Error updating brand:', error);
      res.status(500).json({ message: 'Failed to update brand' });
    }
  });
};

const deleteBrand = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid brand ID' });
  }
  try {
    const brand = await Brand.findByIdAndDelete(id);
    if (!brand) return res.status(404).json({ message: 'Brand not found' });
    if (brand.logo) {
      const publicId = brand.logo.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`products/${publicId}`);
    }
    res.json({ message: 'Brand deleted' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ message: 'Failed to delete brand' });
  }
};

module.exports = { getBrands, createBrand, updateBrand, deleteBrand };