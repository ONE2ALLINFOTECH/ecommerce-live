import React, { useState, useEffect } from 'react';
import API from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';

const BrandForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
  });
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchBrand = async () => {
        try {
          const { data } = await API.get(`/brands/${id}`);
          setFormData({
            name: data.name || '',
            description: data.description || '',
            status: data.status || 'Active',
          });
          if (data.logo) {
            setLogoPreview(data.logo);
          }
        } catch (error) {
          console.error('Error fetching brand:', error);
          setError('Failed to load brand data. Please try again.');
        }
      };
      fetchBrand();
    }
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const data = new FormData();
    Object.keys(formData).forEach((key) => data.append(key, formData[key]));
    if (logo) data.append('logo', logo);

    try {
      if (id) {
        await API.put(`/brands/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await API.post('/brands', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      navigate('/dashboard/brands');
    } catch (error) {
      console.error('Error saving brand:', error);
      setError('Failed to save brand. Please try again.');
    }
  };

  return (
    <div style={{ backgroundColor: '#f1f3f6', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ backgroundColor: '#fff', padding: '12px 20px', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
          <button
            onClick={() => navigate('/dashboard/brands')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#878787',
              fontSize: '14px',
              padding: 0,
            }}
          >
            <ArrowLeft size={20} />
            <span>Back to Brands</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ backgroundColor: '#ffebee', padding: '10px', marginBottom: '12px', color: '#c62828', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {/* Form Container */}
        <div style={{ backgroundColor: '#fff', padding: '20px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '20px', color: '#212121' }}>
            {id ? 'Edit Brand' : 'Add New Brand'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Brand Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#878787', marginBottom: '6px' }}>
                  Brand Name <span style={{ color: '#ff6161' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d4d5d9',
                    borderRadius: '2px',
                    outline: 'none',
                    transition: 'border-color .2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2874f0')}
                  onBlur={(e) => (e.target.style.borderColor = '#d4d5d9')}
                />
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: '#878787', marginBottom: '6px' }}>
                  Status <span style={{ color: '#ff6161' }}>*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #d4d5d9',
                    borderRadius: '2px',
                    outline: 'none',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    transition: 'border-color .2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#2874f0')}
                  onBlur={(e) => (e.target.style.borderColor = '#d4d5d9')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#878787', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #d4d5d9',
                  borderRadius: '2px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color .2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#2874f0')}
                onBlur={(e) => (e.target.style.borderColor = '#d4d5d9')}
              />
            </div>

            {/* Logo Upload */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#878787', marginBottom: '6px' }}>
                Brand Logo
              </label>
              {logoPreview ? (
                <div
                  style={{
                    border: '1px solid #d4d5d9',
                    borderRadius: '2px',
                    padding: '12px',
                    display: 'inline-block',
                    position: 'relative',
                  }}
                >
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    style={{
                      maxWidth: '150px',
                      maxHeight: '150px',
                      display: 'block',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: '#fff',
                      border: '1px solid #d4d5d9',
                      borderRadius: '50%',
                      width: '26px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,.1)',
                    }}
                  >
                    <X size={14} color="#878787" />
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="file"
                    id="logoInput"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="logoInput"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 20px',
                      backgroundColor: '#fff',
                      border: '1px solid #2874f0',
                      color: '#2874f0',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all .2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2874f0';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.color = '#2874f0';
                    }}
                  >
                    <Upload size={16} />
                    <span>Upload Logo</span>
                  </label>
                </div>
              )}
              <div style={{ fontSize: '11px', color: '#878787', marginTop: '6px' }}>
                Recommended: 400x400px, PNG or JPG
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', marginTop: '16px', borderTop: '1px solid #f0f0f0' }}>
              <button
                type="submit"
                style={{
                  padding: '10px 28px',
                  backgroundColor: '#fb641b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color .2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#e85c0d')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#fb641b')}
              >
                {id ? 'Update Brand' : 'Add Brand'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/brands')}
                style={{
                  padding: '10px 28px',
                  backgroundColor: '#fff',
                  color: '#212121',
                  border: '1px solid #d4d5d9',
                  borderRadius: '2px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color .2s',
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = '#f7f7f7')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#fff')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BrandForm;