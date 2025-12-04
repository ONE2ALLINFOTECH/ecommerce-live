import React, { useState } from 'react';
import { Search, ShoppingCart, User, ChevronDown, Menu, X, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logoutCustomer } from '../../store/userCustomerSlice';

export default function NavbarCustomer() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalQuantity } = useSelector(state => state.cart);
  const { userInfo } = useSelector(state => state.userCustomer);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logoutCustomer());
    setIsLoginOpen(false);
    navigate('/home');
  };

  const categories = [
    // Your categories here
  ];

  return (
    <div className="w-full">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <button
                className="md:hidden mr-3 p-2"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <Link to="/" className="flex flex-col">
                <span className="text-2xl font-bold italic text-blue-600">Shopymall</span>
                <span className="text-xs text-gray-600 flex items-center">
                  Explore <span className="text-yellow-500 ml-1">Plus</span>
                </span>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search for Products, Brands and More"
                  className="w-full px-6 py-2 pl-10 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute left-3 top-2.5 text-blue-600" size={20} />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-6">
              {/* User Dropdown */}
              <div className="relative hidden md:block">
                {userInfo ? (
                  <button
                    onClick={() => setIsLoginOpen(!isLoginOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
                  >
                    <User size={20} />
                    <span className="font-medium">Hi, {userInfo.name.split(' ')[0]}</span>
                    <ChevronDown size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsLoginOpen(!isLoginOpen)}
                    className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
                  >
                    <User size={20} />
                    <span className="font-medium">Login</span>
                    <ChevronDown size={16} />
                  </button>
                )}

                {isLoginOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    <div className="p-6">
                      {userInfo ? (
                        <div className="text-center">
                          <p className="font-medium">Welcome, {userInfo.name}</p>
                          <p className="text-sm text-gray-600">{userInfo.email}</p>
                          <button
                            onClick={handleLogout}
                            className="w-full mt-3 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </div>
                      ) : (
                        <>
                          <Link 
                            to="/login-customer" 
                            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition block text-center"
                            onClick={() => setIsLoginOpen(false)}
                          >
                            Login
                          </Link>
                          <p className="text-sm text-gray-600 mt-3 text-center">
                            New customer?{' '}
                            <Link 
                              to="/register-customer" 
                              className="text-blue-600 cursor-pointer"
                              onClick={() => setIsLoginOpen(false)}
                            >
                              Sign Up
                            </Link>
                          </p>
                        </>
                      )}
                    </div>
                    {userInfo && (
                      <div className="border-t border-gray-200 py-2">
                        <Link 
                          to="/profile-customer" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsLoginOpen(false)}
                        >
                          My Profile
                        </Link>
                        <Link 
                          to="/user-orders" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsLoginOpen(false)}
                        >
                          Orders
                        </Link>
                        <Link 
                          to="/wishlist-customer" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsLoginOpen(false)}
                        >
                          Wishlist
                        </Link>
                        <Link 
                          to="/rewards-customer" 
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsLoginOpen(false)}
                        >
                          Rewards
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart */}
              <Link to="/cart" className="relative flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <ShoppingCart size={20} />
                <span className="font-medium hidden md:inline">Cart</span>
                {totalQuantity > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalQuantity}
                  </span>
                )}
              </Link>

              {/* Become a Seller */}
              <button className="hidden lg:flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <span className="font-medium">Become a Seller</span>
              </button>

              <button className="hidden md:block">
                <svg width="16" height="4" viewBox="0 0 16 4" fill="currentColor">
                  <circle cx="2" cy="2" r="2" />
                  <circle cx="8" cy="2" r="2" />
                  <circle cx="14" cy="2" r="2" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for Products, Brands and More"
                className="w-full px-4 py-2 pl-10 bg-blue-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 text-blue-600" size={20} />
            </div>
          </div>
        </div>
      </nav>

      {/* Categories Bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="hidden md:flex items-center justify-between py-2 overflow-x-auto">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="flex flex-col items-center min-w-max px-2 py-2 hover:text-blue-600 transition group"
              >
                <div className={`${cat.color} rounded-lg p-3 mb-1 group-hover:scale-110 transition`}>
                  <span className="text-2xl">{cat.icon}</span>
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>

          <div className="md:hidden flex items-center overflow-x-auto py-2 space-x-4 scrollbar-hide">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                className="flex flex-col items-center min-w-max"
              >
                <div className={`${cat.color} rounded-lg p-2 mb-1`}>
                  <span className="text-xl">{cat.icon}</span>
                </div>
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="bg-white w-64 h-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User size={24} className="text-gray-700" />
                  {userInfo ? (
                    <span className="font-medium">Hi, {userInfo.name.split(' ')[0]}</span>
                  ) : (
                    <span className="font-medium">Login</span>
                  )}
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-4">
              {userInfo ? (
                <>
                  <Link to="/profile-customer" className="block py-3 text-gray-700 hover:text-blue-600">My Profile</Link>
                  <Link to="/orders-customer" className="block py-3 text-gray-700 hover:text-blue-600">Orders</Link>
                  <Link to="/wishlist-customer" className="block py-3 text-gray-700 hover:text-blue-600">Wishlist</Link>
                  <Link to="/rewards-customer" className="block py-3 text-gray-700 hover:text-blue-600">Rewards</Link>
                  <button onClick={handleLogout} className="block py-3 text-red-600 hover:text-red-700 w-full text-left">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login-customer" className="block py-3 text-gray-700 hover:text-blue-600">Login</Link>
                  <Link to="/register-customer" className="block py-3 text-gray-700 hover:text-blue-600">Register</Link>
                </>
              )}
              <button className="block py-3 text-gray-700 hover:text-blue-600">Become a Seller</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}