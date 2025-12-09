import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Truck, 
  ExternalLink, 
  RefreshCw, 
  Eye, 
  X, 
  AlertCircle,
  Filter,
  Download,
  Search,
  MoreVertical,
  User,
  Phone,
  MapPin,
  CreditCard,
  Tag,
  Calendar,
  ShoppingBag,
  MessageSquare
} from 'lucide-react';
import API from '../services/api';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(null);
  const [notes, setNotes] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const statusOptions = [
    'ALL', 'Canceled', 'Open', 'Ready To Ship', 
    'Ready For Pickup', 'In Transit', 'Delivered', 'RTO'
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/orders/admin/all');
      
      console.log('📦 Admin Orders API Response:', data);
      
      let ordersArray = [];
      
      if (Array.isArray(data)) {
        ordersArray = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } else if (data.data && Array.isArray(data.data)) {
        ordersArray = data.data;
      } else {
        console.error('❌ Unexpected response format:', data);
        ordersArray = [];
      }
      
      console.log(`✅ Fetched ${ordersArray.length} orders`);
      
      const transformedOrders = ordersArray.map(order => {
        const orderTags = [];
        if (order.ekartTrackingId) {
          orderTags.push('Ekart Shipment');
        }
        if (order.paymentMethod === 'cod') {
          orderTags.push('COD');
        } else {
          orderTags.push('Prepaid');
        }
        
        const productNames = order.items.map(item => 
          item.productId?.name || item.name || 'Product'
        );
        
        const mainProduct = productNames[0] || 'Product';
        const truncatedProduct = mainProduct.length > 25 
          ? mainProduct.substring(0, 25) + '...' 
          : mainProduct;
        
        return {
          ...order,
          channel: 'eXart',
          lastUpdated: order.updatedAt || order.createdAt,
          displayItems: `${truncatedProduct} Quantity: ${order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)}`,
          shippingDisplay: `${order.shippingAddress?.name || 'Customer'} ${order.shippingAddress?.mobile || ''}`.trim(),
          paymentDisplay: order.paymentMethod === 'cod' 
            ? `COD ₹${order.finalAmount || 0}` 
            : `Prepaid ₹${order.finalAmount || 0}`,
          orderTags: [...orderTags, order.shippingAddress?.city || 'Location'],
          ekartStatus: mapToEkartStatus(order.orderStatus),
          displayOrderId: order.orderId || order._id
        };
      });
      
      setOrders(transformedOrders);
      
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to load orders: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const mapToEkartStatus = (status) => {
    switch(status?.toLowerCase()) {
      case 'cancelled': return 'Canceled';
      case 'pending': return 'Open';
      case 'confirmed': return 'Ready To Ship';
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'rto': return 'RTO';
      default: return status || 'Open';
    }
  };

  const getEkartStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'canceled':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready to ship':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready for pickup':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.displayOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress?.mobile?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || 
      order.ekartStatus?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const cancelOrder = async (orderId) => {
    if (!confirm(`Are you sure you want to cancel order ${orderId}?`)) {
      return;
    }
    
    setCancellingOrder(orderId);
    try {
      const { data } = await API.put(`/orders/admin/cancel/${orderId}`);
      
      if (data.success) {
        alert('Order cancelled successfully!');
        fetchOrders();
      } else {
        alert(data.message || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const viewOrderDetails = async (order) => {
    setSelectedOrder(order);
    setNotes(order.notes || '');
    
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

  const createShipment = async (orderId) => {
    if (!confirm('Create Ekart shipment for this order?')) return;
    
    setCreatingShipment(orderId);
    try {
      const { data } = await API.post(`/orders/admin/create-shipment/${orderId}`);
      alert(`Shipment created!\nTracking ID: ${data.trackingId}`);
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create shipment');
    } finally {
      setCreatingShipment(null);
    }
  };

  const toggleOrderSelection = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const selectAllOrders = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order._id));
    }
  };

  const addNoteToOrder = async () => {
    if (!notes.trim()) {
      alert('Please enter a note');
      return;
    }
    
    setAddingNote(true);
    try {
      // You need to implement this API endpoint
      const { data } = await API.post(`/orders/admin/add-note/${selectedOrder.orderId}`, {
        notes: notes
      });
      
      if (data.success) {
        alert('Note added successfully!');
        setSelectedOrder({
          ...selectedOrder,
          notes: notes
        });
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setTrackingInfo(null);
    setNotes('');
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await API.put(`/orders/admin/update-status/${orderId}`, { 
        orderStatus: newStatus.toLowerCase() 
      });
      alert('Order status updated successfully!');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders from Ekart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header exactly like Ekart screenshot */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">eXart</h1>
        
        <div className="flex space-x-6 mt-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Analytics</h2>
            <div className="mt-2 space-y-1">
              <div className="text-sm text-gray-600">Orders</div>
              <div className="text-sm text-gray-500">Other Summary</div>
              <div className="text-sm text-gray-500">Proding Actions</div>
              <div className="text-sm text-gray-500">Support Journey</div>
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-700">Packaging</h2>
            
            <div className="flex space-x-2 mt-2 mb-4 overflow-x-auto">
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white border rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="ml-2 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedOrders.length > 0 && (
            <span className="text-sm text-gray-600">
              {selectedOrders.length} selected
            </span>
          )}
          <button 
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={selectAllOrders}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shipping Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order._id)}
                      onChange={() => toggleOrderSelection(order._id)}
                      className="rounded"
                    />
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.channel}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(order.lastUpdated).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}, {new Date(order.lastUpdated).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.displayOrderId}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}, {new Date(order.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.displayItems}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.shippingDisplay}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {order.paymentDisplay}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.paymentStatus || 'Pending'}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {order.orderTags?.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEkartStatusColor(order.ekartStatus)}`}>
                      {order.ekartStatus}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View / Add Notes
                      </button>
                      
                      {order.ekartStatus === 'Ready To Ship' && !order.ekartTrackingId && (
                        <button
                          onClick={() => createShipment(order.orderId)}
                          disabled={creatingShipment === order.orderId}
                          className="text-green-600 hover:text-green-800 text-sm ml-2"
                        >
                          {creatingShipment === order.orderId ? 'Creating...' : 'Create Shipment'}
                        </button>
                      )}
                      
                      {order.ekartStatus !== 'Canceled' && order.ekartStatus !== 'Delivered' && (
                        <button
                          onClick={() => cancelOrder(order.orderId)}
                          disabled={cancellingOrder === order.orderId}
                          className="text-red-600 hover:text-red-800 text-sm ml-2"
                        >
                          {cancellingOrder === order.orderId ? 'Cancelling...' : 'Cancel'}
                        </button>
                      )}
                      
                      {order.ekartTrackingId && (
                        <a
                          href={`https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm ml-2 flex items-center"
                        >
                          <Truck className="w-3 h-3 mr-1" />
                          Track
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No orders match the selected filter'}
              </p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-3 border-t flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{filteredOrders.length}</span> orders
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border rounded text-sm">Previous</button>
            <button className="px-3 py-1 border rounded bg-blue-600 text-white text-sm">1</button>
            <button className="px-3 py-1 border rounded text-sm">2</button>
            <button className="px-3 py-1 border rounded text-sm">Next</button>
          </div>
        </div>
      </div>

      {/* COMPLETE MODAL - NO MISSING PARTS */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Order #{selectedOrder.orderId}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getEkartStatusColor(selectedOrder.ekartStatus)}`}>
                    {selectedOrder.ekartStatus}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedOrder.paymentStatus === 'success' 
                      ? 'bg-green-100 text-green-800' 
                      : selectedOrder.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary Cards */}
              <div className="grid grid-cols-3 gap-6">
                {/* Order Info */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    Order Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-mono">{selectedOrder.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Date:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated:</span>
                      <span>{new Date(selectedOrder.lastUpdated).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium">{selectedOrder.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span>{selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-green-600" />
                    Customer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{selectedOrder.shippingAddress?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{selectedOrder.shippingAddress?.mobile || 'N/A'}</span>
                    </div>
                    {selectedOrder.shippingAddress?.alternatePhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>Alt: {selectedOrder.shippingAddress.alternatePhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Email:</span>
                      <span>{selectedOrder.user?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Shipping Address
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>{selectedOrder.shippingAddress?.address || 'N/A'}</div>
                    <div>{selectedOrder.shippingAddress?.locality || ''}</div>
                    <div>
                      {selectedOrder.shippingAddress?.city || ''}, 
                      {selectedOrder.shippingAddress?.state || ''} - 
                      {selectedOrder.shippingAddress?.pincode || ''}
                    </div>
                    {selectedOrder.shippingAddress?.landmark && (
                      <div>Landmark: {selectedOrder.shippingAddress.landmark}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment & Amount */}
              <div className="grid grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    Payment Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">
                        {selectedOrder.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        selectedOrder.paymentStatus === 'success'
                          ? 'bg-green-100 text-green-800'
                          : selectedOrder.paymentStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedOrder.paymentStatus}
                      </span>
                    </div>
                    {selectedOrder.stripePaymentIntentId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Stripe ID:</span>
                        <span className="font-mono text-xs">{selectedOrder.stripePaymentIntentId}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-orange-600" />
                    Order Amount
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>₹{selectedOrder.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount:</span>
                      <span className="text-green-600">-₹{selectedOrder.discount || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping:</span>
                      <span>₹{selectedOrder.shippingCharge || 0}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-lg">
                      <span>Total Amount:</span>
                      <span>₹{selectedOrder.finalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ekart Tracking Section */}
              {selectedOrder.ekartTrackingId && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Ekart Shipment Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Tracking ID:</span>
                      <div className="font-mono mt-1">{selectedOrder.ekartTrackingId}</div>
                    </div>
                    {selectedOrder.ekartAWB && (
                      <div>
                        <span className="text-gray-600">AWB Number:</span>
                        <div className="font-mono mt-1">{selectedOrder.ekartAWB}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Expected Delivery:</span>
                      <div className="mt-1">
                        {selectedOrder.expectedDelivery 
                          ? new Date(selectedOrder.expectedDelivery).toLocaleDateString()
                          : 'Not set'}
                      </div>
                    </div>
                  </div>
                  
                  {loadingTracking ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading tracking info...</p>
                    </div>
                  ) : trackingInfo && trackingInfo.scans && trackingInfo.scans.length > 0 ? (
                    <div>
                      <h4 className="font-semibold mb-3">Tracking History</h4>
                      <div className="space-y-3">
                        {trackingInfo.scans.map((scan, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                              {index < trackingInfo.scans.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-300 my-1"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <div className="font-medium text-gray-900">{scan.status}</div>
                              {scan.location !== 'N/A' && (
                                <div className="text-sm text-gray-600">{scan.location}</div>
                              )}
                              {scan.remarks && (
                                <div className="text-xs text-gray-500">{scan.remarks}</div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(scan.timestamp).toLocaleString()}
                              </div>
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
                      className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Track on Ekart Portal <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Order Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-600" />
                  Order Items ({selectedOrder.items.length})
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center border-b pb-3">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-16 h-16 object-cover rounded border"
                          />
                        )}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            Product ID: {item.productId?._id || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ₹{item.sellingPrice}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">₹{item.totalPrice || (item.sellingPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gray-600" />
                  Order Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex justify-between items-center mt-3">
                  <div className="text-sm text-gray-500">
                    Notes will be saved to the order history
                  </div>
                  <button
                    onClick={addNoteToOrder}
                    disabled={addingNote || !notes.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {addingNote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        Save Note
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-3">
                  {selectedOrder.ekartStatus !== 'Canceled' && selectedOrder.ekartStatus !== 'Delivered' && (
                    <button
                      onClick={() => cancelOrder(selectedOrder.orderId)}
                      disabled={cancellingOrder === selectedOrder.orderId}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {cancellingOrder === selectedOrder.orderId ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                  
                  {selectedOrder.ekartStatus === 'Ready To Ship' && !selectedOrder.ekartTrackingId && (
                    <button
                      onClick={() => createShipment(selectedOrder.orderId)}
                      disabled={creatingShipment === selectedOrder.orderId}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingShipment === selectedOrder.orderId ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Truck className="w-4 h-4" />
                          Create Shipment
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => updateOrderStatus(selectedOrder.orderId, e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rto">RTO</option>
                  </select>
                  
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
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