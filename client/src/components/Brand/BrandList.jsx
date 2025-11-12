import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { Link } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

const BrandList = () => {
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const { data } = await API.get('/brands');
        setBrands(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching brands:', error);
        setError('Failed to load brands. Please try again.');
      }
    };
    fetchBrands();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this brand?')) {
      try {
        await API.delete(`/brands/${id}`);
        setBrands(brands.filter((brand) => brand._id !== id));
        setError(null);
      } catch (error) {
        console.error('Error deleting brand:', error);
        setError('Failed to delete brand. Please try again.');
      }
    }
  };

  const filteredBrands = brands.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ backgroundColor: '#f1f3f6', minHeight: '100vh', padding: '16px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '16px 20px',
            marginBottom: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 500, color: '#212121', margin: 0 }}>
            Brand Management
          </h2>
          <Link
            to="/dashboard/brands/add"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#2874f0',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '2px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'background-color .2s',
              boxShadow: '0 1px 2px rgba(0,0,0,.2)',
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = '#1c5fbf')}
            onMouseLeave={(e) => (e.target.style.backgroundColor = '#2874f0')}
          >
            <Plus size={18} />
            <span>Add Brand</span>
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ backgroundColor: '#ffebee', padding: '10px', marginBottom: '12px', color: '#c62828', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div style={{ backgroundColor: '#fff', padding: '16px 20px', marginBottom: '12px', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={18} color="#878787" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
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
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.1)', overflow: 'hidden' }}>
          {filteredBrands.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#878787', fontSize: '14px' }}>
              {searchTerm ? 'No brands found matching your search.' : 'No brands available. Add your first brand!'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f8f8', borderBottom: '1px solid #e0e0e0' }}>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#878787',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '100px',
                    }}
                  >
                    Image
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#878787',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Brand Name
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#878787',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Description
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#878787',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '120px',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#878787',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      width: '150px',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBrands.map((brand, index) => (
                  <tr
                    key={brand._id}
                    style={{
                      borderBottom: index !== filteredBrands.length - 1 ? '1px solid #f0f0f0' : 'none',
                      transition: 'background-color .2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: '#212121' }}>
                      {brand.logo ? (
                        <img
                          src={`${brand.logo}?w=80&h=80&f=webp&q=80`} // Use 'logo' instead of 'image'
                          alt={brand.name}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0',
                          }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80';
                          }}
                        />
                      ) : (
                        <img
                          src="https://via.placeholder.com/80"
                          alt="No image"
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'contain',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0',
                          }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '14px', color: '#212121', fontWeight: 500 }}>
                      {brand.name}
                    </td>
                    <td
                      style={{
                        padding: '16px 20px',
                        fontSize: '13px',
                        color: '#878787',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {brand.description || '-'}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          borderRadius: '2px',
                          backgroundColor: brand.status === 'Active' ? '#e8f5e9' : '#ffebee',
                          color: brand.status === 'Active' ? '#2e7d32' : '#c62828',
                        }}
                      >
                        {brand.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <Link
                          to={`/dashboard/brands/edit/${brand._id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#fff',
                            border: '1px solid #2874f0',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all .2s',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2874f0';
                            e.currentTarget.querySelector('svg').style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff';
                            e.currentTarget.querySelector('svg').style.color = '#2874f0';
                          }}
                        >
                          <Edit2 size={16} color="#2874f0" />
                        </Link>
                        <button
                          onClick={() => handleDelete(brand._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#fff',
                            border: '1px solid #ff6161',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            transition: 'all .2s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#ff6161';
                            e.target.querySelector('svg').style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#fff';
                            e.target.querySelector('svg').style.color = '#ff6161';
                          }}
                        >
                          <Trash2 size={16} color="#ff6161" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Info */}
        {filteredBrands.length > 0 && (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '12px 20px',
              marginTop: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,.1)',
              fontSize: '13px',
              color: '#878787',
              textAlign: 'center',
            }}
          >
            Showing {filteredBrands.length} of {brands.length} brand{brands.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandList;