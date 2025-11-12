import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import BannerSlider from './BannerSlider';
import Navbar from '../UserHome/Navbar';
import Footer from '../UserHome/footer';
const UserHome = () => {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const sliderRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data } = await API.get('/categories');
      // Filter top-level categories (parentCategory null)
      const topCategories = data.filter(cat => !cat.parentCategory);
      setCategories(topCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const scroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 400;
      if (direction === 'left') {
        sliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f1f3f6', minHeight: '100vh' }}>
      {/* Header */}
      <Navbar />
      <BannerSlider />

      {/* Top Categories Section with Slider */}
      <div style={{ marginBottom: '40px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '500', color: '#212121', marginBottom: '16px' }}>
          Top Categories
        </h2>
        {loadingCategories ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #2874f0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Left Arrow */}
            {categories.length > 4 && (
              <button
                onClick={() => scroll('left')}
                style={{
                  position: 'absolute',
                  left: '-15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#212121',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2874f0';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#212121';
                }}
              >
                ‹
              </button>
            )}

            {/* Slider Container */}
            <div
              ref={sliderRef}
              style={{
                display: 'flex',
                gap: '20px',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                padding: '10px 0'
              }}
              className="category-slider"
            >
              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/category/${cat.slug}`}
                  style={{ textDecoration: 'none', flexShrink: 0 }}
                >
                  <div style={{
                    backgroundColor: '#fff',
                    border: '1px solid #f0f0f0',
                    padding: '16px',
                    borderRadius: '4px',
                    textAlign: 'center',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    width: '200px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.15)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  >
                    <img
                      src={cat.image || 'https://via.placeholder.com/200'}
                      alt={cat.name}
                      style={{ width: '100%', height: '200px', objectFit: 'contain', marginBottom: '12px' }}
                    />
                    <h3 style={{ fontSize: '16px', color: '#212121', margin: 0 }}>
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              ))}
              {categories.length === 0 && <p>No categories available.</p>}
            </div>

            {/* Right Arrow */}
            {categories.length > 4 && (
              <button
                onClick={() => scroll('right')}
                style={{
                  position: 'absolute',
                  right: '-15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  boxShadow: '0 2px 8px rgba(0,0,0,.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#212121',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2874f0';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#fff';
                  e.currentTarget.style.color = '#212121';
                }}
              >
                ›
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .category-slider::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Footer />
    </div>
  );
};

export default UserHome;