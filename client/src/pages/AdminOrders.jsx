import React, { useEffect, useState } from 'react';
import { Package, Truck, ExternalLink, RefreshCw, Eye, X } from 'lucide-react';
import API from '../services/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/admin/all');
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      await API.put(`/orders/admin/update-status/${orderId}`, { orderStatus: newStatus });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const createShipment = async (orderId) => {
    if (!confirm('Create Ekart shipment for this order?')) return;
    
    setCreatingShipment(orderId);
    try {
      const { data } = await API.post(`/orders/create-shipment/${orderId}`);
      alert(`Shipment created!\nTracking ID: ${data.trackingId}\nAWB: ${data.awb}`);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create shipment');
    } finally {
      setCreatingShipment(null);
    }
  };

  const viewOrderDetails = async (order) => {
    setSelectedOrder(order);
    if (order.ekartTrackingId) {
      setLoadingTracking(true);
      try {
        const { data } = await API.get(`/orders/track/${order.orderId}`);
        setTrackingInfo(data.trackingInfo);
      } catch (error) {
        console.error('Failed to fetch tracking:', error);
      } finally {
        setLoadingTracking(false);
      }
    }
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setTrackingInfo(null);
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
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">All Orders</h1>
          <p className="text-gray-600 mt-1">{orders.length} total orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ekart Tracking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">#{order.orderId}</div>
                      <div className="text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div className="text-gray-500">{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{order.user?.username || 'N/A'}</div>
                      <div className="text-gray-500">{order.shippingAddress?.mobile}</div>
                      <div className="text-gray-500">{order.shippingAddress?.city || 'N/A'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{order.finalAmount}</div>
                    <div className="text-xs text-gray-500">{order.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {order.ekartTrackingId ? (
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-600">Shipment Created</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div>ID: {order.ekartTrackingId}</div>
                          {order.ekartAWB && <div>AWB: {order.ekartAWB}</div>}
                        </div>
                        {order.publicTrackingUrl && (
                          <a
                            href={order.publicTrackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            Track on Ekart <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Package className="w-4 h-4" />
                          <span>No shipment</span>
                        </div>
                        {order.orderStatus === 'confirmed' && order.paymentStatus === 'success' && (
                          <button
                            onClick={() => createShipment(order.orderId)}
                            disabled={creatingShipment === order.orderId}
                            className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                          >
                            {creatingShipment === order.orderId ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Creating...
                              </>
                            ) : (
                              <>
                                <Truck className="w-3 h-3" />
                                Create Shipment
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-y-2">
                    <button
                      onClick={() => viewOrderDetails(order)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <select
                      value={order.orderStatus}
                      onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                      disabled={updatingOrder === order.orderId}
                      className="block w-full px-2 py-1 text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Order #{selectedOrder.orderId}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Order Information</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Date:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                    <div><span className="text-gray-600">Status:</span> <span className={`px-2 py-1 rounded ${getStatusColor(selectedOrder.orderStatus)}`}>{selectedOrder.orderStatus}</span></div>
                    <div><span className="text-gray-600">Payment:</span> <span className={`px-2 py-1 rounded ${getPaymentStatusColor(selectedOrder.paymentStatus)}`}>{selectedOrder.paymentStatus}</span></div>
                    <div><span className="text-gray-600">Method:</span> {selectedOrder.paymentMethod}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Customer Details</h3>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-600">Name:</span> {selectedOrder.shippingAddress.name}</div>
                    <div><span className="text-gray-600">Mobile:</span> {selectedOrder.shippingAddress.mobile}</div>
                    <div><span className="text-gray-600">Address:</span> {selectedOrder.shippingAddress.address}, {selectedOrder.shippingAddress.locality}</div>
                    <div><span className="text-gray-600">City:</span> {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</div>
                    <div><span className="text-gray-600">Pincode:</span> {selectedOrder.shippingAddress.pincode}</div>
                  </div>
                </div>
              </div>

              {/* Ekart Tracking */}
              {selectedOrder.ekartTrackingId && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Ekart Shipment Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-gray-600">Tracking ID:</span> <span className="font-mono">{selectedOrder.ekartTrackingId}</span></div>
                    {selectedOrder.ekartAWB && <div><span className="text-gray-600">AWB Number:</span> <span className="font-mono">{selectedOrder.ekartAWB}</span></div>}
                  </div>
                  
                  {loadingTracking ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading tracking info...</p>
                    </div>
                  ) : trackingInfo && trackingInfo.scans && trackingInfo.scans.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-2">Tracking History</h4>
                      <div className="space-y-3">
                        {trackingInfo.scans.map((scan, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                              {index < trackingInfo.scans.length - 1 && <div className="w-0.5 h-full bg-gray-300 my-1"></div>}
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="font-medium text-gray-900">{scan.status}</div>
                              {scan.location !== 'N/A' && <div className="text-sm text-gray-600">{scan.location}</div>}
                              {scan.remarks && <div className="text-xs text-gray-500">{scan.remarks}</div>}
                              <div className="text-xs text-gray-400 mt-1">{new Date(scan.timestamp).toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-600">
                      No tracking updates yet
                    </div>
                  )}

                  {selectedOrder.publicTrackingUrl && (
                    <a
                      href={selectedOrder.publicTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      Track on Ekart Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-3">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.sellingPrice}</div>
                        </div>
                      </div>
                      <div className="font-semibold">₹{item.totalPrice}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-green-600">-₹{selectedOrder.discount}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Shipping:</span>
                  <span>₹{selectedOrder.shippingCharge}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>₹{selectedOrder.finalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;