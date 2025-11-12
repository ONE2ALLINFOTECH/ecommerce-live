// Complete Fixed ProductForm Component with Dynamic Highlights, Offers, Coupons, Description Sections and Payment Controls
import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const ProductForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: { short: '', long: '' },
    category: '',
    secondaryCategory: '',
    sku: '',
    barcode: '',
    originalPrice: 0,
    sellingPrice: 0,
    discountPercentage: 0,
    taxRate: 0,
    shippingCharges: 0,
    stockQuantity: 0,
    lowStockAlert: 5,
    stockStatus: 'In Stock',
    warehouseLocation: '',
    supplierInfo: '',
    brand: '',
    model: '',
    colorOptions: [],
    sizeVariants: [],
    weight: '',
    dimensions: '',
    material: '',
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    urlSlug: '',
    featured: false,
    dealTags: [],
    warrantyDetails: '',
    returnPolicy: '',
    shippingInfo: '',
    careInstructions: '',
    specifications: '',
    relatedProducts: [],
    crossSellProducts: [],
    status: 'Draft',
    visibility: 'Public',
    publicationDate: '',
    featuredCategory: '',
    searchVisibility: true,
    ageRestriction: '',
    highlights: [],
    offers: [],
    coupons: [],
    estimatedDelivery: '',
    rating: 0,
    reviewCount: 0,
    productDescription: [],
    // NEW: Payment Method Controls
    enableOnlinePayment: true,
    enableCashOnDelivery: true
  });

  const [mainImage, setMainImage] = useState(null);
  const [additionalMedia, setAdditionalMedia] = useState([]);
  const [existingMain, setExistingMain] = useState(null);
  const [existingAdditional, setExistingAdditional] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  // Dynamic field states
  const [highlightInput, setHighlightInput] = useState('');
  const [offerInput, setOfferInput] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [descriptionImages, setDescriptionImages] = useState({});

  useEffect(() => {
    fetchData();
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([
        API.get('/categories'),
        API.get('/brands')
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    } catch (error) {
      console.error('Error fetching categories/brands:', error);
      alert('Error fetching data: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchProduct = async () => {
    try {
      const { data } = await API.get(`/products/${id}`);

      setFormData({
        name: data.name || '',
        description: data.description || { short: '', long: '' },
        category: data.category?._id || '',
        secondaryCategory: data.secondaryCategory?._id || '',
        sku: data.sku || '',
        barcode: data.barcode || '',
        originalPrice: data.originalPrice || 0,
        sellingPrice: data.sellingPrice || 0,
        discountPercentage: data.discountPercentage || 0,
        taxRate: data.taxRate || 0,
        shippingCharges: data.shippingCharges || 0,
        stockQuantity: data.stockQuantity || 0,
        lowStockAlert: data.lowStockAlert || 5,
        stockStatus: data.stockStatus || 'In Stock',
        warehouseLocation: data.warehouseLocation || '',
        supplierInfo: data.supplierInfo || '',
        brand: data.brand?._id || '',
        model: data.model || '',
        colorOptions: data.colorOptions || [],
        sizeVariants: data.sizeVariants || [],
        weight: data.weight || '',
        dimensions: data.dimensions || '',
        material: data.material || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        keywords: data.keywords || [],
        urlSlug: data.urlSlug || '',
        featured: data.featured || false,
        dealTags: data.dealTags || [],
        warrantyDetails: data.warrantyDetails || '',
        returnPolicy: data.returnPolicy || '',
        shippingInfo: data.shippingInfo || '',
        careInstructions: data.careInstructions || '',
        specifications: data.specifications || '',
        relatedProducts: data.relatedProducts?.map(p => typeof p === 'object' ? p._id : p) || [],
        crossSellProducts: data.crossSellProducts?.map(p => typeof p === 'object' ? p._id : p) || [],
        status: data.status || 'Draft',
        visibility: data.visibility || 'Public',
        publicationDate: data.publicationDate ? data.publicationDate.split('T')[0] : '',
        featuredCategory: data.featuredCategory?._id || '',
        searchVisibility: data.searchVisibility !== undefined ? data.searchVisibility : true,
        ageRestriction: data.ageRestriction || '',
        highlights: data.highlights || [],
        offers: data.offers || [],
        coupons: data.coupons || [],
        estimatedDelivery: data.estimatedDelivery || '',
        rating: data.rating || 0,
        reviewCount: data.reviewCount || 0,
        productDescription: data.productDescription || [],
        // NEW: Payment Method Controls
        enableOnlinePayment: data.enableOnlinePayment !== undefined ? data.enableOnlinePayment : true,
        enableCashOnDelivery: data.enableCashOnDelivery !== undefined ? data.enableCashOnDelivery : true
      });

      const images = data.images || [];
      setExistingMain(images.find(img => img.isMain));
      setExistingAdditional(images.filter(img => !img.isMain));
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Error fetching product: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleArrayChange = (e, field) => {
    const value = e.target.value;
    const array = value
      ? value.split(',')
             .map(item => item.trim())
             .filter(item => item.length > 0)
      : [];

    setFormData(prev => ({ ...prev, [field]: array }));
  };

  const validateObjectIds = (ids) => {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return ids.filter(id => objectIdRegex.test(id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Sanitize data
      const sanitizedData = {
        ...formData,
        relatedProducts: validateObjectIds(formData.relatedProducts),
        crossSellProducts: validateObjectIds(formData.crossSellProducts),
        productDescription: formData.productDescription.map(section => ({
          title: section.title,
          content: section.content,
          image: typeof section.image === 'string' ? section.image : null
        }))
      };
      
      // Create FormData object
      const data = new FormData();
      data.append('productData', JSON.stringify(sanitizedData));
      
      // Append main image
      if (mainImage) {
        data.append('main_image', mainImage);
      }
      
      // Append additional media
      additionalMedia.forEach((file) => {
        data.append('additional_media', file);
      });
      
      // Append description section images
      Object.entries(descriptionImages).forEach(([index, file]) => {
        if (file instanceof File) {
          data.append(`description_image_${index}`, file);
        }
      });
      
      // Make API request
      if (id) {
        await API.put(`/products/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Product updated successfully!');
      } else {
        await API.post('/products', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Product created successfully!');
      }
      
      navigate('/dashboard/products');
      
    } catch (error) {
      console.error('Error saving product:', error);
      
      let errorMessage = 'Error saving product: ';
      
      if (error.response?.data?.errors) {
        const errors = Object.values(error.response.data.errors)
          .map(err => err.message)
          .join(', ');
        errorMessage += errors;
      } else {
        errorMessage += error.response?.data?.message || error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add Description Section
  const addDescriptionSection = () => {
    setFormData(prev => ({
      ...prev,
      productDescription: [
        ...prev.productDescription,
        { title: '', content: '', image: null }
      ]
    }));
  };

  // Remove Description Section
  const removeDescriptionSection = (index) => {
    setFormData(prev => ({
      ...prev,
      productDescription: prev.productDescription.filter((_, i) => i !== index)
    }));
    
    setDescriptionImages(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  // Update Description Section
  const updateDescriptionSection = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      productDescription: prev.productDescription.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      )
    }));
  };

  // Handle Description Image
  const handleDescriptionImage = (index, file) => {
    if (file) {
      setDescriptionImages(prev => ({
        ...prev,
        [index]: file
      }));
      
      setFormData(prev => ({
        ...prev,
        productDescription: prev.productDescription.map((section, i) =>
          i === index ? { ...section, image: file } : section
        )
      }));
    }
  };

  // Dynamic Add/Remove Handlers
  const addHighlight = () => {
    if (highlightInput.trim() && formData.highlights.length < 10) {
      setFormData(prev => ({
        ...prev,
        highlights: [...prev.highlights, highlightInput.trim()]
      }));
      setHighlightInput('');
    }
  };

  const removeHighlight = (index) => {
    setFormData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const addOffer = () => {
    if (offerInput.trim() && formData.offers.length < 10) {
      setFormData(prev => ({
        ...prev,
        offers: [...prev.offers, offerInput.trim()]
      }));
      setOfferInput('');
    }
  };

  const removeOffer = (index) => {
    setFormData(prev => ({
      ...prev,
      offers: prev.offers.filter((_, i) => i !== index)
    }));
  };

  const addCoupon = () => {
    if (couponInput.trim() && formData.coupons.length < 10) {
      setFormData(prev => ({
        ...prev,
        coupons: [...prev.coupons, couponInput.trim()]
      }));
      setCouponInput('');
    }
  };

  const removeCoupon = (index) => {
    setFormData(prev => ({
      ...prev,
      coupons: prev.coupons.filter((_, i) => i !== index)
    }));
  };

  return (
    <div style={{ backgroundColor: '#f1f3f6', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#fff',
          padding: '16px 24px',
          marginBottom: '12px',
          boxShadow: '0 1px 2px rgba(0,0,0,.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '500', color: '#212121' }}>
            {id ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            type="button"
            onClick={() => navigate('/dashboard/products')}
            style={{
              padding: '8px 20px',
              backgroundColor: '#fff',
              color: '#2874f0',
              border: '1px solid #e0e0e0',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Products
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Basic Information</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Product Name <span style={{ color: '#ff6161' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                  onBlur={(e) => e.target.style.borderColor = '#c2c2c2'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Short Description
                </label>
                <textarea
                  name="description.short"
                  rows="2"
                  value={formData.description.short}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                  onBlur={(e) => e.target.style.borderColor = '#c2c2c2'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Long Description
                </label>
                <textarea
                  name="description.long"
                  rows="4"
                  value={formData.description.long}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                  onBlur={(e) => e.target.style.borderColor = '#c2c2c2'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Category <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Secondary Category
                  </label>
                  <select
                    name="secondaryCategory"
                    value={formData.secondaryCategory}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">Select Secondary Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    SKU <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Barcode/ISBN
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Main Product Image (Big Image)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setMainImage(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                {existingMain && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#878787' }}>Existing Main Image:</p>
                    {existingMain.mediaType === 'image' ? (
                      <img
                        src={existingMain.url}
                        alt="Existing main"
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    ) : (
                      <video
                        src={existingMain.url}
                        controls
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Additional Images/Videos (up to 10)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setAdditionalMedia([...e.target.files].slice(0, 10))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                {existingAdditional.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#878787' }}>Existing Additional Media: {existingAdditional.length} file(s)</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                      {existingAdditional.map((media, index) => (
                        media.mediaType === 'image' ? (
                          <img
                            key={index}
                            src={media.url}
                            alt={`Media ${index + 1}`}
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #e0e0e0'
                            }}
                          />
                        ) : (
                          <video
                            key={index}
                            src={media.url}
                            controls
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #e0e0e0'
                            }}
                          />
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Details */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Pricing Details</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Original Price <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Selling Price <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Discount %
                  </label>
                  <input
                    type="number"
                    name="discountPercentage"
                    value={formData.discountPercentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Tax Rate (GST %)
                  </label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Shipping Charges
                  </label>
                  <input
                    type="number"
                    name="shippingCharges"
                    value={formData.shippingCharges}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Controls - NEW SECTION */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Payment Method Controls</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      name="enableOnlinePayment"
                      checked={formData.enableOnlinePayment}
                      onChange={handleChange}
                      style={{ 
                        marginRight: '12px', 
                        width: '18px', 
                        height: '18px',
                        accentColor: '#2874f0'
                      }}
                    />
                    <div>
                      <span style={{ fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                        Enable Online Payment
                      </span>
                      <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>
                        UPI / Credit / Debit Card / Net Banking
                      </div>
                    </div>
                  </label>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}>
                    <input
                      type="checkbox"
                      name="enableCashOnDelivery"
                      checked={formData.enableCashOnDelivery}
                      onChange={handleChange}
                      style={{ 
                        marginRight: '12px', 
                        width: '18px', 
                        height: '18px',
                        accentColor: '#2874f0'
                      }}
                    />
                    <div>
                      <span style={{ fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                        Enable Cash on Delivery
                      </span>
                      <div style={{ fontSize: '12px', color: '#878787', marginTop: '4px' }}>
                        Pay when you receive your order
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div style={{ 
                backgroundColor: '#f0f8ff', 
                padding: '12px 16px', 
                borderRadius: '4px', 
                border: '1px solid #c2d7ff',
                marginTop: '12px'
              }}>
                <p style={{ fontSize: '12px', color: '#2874f0', margin: 0 }}>
                  💡 <strong>Note:</strong> These settings control which payment methods are available for this product at checkout. 
                  If both are disabled, customers cannot purchase this product.
                </p>
              </div>
            </div>
          </div>

          {/* Inventory Management */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Inventory Management</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Stock Quantity <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    min="0"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    name="lowStockAlert"
                    value={formData.lowStockAlert}
                    onChange={handleChange}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Stock Status
                  </label>
                  <select
                    name="stockStatus"
                    value={formData.stockStatus}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option>In Stock</option>
                    <option>Out of Stock</option>
                    <option>Pre-order</option>
                    <option>Coming Soon</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Warehouse Location
                  </label>
                  <input
                    type="text"
                    name="warehouseLocation"
                    value={formData.warehouseLocation}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Supplier Info
                  </label>
                  <input
                    type="text"
                    name="supplierInfo"
                    value={formData.supplierInfo}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Attributes */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Product Attributes</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Brand
                  </label>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand._id} value={brand._id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Model/Version
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Color Options (comma separated)
                  </label>
                  <input
                    type="text"
                    onChange={(e) => handleArrayChange(e, 'colorOptions')}
                    value={Array.isArray(formData.colorOptions) ? formData.colorOptions.join(', ') : ''}
                    placeholder="e.g., Red, Blue, Green"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Size Variants (comma separated)
                  </label>
                  <input
                    type="text"
                    onChange={(e) => handleArrayChange(e, 'sizeVariants')}
                    value={Array.isArray(formData.sizeVariants) ? formData.sizeVariants.join(', ') : ''}
                    placeholder="e.g., S, M, L, XL"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Weight
                  </label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="e.g., 500g"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Dimensions
                  </label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleChange}
                    placeholder="e.g., 10x20x5 cm"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Material/Fabric
                  </label>
                  <input
                    type="text"
                    name="material"
                    value={formData.material}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEO & Marketing */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>SEO & Marketing</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Meta Title
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  value={formData.metaTitle}
                  onChange={handleChange}
                  maxLength="60"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#878787' }}>
                  Recommended: 50-60 characters
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Meta Description
                </label>
                <textarea
                  name="metaDescription"
                  rows="2"
                  value={formData.metaDescription}
                  onChange={handleChange}
                  maxLength="160"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#878787' }}>
                  Recommended: 150-160 characters
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  onChange={(e) => handleArrayChange(e, 'keywords')}
                  value={Array.isArray(formData.keywords) ? formData.keywords.join(', ') : ''}
                  placeholder="e.g., product, category, feature"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  URL Slug
                </label>
                <input
                  type="text"
                  name="urlSlug"
                  value={formData.urlSlug}
                  onChange={handleChange}
                  placeholder="e.g., product-name-123"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleChange}
                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#212121' }}>Featured Product</span>
                </label>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Deal/Offer Tags (comma separated)
                </label>
                <input
                  type="text"
                  onChange={(e) => handleArrayChange(e, 'dealTags')}
                  value={Array.isArray(formData.dealTags) ? formData.dealTags.join(', ') : ''}
                  placeholder="e.g., Sale, New Arrival, Trending"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Product Description Sections */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>
                Product Description Sections
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              {formData.productDescription.map((section, index) => (
                <div key={index} style={{ 
                  marginBottom: '24px', 
                  padding: '16px', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '4px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#212121' }}>
                      Section {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeDescriptionSection(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d32f2f',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '0 8px'
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Title */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#212121', fontWeight: '500' }}>
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateDescriptionSection(index, 'title', e.target.value)}
                      placeholder="e.g., Lightweight and Fast-absorbing"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#212121', fontWeight: '500' }}>
                      Section Content
                    </label>
                    <textarea
                      rows="4"
                      value={section.content}
                      onChange={(e) => updateDescriptionSection(index, 'content', e.target.value)}
                      placeholder="Description text..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '13px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Image */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#212121', fontWeight: '500' }}>
                      Section Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDescriptionImage(index, e.target.files[0])}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                    {section.image && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={typeof section.image === 'string' ? section.image : URL.createObjectURL(section.image)}
                          alt="Section preview"
                          style={{
                            width: '150px',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addDescriptionSection}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2874f0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                + Add Description Section
              </button>
            </div>
          </div>

          {/* Additional Information - DYNAMIC FIELDS */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Additional Information</h3>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Warranty, Return, etc. */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Warranty Details
                </label>
                <textarea
                  name="warrantyDetails"
                  rows="2"
                  value={formData.warrantyDetails}
                  onChange={handleChange}
                  placeholder="e.g., 1 year manufacturer warranty"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Return Policy
                </label>
                <textarea
                  name="returnPolicy"
                  rows="2"
                  value={formData.returnPolicy}
                  onChange={handleChange}
                  placeholder="e.g., 30 days return policy"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Shipping Information
                </label>
                <textarea
                  name="shippingInfo"
                  rows="2"
                  value={formData.shippingInfo}
                  onChange={handleChange}
                  placeholder="e.g., Free shipping above ₹499"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Care Instructions
                </label>
                <textarea
                  name="careInstructions"
                  rows="2"
                  value={formData.careInstructions}
                  onChange={handleChange}
                  placeholder="e.g., Hand wash only"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Specifications
                </label>
                <textarea
                  name="specifications"
                  rows="3"
                  value={formData.specifications}
                  onChange={handleChange}
                  placeholder="e.g., Technical specifications..."
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* DYNAMIC HIGHLIGHTS */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Highlights (Max 10)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addHighlight()}
                    placeholder="Add a highlight"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={addHighlight}
                    disabled={formData.highlights.length >= 10}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: formData.highlights.length >= 10 ? '#ccc' : '#2874f0',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: formData.highlights.length >= 10 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.highlights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#e0f7fa',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {h}
                      <button
                        type="button"
                        onClick={() => removeHighlight(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC OFFERS */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Offers (Max 10)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={offerInput}
                    onChange={(e) => setOfferInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addOffer()}
                    placeholder="Add an offer"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={addOffer}
                    disabled={formData.offers.length >= 10}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: formData.offers.length >= 10 ? '#ccc' : '#4caf50',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: formData.offers.length >= 10 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.offers.map((o, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#e8f5e9',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {o}
                      <button
                        type="button"
                        onClick={() => removeOffer(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DYNAMIC COUPONS */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Coupon Codes (Max 10)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCoupon()}
                    placeholder="Add a coupon"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCoupon}
                    disabled={formData.coupons.length >= 10}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: formData.coupons.length >= 10 ? '#ccc' : '#ff9800',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: formData.coupons.length >= 10 ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.coupons.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#fff3e0',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removeCoupon(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remaining fields */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Estimated Delivery Period
                </label>
                <input
                  type="text"
                  name="estimatedDelivery"
                  value={formData.estimatedDelivery}
                  onChange={handleChange}
                  placeholder="e.g., 5-7 days"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Average Rating
                  </label>
                  <input
                    type="number"
                    name="rating"
                    value={formData.rating}
                    onChange={handleChange}
                    min="0"
                    max="5"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Review Count
                  </label>
                  <input
                    type="number"
                    name="reviewCount"
                    value={formData.reviewCount}
                    onChange={handleChange}
                    min="0"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Related Products IDs (comma separated)
                </label>
                <input
                  type="text"
                  onChange={(e) => handleArrayChange(e, 'relatedProducts')}
                  value={Array.isArray(formData.relatedProducts) ? formData.relatedProducts.join(', ') : ''}
                  placeholder="e.g., 507f1f77bcf86cd799439011"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#878787' }}>
                  Enter valid 24-character MongoDB ObjectIDs
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                  Cross-sell Products IDs (comma separated)
                </label>
                <input
                  type="text"
                  onChange={(e) => handleArrayChange(e, 'crossSellProducts')}
                  value={Array.isArray(formData.crossSellProducts) ? formData.crossSellProducts.join(', ') : ''}
                  placeholder="e.g., 507f1f77bcf86cd799439011"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #c2c2c2',
                    borderRadius: '2px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#878787' }}>
                  Enter valid 24-character MongoDB ObjectIDs
                </div>
              </div>
            </div>
          </div>

          {/* Admin Control Settings */}
          <div style={{ backgroundColor: '#fff', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212121' }}>Admin Control Settings</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Status <span style={{ color: '#ff6161' }}>*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option>Draft</option>
                    <option>Published</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Visibility
                  </label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option>Public</option>
                    <option>Private</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Publication Date
                  </label>
                  <input
                    type="date"
                    name="publicationDate"
                    value={formData.publicationDate}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Featured Category
                  </label>
                  <select
                    name="featuredCategory"
                    value={formData.featuredCategory}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  >
                    <option value="">Select Featured Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#212121', fontWeight: '500' }}>
                    Age Restriction
                  </label>
                  <input
                    type="text"
                    name="ageRestriction"
                    value={formData.ageRestriction}
                    onChange={handleChange}
                    placeholder="e.g., 18+"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #c2c2c2',
                      borderRadius: '2px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="searchVisibility"
                    checked={formData.searchVisibility}
                    onChange={handleChange}
                    style={{ marginRight: '8px', width: '16px', height: '16px' }}
                  />
                  <span style={{ fontSize: '14px', color: '#212121' }}>Show in Search Results</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            backgroundColor: '#fff',
            padding: '16px 24px',
            boxShadow: '0 1px 2px rgba(0,0,0,.1)',
            display: 'flex',
            gap: '12px'
          }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 32px',
                backgroundColor: loading ? '#ccc' : '#fb641b',
                color: '#fff',
                border: 'none',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    border: '2px solid #fff',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    animation: 'spin 0.6s linear infinite'
                  }}></span>
                  Saving...
                </>
              ) : (
                id ? 'Update Product' : 'Create Product'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/products')}
              disabled={loading}
              style={{
                padding: '12px 32px',
                backgroundColor: '#fff',
                color: '#212121',
                border: '1px solid #e0e0e0',
                borderRadius: '2px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProductForm;