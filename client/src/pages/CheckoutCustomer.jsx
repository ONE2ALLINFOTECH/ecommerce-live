import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearCart } from '../store/cartSlice';
import API from '../services/api';

const CheckoutCustomer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, totalAmount, totalQuantity } = useSelector(state => state.cart);
  const { userInfo } = useSelector(state => state.userCustomer);

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [address, setAddress] = useState({
    name: userInfo?.username || '',
    mobile: '',
    pincode: '',
    locality: '',
    address: '',
    city: '',
    state: '',
    landmark: '',
    alternatePhone: ''
  });

  const discount = Math.round(totalAmount * 0.3);
  const shippingCharge = 29;
  const finalAmount = totalAmount - discount + shippingCharge;

  const getAvailablePaymentMethods = () => {
    if (!items || items.length === 0) {
      return { online: false, cod: false };
    }

    const allProductsAllowOnline = items.every(item => 
      item.productId?.enableOnlinePayment !== false
    );
    
    const allProductsAllowCOD = items.every(item => 
      item.productId?.enableCashOnDelivery !== false
    );

    return {
      online: allProductsAllowOnline,
      cod: allProductsAllowCOD
    };
  };

  const availablePaymentMethods = getAvailablePaymentMethods();

  React.useEffect(() => {
    if (!paymentMethod) {
      if (availablePaymentMethods.online) {
        setPaymentMethod('online');
      } else if (availablePaymentMethods.cod) {
        setPaymentMethod('cod');
      }
    }
  }, [availablePaymentMethods, paymentMethod]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (!address.name || !address.mobile || !address.pincode || !address.locality || !address.address || !address.city || !address.state) {
      alert('Please fill all required address fields including locality');
      return;
    }

    if (!/^\d{10}$/.test(address.mobile)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!paymentMethod) {
      alert('Please select a payment method');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        shippingAddress: address,
        paymentMethod
      };

      console.log('📦 Creating order with data:', orderData);

      const { data } = await API.post('/orders/create', orderData);

      console.log('✅ Order response:', data);

      if (paymentMethod === 'online') {
        // Online payment - load Cashfree SDK
        await loadCashfreeSDK();
        
        if (!data.paymentSessionId) {
          throw new Error('Payment session ID not received');
        }

        console.log('🔄 Initializing payment with session:', data.paymentSessionId);
        
        const cashfree = new window.Cashfree(data.paymentSessionId);
        
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self"
        }).then(() => {
          console.log('Payment redirect initiated');
        }).catch((error) => {
          console.error('Cashfree checkout error:', error);
          alert('Payment initialization failed. Please try again.');
          setLoading(false);
        });
      } else {
        // COD payment - clear cart and redirect
        console.log('✅ COD order placed, redirecting to success page');
        
        dispatch(clearCart());
        
        navigate('/order-success', { 
          state: { 
            orderId: data.orderId,
            amount: data.orderAmount,
            paymentMethod: 'cod'
          }
        });
      }
    } catch (error) {
      console.error('❌ Order creation failed:', error);
      
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Failed to create order. Please try again.';
      
      alert(errorMessage);
      setLoading(false);
    }
  };

  const loadCashfreeSDK = () => {
    return new Promise((resolve, reject) => {
      if (window.Cashfree) {
        console.log('✅ Cashfree SDK already loaded');
        resolve();
        return;
      }

      console.log('📥 Loading Cashfree SDK...');
      const script = document.createElement('script');
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => {
        console.log('✅ Cashfree SDK loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load Cashfree SDK');
        reject(new Error('Failed to load Cashfree SDK'));
      };
      document.head.appendChild(script);
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-600">Flipkart</h1>
              <div className="flex items-center space-x-8 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">✓</div>
                  <span className="text-gray-600 font-medium">LOGIN</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">2</div>
                  <span className="font-medium text-gray-900">DELIVERY ADDRESS</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">3</div>
                  <span className="text-gray-400">ORDER SUMMARY</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs font-semibold">4</div>
                  <span className="text-gray-400">PAYMENT OPTIONS</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs text-gray-600 font-medium">100% SECURE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4">
          {/* Left Section */}
          <div className="flex-1 space-y-4">
            {/* Login Info Box */}
            <div className="bg-white shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500">1</span>
                  <span className="text-sm font-medium text-gray-500 uppercase">Login</span>
                </div>
                <button className="text-sm text-blue-600 font-medium">CHANGE</button>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{userInfo?.username}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600">{userInfo?.email}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white shadow-sm">
              <div className="flex items-center space-x-3 px-6 py-4 border-b bg-blue-50">
                <span className="text-blue-600 font-bold">2</span>
                <span className="text-sm font-medium text-gray-900 uppercase">Delivery Address</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={address.name}
                      onChange={handleInputChange}
                      placeholder="Name *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="mobile"
                      value={address.mobile}
                      onChange={handleInputChange}
                      placeholder="10-digit mobile number *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="pincode"
                      value={address.pincode}
                      onChange={handleInputChange}
                      placeholder="Pincode *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="locality"
                      value={address.locality}
                      onChange={handleInputChange}
                      placeholder="Locality *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <textarea
                      name="address"
                      value={address.address}
                      onChange={handleInputChange}
                      placeholder="Address (Area and Street) *"
                      rows="2"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={address.city}
                      onChange={handleInputChange}
                      placeholder="City/District/Town *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="state"
                      value={address.state}
                      onChange={handleInputChange}
                      placeholder="State *"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="landmark"
                      value={address.landmark}
                      onChange={handleInputChange}
                      placeholder="Landmark (Optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={address.alternatePhone}
                      onChange={handleInputChange}
                      placeholder="Alternate Phone (Optional)"
                      className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-white shadow-sm">
              <div className="flex items-center space-x-3 px-6 py-4 border-b">
                <span className="text-gray-500">3</span>
                <span className="text-sm font-medium text-gray-500 uppercase">Payment Options</span>
              </div>
              <div className="p-6 space-y-4">
                {/* Online Payment Option */}
                <label className={`flex items-start space-x-3 cursor-pointer group ${
                  !availablePaymentMethods.online ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={!availablePaymentMethods.online}
                    className="w-4 h-4 mt-1 text-blue-600 focus:ring-0 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center">
                      UPI / Credit / Debit Card / Net Banking
                      {!availablePaymentMethods.online && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Not Available</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Pay securely with multiple payment options
                      {!availablePaymentMethods.online && (
                        <div className="text-red-600 text-xs mt-1">
                          Some products in your cart don't support online payment
                        </div>
                      )}
                    </div>
                  </div>
                </label>
                
                {/* Cash on Delivery Option */}
                <label className={`flex items-start space-x-3 cursor-pointer group ${
                  !availablePaymentMethods.cod ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={!availablePaymentMethods.cod}
                    className="w-4 h-4 mt-1 text-blue-600 focus:ring-0 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 flex items-center">
                      Cash on Delivery
                      {!availablePaymentMethods.cod && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Not Available</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Pay when you receive your order
                      {!availablePaymentMethods.cod && (
                        <div className="text-red-600 text-xs mt-1">
                          Some products in your cart don't support cash on delivery
                        </div>
                      )}
                    </div>
                  </div>
                </label>

                {/* Warning if no payment methods available */}
                {!availablePaymentMethods.online && !availablePaymentMethods.cod && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-800 font-medium">No Payment Methods Available</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      The products in your cart don't support any available payment methods. 
                      Please contact customer support or remove these items from your cart.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Price Details */}
          <div className="w-96">
            <div className="bg-white shadow-sm sticky top-4">
              <div className="px-6 py-4 border-b">
                <h3 className="text-gray-500 uppercase text-sm font-medium">Price Details</h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Price ({totalQuantity} items)</span>
                  <span className="text-gray-900">₹{totalAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Discount</span>
                  <span className="text-green-600">− ₹{discount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Delivery Charges</span>
                  <span className="text-green-600">₹{shippingCharge}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between font-semibold text-base">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-gray-900">₹{finalAmount.toFixed(0)}</span>
                </div>
                <div className="text-green-600 font-medium text-sm pt-2">
                  You will save ₹{discount.toFixed(0)} on this order
                </div>
              </div>
              <div className="px-6 pb-6">
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading || (!availablePaymentMethods.online && !availablePaymentMethods.cod)}
                  className={`w-full py-3 rounded font-semibold text-sm transition-colors shadow-md ${
                    loading || (!availablePaymentMethods.online && !availablePaymentMethods.cod)
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {loading ? 'PROCESSING...' : 'PLACE ORDER'}
                </button>
                
                {(!availablePaymentMethods.online && !availablePaymentMethods.cod) && (
                  <p className="text-red-600 text-xs mt-2 text-center">
                    No payment methods available for items in cart
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCustomer;