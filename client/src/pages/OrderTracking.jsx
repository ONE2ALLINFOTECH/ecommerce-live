import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/orders/${orderId}`);
      setOrder(data);

      if (data.ekartTrackingId) {
        const trackingResponse = await API.get(`/orders/track/${orderId}`);
        setTrackingInfo(trackingResponse.data.trackingInfo);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'out for delivery': return 'bg-purple-100 text-purple-800';
      case 'in transit': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Order Tracking</h1>
        
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Order ID</h3>
              <p className="text-lg font-semibold text-gray-900">#{order.orderId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Order Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
              <p className="text-lg font-semibold text-gray-900">₹{order.finalAmount}</p>
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        {order.ekartTrackingId ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Shipment Tracking</h2>
              {trackingInfo && (
                <a
                  href={order.publicTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Track on Ekart
                </a>
              )}
            </div>

            {trackingInfo ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Tracking ID</p>
                    <p className="text-sm text-gray-600">{order.ekartTrackingId}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">AWB Number</p>
                    <p className="text-sm text-gray-600">{order.ekartAWB || 'N/A'}</p>
                  </div>
                </div>

                {/* Tracking Timeline */}
                <div className="border-l-2 border-gray-200 ml-4 pl-8 space-y-8">
                  {trackingInfo.scans?.map((scan, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-10 mt-1.5">
                        <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white"></div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium text-gray-900">{scan.status}</p>
                        <p className="text-sm text-gray-600">{scan.location}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(scan.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading tracking information...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tracking Not Available</h3>
            <p className="text-gray-600 mb-4">
              Shipment tracking information will be available once your order is processed and shipped.
            </p>
            <p className="text-sm text-gray-500">
              Current Status: <span className="font-medium">{order.orderStatus}</span>
            </p>
          </div>
        )}

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
          <div className="text-gray-600">
            <p className="font-medium">{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.locality}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            <p className="mt-2">Phone: {order.shippingAddress.mobile}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;