import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Package, Truck, Home } from 'lucide-react';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (!location.state?.orderId) {
      navigate('/');
      return;
    }
    setOrderDetails(location.state);
  }, [location.state, navigate]);

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const isSuccess = orderDetails.paymentMethod === 'cod' || orderDetails.paymentStatus === 'success';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600">Flipkart</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isSuccess ? (
          <div>
            {/* Success Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-4">
                <CheckCircle size={48} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Order Placed Successfully
              </h2>
              <p className="text-gray-600 text-lg">
                Thank you for your order!
              </p>
            </div>

            {/* Order Details Card */}
            <div className="bg-white border border-gray-200 rounded shadow-sm mb-6">
              <div className="bg-blue-50 px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order ID</p>
                    <p className="font-semibold text-gray-900">{orderDetails.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    <p className="font-semibold text-gray-900 text-xl">₹{orderDetails.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                    <p className="font-semibold text-gray-900">
                      {orderDetails.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                    </p>
                  </div>
                </div>

                {/* Delivery Timeline */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Order Tracking</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                        <CheckCircle size={24} className="text-white" />
                      </div>
                      <p className="text-xs font-medium text-gray-900">Order Placed</p>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-300 -mx-2"></div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                        <Package size={24} className="text-gray-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-500">Packed</p>
                      <p className="text-xs text-gray-400">Pending</p>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-300 -mx-2"></div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                        <Truck size={24} className="text-gray-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-500">Shipped</p>
                      <p className="text-xs text-gray-400">Pending</p>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-300 -mx-2"></div>
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                        <Home size={24} className="text-gray-500" />
                      </div>
                      <p className="text-xs font-medium text-gray-500">Delivered</p>
                      <p className="text-xs text-gray-400">Pending</p>
                    </div>
                  </div>
                </div>

                {orderDetails.paymentMethod === 'cod' && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <span className="font-semibold">Note:</span> Please keep ₹{orderDetails.amount} ready for cash payment on delivery.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/orders"
                className="bg-blue-600 text-white px-8 py-3 rounded-sm font-medium hover:bg-blue-700 transition-colors text-center shadow-md"
              >
                Track Order
              </Link>
              <Link
                to="/products"
                className="bg-white border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-sm font-medium hover:bg-blue-50 transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div>
            {/* Failure Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-4">
                <XCircle size={48} className="text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 text-lg">
                Unfortunately, your payment could not be processed.
              </p>
            </div>

            {/* Failure Details Card */}
            <div className="bg-white border border-gray-200 rounded shadow-sm mb-6">
              <div className="bg-red-50 px-6 py-4 border-b border-red-100">
                <h3 className="text-lg font-semibold text-gray-900">Transaction Details</h3>
              </div>
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-red-800">
                    Your payment was unsuccessful. No amount has been deducted from your account.
                  </p>
                </div>
                {orderDetails.orderId && (
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Reference ID:</span> {orderDetails.orderId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/checkout-customer')}
                className="bg-orange-500 text-white px-8 py-3 rounded-sm font-medium hover:bg-orange-600 transition-colors shadow-md"
              >
                Retry Payment
              </button>
              <Link
                to="/products"
                className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-sm font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact our{' '}
            <a href="#" className="text-blue-600 hover:underline font-medium">
              customer support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;