import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, MapPin, Clock, User, Phone, Mail, 
  CreditCard, Calendar, CheckCircle, XCircle, AlertCircle,
  ExternalLink, RefreshCw, ChevronDown, ChevronUp, Copy,
  ShoppingBag, DollarSign, Tag, Home, IndianRupee, X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

const EkartOrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    orderInfo: true,
    customerInfo: true,
    itemsInfo: true,
    trackingInfo: true,
    pricingInfo: true
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/orders/${orderId}`);
      setOrder(data);
      setTrackingInfo(data.trackingInfo);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      alert('Failed to load order details');
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
    } catch (error) {
      console.error('Failed to refresh tracking:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      shipped: 'bg-purple-100 text-purple-800 border-purple-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">Order Not Found</h2>
          <button 
            onClick={() => navigate('/orders')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderId}</h1>
                <button 
                  onClick={() => copyToClipboard(order.orderId)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                  title="Copy Order ID"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchOrderDetails}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-3 mt-4">
            <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getStatusColor(order.orderStatus)}`}>
              Order Status: {order.orderStatus.toUpperCase()}
            </div>
            <div className={`px-4 py-2 rounded-lg border font-semibold text-sm ${getPaymentStatusColor(order.paymentStatus)}`}>
              Payment: {order.paymentStatus.toUpperCase()}
            </div>
            <div className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg border border-gray-300 font-semibold text-sm">
              Method: {order.paymentMethod.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ekart Tracking Section */}
            {order.ekartTrackingId && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection('trackingInfo')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Ekart Shipment Tracking</h2>
                      <p className="text-sm text-gray-500">Live tracking updates</p>
                    </div>
                  </div>
                  {expandedSections.trackingInfo ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>

                {expandedSections.trackingInfo && (
                  <div className="p-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600 mb-1">Tracking ID</p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-semibold text-blue-900">{order.ekartTrackingId}</p>
                          <button 
                            onClick={() => copyToClipboard(order.ekartTrackingId)}
                            className="p-1 hover:bg-blue-100 rounded"
                          >
                            <Copy className="w-4 h-4 text-blue-600" />
                          </button>
                        </div>
                      </div>
                      {order.ekartAWB && (
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-sm text-gray-600 mb-1">AWB Number</p>
                          <div className="flex items-center justify-between">
                            <p className="font-mono font-semibold text-purple-900">{order.ekartAWB}</p>
                            <button 
                              onClick={() => copyToClipboard(order.ekartAWB)}
                              className="p-1 hover:bg-purple-100 rounded"
                            >
                              <Copy className="w-4 h-4 text-purple-600" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tracking Timeline */}
                    {trackingInfo && trackingInfo.scans && trackingInfo.scans.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900">Shipment Journey</h3>
                          <button
                            onClick={refreshTracking}
                            disabled={refreshing}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh Tracking
                          </button>
                        </div>
                        <div className="space-y-4">
                          {trackingInfo.scans.map((scan, index) => (
                            <div key={index} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'} ring-4 ${index === 0 ? 'ring-blue-100' : 'ring-gray-100'}`}></div>
                                {index < trackingInfo.scans.length - 1 && (
                                  <div className="w-0.5 h-full bg-gray-300 my-2"></div>
                                )}
                              </div>
                              <div className="flex-1 pb-6">
                                <div className={`font-semibold ${index === 0 ? 'text-blue-900' : 'text-gray-900'}`}>
                                  {scan.status}
                                </div>
                                {scan.location && scan.location !== 'N/A' && (
                                  <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {scan.location}
                                  </div>
                                )}
                                {scan.remarks && (
                                  <p className="text-sm text-gray-500 mt-1">{scan.remarks}</p>
                                )}
                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                                  <Clock className="w-3 h-3" />
                                  {new Date(scan.timestamp).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600">No tracking updates available yet</p>
                        <p className="text-sm text-gray-500 mt-1">Check back later for updates</p>
                      </div>
                    )}

                    {order.publicTrackingUrl && (
                      <a
                        href={order.publicTrackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                      >
                        Track on Ekart Portal
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('itemsInfo')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <ShoppingBag className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Order Items</h2>
                    <p className="text-sm text-gray-500">{order.items.length} item(s)</p>
                  </div>
                </div>
                {expandedSections.itemsInfo ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>

              {expandedSections.itemsInfo && (
                <div className="p-6 border-t border-gray-200">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Tag className="w-4 h-4" />
                              SKU: {item.productId}
                            </div>
                            <div>Qty: {item.quantity}</div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                              ₹{item.sellingPrice} × {item.quantity}
                            </div>
                            <div className="font-bold text-lg text-gray-900">
                              ₹{item.totalPrice}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Customer & Pricing */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('customerInfo')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
                  </div>
                </div>
                {expandedSections.customerInfo ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>

              {expandedSections.customerInfo && (
                <div className="p-6 border-t border-gray-200 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Name</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{order.shippingAddress.name}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">Mobile</span>
                    </div>
                    <p className="text-gray-900 font-semibold">{order.shippingAddress.mobile}</p>
                  </div>

                  {order.shippingAddress.alternatePhone && (
                    <div>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">Alternate Phone</span>
                      </div>
                      <p className="text-gray-900 font-semibold">{order.shippingAddress.alternatePhone}</p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Home className="w-4 h-4" />
                      <span className="text-sm font-medium">Shipping Address</span>
                    </div>
                    <div className="text-gray-900 space-y-1">
                      <p>{order.shippingAddress.address}</p>
                      <p>{order.shippingAddress.locality}</p>
                      <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                      <p className="font-semibold">PIN: {order.shippingAddress.pincode}</p>
                      {order.shippingAddress.landmark && (
                        <p className="text-sm text-gray-600">Landmark: {order.shippingAddress.landmark}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleSection('pricingInfo')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <IndianRupee className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Pricing Details</h2>
                  </div>
                </div>
                {expandedSections.pricingInfo ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </div>

              {expandedSections.pricingInfo && (
                <div className="p-6 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({order.items.length} items)</span>
                    <span className="font-semibold">₹{order.totalAmount}</span>
                  </div>
                  
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-semibold">-₹{order.discount}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping Charges</span>
                    <span className="font-semibold">₹{order.shippingCharge}</span>
                  </div>
                  
                  <div className="border-t-2 border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total Amount</span>
                      <span className="text-blue-600">₹{order.finalAmount}</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-900">
                      <CreditCard className="w-4 h-4" />
                      <span className="font-semibold text-sm">Payment Method</span>
                    </div>
                    <p className="text-blue-800 font-bold mt-1 uppercase">{order.paymentMethod}</p>
                  </div>

                  {order.expectedDelivery && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-900">
                        <Calendar className="w-4 h-4" />
                        <span className="font-semibold text-sm">Expected Delivery</span>
                      </div>
                      <p className="text-green-800 font-bold mt-1">
                        {new Date(order.expectedDelivery).toLocaleDateString('en-IN', { 
                          dateStyle: 'long' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EkartOrderDetails;