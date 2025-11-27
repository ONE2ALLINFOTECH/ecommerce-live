import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';

const OrderTracking = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/orders/${orderId}`);
      setOrder(data);
      setTrackingInfo(data.trackingInfo);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const refreshTracking = async () => {
    if (!order?.ekartTrackingId) return;
    
    try {
      setRefreshing(true);
      const { data } = await API.get(`/orders/track/${orderId}`);
      setTrackingInfo(data.trackingInfo);
      setError(null);
    } catch (err) {
      console.error('Failed to refresh tracking:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('delivered')) return 'bg-green-100 text-green-800 border-green-200';
    if (statusLower.includes('out for delivery')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (statusLower.includes('shipped') || statusLower.includes('transit')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (statusLower.includes('picked')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium mb-2">Unable to Load Order</p>
            <p className="text-sm">{error}</p>
            <Link to="/orders" className="mt-4 inline-block text-blue-600 hover:underline">
              Go to My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Order Tracking</h1>
          <Link 
            to="/orders" 
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
        </div>
        
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Order ID</h3>
              <p className="text-lg font-semibold text-gray-900">#{order.orderId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Order Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h3>
              <p className="text-lg font-semibold text-gray-900">₹{order.finalAmount}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h3>
              <p className="text-sm text-gray-900 capitalize">{order.paymentMethod}</p>
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        {order.ekartTrackingId ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Shipment Tracking
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={refreshTracking}
                  disabled={refreshing}
                  className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                {trackingInfo && order.publicTrackingUrl && (
                  <a 
                    href={order.publicTrackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Track on Ekart
                  </a>
                )}
              </div>
            </div>

            {/* Tracking Details */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1">Tracking ID</p>
                  <p className="text-sm text-gray-900 font-mono">{order.ekartTrackingId}</p>
                </div>
                {order.ekartAWB && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">AWB Number</p>
                    <p className="text-sm text-gray-900 font-mono">{order.ekartAWB}</p>
                  </div>
                )}
                {trackingInfo?.current_status && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Current Status</p>
                    <p className="text-sm text-gray-900 font-semibold">{trackingInfo.current_status}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tracking Timeline */}
            {trackingInfo && trackingInfo.scans && trackingInfo.scans.length > 0 ? (
              <div className="relative">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracking History</h3>
                <div className="space-y-6">
                  {trackingInfo.scans.map((scan, index) => (
                    <div key={index} className="relative pl-8 pb-6 last:pb-0">
                      {/* Timeline Line */}
                      {index < trackingInfo.scans.length - 1 && (
                        <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-gray-300"></div>
                      )}
                      
                      {/* Timeline Dot */}
                      <div className={`absolute left-0 top-1 w-5 h-5 rounded-full border-4 border-white ${
                        index === 0 ? 'bg-blue-600' : 'bg-gray-400'
                      }`}></div>
                      
                      {/* Scan Details */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{scan.status}</p>
                            {scan.location && scan.location !== 'N/A' && (
                              <p className="text-sm text-gray-600 flex items-center mb-1">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {scan.location}
                              </p>
                            )}
                            {scan.remarks && (
                              <p className="text-xs text-gray-500 mt-1">{scan.remarks}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs text-gray-500">{formatDate(scan.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-600 font-medium mb-2">No tracking updates yet</p>
                <p className="text-sm text-gray-500">Tracking information will appear here once your shipment is picked up</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Preparing for Shipment</h3>
            <p className="text-gray-600 mb-4">
              Your order is being processed. Tracking information will be available once your order is shipped.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Current Status: <span className="font-semibold ml-1 capitalize">{order.orderStatus}</span>
            </div>
          </div>
        )}

        {/* Shipping Address */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Delivery Address
          </h3>
          <div className="text-gray-700 space-y-1">
            <p className="font-semibold text-gray-900">{order.shippingAddress.name}</p>
            <p>{order.shippingAddress.address}</p>
            <p>{order.shippingAddress.locality}</p>
            <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
            {order.shippingAddress.landmark && (
              <p className="text-sm text-gray-500">Landmark: {order.shippingAddress.landmark}</p>
            )}
            <p className="pt-2 flex items-center text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {order.shippingAddress.mobile}
            </p>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center space-x-4 pb-4 border-b last:border-b-0">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-20 h-20 object-cover rounded border"
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Quantity: {item.quantity} × ₹{item.sellingPrice}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{item.totalPrice}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Order Total */}
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">₹{order.totalAmount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="text-green-600">-₹{order.discount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping:</span>
              <span className="text-gray-900">₹{order.shippingCharge}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t">
              <span className="text-gray-900">Total:</span>
              <span className="text-gray-900">₹{order.finalAmount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;