// Updated ProductList Component
import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useNavigate } from 'react-router-dom';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/products');
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error fetching products: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await API.delete(`/products/${id}`);
      alert('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || product.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStockStatusColor = (status) => {
    const colors = {
      'In Stock': '#388e3c',
      'Out of Stock': '#d32f2f',
      'Pre-order': '#f57c00',
      'Coming Soon': '#1976d2'
    };
    return colors[status] || '#757575';
  };

  const getVideoThumb = (url) => {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return parts[0] + '/upload/so_0/' + parts[1].replace(/\.\w+$/, '.jpg');
    }
    return url;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f3f6' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f0f0f0',
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
          <p style={{ marginTop: '16px', color: '#878787', fontSize: '14px' }}>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f3f6', padding: '20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          padding: '20px 24px',
          borderRadius: '2px',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,.1)',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '500', color: '#212121' }}>Products</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#878787' }}>
              Manage your product inventory
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/products/new')}
            style={{
              background: '#2874f0',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '2px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,.1)',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.target.style.background = '#1c5fbf'}
            onMouseOut={e => e.target.style.background = '#2874f0'}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Add Product
          </button>
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '16px 24px',
          borderRadius: '2px',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,.1)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f0f5ff',
                border: '1px solid #c2d7ff',
                borderRadius: '2px',
                padding: '0 12px'
              }}>
                <span style={{ color: '#2874f0', fontSize: '18px' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search for products, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    padding: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#212121'
                  }}
                />
              </div>
            </div>
            <div style={{ minWidth: '200px' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '2px',
                  fontSize: '14px',
                  color: '#212121',
                  background: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">All Status</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div style={{
            background: 'white',
            padding: '80px 24px',
            borderRadius: '2px',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,.1)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500', color: '#212121' }}>
              No products found
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#878787' }}>
              {searchTerm || filterStatus ? 'Try adjusting your filters' : 'Start by adding your first product'}
            </p>
            <button
              onClick={() => navigate('/dashboard/products/new')}
              style={{
                background: '#2874f0',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '2px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,.1)',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#1c5fbf'}
              onMouseOut={e => e.target.style.background = '#2874f0'}
            >
              Add Product
            </button>
          </div>
        ) : (
          <>
            <div style={{
              background: 'white',
              borderRadius: '2px',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,.1)',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                  <thead>
                    <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Product</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SKU</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                      <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Price</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Stock</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rating</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                      <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#878787', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const mainMedia = product.images.find(i => i.isMain) || product.images[0];
                      const mediaSrc = mainMedia ? (mainMedia.mediaType === 'video' ? getVideoThumb(mainMedia.url) : mainMedia.url) : null;
                      return (
                        <tr key={product._id} style={{ borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s', cursor: 'pointer' }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8f8f8'}
                          onMouseOut={e => e.currentTarget.style.background = 'white'}
                        >
                          <td style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {mediaSrc ? (
                                <img 
                                  src={mediaSrc} 
                                  alt={product.name}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    backgroundColor: '#f0f5ff',
                                    padding: '4px',
                                    border: '1px solid #e3f2fd'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '50px',
                                  height: '50px',
                                  background: 'linear-gradient(135deg, #f0f5ff 0%, #e3f2fd 100%)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '24px',
                                  flexShrink: 0,
                                  border: '1px solid #e3f2fd'
                                }}>
                                  📦
                                </div>
                              )}
                              <div style={{ minWidth: 0, maxWidth: '250px' }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#212121',
                                  marginBottom: '4px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}>
                                  {product.name || 'Untitled'}
                                  {product.featured && <span style={{ fontSize: '16px' }} title="Featured Product">⭐</span>}
                                </div>
                                {product.brand && (
                                  <div style={{ fontSize: '12px', color: '#878787' }}>
                                    {typeof product.brand === 'object' ? product.brand.name : product.brand}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <code style={{
                              background: '#f5f5f5',
                              padding: '4px 8px',
                              borderRadius: '2px',
                              fontSize: '12px',
                              color: '#212121',
                              fontFamily: 'monospace',
                              fontWeight: '500'
                            }}>
                              {product.sku || 'N/A'}
                            </code>
                          </td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ fontSize: '14px', color: '#212121' }}>
                              {product.category ? (
                                typeof product.category === 'object' ? product.category.name : product.category
                              ) : (
                                <span style={{ color: '#878787' }}>N/A</span>
                              )}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'right' }}>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '500', color: '#212121' }}>
                                ₹{product.sellingPrice?.toFixed(2) || '0.00'}
                              </div>
                              {product.discountPercentage > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
                                  <span style={{
                                    fontSize: '12px',
                                    color: '#878787',
                                    textDecoration: 'line-through'
                                  }}>
                                    ₹{product.originalPrice?.toFixed(2) || '0.00'}
                                  </span>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    color: '#388e3c',
                                    background: '#e8f5e9',
                                    padding: '2px 6px',
                                    borderRadius: '2px'
                                  }}>
                                    {product.discountPercentage}% OFF
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div>
                              <div style={{
                                fontSize: '16px',
                                fontWeight: '500',
                                color: product.stockQuantity <= product.lowStockAlert ? '#d32f2f' : '#212121'
                              }}>
                                {product.stockQuantity || 0}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: getStockStatusColor(product.stockStatus),
                                fontWeight: '500',
                                marginTop: '4px'
                              }}>
                                {product.stockStatus || 'Unknown'}
                              </div>
                              {product.stockQuantity <= product.lowStockAlert && product.stockQuantity > 0 && (
                                <div style={{
                                  fontSize: '11px',
                                  color: '#d32f2f',
                                  marginTop: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}>
                                  ⚠️ Low Stock
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '500',
                              color: '#212121'
                            }}>
                              {product.rating.toFixed(1) || 0} ⭐ ({product.reviewCount || 0})
                            </div>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '2px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: product.status === 'Published' ? '#e8f5e9' : product.status === 'Draft' ? '#fff8e1' : '#f5f5f5',
                              color: product.status === 'Published' ? '#388e3c' : product.status === 'Draft' ? '#f57c00' : '#757575'
                            }}>
                              {product.status || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => navigate(`/dashboard/products/edit/${product._id}`)}
                                style={{
                                  padding: '8px 12px',
                                  background: 'white',
                                  border: '1px solid #2874f0',
                                  borderRadius: '2px',
                                  color: '#2874f0',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = '#2874f0';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#2874f0';
                                }}
                                title="Edit Product"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                style={{
                                  padding: '8px 12px',
                                  background: 'white',
                                  border: '1px solid #d32f2f',
                                  borderRadius: '2px',
                                  color: '#d32f2f',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = '#d32f2f';
                                  e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#d32f2f';
                                }}
                                title="Delete Product"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              background: 'white',
              padding: '16px 24px',
              borderRadius: '2px',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,.1)',
              marginTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{ fontSize: '14px', color: '#878787' }}>
                Showing <strong style={{ color: '#212121' }}>{filteredProducts.length}</strong> of <strong style={{ color: '#212121' }}>{products.length}</strong> products
              </span>
              {filterStatus && (
                <button
                  onClick={() => setFilterStatus('')}
                  style={{
                    padding: '6px 12px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '12px',
                    color: '#212121',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.target.style.background = '#e0e0e0'}
                  onMouseOut={e => e.target.style.background = '#f5f5f5'}
                >
                  Clear Filter
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductList;