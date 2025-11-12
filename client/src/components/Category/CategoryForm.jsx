import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { toast } from 'react-toastify';

const CategoryForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parentCategory: '',
    displayOrder: 0,
    status: 'Active',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    if (id) {
      const fetchCategory = async () => {
        setLoading(true);
        try {
          const { data } = await API.get(`/categories/${id}`);
          if (mounted) {
            setFormData({
              name: data.name || '',
              slug: data.slug || '',
              parentCategory: data.parentCategory?._id || '',
              displayOrder: data.displayOrder || 0,
              status: data.status || 'Active',
            });
            if (data.image) {
              setImagePreview(data.image);
            }
          }
        } catch (error) {
          if (error.response?.status === 404) {
            toast.error('Category not found');
          } else {
            toast.error('Error fetching category');
          }
        } finally {
          if (mounted) setLoading(false);
        }
      };
      fetchCategory();
    }

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (image) data.append('image', image);

    try {
      if (id) {
        await API.put(`/categories/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Category updated successfully');
      } else {
        await API.post('/categories', data, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Category created successfully');
      }
      navigate('/dashboard/categories');
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Error saving category');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d4d5d9',
    borderRadius: '2px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit'
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <button
          onClick={() => navigate('/dashboard/categories')}
          style={{
            marginRight: '12px',
            padding: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#878787',
            fontSize: '18px'
          }}
        >
          ←
        </button>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '500',
          color: '#212121'
        }}>
          {id ? 'Edit' : 'Add'} Category
        </h2>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '4px',
            textAlign: 'center'
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
            <p style={{ marginTop: '16px', color: '#212121', fontSize: '14px' }}>
              {id ? 'Loading...' : 'Saving...'}
            </p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '4px',
        boxShadow: '0 1px 4px 0 rgba(0,0,0,.1)',
        padding: '20px'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Name Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Name <span style={{ color: '#ff6161' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                onBlur={(e) => e.target.style.borderColor = '#d4d5d9'}
                placeholder="Enter category name"
              />
            </div>

            {/* Slug Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Slug <span style={{ color: '#ff6161' }}>*</span>
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                onBlur={(e) => e.target.style.borderColor = '#d4d5d9'}
                placeholder="category-slug"
              />
            </div>

            {/* Parent Category Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Parent Category ID
              </label>
              <input
                type="text"
                name="parentCategory"
                value={formData.parentCategory}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                onBlur={(e) => e.target.style.borderColor = '#d4d5d9'}
                placeholder="Optional"
              />
            </div>

            {/* Display Order Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Display Order
              </label>
              <input
                type="number"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                onBlur={(e) => e.target.style.borderColor = '#d4d5d9'}
                placeholder="0"
              />
            </div>

            {/* Status Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                style={inputStyle}
                onFocus={(e) => e.target.style.borderColor = '#2874f0'}
                onBlur={(e) => e.target.style.borderColor = '#d4d5d9'}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Image Upload Field */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#212121'
              }}>
                Category Image
              </label>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {/* Image Preview */}
                {imagePreview && (
                  <div style={{
                    position: 'relative',
                    flexShrink: 0
                  }}>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #f0f0f0'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ff6161',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* File Input */}
                <div style={{
                  flex: 1,
                  border: '1px dashed #d4d5d9',
                  borderRadius: '4px',
                  padding: '12px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2874f0'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d4d5d9'}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                    <p style={{ margin: 0, color: '#878787', fontSize: '12px' }}>
                      Click to upload
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid #f0f0f0'
          }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 28px',
                backgroundColor: '#2874f0',
                color: '#fff',
                border: 'none',
                borderRadius: '2px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 1px 2px 0 rgba(0,0,0,.2)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.backgroundColor = '#1c5bbf';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.backgroundColor = '#2874f0';
              }}
            >
              {loading ? 'Saving...' : (id ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/categories')}
              disabled={loading}
              style={{
                padding: '10px 28px',
                backgroundColor: '#fff',
                color: '#878787',
                border: '1px solid #d4d5d9',
                borderRadius: '2px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.borderColor = '#212121';
                  e.target.style.color = '#212121';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.borderColor = '#d4d5d9';
                  e.target.style.color = '#878787';
                }
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CategoryForm;