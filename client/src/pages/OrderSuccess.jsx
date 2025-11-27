import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, Truck, Home } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { clearCart } from '../store/cartSlice';
import API from '../services/api';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const orderId = searchParams.get('order_id');

      // Check if coming from COD order
      if (location.state?.orderId && location.state?.paymentMethod === 'cod') {
        setOrderDetails(location.state);
        setLoading(false);
        return;
      }

      // Verify Stripe payment
      if (sessionId && orderId) {
        try {
          const { data } = await API.get(`/orders/verify-payment/${sessionId}?order_id=${orderId}`);
          
          if (data.success) {
            dispatch(clearCart());
            setOrderDetails({
              orderId: data.orderId,
              amount: data.amount,
              paymentMethod: 'online',
              paymentStatus: 'success',
              trackingId: data.trackingId
            });
          } else {
            navigate('/order-failed', {
              state: {
                orderId: data.orderId,
                paymentStatus: 'failed'
              }
            });
          }
        } catch (error) {
          console.error('Payment verification failed:', error);
          navigate('/order-failed');
        } finally {
          setLoading(false);
        }
      } else {
        // No valid data, redirect to home
        navigate('/');
      }
    };

    verifyPayment();
  }, [searchParams, location.state, navigate, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (!orderDetails) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Flipkart Header */}
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Flipkart</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Icon & Message */}
        <div className="text-center mb-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Order Placed Successfully!
          </h2>
          <p className="text-gray-600">Thank you for shopping with us</p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Order Information
          </h3>

          {/* Order Summary Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Order ID</p>
              <p className="font-semibold text-gray-800">#{orderDetails.orderId}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="font-semibold text-gray-800">₹{orderDetails.amount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Payment Mode</p>
              <p className="font-semibold text-gray-800">
                {orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
              </p>
            </div>
          </div>

          {/* Tracking ID if available */}
          {orderDetails.trackingId && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-blue-600 mr-2" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">Shipment Created</p>
                  <p className="text-xs text-blue-600 mt-1">Tracking ID: {orderDetails.trackingId}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Tracking Timeline */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Order Status</h4>
            <div className="relative">
              {/* Order Placed */}
              <div className="flex items-start mb-8">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-grow">
                  <h5 className="font-semibold text-gray-800">Order Placed</h5>
                  <p className="text-sm text-gray-600">Just now</p>
                  <p className="text-xs text-green-600 mt-1">✓ Confirmed</p>
                </div>
              </div>

              {/* Connecting Line */}
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-300" style={{ height: 'calc(100% - 10rem)' }}></div>

              {/* Packed */}
              <div className="flex items-start mb-8">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-grow">
                  <h5 className="font-semibold text-gray-800">Packed</h5>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>

              {/* Shipped */}
              <div className="flex items-start mb-8">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-grow">
                  <h5 className="font-semibold text-gray-800">Shipped</h5>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>

              {/* Delivered */}
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-grow">
                  <h5 className="font-semibold text-gray-800">Delivered</h5>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Messages */}
          {orderDetails.paymentMethod === 'cod' && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-yellow-800">
                  <strong>Cash on Delivery:</strong> Please keep ₹{orderDetails.amount} ready for payment at the time of delivery.
                </p>
              </div>
            </div>
          )}

          {orderDetails.paymentMethod === 'online' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                <p className="text-green-800">
                  <strong>Payment Successful!</strong> Your payment of ₹{orderDetails.amount} has been processed successfully.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            to={`/order-tracking/${orderDetails.orderId}`}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition text-center font-semibold flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 013.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Track Your Order
          </Link>
          <Link
            to="/products"
            className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition text-center font-semibold"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Help Section */}
        <div className="text-center text-gray-600 bg-white rounded-lg shadow-sm p-6">
          <h4 className="font-semibold text-gray-800 mb-2">Need Help?</h4>
          <p className="mb-4">
            Have questions about your order?{' '}
            <Link to="/contact" className="text-blue-600 hover:underline font-semibold">
              Contact Customer Support
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            You can also view your order details anytime in{' '}
            <Link to="/orders" className="text-blue-600 hover:underline">
              My Orders
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;