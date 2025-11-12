import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import API from '../../services/api';

const UserElectroniccategory = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    fetchBrands();
    fetchCategoryData();
  }, [slug, selectedBrand, sortBy, minPrice, maxPrice]);

  const fetchBrands = async () => {
    try {
      const { data } = await API.get('/brands');
      setBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchCategoryData = async () => {
    setLoading(true);
    try {
      let url = `/categories/slug/${slug}`;
      const params = [];
      if (selectedBrand) params.push(`brand=${selectedBrand}`);
      if (sortBy) params.push(`sort=${sortBy}`);
      if (minPrice) params.push(`minPrice=${minPrice}`);
      if (maxPrice) params.push(`maxPrice=${maxPrice}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const { data } = await API.get(url);
      console.log('Category API Response:', data);

      setCategory(data.category);
      setSubcategories(data.subcategories);

      if (data.products && data.products.length > 0) {
        const productIds = data.products.map((p) => p._id || p);
        console.log('Fetching full product details for:', productIds);

        try {
          const productPromises = productIds.map((id) =>
            API.get(`/products/${id}`).catch((err) => {
              console.error(`Failed to fetch product ${id}:`, err);
              return null;
            })
          );

          const productResponses = await Promise.all(productPromises);
          const fullProducts = productResponses
            .filter((res) => res && res.data)
            .map((res) => res.data);

          console.log('Full products with images:', fullProducts);
          setProducts(fullProducts);
        } catch (error) {
          console.error('Error fetching product details:', error);
          setProducts(data.products);
        }
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching category:', error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // FIXED: Better image URL extraction function
  const getProductImageUrl = (product) => {
    // Check if images array exists and has items
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      return null;
    }

    const firstImage = product.images[0];
    
    // Case 1: Image is an object with 'url' property (matching your ProductImage model)
    if (firstImage && typeof firstImage === 'object' && firstImage.url) {
      return firstImage.url;
    }
    
    // Case 2: Image is an object with 'imageUrl' property
    if (firstImage && typeof firstImage === 'object' && firstImage.imageUrl) {
      return firstImage.imageUrl;
    }
    
    // Case 3: Image is a direct URL string
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    
    return null;
  };

  const handleImageError = (e) => {
    console.error('Image failed to load:', e.target.src);
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    if (parent) {
      parent.style.background = '#f0f0f0';
      parent.innerHTML = '<div style="font-size: 64px; color: #c2c2c2;">📦</div>';
    }
  };

  const handleBrandChange = (brandId) => {
    setSelectedBrand(brandId);
  };

  const handleSortChange = (sortOption) => {
    setSortBy(sortOption);
  };

  const clearPriceFilter = () => {
    setMinPrice('');
    setMaxPrice('');
  };

  if (loading) return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '400px',
      background: '#f1f2f4'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #2874f0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '16px', color: '#878787' }}>Loading...</p>
      </div>
    </div>
  );

  if (!category) return (
    <div style={{ padding: '40px', textAlign: 'center', background: '#f1f2f4', minHeight: '100vh' }}>
      <h2 style={{ color: '#212121', marginBottom: '16px' }}>Category not found</h2>
      <Link to="/" style={{ color: '#2874f0', textDecoration: 'none', fontSize: '14px' }}>
        ← Back to Home
      </Link>
    </div>
  );

  const sortButtons = [
    { label: 'Relevance', value: 'relevance' },
    { label: 'Popularity', value: 'popularity' },
    { label: 'Price -- Low to High', value: 'price-low-high' },
    { label: 'Price -- High to Low', value: 'price-high-low' },
    { label: 'Newest First', value: 'newest' }
  ];

  return (
    <div style={{ background: '#f1f2f4', minHeight: '100vh' }}>
      <style>{`
        @media (max-width: 768px) {
          .filter-sidebar {
            position: fixed !important;
            left: ${showFilters ? '0' : '-100%'} !important;
            top: 0 !important;
            bottom: 0 !important;
            z-index: 1000 !important;
            width: 80% !important;
            max-width: 300px !important;
            transition: left 0.3s ease !important;
            overflow-y: auto !important;
          }
          .filter-overlay {
            display: ${showFilters ? 'block' : 'none'} !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0,0,0,0.5) !important;
            z-index: 999 !important;
          }
          .mobile-filter-btn {
            display: block !important;
          }
          .mobile-close-btn {
            display: block !important;
          }
          .sort-buttons {
            overflow-x: auto !important;
            white-space: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .product-card {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .product-image {
            width: 100% !important;
            height: auto !important;
            max-height: 250px !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-filter-btn {
            display: none !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
      `}</style>

      <div 
        className="filter-overlay"
        onClick={() => setShowFilters(false)}
      ></div>

      <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <div style={{ 
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          fontSize: '12px',
          color: '#878787'
        }}>
          <Link to="/" style={{ color: '#878787', textDecoration: 'none' }}>Home</Link>
          <span style={{ margin: '0 8px' }}>›</span>
          <span style={{ color: '#212121' }}>{category.name}</span>
        </div>
      </div>

      <div style={{ width: '100%', padding: '12px 8px' }}>
        <div style={{ display: 'flex', gap: '10px', position: 'relative' }}>
          {/* Left Sidebar */}
          <div className="filter-sidebar" style={{ width: '240px', flexShrink: 0 }}>
            <div style={{ background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.08)' }}>
              {/* Filters Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500', color: '#212121' }}>
                  Filters
                </h3>
                <button 
                  onClick={() => setShowFilters(false)}
                  style={{
                    display: 'none',
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#878787'
                  }}
                  className="mobile-close-btn"
                >
                  ×
                </button>
              </div>
              
              {/* Categories Section */}
              <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '500', 
                    color: '#878787', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '12px' 
                  }}>
                    CATEGORIES
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#212121', marginBottom: '4px' }}>
                    {category.name}
                  </div>
                  {subcategories.length > 0 && (
                    <div>
                      {subcategories.slice(0, 10).map((sub) => (
                        <Link
                          key={sub._id}
                          to={`/category/${sub.slug}`}
                          style={{
                            display: 'block',
                            padding: '10px 0 10px 12px',
                            fontSize: '14px',
                            color: '#878787',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                          }}
                          onMouseOver={e => e.target.style.color = '#2874f0'}
                          onMouseOut={e => e.target.style.color = '#878787'}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Price Filter */}
              <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '500', 
                    color: '#878787', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '14px' 
                  }}>
                    PRICE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <select 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '14px',
                        color: '#212121',
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Min</option>
                      <option value="0">₹0</option>
                      <option value="1000">₹1,000</option>
                      <option value="5000">₹5,000</option>
                      <option value="10000">₹10,000</option>
                      <option value="20000">₹20,000</option>
                      <option value="50000">₹50,000</option>
                    </select>
                    <span style={{ color: '#878787', fontSize: '14px' }}>to</span>
                    <select 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '14px',
                        color: '#212121',
                        background: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Max</option>
                      <option value="5000">₹5,000</option>
                      <option value="10000">₹10,000</option>
                      <option value="20000">₹20,000</option>
                      <option value="50000">₹50,000</option>
                      <option value="100000">₹1,00,000</option>
                      <option value="999999">₹1,00,000+</option>
                    </select>
                  </div>
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={clearPriceFilter}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#fff',
                        border: '1px solid #2874f0',
                        borderRadius: '2px',
                        color: '#2874f0',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={e => {
                        e.target.style.background = '#2874f0';
                        e.target.style.color = '#fff';
                      }}
                      onMouseOut={e => {
                        e.target.style.background = '#fff';
                        e.target.style.color = '#2874f0';
                      }}
                    >
                      Clear Price Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Brand Filter */}
              <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '500', 
                    color: '#878787', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '14px' 
                  }}>
                    BRAND
                  </div>
                  <div style={{ position: 'relative', marginBottom: '14px' }}>
                    <input 
                      type="text" 
                      placeholder="Search Brand" 
                      style={{
                        width: '100%',
                        padding: '8px 8px 8px 30px',
                        border: '1px solid #c2c2c2',
                        borderRadius: '2px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    <svg style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '14px',
                      fill: '#878787'
                    }} viewBox="0 0 17 18">
                      <path d="M11.618 9.897l4.225 4.212c.092.092.101.232.02.313l-1.465 1.46c-.081.081-.221.072-.314-.02l-4.216-4.203" fill="none"/>
                      <path d="M6.486 10.901c-2.42 0-4.381-1.956-4.381-4.368 0-2.413 1.961-4.369 4.381-4.369 2.42 0 4.381 1.956 4.381 4.369 0 2.413-1.961 4.368-4.381 4.368m0-10.835C2.904.066 0 2.96 0 6.533 0 10.105 2.904 13 6.486 13s6.487-2.895 6.487-6.467c0-3.572-2.905-6.467-6.487-6.467"/>
                    </svg>
                  </div>
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '8px 0',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    <input 
                      type="radio" 
                      name="brand" 
                      value="" 
                      checked={!selectedBrand}
                      onChange={() => handleBrandChange('')}
                      style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }} 
                    />
                    <span style={{ color: '#212121' }}>All Brands</span>
                  </label>
                  {brands.map((brand) => (
                    <label key={brand._id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px 0',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      <input 
                        type="radio" 
                        name="brand" 
                        value={brand._id} 
                        checked={selectedBrand === brand._id}
                        onChange={() => handleBrandChange(brand._id)}
                        style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }} 
                      />
                      <span style={{ color: '#212121' }}>{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Customer Ratings */}
              <div style={{ borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '500', 
                    color: '#878787', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '14px' 
                  }}>
                    CUSTOMER RATINGS
                  </div>
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px 0',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      <input type="checkbox" style={{ marginRight: '10px', width: '16px', height: '16px', cursor: 'pointer' }} />
                      <span style={{ color: '#212121' }}>{rating}★ & above</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Products List */}
            <div style={{ background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.08)' }}>
              {/* Sort Header */}
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button 
                    className="mobile-filter-btn"
                    onClick={() => setShowFilters(true)}
                    style={{
                      background: '#fff',
                      border: '1px solid #c2c2c2',
                      padding: '8px 16px',
                      borderRadius: '2px',
                      fontSize: '14px',
                      color: '#212121',
                      cursor: 'pointer',
                      display: 'none'
                    }}
                  >
                    ☰ Filters
                  </button>
                  <div style={{ fontSize: '20px', fontWeight: '400', color: '#212121' }}>
                    {category.name} 
                    {selectedBrand && ` - ${brands.find(b => b._id === selectedBrand)?.name || ''}`}
                    {(minPrice || maxPrice) && (
                      <span style={{ fontSize: '14px', color: '#878787', marginLeft: '8px' }}>
                        (₹{minPrice || '0'} - ₹{maxPrice || '∞'})
                      </span>
                    )}
                  </div>
                </div>
                <div className="sort-buttons" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#878787' }}>Sort By</span>
                  {sortButtons.map((btn) => (
                    <button 
                      key={btn.value}
                      onClick={() => handleSortChange(btn.value)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        color: sortBy === btn.value ? '#212121' : '#878787',
                        fontWeight: sortBy === btn.value ? '500' : '400',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Products */}
              {products.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '80px 20px',
                  color: '#878787'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
                  <p style={{ fontSize: '16px', margin: 0 }}>
                    No products available
                    {selectedBrand && ' for the selected brand'}
                    {(minPrice || maxPrice) && ' in this price range'}
                  </p>
                  {(minPrice || maxPrice) && (
                    <button
                      onClick={clearPriceFilter}
                      style={{
                        marginTop: '16px',
                        padding: '10px 24px',
                        background: '#2874f0',
                        border: 'none',
                        borderRadius: '2px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Clear Price Filter
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {products.map((product, index) => {
                    const imageUrl = getProductImageUrl(product);
                    
                    return (
                      <Link 
                        key={product._id} 
                        to={`/product/${product._id}`} 
                        style={{ 
                          textDecoration: 'none',
                          display: 'block',
                          borderBottom: index < products.length - 1 ? '1px solid #f0f0f0' : 'none'
                        }}
                      >
                        <div 
                          className="product-card"
                          style={{ 
                            padding: '24px 16px',
                            display: 'flex',
                            gap: '20px',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseOut={e => e.currentTarget.style.background = '#fff'}
                        >
                          {/* Product Image - FIXED VERSION */}
                          <div className="product-image" style={{
                            width: '200px',
                            height: '200px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            background: '#f0f0f0'
                          }}>
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.name || 'Product'}
                                onError={handleImageError}
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '100%', 
                                  objectFit: 'contain',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <div style={{ fontSize: '64px', color: '#c2c2c2' }}>📦</div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                            <h3 style={{ 
                              fontSize: '18px', 
                              color: '#212121',
                              margin: 0,
                              fontWeight: '400',
                              lineHeight: '1.3'
                            }}>
                              {product.name}
                            </h3>
                            
                            {/* Rating & Reviews */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {product.rating && (
                                <div style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: '#388e3c',
                                  color: '#fff',
                                  padding: '4px 8px',
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  gap: '4px'
                                }}>
                                  <span>{product.rating}</span>
                                  <span>★</span>
                                </div>
                              )}
                            </div>

                            {/* Specs/Features */}
                            <ul style={{ 
                              margin: '8px 0',
                              padding: '0 0 0 20px',
                              fontSize: '14px',
                              color: '#212121',
                              lineHeight: '1.8'
                            }}>
                              {product.description && typeof product.description === 'string' && (
                                <li>{product.description.slice(0, 80)}...</li>
                              )}
                              <li>1 Year Warranty</li>
                              <li>Fast Delivery Available</li>
                            </ul>

                            {/* Price Section */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '12px',
                              marginTop: '8px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{ 
                                fontSize: '28px', 
                                color: '#212121',
                                fontWeight: '500'
                              }}>
                                ₹{product.sellingPrice?.toLocaleString('en-IN')}
                              </span>
                              {product.originalPrice && product.originalPrice > product.sellingPrice && (
                                <>
                                  <span style={{ 
                                    fontSize: '18px', 
                                    color: '#878787',
                                    textDecoration: 'line-through'
                                  }}>
                                    ₹{product.originalPrice?.toLocaleString('en-IN')}
                                  </span>
                                  <span style={{
                                    fontSize: '16px',
                                    color: '#388e3c',
                                    fontWeight: '500'
                                  }}>
                                    {product.discountPercentage}% off
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Delivery Info */}
                            <div style={{ fontSize: '14px', color: '#26a541', fontWeight: '500', marginTop: '4px' }}>
                              Free delivery
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserElectroniccategory;