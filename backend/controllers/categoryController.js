const Category = require('../models/Category');
const Product = require('../models/Product');
const upload = require('../middlewares/upload');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).populate('parentCategory');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories', error: error.message });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('parentCategory');
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch category', error: error.message });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { brand, sort, minPrice, maxPrice } = req.query;

    // Find category
    const category = await Category.findOne({ slug }).populate('parentCategory');
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find subcategories
    const subcategories = await Category.find({ parentCategory: category._id });

    // Build product query
    let productQuery = { category: category._id };
    
    // Add brand filter if specified
    if (brand) {
      productQuery.brand = brand;
    }

    // Add price range filter if specified
    if (minPrice || maxPrice) {
      productQuery.sellingPrice = {};
      if (minPrice) {
        productQuery.sellingPrice.$gte = parseInt(minPrice);
      }
      if (maxPrice) {
        productQuery.sellingPrice.$lte = parseInt(maxPrice);
      }
    }

    // Determine sort order based on sort parameter
    let sortOption = {};
    
    switch (sort) {
      case 'popularity':
        // Sort by featured status first, then by stock quantity (popular items likely have more stock)
        sortOption = { featured: -1, stockQuantity: -1, createdAt: -1 };
        break;
      
      case 'price-low-high':
        // Sort by selling price ascending
        sortOption = { sellingPrice: 1 };
        break;
      
      case 'price-high-low':
        // Sort by selling price descending
        sortOption = { sellingPrice: -1 };
        break;
      
      case 'newest':
        // Sort by creation date descending
        sortOption = { createdAt: -1 };
        break;
      
      case 'relevance':
      default:
        // Default relevance: featured first, then newest
        sortOption = { featured: -1, createdAt: -1 };
        break;
    }

    // Fetch products with sorting
    const products = await Product.find(productQuery)
      .populate('brand')
      .sort(sortOption);

    res.json({ category, subcategories, products });
  } catch (error) {
    console.error('Get Category By Slug Error:', error);
    res.status(500).json({ message: 'Failed to fetch category by slug', error: error.message });
  }
};

const createCategory = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: 'File upload failed', error: err.message });
    const { name, slug, parentCategory, displayOrder, status } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    try {
      const existingCategory = await Category.findOne({ slug });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug already exists' });
      }

      const category = new Category({
        name,
        slug,
        parentCategory: parentCategory || null,
        image: req.file ? req.file.path : '',
        displayOrder: displayOrder || 0,
        status: status || 'Active',
      });
      await category.save();
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create category', error: error.message });
    }
  });
};

const updateCategory = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ message: 'File upload failed', error: err.message });
    const { id } = req.params;
    const { name, slug, parentCategory, displayOrder, status } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }

    try {
      const existingCategory = await Category.findOne({ slug, _id: { $ne: id } });
      if (existingCategory) {
        return res.status(400).json({ message: 'Slug already exists' });
      }

      const updates = {
        name,
        slug,
        parentCategory: parentCategory || null,
        displayOrder: displayOrder || 0,
        status: status || 'Active',
      };
      if (req.file) updates.image = req.file.path;

      const category = await Category.findByIdAndUpdate(id, updates, { new: true });
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update category', error: error.message });
    }
  });
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete category', error: error.message });
  }
};

module.exports = { 
  getCategories, 
  getCategoryById, 
  getCategoryBySlug, 
  createCategory, 
  updateCategory, 
  deleteCategory 
};