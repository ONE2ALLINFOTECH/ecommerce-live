import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data } = await API.get('/categories');
        setCategories(data);
      } catch (error) {
        toast.error('Error fetching categories');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setLoading(true);
    try {
      await API.delete(`/categories/${id}`);
      setCategories(categories.filter((cat) => cat._id !== id));
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Error deleting category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '20px 0',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '500',
          color: '#212121'
        }}>
          Categories
        </h2>
        <Link 
          to="/dashboard/categories/add"
          style={{
            padding: '10px 24px',
            backgroundColor: '#2874f0',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '2px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#1c5bbf';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#2874f0';
          }}
        >
          + Add Category
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#fff',
          borderRadius: '4px',
          boxShadow: '0 1px 4px 0 rgba(0,0,0,.1)'
        }}>
          <div style={{
            display: 'inline-block',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #2874f0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '16px', color: '#878787', fontSize: '14px' }}>Loading categories...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '4px',
          boxShadow: '0 1px 4px 0 rgba(0,0,0,.1)',
          overflow: 'hidden'
        }}>
          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f9f9f9',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#878787',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Image</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#878787',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Name</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#878787',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Slug</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#878787',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Status</th>
                  <th style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '500',
                    color: '#878787',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: '#878787',
                      fontSize: '14px'
                    }}>
                      <div style={{ marginBottom: '12px', fontSize: '48px' }}>📦</div>
                      No categories found
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat._id} style={{
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <td style={{ padding: '16px' }}>
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            style={{
                              width: '60px',
                              height: '60px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #f0f0f0'
                            }}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/60';
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#878787',
                            fontSize: '12px'
                          }}>
                            No Image
                          </div>
                        )}
                      </td>
                      <td style={{
                        padding: '16px',
                        color: '#212121',
                        fontWeight: '500'
                      }}>{cat.name}</td>
                      <td style={{
                        padding: '16px',
                        color: '#878787'
                      }}>{cat.slug}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: cat.status === 'active' ? '#e8f5e9' : '#ffebee',
                          color: cat.status === 'active' ? '#2e7d32' : '#c62828'
                        }}>
                          {cat.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/dashboard/categories/edit/${cat._id}`}
                            style={{
                              padding: '6px 16px',
                              backgroundColor: '#fff',
                              color: '#2874f0',
                              textDecoration: 'none',
                              borderRadius: '2px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: '1px solid #2874f0',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#2874f0';
                              e.target.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#fff';
                              e.target.style.color = '#2874f0';
                            }}
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(cat._id)}
                            disabled={loading}
                            style={{
                              padding: '6px 16px',
                              backgroundColor: '#fff',
                              color: '#ff6161',
                              borderRadius: '2px',
                              fontSize: '13px',
                              fontWeight: '500',
                              border: '1px solid #ff6161',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.target.style.backgroundColor = '#ff6161';
                                e.target.style.color = '#fff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) {
                                e.target.style.backgroundColor = '#fff';
                                e.target.style.color = '#ff6161';
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryList;