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
              paymentStatus: 'success'
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
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
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
            <div>
              <p className="text-sm text-gray-600 mb-1">Order ID</p>
              <p className="font-semibold text-gray-800">#{orderDetails.orderId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="font-semibold text-gray-800">₹{orderDetails.amount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Mode</p>
              <p className="font-semibold text-gray-800">
                {orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
              </p>
            </div>
          </div>

          {/* Order Tracking Timeline */}
          <div className="mt-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Order Status</h4>
            <div className="relative">
              {/* Order Placed */}
              <div className="flex items-start mb-8">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-grow">
                  <h5 className="font-semibold text-gray-800">Order Placed</h5>
                  <p className="text-sm text-gray-600">Just now</p>
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
              <p className="text-yellow-800">
                <strong>Cash on Delivery:</strong> Please keep ₹{orderDetails.amount} ready for payment at the time of delivery.
              </p>
            </div>
          )}

          {orderDetails.paymentMethod === 'online' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                <strong>Payment Successful!</strong> Your payment of ₹{orderDetails.amount} has been processed successfully.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            to={`/track-order/${orderDetails.orderId}`}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition text-center font-semibold"
          >
            Track Your Order
          </Link>
          <Link
            to="/"
            className="flex-1 bg-white text-blue-600 border-2 border-blue-600 py-3 px-6 rounded-lg hover:bg-blue-50 transition text-center font-semibold"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Help Section */}
        <div className="text-center text-gray-600">
          <p>
            Need help with your order?{' '}
            <Link to="/contact" className="text-blue-600 hover:underline font-semibold">
              Contact Customer Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;