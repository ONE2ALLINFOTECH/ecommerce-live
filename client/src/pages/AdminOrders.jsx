// components/AdminOrders.js - FIXED CODE WITH SCREENSHOT DESIGN
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
  MessageSquare,
  FileText,
  Printer,
  FileDown,
  CheckCircle,
  AlertTriangle,
  Info,
  File,
  Receipt,
  Layers,
  Archive,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square
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
  const [expandedOrders, setExpandedOrders] = useState([]);

  const statusOptions = [
    'ALL', 'Canceled', 'Open', 'Ready To Ship', 
    'Ready For Pickup', 'In Transit', 'Delivered', 'RTO'
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
      showNotification('Failed to load orders: ' + (error.response?.data?.message || error.message), 'error');
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
        showNotification(`Order ${orderId} cancelled successfully!`, 'success');
        fetchOrders();
      } else {
        showNotification(data.message || 'Failed to cancel order', 'error');
      }
    } catch (error) {
      console.error('Cancel error:', error);
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

  const toggleExpandOrder = (orderId) => {
    if (expandedOrders.includes(orderId)) {
      setExpandedOrders(expandedOrders.filter(id => id !== orderId));
    } else {
      setExpandedOrders([...expandedOrders, orderId]);
    }
  };

  const addNoteToOrder = async () => {
    if (!notes.trim()) {
      showNotification('Please enter a note', 'error');
      return;
    }
    
    setAddingNote(true);
    try {
      const { data } = await API.post(`/orders/admin/add-note/${selectedOrder.orderId}`, {
        notes: notes
      });
      
      if (data.success) {
        showNotification('Note added successfully!', 'success');
        setSelectedOrder({
          ...selectedOrder,
          notes: notes
        });
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      showNotification('Failed to add note', 'error');
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
      showNotification('Order status updated successfully!', 'success');
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order status:', error);
      showNotification('Failed to update order status', 'error');
    }
  };

  // ========== DOWNLOAD SINGLE LABEL ==========
  const downloadLabel = async (order) => {
    if (!order.ekartTrackingId) {
      showNotification('No tracking ID available for this order', 'error');
      return;
    }

    setDownloadingLabel(order.orderId);
    try {
      const response = await API.get(`/orders/admin/label/${order.orderId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `label_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Label downloaded:', order.ekartTrackingId);
      showNotification(`Label downloaded for order ${order.orderId}`, 'success');
    } catch (error) {
      console.error('❌ Label download failed:', error);
      showNotification('Failed to download label: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingLabel(null);
    }
  };

  // ========== DOWNLOAD SINGLE INVOICE ==========
  const downloadInvoice = async (order) => {
    if (!order.ekartTrackingId) {
      showNotification('No tracking ID available for this order', 'error');
      return;
    }

    setDownloadingInvoice(order.orderId);
    try {
      const response = await API.get(`/orders/admin/invoice/${order.orderId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Invoice downloaded:', order.ekartTrackingId);
      showNotification(`Invoice downloaded for order ${order.orderId}`, 'success');
    } catch (error) {
      console.error('❌ Invoice download failed:', error);
      showNotification('Failed to download invoice: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // ========== DOWNLOAD BOTH LABEL & INVOICE ==========
  const downloadBoth = async (order) => {
    if (!order.ekartTrackingId) {
      showNotification('No tracking ID available for this order', 'error');
      return;
    }

    setDownloadingLabel(order.orderId);
    setDownloadingInvoice(order.orderId);
    
    try {
      // Download label
      const labelResponse = await API.get(`/orders/admin/label/${order.orderId}`, {
        responseType: 'blob'
      });

      const labelBlob = new Blob([labelResponse.data], { type: 'application/pdf' });
      const labelUrl = window.URL.createObjectURL(labelBlob);
      const labelLink = document.createElement('a');
      labelLink.href = labelUrl;
      labelLink.download = `label_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(labelLink);
      labelLink.click();
      window.URL.revokeObjectURL(labelUrl);
      document.body.removeChild(labelLink);

      // Wait a bit before downloading invoice
      await new Promise(resolve => setTimeout(resolve, 500));

      // Download invoice
      const invoiceResponse = await API.get(`/orders/admin/invoice/${order.orderId}`, {
        responseType: 'blob'
      });

      const invoiceBlob = new Blob([invoiceResponse.data], { type: 'application/pdf' });
      const invoiceUrl = window.URL.createObjectURL(invoiceBlob);
      const invoiceLink = document.createElement('a');
      invoiceLink.href = invoiceUrl;
      invoiceLink.download = `invoice_${order.ekartTrackingId}_${order.orderId}.pdf`;
      document.body.appendChild(invoiceLink);
      invoiceLink.click();
      window.URL.revokeObjectURL(invoiceUrl);
      document.body.removeChild(invoiceLink);
      
      console.log('✅ Label & Invoice downloaded:', order.ekartTrackingId);
      showNotification(`Label & Invoice downloaded for order ${order.orderId}`, 'success');
    } catch (error) {
      console.error('❌ Download failed:', error);
      showNotification('Failed to download: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingLabel(null);
      setDownloadingInvoice(null);
    }
  };

  // ========== DOWNLOAD BULK LABELS ==========
  const downloadBulkLabels = async () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders to download labels', 'error');
      return;
    }

    const selectedOrderIds = selectedOrders.map(id => 
      orders.find(order => order._id === id)?.orderId
    ).filter(Boolean);

    if (selectedOrderIds.length === 0) {
      showNotification('No valid orders selected', 'error');
      return;
    }

    if (!confirm(`Download labels for ${selectedOrderIds.length} selected orders?`)) {
      return;
    }

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/labels/bulk', {
        orderIds: selectedOrderIds
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `labels_bulk_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log(`✅ Bulk labels downloaded (${selectedOrderIds.length} orders)`);
      showNotification(`Downloaded ${selectedOrderIds.length} labels`, 'success');
    } catch (error) {
      console.error('❌ Bulk label download failed:', error);
      showNotification('Failed to download bulk labels: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingBulk(false);
    }
  };

  // ========== DOWNLOAD BULK INVOICES ==========
  const downloadBulkInvoices = async () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders to download invoices', 'error');
      return;
    }

    const selectedOrderIds = selectedOrders.map(id => 
      orders.find(order => order._id === id)?.orderId
    ).filter(Boolean);

    if (selectedOrderIds.length === 0) {
      showNotification('No valid orders selected', 'error');
      return;
    }

    if (!confirm(`Download invoices for ${selectedOrderIds.length} selected orders?`)) {
      return;
    }

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/invoices/bulk', {
        orderIds: selectedOrderIds
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices_bulk_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log(`✅ Bulk invoices downloaded (${selectedOrderIds.length} orders)`);
      showNotification(`Downloaded ${selectedOrderIds.length} invoices`, 'success');
    } catch (error) {
      console.error('❌ Bulk invoice download failed:', error);
      showNotification('Failed to download bulk invoices: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingBulk(false);
    }
  };

  // ========== DOWNLOAD MANIFEST ==========
  const downloadManifest = async () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders to download manifest', 'error');
      return;
    }

    const selectedOrderIds = selectedOrders.map(id => 
      orders.find(order => order._id === id)?.orderId
    ).filter(Boolean);

    if (selectedOrderIds.length === 0) {
      showNotification('No valid orders selected', 'error');
      return;
    }

    setDownloadingManifest(true);
    try {
      const response = await API.post('/orders/admin/manifest/bulk', {
        orderIds: selectedOrderIds
      });

      if (response.data.success && response.data.manifestUrl) {
        window.open(response.data.manifestUrl, '_blank');
        console.log('✅ Manifest opened:', response.data.manifestUrl);
        showNotification('Manifest opened in new tab', 'success');
      } else {
        showNotification('Manifest URL not received from server', 'error');
      }
    } catch (error) {
      console.error('❌ Manifest download failed:', error);
      showNotification('Failed to download manifest: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingManifest(false);
    }
  };

  // ========== BULK ACTIONS ==========
  const handleBulkAction = () => {
    if (selectedOrders.length === 0) {
      showNotification('Please select orders first', 'error');
      return;
    }

    if (bulkActionType === 'labels') {
      downloadBulkLabels();
    } else if (bulkActionType === 'invoices') {
      downloadBulkInvoices();
    } else if (bulkActionType === 'manifest') {
      downloadManifest();
    } else if (bulkActionType === 'both') {
      downloadBulkLabels();
      setTimeout(() => downloadBulkInvoices(), 1000);
    }
    setShowBulkOptions(false);
  };

  // Calculate counts for summary
  const getOrderSummary = () => {
    const total = orders.length;
    const cancelled = orders.filter(order => order.ekartStatus === 'Canceled').length;
    const open = orders.filter(order => order.ekartStatus === 'Open').length;
    const readyToShip = orders.filter(order => order.ekartStatus === 'Ready To Ship').length;
    const readyForPickup = orders.filter(order => order.ekartStatus === 'Ready For Pickup').length;
    const inTransit = orders.filter(order => order.ekartStatus === 'In Transit').length;
    const delivered = orders.filter(order => order.ekartStatus === 'Delivered').length;
    const rto = orders.filter(order => order.ekartStatus === 'RTO').length;

    return {
      total,
      cancelled,
      open,
      readyToShip,
      readyForPickup,
      inTransit,
      delivered,
      rto
    };
  };

  const summary = getOrderSummary();

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
    <div className="container mx-auto px-4 py-6 relative">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          notification.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
           <Info className="w-5 h-5" />}
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Orders</h1>

        {/* Order Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Order Summary</h2>
          <div className="flex space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">All</span>
              <span className="font-bold text-gray-800">{summary.total}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Cancelled</span>
              <span className="font-bold text-gray-800">{summary.cancelled}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          {/* Status Filters */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Ready To Ship</h2>
            <div className="flex space-x-4">
              <button
                onClick={() => setStatusFilter('Open')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'Open' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Open {summary.open}
              </button>
              <button
                onClick={() => setStatusFilter('Ready To Ship')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'Ready To Ship' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Ready To Ship {summary.readyToShip}
              </button>
              <button
                onClick={() => setStatusFilter('Ready For Pickup')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'Ready For Pickup' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Ready For Pickup {summary.readyForPickup}
              </button>
              <button
                onClick={() => setStatusFilter('In Transit')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'In Transit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                In Transit {summary.inTransit}
              </button>
              <button
                onClick={() => setStatusFilter('Delivered')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'Delivered' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Delivered {summary.delivered}
              </button>
              <button
                onClick={() => setStatusFilter('RTO')}
                className={`px-4 py-2 rounded-lg ${statusFilter === 'RTO' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                RTO {summary.rto}
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Bulk Action</h2>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Order
              </button>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {selectedOrders.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">
                {selectedOrders.length} orders selected
              </span>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={downloadBulkLabels}
                disabled={downloadingBulk}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <FileDown className="w-4 h-4 mr-2" />
                {downloadingBulk ? 'Downloading...' : 'Download Labels'}
              </button>
              
              <button
                onClick={downloadBulkInvoices}
                disabled={downloadingBulk}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Receipt className="w-4 h-4 mr-2" />
                {downloadingBulk ? 'Downloading...' : 'Download Invoices'}
              </button>
              
              <button
                onClick={downloadManifest}
                disabled={downloadingManifest}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                <Layers className="w-4 h-4 mr-2" />
                {downloadingManifest ? 'Generating...' : 'Download Manifest'}
              </button>
              
              <button
                onClick={() => setSelectedOrders([])}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Refresh */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white border rounded-lg px-3 py-2 w-96">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="ml-2 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {filteredOrders.length} orders found
          </span>
          
          <button 
            onClick={fetchOrders}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Orders Table */}
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
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
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
      </div>

      {/* Order Details Modal */}
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
                </div>
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Summary Cards */}
              <div className="grid grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Order Information</h3>
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
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium">{selectedOrder.channel}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Customer Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium ml-2">{selectedOrder.shippingAddress?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <span className="ml-2">{selectedOrder.shippingAddress?.mobile || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Payment Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span>{selectedOrder.paymentMethod === 'cod' ? 'COD' : 'Prepaid'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold">₹{selectedOrder.finalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ekart Tracking Section */}
              {selectedOrder.ekartTrackingId && (
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-700">Shipment Details</h3>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadLabel(selectedOrder)}
                        disabled={downloadingLabel === selectedOrder.orderId}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                  
                  <div className="text-sm mb-4">
                    <span className="text-gray-600">Tracking ID:</span>
                    <div className="font-mono mt-1 p-2 bg-gray-50 rounded">{selectedOrder.ekartTrackingId}</div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ₹{item.sellingPrice}
                        </div>
                      </div>
                      <div className="font-semibold">₹{item.totalPrice || (item.sellingPrice * item.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Order Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  className="w-full h-32 p-3 border rounded-lg"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={addNoteToOrder}
                    disabled={addingNote || !notes.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingNote ? 'Saving...' : 'Save Note'}
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
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancellingOrder === selectedOrder.orderId ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                  
                  {selectedOrder.ekartStatus === 'Ready To Ship' && !selectedOrder.ekartTrackingId && (
                    <button
                      onClick={() => createShipment(selectedOrder.orderId)}
                      disabled={creatingShipment === selectedOrder.orderId}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {creatingShipment === selectedOrder.orderId ? 'Creating...' : 'Create Shipment'}
                    </button>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <select
                    value={selectedOrder.orderStatus}
                    onChange={(e) => updateOrderStatus(selectedOrder.orderId, e.target.value)}
                    className="px-4 py-2 border rounded-lg"
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