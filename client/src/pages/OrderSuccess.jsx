import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { orderId, amount, paymentMethod, paymentIntentId } = location.state || {};

  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-4">We couldn't find your order details.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
        <p className="text-gray-600 mb-4">Thank you for your purchase.</p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-medium">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-medium">₹{amount}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium">{paymentMethod === 'online' ? 'Online Payment' : 'Cash on Delivery'}</span>
            </div>
            {paymentIntentId && (
              <div className="flex justify-between">
                <span>Payment ID:</span>
                <span className="font-medium text-xs">{paymentIntentId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => navigate('/my-orders')}
            className="w-full bg-blue-600 text-white py-3 rounded font-medium hover:bg-blue-700 transition-colors"
          >
            View My Orders
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded font-medium hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;