// productController.js - COMPLETE WITH PAYMENT METHOD CONTROLS
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const Inventory = require('../models/Inventory');
const Pricing = require('../models/Pricing');
const upload = require('../middlewares/upload');

// GET ALL PRODUCTS
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({})
      .populate('category secondaryCategory featuredCategory brand')
      .populate('relatedProducts', 'name')
      .populate('crossSellProducts', 'name');
    
    const productsWithImages = await Promise.all(products.map(async (product) => {
      const images = await ProductImage.find({ product: product._id });
      return { ...product.toObject(), images };
    }));
    
    res.json(productsWithImages);
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET PRODUCT BY ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id)
      .populate('category secondaryCategory featuredCategory brand')
      .populate('relatedProducts', 'name')
      .populate('crossSellProducts', 'name');
  
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
  
    const images = await ProductImage.find({ product: id });
  
    res.json({ ...product.toObject(), images });
  } catch (error) {
    console.error('Get Product By ID Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
  // Dynamic upload fields for description images
  const uploadFields = [
    { name: 'main_image', maxCount: 1 },
    { name: 'additional_media', maxCount: 10 }
  ];
  
  // Add dynamic fields for description section images (max 20 sections)
  for (let i = 0; i < 20; i++) {
    uploadFields.push({ name: `description_image_${i}`, maxCount: 1 });
  }
  
  upload.fields(uploadFields)(req, res, async (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.status(400).json({ message: err.message });
    }
  
    try {
      const productData = JSON.parse(req.body.productData);
      console.log('Parsed Product Data:', productData);
      
      // Clean empty string ObjectId fields
      const objectIdFields = [
        'category',
        'secondaryCategory',
        'featuredCategory',
        'brand'
      ];
    
      objectIdFields.forEach(field => {
        if (productData[field] === '' || productData[field] === null) {
          delete productData[field];
        }
      });
      
      // Clean and validate ObjectId arrays
      if (productData.relatedProducts) {
        productData.relatedProducts = productData.relatedProducts
          .filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));
      }
      if (productData.crossSellProducts) {
        productData.crossSellProducts = productData.crossSellProducts
          .filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));
      }
      
      // Process description section images
      if (productData.productDescription && Array.isArray(productData.productDescription)) {
        productData.productDescription = productData.productDescription.map((section, index) => {
          const imageFile = req.files[`description_image_${index}`];
          if (imageFile && imageFile[0]) {
            return {
              ...section,
              image: imageFile[0].path // Cloudinary URL
            };
          }
          return section;
        });
      }
      
      const product = new Product(productData);
      await product.save();
      
      // Save main media
      if (req.files.main_image) {
        const file = req.files.main_image[0];
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        await ProductImage.create({
          product: product._id,
          url: file.path,
          mediaType,
          isMain: true
        });
      }
      
      // Save additional media
      if (req.files.additional_media) {
        for (let file of req.files.additional_media) {
          const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
          await ProductImage.create({
            product: product._id,
            url: file.path,
            mediaType,
            isMain: false
          });
        }
      }
      
      // Create inventory record
      await Inventory.create({
        product: product._id,
        quantity: product.stockQuantity || 0
      });
      
      // Create pricing history record
      await Pricing.create({
        product: product._id,
        originalPrice: product.originalPrice,
        sellingPrice: product.sellingPrice,
        discount: product.discountPercentage || 0,
      });
      
      // Populate and return
      const populatedProduct = await Product.findById(product._id)
        .populate('category secondaryCategory featuredCategory brand');
      
      res.status(201).json(populatedProduct);
    } catch (error) {
      console.error('Create Product Error:', error);
      console.error('Error details:', error.errors);
      res.status(500).json({
        message: error.message,
        errors: error.errors
      });
    }
  });
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
  // Dynamic upload fields for description images
  const uploadFields = [
    { name: 'main_image', maxCount: 1 },
    { name: 'additional_media', maxCount: 10 }
  ];
  
  // Add dynamic fields for description section images (max 20 sections)
  for (let i = 0; i < 20; i++) {
    uploadFields.push({ name: `description_image_${i}`, maxCount: 1 });
  }
  
  upload.fields(uploadFields)(req, res, async (err) => {
    if (err) {
      console.error('Upload Error:', err);
      return res.status(400).json({ message: err.message });
    }
  
    const { id } = req.params;
  
    try {
      const updates = JSON.parse(req.body.productData);
      console.log('Parsed Update Data:', updates);
      
      // Clean empty string ObjectId fields
      const objectIdFields = [
        'category',
        'secondaryCategory',
        'featuredCategory',
        'brand'
      ];
    
      objectIdFields.forEach(field => {
        if (updates[field] === '' || updates[field] === null) {
          delete updates[field];
        }
      });
      
      // Clean and validate ObjectId arrays
      if (updates.relatedProducts) {
        updates.relatedProducts = updates.relatedProducts
          .filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));
      }
      if (updates.crossSellProducts) {
        updates.crossSellProducts = updates.crossSellProducts
          .filter(id => id && id.match(/^[0-9a-fA-F]{24}$/));
      }
      
      // Process description section images
      if (updates.productDescription && Array.isArray(updates.productDescription)) {
        updates.productDescription = updates.productDescription.map((section, index) => {
          const imageFile = req.files[`description_image_${index}`];
          if (imageFile && imageFile[0]) {
            return {
              ...section,
              image: imageFile[0].path // Cloudinary URL
            };
          }
          return section;
        });
      }
      
      const product = await Product.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      });
    
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      // Delete existing media if new media is uploaded
      if (req.files.main_image || req.files.additional_media) {
        await ProductImage.deleteMany({ product: id });
      }
      
      // Save new main media
      if (req.files.main_image) {
        const file = req.files.main_image[0];
        const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
        await ProductImage.create({
          product: id,
          url: file.path,
          mediaType,
          isMain: true
        });
      }
      
      // Save new additional media
      if (req.files.additional_media) {
        for (let file of req.files.additional_media) {
          const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
          await ProductImage.create({
            product: id,
            url: file.path,
            mediaType,
            isMain: false
          });
        }
      }
      
      // Update inventory if quantity changed
      if (updates.stockQuantity !== undefined) {
        await Inventory.findOneAndUpdate(
          { product: id },
          { quantity: updates.stockQuantity },
          { upsert: true }
        );
      }
      
      // Add pricing history if price changed
      if (updates.sellingPrice !== undefined) {
        await Pricing.create({
          product: id,
          originalPrice: updates.originalPrice || product.originalPrice,
          sellingPrice: updates.sellingPrice,
          discount: updates.discountPercentage || product.discountPercentage || 0,
        });
      }
      
      // Populate and return
      const populatedProduct = await Product.findById(id)
        .populate('category secondaryCategory featuredCategory brand');
      
      res.json(populatedProduct);
    } catch (error) {
      console.error('Update Product Error:', error);
      console.error('Error details:', error.errors);
      res.status(500).json({
        message: error.message,
        errors: error.errors
      });
    }
  });
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  
  try {
    const product = await Product.findByIdAndDelete(id);
  
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
  
    // Delete associated records
    await ProductImage.deleteMany({ product: id });
    await Inventory.deleteMany({ product: id });
    await Pricing.deleteMany({ product: id });
  
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete Product Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};