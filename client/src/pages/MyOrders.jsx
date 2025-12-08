import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, X, Eye, ExternalLink, RefreshCw } from 'lucide-react';
import API from '../services/api';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(false);
  const [cancellationError, setCancellationError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/orders/my-orders');
      
      // Handle both array and object response
      const ordersArray = Array.isArray(data) ? data : data.orders || [];
      setOrders(ordersArray);
      setCancellationError(null);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      alert('Failed to load orders: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?\n\nThis will also cancel the Ekart shipment if exists.')) return;

    setCancellingOrder(orderId);
    setCancellationError(null);
    
    try {
      const { data } = await API.put(`/orders/cancel/${orderId}`);
      
      let message = data.message || 'Order cancelled successfully!';
      
      if (data.ekartCancelled) {
        message += '\n✅ Ekart shipment cancelled successfully.';
      } else if (data.ekartCancelError) {
        message += `\n⚠️ Ekart cancellation: ${data.ekartCancelError}`;
      }
      
      alert(message);
      fetchOrders();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to cancel order';
      const ekartError = error.response?.data?.ekartCancelError;
      
      if (ekartError) {
        setCancellationError({
          orderId,
          message: `Ekart cancellation failed: ${ekartError}`,
          trackingId: error.response?.data?.trackingId
        });
        
        alert(`Order cancellation failed: ${errorMessage}\n\nPlease contact admin for manual cancellation on Ekart.`);
      } else {
        alert(errorMessage);
      }
    } finally {
      setCancellingOrder(null);
    }
  };

  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setViewingDetails(true);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setViewingDetails(false);
    setCancellationError(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCancelOrder = (order) => {
    return !['shipped', 'delivered', 'cancelled'].includes(order.orderStatus);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        {/* Cancellation Error Banner */}
        {cancellationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Order Cancellation Failed</h3>
                <p className="text-red-600 text-sm">{cancellationError.message}</p>
                <p className="text-red-600 text-sm mt-1">Please contact customer support for assistance.</p>
              </div>
            </div>
          </div>
        )}
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">Start shopping to see your orders here</p>
            <Link
              to="/products"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">Order #{order.orderId}</h3>
                      <p className="text-sm text-gray-500">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <div className="flex gap-3 mt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                          Payment: {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0 text-right">
                      <p className="text-2xl font-bold text-gray-900">₹{order.finalAmount}</p>
                      <p className="text-sm text-gray-500 capitalize">{order.paymentMethod}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {order.items.map(item => (
                    <div key={item._id} className="flex items-center space-x-4 mb-4 last:mb-0">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.sellingPrice}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">₹{item.totalPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking Info */}
                {order.ekartTrackingId && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Shipment Tracking Available</p>
                        <p className="text-xs text-blue-600 font-mono">{order.ekartTrackingId}</p>
                      </div>
                      <a
                        href={`https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Track
                      </a>
                    </div>
                  </div>
                )}
                
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => viewOrderDetails(order)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      {canCancelOrder(order) && (
                        <button
                          onClick={() => cancelOrder(order.orderId)}
                          disabled={cancellingOrder === order.orderId}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          {cancellingOrder === order.orderId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Cancel Order
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {viewingDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Order #{selectedOrder.orderId}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Status */}
              <div>
                <h3 className="font-semibold mb-2">Order Status</h3>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedOrder.orderStatus)}`}>
                    {selectedOrder.orderStatus}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>
                    Payment: {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h3 className="font-semibold mb-2">Delivery Address</h3>
                <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedOrder.shippingAddress.name}</p>
                  <p>{selectedOrder.shippingAddress.address}</p>
                  <p>{selectedOrder.shippingAddress.locality}</p>
                  <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                  <p>Pincode: {selectedOrder.shippingAddress.pincode}</p>
                  <p className="mt-2">Mobile: {selectedOrder.shippingAddress.mobile}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.sellingPrice}</p>
                      </div>
                      <p className="font-semibold">₹{item.totalPrice}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div>
                <h3 className="font-semibold mb-2">Price Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹{selectedOrder.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-₹{selectedOrder.discount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>₹{selectedOrder.shippingCharge}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>₹{selectedOrder.finalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {canCancelOrder(selectedOrder) && (
                <button
                  onClick={() => {
                    closeModal();
                    cancelOrder(selectedOrder.orderId);
                  }}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel This Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;