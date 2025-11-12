import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

const Dashboard = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Add Global Styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .menu-link {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .menu-link:hover {
          transform: translateX(4px);
        }

        .menu-link.active {
          transform: translateX(0) !important;
        }

        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-header {
            display: flex !important;
          }
        }

        @media (min-width: 769px) {
          .desktop-sidebar {
            display: block !important;
          }
          .mobile-header {
            display: none !important;
          }
        }
      `}</style>

      <div style={{ 
        display: 'flex', 
        minHeight: '100vh', 
        backgroundColor: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* Desktop Sidebar */}
        <nav className="desktop-sidebar" style={{
          width: '280px',
          backgroundColor: '#ffffff',
          boxShadow: '2px 0 12px rgba(0,0,0,0.08)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderRight: '1px solid #e5e7eb'
        }}>
          <div style={{ padding: '24px' }}>
            {/* Logo Section */}
            <div style={{
              marginBottom: '32px',
              paddingBottom: '20px',
              borderBottom: '2px solid #f3f4f6'
            }}>
              <h5 style={{ 
                margin: 0,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '700',
                fontSize: '24px',
                letterSpacing: '-0.5px'
              }}>
                Admin Panel
              </h5>
              <p style={{
                margin: '6px 0 0 0',
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: '500'
              }}>
                Management Dashboard
              </p>
            </div>

            {/* Navigation Menu */}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                <Link 
                  to="/dashboard/categories" 
                  className={`menu-link ${isActive('/dashboard/categories') ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    color: isActive('/dashboard/categories') ? '#667eea' : '#374151',
                    textDecoration: 'none',
                    backgroundColor: isActive('/dashboard/categories') ? '#f3f4f6' : 'transparent',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: isActive('/dashboard/categories') ? '600' : '500',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/dashboard/categories')) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/dashboard/categories')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {isActive('/dashboard/categories') && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  <span>Categories</span>
                </Link>
              </li>

              <li style={{ marginBottom: '8px' }}>
                <Link 
                  to="/dashboard/brands" 
                  className={`menu-link ${isActive('/dashboard/brands') ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    color: isActive('/dashboard/brands') ? '#667eea' : '#374151',
                    textDecoration: 'none',
                    backgroundColor: isActive('/dashboard/brands') ? '#f3f4f6' : 'transparent',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: isActive('/dashboard/brands') ? '600' : '500',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/dashboard/brands')) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/dashboard/brands')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {isActive('/dashboard/brands') && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                  <span>Brands</span>
                </Link>
              </li>

              <li style={{ marginBottom: '8px' }}>
                <Link 
                  to="/dashboard/products" 
                  className={`menu-link ${isActive('/dashboard/products') ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    color: isActive('/dashboard/products') ? '#667eea' : '#374151',
                    textDecoration: 'none',
                    backgroundColor: isActive('/dashboard/products') ? '#f3f4f6' : 'transparent',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: isActive('/dashboard/products') ? '600' : '500',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/dashboard/products')) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/dashboard/products')) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {isActive('/dashboard/products') && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '0 4px 4px 0'
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                  <span>Products</span>
                </Link>
              </li>
            </ul>
// Add this to the navigation list in Dashboard.js
<li style={{ marginBottom: '8px' }}>
  <Link 
    to="/dashboard/orders" 
    className={`menu-link ${isActive('/dashboard/orders') ? 'active' : ''}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '14px 16px',
      color: isActive('/dashboard/orders') ? '#667eea' : '#374151',
      textDecoration: 'none',
      backgroundColor: isActive('/dashboard/orders') ? '#f3f4f6' : 'transparent',
      borderRadius: '12px',
      fontSize: '15px',
      fontWeight: isActive('/dashboard/orders') ? '600' : '500',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {isActive('/dashboard/orders') && (
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '0 4px 4px 0'
      }} />
    )}
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
    <span>Orders</span>
  </Link>
</li>
            {/* Help Card */}
            <div style={{
              marginTop: '32px',
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)',
              borderRadius: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <p style={{
                margin: '0 0 4px 0',
                fontSize: '13px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Need Help?
              </p>
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                Check our documentation for guides
              </p>
            </div>
          </div>
        </nav>

        {/* Mobile Header */}
        <div className="mobile-header" style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          zIndex: 200,
          padding: '16px 20px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h5 style={{ 
            margin: 0,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: '700',
            fontSize: '20px'
          }}>
            Admin Panel
          </h5>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isMobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <>
            <div 
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 150,
                animation: 'fadeIn 0.3s ease-out'
              }}
            />
            <div style={{
              position: 'fixed',
              top: '72px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#ffffff',
              zIndex: 200,
              overflowY: 'auto',
              animation: 'slideIn 0.3s ease-out',
              padding: '16px'
            }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <Link 
                    to="/dashboard/categories" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      color: isActive('/dashboard/categories') ? '#667eea' : '#374151',
                      textDecoration: 'none',
                      backgroundColor: isActive('/dashboard/categories') ? '#f3f4f6' : 'transparent',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: isActive('/dashboard/categories') ? '600' : '500'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                    <span>Categories</span>
                  </Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link 
                    to="/dashboard/brands" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      color: isActive('/dashboard/brands') ? '#667eea' : '#374151',
                      textDecoration: 'none',
                      backgroundColor: isActive('/dashboard/brands') ? '#f3f4f6' : 'transparent',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: isActive('/dashboard/brands') ? '600' : '500'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                      <line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    <span>Brands</span>
                  </Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link 
                    to="/dashboard/products" 
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      color: isActive('/dashboard/products') ? '#667eea' : '#374151',
                      textDecoration: 'none',
                      backgroundColor: isActive('/dashboard/products') ? '#f3f4f6' : 'transparent',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: isActive('/dashboard/products') ? '600' : '500'
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                    <span>Products</span>
                  </Link>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: '32px',
          overflowY: 'auto',
          maxWidth: '100%'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;