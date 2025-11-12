import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  removeFromCartAPI, 
  updateCartItemAPI, 
  clearCartAPI, 
  fetchCart,
  updateItemQuantity,
  removeItemFromCart,
  addItemToCart,
  clearError
} from '../store/cartSlice';
import { Trash2, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const CartCustomer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalAmount, totalQuantity, loading, error } = useSelector(state => state.cart);
  const { userInfo } = useSelector(state => state.userCustomer);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(fetchCart());
    } else {
      const localCart = JSON.parse(localStorage.getItem('localCart') || '{"items":[],"totalQuantity":0,"totalAmount":0}');
      if (localCart.items.length > 0) {
        localCart.items.forEach(item => {
          dispatch(addItemToCart(item));
        });
      }
    }
  }, [dispatch]);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingItem(productId);
    
    try {
      dispatch(updateItemQuantity({ productId, quantity: newQuantity }));
      
      const token = localStorage.getItem('token');
      if (token) {
        await dispatch(updateCartItemAPI({ productId, quantity: newQuantity })).unwrap();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      dispatch(fetchCart());
    } finally {
      setUpdatingItem(null);
    }
  };

  const openRemoveModal = (productId) => {
    setItemToRemove(productId);
    setShowRemoveModal(true);
  };

  const closeRemoveModal = () => {
    setShowRemoveModal(false);
    setItemToRemove(null);
  };

  const confirmRemove = async () => {
    if (!itemToRemove) return;
    
    try {
      dispatch(removeItemFromCart(itemToRemove));
      
      const token = localStorage.getItem('token');
      if (token) {
        await dispatch(removeFromCartAPI(itemToRemove)).unwrap();
      }
      closeRemoveModal();
    } catch (error) {
      console.error('Failed to remove item:', error);
      dispatch(fetchCart());
      closeRemoveModal();
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) return;
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await dispatch(clearCartAPI()).unwrap();
      } else {
        dispatch(clearCart());
        localStorage.setItem('localCart', JSON.stringify({ items: [], totalQuantity: 0, totalAmount: 0 }));
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  };

  const handleCheckout = () => {
    if (!userInfo) {
      navigate('/login-customer', { state: { from: '/cart' } });
      return;
    }
    navigate('/checkout-customer');
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cart...</p>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-20">
            <ShoppingCart size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to your cart to get started</p>
            <Link 
              to="/products"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded font-semibold hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-7xl mx-auto px-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
            <button 
              onClick={() => dispatch(clearError())}
              className="float-right font-bold"
            >
              ×
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Side - Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {/* Delivery Address Card */}
            <div className="bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Deliver to:</h3>
                    <p className="text-base font-semibold text-gray-900">New Delhi - 110043</p>
                  </div>
                  <button className="text-blue-600 text-sm font-semibold hover:underline">
                    Change
                  </button>
                </div>
              </div>
            </div>

            {/* Cart Items Card */}
            <div className="bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">
                  Flipkart ({totalQuantity})
                </h2>
              </div>

              {items.map(item => (
                <div key={item.productId} className="border-b border-gray-200 last:border-b-0">
                  <div className="px-6 py-6">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-28 h-28 object-contain" 
                        />
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 mb-1">{item.name}</h3>
                        <p className="text-xs text-gray-500 mb-3">
                          {item.description || 'Seller: Verified Seller'}
                        </p>
                        
                        {/* Price */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-lg font-semibold text-gray-900">₹{item.sellingPrice}</span>
                          <span className="text-sm text-gray-400 line-through">₹{Math.round(item.sellingPrice * 1.3)}</span>
                          <span className="text-sm font-medium text-green-600">
                            {Math.round(((item.sellingPrice * 1.3 - item.sellingPrice) / (item.sellingPrice * 1.3)) * 100)}% Off
                          </span>
                        </div>

                        {/* Delivery Info */}
                        <p className="text-xs text-gray-600 mb-4">
                          Delivery by Sun Nov {new Date().getDate() + 3}
                        </p>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-6">
                          {/* Quantity Selector */}
                          <div className="flex items-center">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                              disabled={updatingItem === item.productId || item.quantity <= 1}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus size={14} />
                            </button>
                            
                            <span className="mx-4 w-8 text-center font-medium text-gray-900">
                              {updatingItem === item.productId ? (
                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
                              ) : (
                                item.quantity
                              )}
                            </span>
                            
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                              disabled={updatingItem === item.productId}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          {/* Save & Remove Buttons */}
                          <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
                            SAVE FOR LATER
                          </button>
                          <button
                            onClick={() => openRemoveModal(item.productId)}
                            disabled={updatingItem === item.productId}
                            className="text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            REMOVE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Place Order Button (Mobile) */}
              <div className="px-6 py-4 border-t border-gray-200 lg:hidden">
                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded font-semibold text-base hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  PLACE ORDER
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Side - Price Details */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm sticky top-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-500 uppercase">Price Details</h2>
              </div>
              
              <div className="px-6 py-4 space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Price ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})</span>
                  <span className="text-gray-900">₹{totalAmount.toFixed(0)}</span>
                </div>
                
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Discount</span>
                  <span className="text-green-600">− ₹{Math.round(totalAmount * 0.3)}</span>
                </div>
                
                <div className="flex justify-between text-base">
                  <span className="text-gray-700">Protect Promise Fee</span>
                  <span className="text-gray-900">₹29</span>
                </div>
                
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total Amount</span>
                    <span className="text-gray-900">₹{(totalAmount * 0.7 + 29).toFixed(0)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-semibold text-green-600">
                    You will save ₹{Math.round(totalAmount * 0.3)} on this order
                  </p>
                </div>
              </div>

              {/* Place Order Button (Desktop) */}
              <div className="hidden lg:block px-6 py-4 border-t border-gray-200">
                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-3 rounded font-semibold text-base hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  PLACE ORDER
                </button>
              </div>

              {/* Safe Payment Info */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Safe and Secure Payments. Easy returns. 100% Authentic products.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Item Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Remove Item</h3>
                <button
                  onClick={closeRemoveModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove this item from your cart?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={closeRemoveModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemove}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartCustomer;