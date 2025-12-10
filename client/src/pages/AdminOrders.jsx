// components/AdminOrders.js - EKART DESIGN WITH YOUR EXISTING API
import React, { useEffect, useState } from 'react';
import { 
  Package, Truck, ExternalLink, RefreshCw, Eye, X, AlertCircle, Filter,
  Download, Search, MoreVertical, User, Phone, MapPin, CreditCard, Tag,
  Calendar, ShoppingBag, MessageSquare, FileText, Printer, FileDown,
  CheckCircle, AlertTriangle, Info, File, Receipt, Layers, Archive,
  ChevronDown, ChevronUp, CheckSquare, Square, Settings, Plus
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
  const [downloadingLabel, setDownloadingLabel] = useState(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadingManifest, setDownloadingManifest] = useState(false);
  const [showBulkOptions, setShowBulkOptions] = useState(false);
  const [bulkActionType, setBulkActionType] = useState('labels');
  const [notification, setNotification] = useState(null);
  const [dateFrom, setDateFrom] = useState('2025-11-09');
  const [dateTo, setDateTo] = useState('2025-12-09');

  const statusOptions = [
    { key: 'ALL', label: 'All', count: 29 },
    { key: 'Cancelled', label: 'Cancelled', count: 29 },
    { key: 'Open', label: 'Open', count: 0 },
    { key: 'Ready To Ship', label: 'Ready To Ship', count: 0 },
    { key: 'Ready For Pickup', label: 'Ready For Pickup', count: 0 },
    { key: 'In Transit', label: 'In Transit', count: 0 },
    { key: 'Delivered', label: 'Delivered', count: 0 },
    { key: 'RTO', label: 'RTO', count: 0 }
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/orders/admin/all');
      
      let ordersArray = [];
      if (Array.isArray(data)) {
        ordersArray = data;
      } else if (data.orders && Array.isArray(data.orders)) {
        ordersArray = data.orders;
      } else if (data.data && Array.isArray(data.data)) {
        ordersArray = data.data;
      }
      
      const transformedOrders = ordersArray.map(order => ({
        ...order,
        channel: 'eKart',
        lastUpdated: order.updatedAt || order.createdAt,
        ekartStatus: mapToEkartStatus(order.orderStatus),
        displayOrderId: order.orderId || order._id
      }));
      
      setOrders(transformedOrders);
      
    } catch (error) {
      console.error('❌ Failed to fetch orders:', error);
      showNotification('Failed to load orders: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  const mapToEkartStatus = (status) => {
    switch(status?.toLowerCase()) {
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Open';
      case 'confirmed': return 'Ready To Ship';
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'rto': return 'RTO';
      default: return status || 'Open';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'in transit': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
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
    if (!confirm(`Are you sure you want to cancel order ${orderId}?`)) return;
    
    setCancellingOrder(orderId);
    try {
      const { data } = await API.put(`/orders/admin/cancel/${orderId}`);
      if (data.success) {
        showNotification(`Order ${orderId} cancelled successfully!`, 'success');
        fetchOrders();
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to cancel order', 'error');
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
      showNotification(`Shipment created! Tracking ID: ${data.trackingId}`, 'success');
      fetchOrders();
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to create shipment', 'error');
    } finally {
      setCreatingShipment(null);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(selectedOrders.length === filteredOrders.length ? [] : filteredOrders.map(o => o._id));
  };

  const downloadLabel = async (order) => {
    if (!order.ekartTrackingId) {
      showNotification('No tracking ID available', 'error');
      return;
    }

    setDownloadingLabel(order.orderId);
    try {
      const response = await API.get(`/orders/admin/label/${order.orderId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      showNotification(`Label downloaded for order ${order.orderId}`, 'success');
    } catch (error) {
      showNotification('Failed to download label', 'error');
    } finally {
      setDownloadingLabel(null);
    }
  };

  const downloadInvoice = async (order) => {
    if (!order.ekartTrackingId) {
      showNotification('No tracking ID available', 'error');
      return;
    }

    setDownloadingInvoice(order.orderId);
    try {
      const response = await API.get(`/orders/admin/invoice/${order.orderId}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      showNotification(`Invoice downloaded for order ${order.orderId}`, 'success');
    } catch (error) {
      showNotification('Failed to download invoice', 'error');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const downloadBulkLabels = async () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders', 'error');
      return;
    }

    const orderIds = selectedOrders.map(id => 
      orders.find(order => order._id === id)?.orderId
    ).filter(Boolean);

    if (!confirm(`Download labels for ${orderIds.length} orders?`)) return;

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/labels/bulk', { orderIds }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `labels_bulk_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      showNotification(`Downloaded ${orderIds.length} labels`, 'success');
    } catch (error) {
      showNotification('Failed to download bulk labels', 'error');
    } finally {
      setDownloadingBulk(false);
    }
  };

  const downloadBulkInvoices = async () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders', 'error');
      return;
    }

    const orderIds = selectedOrders.map(id => 
      orders.find(order => order._id === id)?.orderId
    ).filter(Boolean);

    if (!confirm(`Download invoices for ${orderIds.length} orders?`)) return;

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/invoices/bulk', { orderIds }, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_bulk_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      showNotification(`Downloaded ${orderIds.length} invoices`, 'success');
    } catch (error) {
      showNotification('Failed to download bulk invoices', 'error');
    } finally {
      setDownloadingBulk(false);
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
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1a3a52] text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl font-bold">eKart</div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded">
            <Package className="w-5 h-5" />
            <span>₹700.00</span>
          </div>
          <button className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
            Recharge
          </button>
          <span className="text-sm">ONE2ALL RECHARGE PRIVATE LIMITED</span>
          <button className="p-2 hover:bg-white/10 rounded">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 bg-white border-r min-h-screen">
          <nav className="py-4">
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Package className="w-4 h-4 mr-3" />
              <span className="text-sm">Analytics</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Truck className="w-4 h-4 mr-3" />
              <span className="text-sm">Shipments</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Package className="w-4 h-4 mr-3" />
              <span className="text-sm">Ship Parcel</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Archive className="w-4 h-4 mr-3" />
              <span className="text-sm">Packaging</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 bg-blue-50 text-blue-600 border-l-4 border-blue-600">
              <ShoppingBag className="w-4 h-4 mr-3" />
              <span className="text-sm font-medium">Orders</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Package className="w-4 h-4 mr-3" />
              <span className="text-sm">Product Master</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <CreditCard className="w-4 h-4 mr-3" />
              <span className="text-sm">Payments</span>
            </a>
            <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50">
              <Settings className="w-4 h-4 mr-3" />
              <span className="text-sm">Settings</span>
            </a>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Orders Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <button className="px-4 py-2 bg-white border rounded hover:bg-gray-50 flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Orders
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Order Creation Date</span>
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 border rounded text-sm"
                />
                <span className="text-gray-500">-</span>
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 border rounded text-sm"
                />
              </div>
              <div className="flex-1"></div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Order ID, Shipment ID, Phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded w-80 text-sm"
                />
              </div>
              <button className="p-2 border rounded hover:bg-gray-50">
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-6 border-b mb-4">
              <button className="pb-3 border-b-2 border-blue-600 text-blue-600 font-medium text-sm">
                Order Summary
              </button>
              <button className="pb-3 text-gray-600 text-sm hover:text-gray-900">
                Pending Actions
              </button>
              <button className="pb-3 text-gray-600 text-sm hover:text-gray-900">
                Shipment Journey
              </button>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 bg-white border rounded-lg p-1 overflow-x-auto">
              {statusOptions.map(status => (
                <button
                  key={status.key}
                  onClick={() => setStatusFilter(status.key)}
                  className={`px-4 py-2 rounded text-sm whitespace-nowrap transition-colors ${
                    statusFilter === status.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{status.label}</div>
                  <div className="text-xl font-bold">{status.count}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrders.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    {selectedOrders.length} orders selected
                  </span>
                  <button
                    onClick={downloadBulkLabels}
                    disabled={downloadingBulk}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download Labels
                  </button>
                  <button
                    onClick={downloadBulkInvoices}
                    disabled={downloadingBulk}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Download Invoices
                  </button>
                </div>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Orders Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">All Orders</h2>
              <div className="flex items-center space-x-2">
                <button className="px-4 py-2 border rounded hover:bg-gray-50 flex items-center text-sm">
                  <span>Bulk Action</span>
                  <ChevronDown className="w-4 h-4 ml-2" />
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Order
                </button>
                <button className="p-2 border rounded hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={fetchOrders} className="p-2 border rounded hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button className="p-2 border rounded hover:bg-gray-50">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 border rounded hover:bg-gray-50 text-sm">
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <button onClick={selectAllOrders}>
                          {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Channel
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Last Updated
                          <button className="ml-1"><ChevronDown className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Order ID
                          <button className="ml-1"><ChevronDown className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Items
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Shipping Details
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Payment Info
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Order Tags
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center">
                          Status
                          <button className="ml-1"><Filter className="w-3 h-3" /></button>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() => toggleOrderSelection(order._id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="bg-yellow-400 text-white font-bold px-2 py-1 rounded text-xs">
                              eKart
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
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
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => viewOrderDetails(order)}
                            className="text-blue-600 hover:underline text-sm font-medium"
                          >
                            {order.displayOrderId}
                          </button>
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
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {order.items[0]?.name || order.items[0]?.productId?.name || 'Product'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Quantity: {order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{order.shippingAddress?.name || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.shippingAddress?.mobile || ''}</div>
                          <div className="text-xs text-gray-500">
                            {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">
                            {order.paymentMethod === 'cod' ? 'Prepaid' : 'Prepaid'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Order Value: ₹{order.finalAmount}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.paymentStatus || 'Paid'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                              Manual Shipment
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              Repeat Customer
                            </span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                              Shipment Cancelled
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.ekartStatus)}`}>
                            {order.ekartStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => viewOrderDetails(order)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="View Details"
                            >
                              <FileText className="w-4 h-4 text-gray-600" />
                            </button>
                            {order.ekartTrackingId && (
                              <>
                                <button 
                                  onClick={() => downloadLabel(order)}
                                  disabled={downloadingLabel === order.orderId}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Download Label"
                                >
                                  {downloadingLabel === order.orderId ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <Download className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                                <button 
                                  onClick={() => downloadInvoice(order)}
                                  disabled={downloadingInvoice === order.orderId}
                                  className="p-1 hover:bg-gray-100 rounded"
                                  title="Download Invoice"
                                >
                                  {downloadingInvoice === order.orderId ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  ) : (
                                    <Receipt className="w-4 h-4 text-gray-600" />
                                  )}
                                </button>
                              </>
                            )}
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => viewOrderDetails(order)}
                              className="px-3 py-1 text-xs border rounded hover:bg-gray-50"
                            >
                              View / Add Notes
                            </button>
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

              {/* Pagination */}
              <div className="px-6 py-3 border-t flex justify-between items-center bg-gray-50">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredOrders.length}</span> orders
                </div>
                <div className="flex space-x-1">
                  <button className="px-3 py-1 border rounded text-sm hover:bg-white">Previous</button>
                  <button className="px-3 py-1 border rounded bg-blue-600 text-white text-sm">1</button>
                  <button className="px-3 py-1 border rounded text-sm hover:bg-white">2</button>
                  <button className="px-3 py-1 border rounded text-sm hover:bg-white">Next</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Order #{selectedOrder.orderId}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(selectedOrder.ekartStatus)}`}>
                    {selectedOrder.ekartStatus}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                    {selectedOrder.paymentStatus}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary Cards */}
              <div className="grid grid-cols-3 gap-6">
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
                      <span>{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium">{selectedOrder.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span>{selectedOrder.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</span>
                    </div>
                  </div>
                </div>

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
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" />
                    Shipping Address
                  </h3>
                  <div className="space-y-1 text-sm">
                    <div>{selectedOrder.shippingAddress?.address || 'N/A'}</div>
                    <div>
                      {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ekart Tracking */}
              {selectedOrder.ekartTrackingId && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      Ekart Shipment Details
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadLabel(selectedOrder)}
                        disabled={downloadingLabel === selectedOrder.orderId}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {downloadingLabel === selectedOrder.orderId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FileDown className="w-4 h-4" />
                            Label
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => downloadInvoice(selectedOrder)}
                        disabled={downloadingInvoice === selectedOrder.orderId}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {downloadingInvoice === selectedOrder.orderId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Receipt className="w-4 h-4" />
                            Invoice
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Tracking ID:</span>
                      <div className="font-mono mt-1 bg-white p-2 rounded border">{selectedOrder.ekartTrackingId}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Public Tracking:</span>
                      <div className="mt-1">
                        <a
                          href={`https://app.elite.ekartlogistics.in/track/${selectedOrder.ekartTrackingId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Track on Ekart
                        </a>
                      </div>
                    </div>
                  </div>
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
                      <div>
                        <div className="font-medium">{item.name || item.productId?.name}</div>
                        <div className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ₹{item.sellingPrice}
                        </div>
                      </div>
                      <div className="font-semibold">₹{item.totalPrice || (item.sellingPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg">
                  <span>Total Amount:</span>
                  <span>₹{selectedOrder.finalAmount}</span>
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
                  className="w-full h-32 p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={async () => {
                      if (!notes.trim()) {
                        showNotification('Please enter a note', 'error');
                        return;
                      }
                      setAddingNote(true);
                      try {
                        const { data } = await API.post(`/orders/admin/add-note/${selectedOrder.orderId}`, { notes });
                        if (data.success) {
                          showNotification('Note added successfully!', 'success');
                        }
                      } catch (error) {
                        showNotification('Failed to add note', 'error');
                      } finally {
                        setAddingNote(false);
                      }
                    }}
                    disabled={addingNote || !notes.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingNote ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Note'
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex space-x-3">
                  {selectedOrder.ekartStatus !== 'Cancelled' && selectedOrder.ekartStatus !== 'Delivered' && (
                    <button
                      onClick={() => {
                        cancelOrder(selectedOrder.orderId);
                        setSelectedOrder(null);
                      }}
                      disabled={cancellingOrder === selectedOrder.orderId}
                      className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
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
                      onClick={() => {
                        createShipment(selectedOrder.orderId);
                        setSelectedOrder(null);
                      }}
                      disabled={creatingShipment === selectedOrder.orderId}
                      className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 border rounded hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;