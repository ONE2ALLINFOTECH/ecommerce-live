import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCart } from '../store/cartSlice';
import API from '../services/api';

const OrderStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState(null);

  useEffect(() => {
    const checkOrderStatus = async () => {
      try {
        const orderId = searchParams.get('order_id');
        
        if (!orderId) {
          navigate('/');
          return;
        }

        // Wait a moment for webhook to process
        setTimeout(async () => {
          const { data } = await API.get(`/orders/status/${orderId}`);
          setOrderStatus(data);
          setLoading(false);

          // Clear cart if payment successful
          if (data.paymentStatus === 'success') {
            dispatch(clearCart());
          }
        }, 2000);

      } catch (error) {
        console.error('Error checking order status:', error);
        setLoading(false);
      }
    };

    checkOrderStatus();
  }, [searchParams, navigate, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {orderStatus && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              orderStatus.paymentStatus === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {orderStatus.paymentStatus === 'success' ? (
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {orderStatus.paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {orderStatus.paymentStatus === 'success' 
                ? `Your order #${orderStatus.orderId} has been confirmed.`
                : 'Your payment could not be processed. Please try again.'
              }
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Order ID:</span>
                  <p className="font-semibold">{orderStatus.orderId}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <p className="font-semibold">₹{orderStatus.finalAmount}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-semibold capitalize">{orderStatus.orderStatus}</p>
                </div>
                <div>
                  <span className="text-gray-600">Payment:</span>
                  <p className="font-semibold capitalize">{orderStatus.paymentStatus}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/orders')}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                View Order Details
              </button>
              
              <button
                onClick={() => navigate('/products')}
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatus;