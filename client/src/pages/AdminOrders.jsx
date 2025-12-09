import React, { useEffect, useState } from 'react';
import { Package, Truck, ExternalLink, RefreshCw, Eye, X, CheckCircle } from 'lucide-react';
import API from '../services/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(null);
  const [cancellationError, setCancellationError] = useState(null);
  const [cancellationSuccess, setCancellationSuccess] = useState(null);
  const [forceDeleteMode, setForceDeleteMode] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data } = await API.get('/orders/admin/all');
      
      console.log('📦 Raw API Response:', data);
      
      let ordersArray;
      if (Array.isArray(data)) {
        ordersArray = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } else {
        console.error('❌ Unexpected response format:', data);
        ordersArray = [];
      }
      
      console.log('✅ Parsed orders:', ordersArray.length, 'orders');
      setOrders(ordersArray);
      setCancellationError(null);
      setCancellationSuccess(null);
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      console.error('Response:', error.response?.data);
      alert('Failed to load orders: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrder(orderId);
    try {
      await API.put(`/orders/admin/update-status/${orderId}`, { orderStatus: newStatus });
      alert('Order status updated successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  // ✅ FIXED: Admin Cancel Order Function with COMPLETE EKART DELETION
  const cancelOrder = async (orderId, forceDelete = false) => {
    let confirmMessage = `Are you sure you want to cancel order ${orderId}?\n\n`;
    
    if (forceDelete) {
      confirmMessage += `🚨 FORCE DELETE MODE: This will COMPLETELY DELETE the order from Ekart.\n`;
      confirmMessage += `Ekart पर से सब कुछ DELETE हो जाएगा - कोई निशान नहीं बचेगा।\n\n`;
    } else {
      confirmMessage += `This will also cancel the Ekart shipment if exists.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setCancellingOrder(orderId);
    setCancellationError(null);
    setCancellationSuccess(null);
    
    try {
      const { data } = await API.put(`/orders/admin/cancel/${orderId}`);
      
      let message = data.message || 'Order cancelled successfully!';
      let successDetails = [];
      
      if (data.ekartCancelled) {
        message += '\n✅ Ekart shipment CANCELLED and COMPLETELY DELETED.';
        successDetails.push('✅ Ekart shipment cancelled');
        
        if (data.ekartDeleted) {
          successDetails.push('✅ COMPLETELY DELETED from Ekart');
          successDetails.push('✅ Ekart पर अब कुछ नहीं दिखेगा');
        }
      } else if (data.ekartCancelError) {
        message += `\n⚠️ Ekart cancellation: ${data.ekartCancelError}`;
        setCancellationError({
          orderId,
          message: `Ekart cancellation failed: ${data.ekartCancelError}`,
          trackingId: data.ekartResponse?.tracking_id
        });
      }
      
      if (successDetails.length > 0) {
        setCancellationSuccess({
          orderId,
          message: `Order ${orderId} CANCELLED SUCCESSFULLY`,
          details: successDetails,
          ekartDeleted: data.ekartDeleted || false
        });
      }
      
      alert(message);
      fetchOrders();
      setForceDeleteMode(false);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to cancel order';
      const ekartError = error.response?.data?.ekartCancelError;
      
      if (ekartError) {
        setCancellationError({
          orderId,
          message: `Ekart deletion failed: ${ekartError}`,
          trackingId: error.response?.data?.trackingId,
          forceDeleteRequired: true
        });
        
        // Ask user if they want to try force delete
        const shouldForceDelete = confirm(`Ekart deletion failed: ${ekartError}\n\nDo you want to try FORCE DELETE?\n\n🚨 This will try multiple times to completely delete from Ekart.`);
        
        if (shouldForceDelete) {
          setForceDeleteMode(true);
          setTimeout(() => cancelOrder(orderId, true), 1000);
        }
      } else {
        alert(errorMessage);
      }
    } finally {
      setCancellingOrder(null);
    }
  };

  const createShipment = async (orderId) => {
    if (!confirm('Create Ekart shipment for this order?')) return;
    
    setCreatingShipment(orderId);
    try {
      const { data } = await API.post(`/orders/admin/create-shipment/${orderId}`);
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
    setCancellationError(null);
    setCancellationSuccess(null);
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

  const canCancelOrder = (order) => {
    return !['shipped', 'delivered', 'cancelled'].includes(order.orderStatus);
  };

  // Manual Ekart cancellation for failed attempts
  const manualEkartCancel = async (trackingId) => {
    if (!trackingId) return;
    
    const ekartUrl = `https://app.elite.ekartlogistics.in/track/${trackingId}`;
    const confirmManual = confirm(`Ekart deletion failed.\n\nPlease manually DELETE on Ekart portal:\n\n1. Go to: ${ekartUrl}\n2. Login to your Ekart account\n3. Find the shipment and CANCEL/DELETE it completely\n4. Make sure nothing remains on Ekart\n\nClick OK to open Ekart portal for manual deletion.`);
    
    if (confirmManual) {
      window.open(ekartUrl, '_blank');
    }
  };

  // Force delete function
  const forceDeleteOrder = (orderId) => {
    if (confirm(`🚨 FORCE DELETE ORDER ${orderId}?\n\nThis will:\n1. Cancel order locally\n2. Try multiple times to delete from Ekart\n3. Clear all Ekart tracking data\n4. Make sure Ekart is completely clean\n\nAre you sure?`)) {
      cancelOrder(orderId, true);
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
        <div className="flex gap-3">
          {forceDeleteMode && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-semibold">FORCE DELETE MODE ACTIVE</span>
            </div>
          )}
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Force Delete Mode Banner */}
      {forceDeleteMode && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-800">🚨 FORCE DELETE MODE ACTIVATED</h3>
                <p className="text-red-700 text-sm">
                  Next order cancellation will attempt COMPLETE DELETION from Ekart.
                  Ekart पर से सब कुछ DELETE कर देगा।
                </p>
              </div>
            </div>
            <button
              onClick={() => setForceDeleteMode(false)}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Cancel Force Mode
            </button>
          </div>
        </div>
      )}

      {/* Cancellation Success Banner */}
      {cancellationSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">{cancellationSuccess.message}</h3>
              {cancellationSuccess.details && (
                <ul className="mt-2 space-y-1">
                  {cancellationSuccess.details.map((detail, idx) => (
                    <li key={idx} className="text-green-700 text-sm flex items-center gap-2">
                      <CheckCircle className="w-3 h-3" />
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
              {cancellationSuccess.ekartDeleted && (
                <p className="mt-2 text-green-600 text-sm font-medium">
                  ✅ Ekart पर अब कुछ नहीं दिखेगा - COMPLETELY DELETED
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Error Banner */}
      {cancellationError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Ekart Deletion Failed</h3>
                <p className="text-red-600 text-sm">{cancellationError.message}</p>
                {cancellationError.trackingId && (
                  <p className="text-red-600 text-sm mt-1">
                    Tracking ID: <span className="font-mono">{cancellationError.trackingId}</span>
                  </p>
                )}
                {cancellationError.forceDeleteRequired && (
                  <p className="text-red-700 text-sm mt-2 font-medium">
                    ⚠️ Try FORCE DELETE to completely remove from Ekart
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {cancellationError.forceDeleteRequired && (
                <button
                  onClick={() => forceDeleteOrder(cancellationError.orderId)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Force Delete
                </button>
              )}
              <button
                onClick={() => manualEkartCancel(cancellationError.trackingId)}
                className="px-4 py-2 bg-red-800 text-white text-sm rounded hover:bg-red-900"
              >
                Manual Delete on Ekart
              </button>
            </div>
          </div>
        </div>
      )}

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
                    ) : order.ekartDeleted ? (
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-600">DELETED FROM EKART</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Completely removed from Ekart
                        </div>
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
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800 mb-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    
                    <select
                      value={order.orderStatus}
                      onChange={(e) => updateOrderStatus(order.orderId, e.target.value)}
                      disabled={updatingOrder === order.orderId}
                      className="block w-full px-2 py-1 text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {canCancelOrder(order) && (
                      <div className="space-y-1">
                        <button
                          onClick={() => cancelOrder(order.orderId)}
                          disabled={cancellingOrder === order.orderId}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50 w-full"
                        >
                          {cancellingOrder === order.orderId ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4" />
                              Cancel Order
                            </>
                          )}
                        </button>
                        {forceDeleteMode && (
                          <button
                            onClick={() => forceDeleteOrder(order.orderId)}
                            className="flex items-center gap-1 text-white bg-red-700 hover:bg-red-800 px-2 py-1 rounded text-xs w-full justify-center"
                          >
                            <X className="w-3 h-3" />
                            Force Delete from Ekart
                          </button>
                        )}
                      </div>
                    )}
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
                    {selectedOrder.ekartDeleted && (
                      <div className="mt-2">
                        <span className="text-gray-600">Ekart Status:</span>
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                          COMPLETELY DELETED FROM EKART
                        </span>
                      </div>
                    )}
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
              {selectedOrder.ekartTrackingId && !selectedOrder.ekartDeleted && (
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

              {/* Ekart Deletion Status */}
              {selectedOrder.ekartDeleted && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <X className="w-5 h-5 text-red-600" />
                    Ekart Deletion Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-700">COMPLETELY DELETED FROM EKART</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      This order has been completely removed from Ekart. No tracking information or order details exist on Ekart anymore.
                    </p>
                    <p className="text-sm text-gray-600">
                      ✅ Ekart पर अब कुछ नहीं दिखेगा<br/>
                      ✅ सभी डेटा DELETE हो गया<br/>
                      ✅ कोई निशान नहीं बचा
                    </p>
                  </div>
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

              {/* Cancel Button in Modal */}
              {canCancelOrder(selectedOrder) && (
                <div className="space-y-3">
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
                  
                  <button
                    onClick={() => {
                      closeModal();
                      forceDeleteOrder(selectedOrder.orderId);
                    }}
                    className="w-full py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="w-4 h-4" />
                    🚨 FORCE DELETE FROM EKART
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;