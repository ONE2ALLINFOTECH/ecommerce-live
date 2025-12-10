// components/AdminOrders.js - 100% COMPLETE CODE WITH INVOICE DOWNLOAD
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
  const [viewType, setViewType] = useState('table'); // 'table' or 'card'

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

  // ========== QUICK ACTIONS FOR ALL ORDERS ==========
  const downloadAllLabels = async () => {
    if (!confirm(`Download labels for all ${filteredOrders.length} filtered orders?`)) {
      return;
    }

    const orderIds = filteredOrders
      .filter(order => order.ekartTrackingId)
      .map(order => order.orderId);

    if (orderIds.length === 0) {
      showNotification('No orders with tracking IDs found', 'error');
      return;
    }

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/labels/bulk', {
        orderIds: orderIds
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_labels_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log(`✅ All labels downloaded (${orderIds.length} orders)`);
      showNotification(`Downloaded ${orderIds.length} labels`, 'success');
    } catch (error) {
      console.error('❌ All labels download failed:', error);
      showNotification('Failed to download labels: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingBulk(false);
    }
  };

  const downloadAllInvoices = async () => {
    if (!confirm(`Download invoices for all ${filteredOrders.length} filtered orders?`)) {
      return;
    }

    const orderIds = filteredOrders
      .filter(order => order.ekartTrackingId)
      .map(order => order.orderId);

    if (orderIds.length === 0) {
      showNotification('No orders with tracking IDs found', 'error');
      return;
    }

    setDownloadingBulk(true);
    try {
      const response = await API.post('/orders/admin/invoices/bulk', {
        orderIds: orderIds
      }, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_invoices_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log(`✅ All invoices downloaded (${orderIds.length} orders)`);
      showNotification(`Downloaded ${orderIds.length} invoices`, 'success');
    } catch (error) {
      console.error('❌ All invoices download failed:', error);
      showNotification('Failed to download invoices: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setDownloadingBulk(false);
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

      {/* Quick Action Bar */}
      <div className="mb-4 p-4 bg-gray-50 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-medium text-gray-700">Quick Actions:</span>
            
            <button
              onClick={downloadAllLabels}
              disabled={downloadingBulk}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
            >
              {downloadingBulk ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Download All Labels
                </>
              )}
            </button>
            
            <button
              onClick={downloadAllInvoices}
              disabled={downloadingBulk}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
            >
              {downloadingBulk ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  Download All Invoices
                </>
              )}
            </button>
            
            <button
              onClick={downloadManifest}
              disabled={downloadingManifest}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center text-sm"
            >
              {downloadingManifest ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4 mr-2" />
                  Download Manifest
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">View:</span>
              <div className="flex border rounded-lg">
                <button
                  onClick={() => setViewType('table')}
                  className={`px-3 py-1 text-sm ${viewType === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewType('card')}
                  className={`px-3 py-1 text-sm ${viewType === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">
                  {selectedOrders.length} orders selected
                </span>
              </div>
              
              <button
                onClick={() => setShowBulkOptions(!showBulkOptions)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Bulk Actions
                {showBulkOptions ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </button>
            </div>
            
            <button
              onClick={() => setSelectedOrders([])}
              className="text-gray-600 hover:text-gray-800 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear selection
            </button>
          </div>
          
          {showBulkOptions && (
            <div className="mt-4 p-4 bg-white border rounded-lg">
              <h3 className="font-medium mb-3">Select Bulk Action:</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center p-2 border rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    id="bulk-labels"
                    name="bulk-action"
                    value="labels"
                    checked={bulkActionType === 'labels'}
                    onChange={(e) => setBulkActionType(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="bulk-labels" className="flex items-center cursor-pointer flex-1">
                    <FileDown className="w-5 h-5 mr-3 text-green-600" />
                    <div>
                      <div className="font-medium">Download Labels</div>
                      <div className="text-xs text-gray-500">PDF file with shipping labels</div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center p-2 border rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    id="bulk-invoices"
                    name="bulk-action"
                    value="invoices"
                    checked={bulkActionType === 'invoices'}
                    onChange={(e) => setBulkActionType(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="bulk-invoices" className="flex items-center cursor-pointer flex-1">
                    <Receipt className="w-5 h-5 mr-3 text-blue-600" />
                    <div>
                      <div className="font-medium">Download Invoices</div>
                      <div className="text-xs text-gray-500">PDF file with invoices</div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center p-2 border rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    id="bulk-both"
                    name="bulk-action"
                    value="both"
                    checked={bulkActionType === 'both'}
                    onChange={(e) => setBulkActionType(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="bulk-both" className="flex items-center cursor-pointer flex-1">
                    <Archive className="w-5 h-5 mr-3 text-purple-600" />
                    <div>
                      <div className="font-medium">Download Both</div>
                      <div className="text-xs text-gray-500">Labels & Invoices separately</div>
                    </div>
                  </label>
                </div>
                
                <div className="flex items-center p-2 border rounded hover:bg-gray-50">
                  <input
                    type="radio"
                    id="bulk-manifest"
                    name="bulk-action"
                    value="manifest"
                    checked={bulkActionType === 'manifest'}
                    onChange={(e) => setBulkActionType(e.target.value)}
                    className="mr-3"
                  />
                  <label htmlFor="bulk-manifest" className="flex items-center cursor-pointer flex-1">
                    <Layers className="w-5 h-5 mr-3 text-orange-600" />
                    <div>
                      <div className="font-medium">Download Manifest</div>
                      <div className="text-xs text-gray-500">Shipping manifest document</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBulkOptions(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAction}
                  disabled={downloadingBulk || downloadingManifest}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {(downloadingBulk || downloadingManifest) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Execute Bulk Action
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white border rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="ml-2 outline-none w-64"
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

      {/* TABLE VIEW */}
      {viewType === 'table' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <button
                      onClick={selectAllOrders}
                      className="flex items-center justify-center w-5 h-5"
                    >
                      {selectedOrders.length === filteredOrders.length && filteredOrders.length > 0 ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
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
                  <React.Fragment key={order._id}>
                    <tr className="hover:bg-gray-50">
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
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => viewOrderDetails(order)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </button>
                          
                          {/* Download Buttons */}
                          {order.ekartTrackingId && (
                            <>
                              <button
                                onClick={() => downloadLabel(order)}
                                disabled={downloadingLabel === order.orderId}
                                className="text-green-600 hover:text-green-800 text-sm flex items-center"
                                title="Download Label"
                              >
                                {downloadingLabel === order.orderId ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600 mr-1"></div>
                                    ...
                                  </>
                                ) : (
                                  <>
                                    <FileDown className="w-3 h-3 mr-1" />
                                    Label
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => downloadInvoice(order)}
                                disabled={downloadingInvoice === order.orderId}
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                title="Download Invoice"
                              >
                                {downloadingInvoice === order.orderId ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                    ...
                                  </>
                                ) : (
                                  <>
                                    <Receipt className="w-3 h-3 mr-1" />
                                    Invoice
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => downloadBoth(order)}
                                disabled={downloadingLabel === order.orderId || downloadingInvoice === order.orderId}
                                className="text-purple-600 hover:text-purple-800 text-sm flex items-center"
                                title="Download Both"
                              >
                                <Archive className="w-3 h-3 mr-1" />
                                Both
                              </button>
                            </>
                          )}
                          
                          {order.ekartStatus === 'Ready To Ship' && !order.ekartTrackingId && (
                            <button
                              onClick={() => createShipment(order.orderId)}
                              disabled={creatingShipment === order.orderId}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              {creatingShipment === order.orderId ? 'Creating...' : 'Ship'}
                            </button>
                          )}
                          
                          {order.ekartStatus !== 'Canceled' && order.ekartStatus !== 'Delivered' && (
                            <button
                              onClick={() => cancelOrder(order.orderId)}
                              disabled={cancellingOrder === order.orderId}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              {cancellingOrder === order.orderId ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                          
                          {order.ekartTrackingId && (
                            <a
                              href={`https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 hover:text-orange-800 text-sm flex items-center"
                              title="Track on Ekart"
                            >
                              <Truck className="w-3 h-3 mr-1" />
                              Track
                            </a>
                          )}
                          
                          <button
                            onClick={() => toggleExpandOrder(order._id)}
                            className="text-gray-600 hover:text-gray-800 text-sm flex items-center"
                          >
                            {expandedOrders.includes(order._id) ? (
                              <>
                                <ChevronUp className="w-3 h-3 mr-1" />
                                Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3 mr-1" />
                                More
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Row */}
                    {expandedOrders.includes(order._id) && (
                      <tr className="bg-blue-50">
                        <td colSpan="10" className="px-6 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-gray-700 mb-2">Quick Actions:</div>
                              <div className="flex flex-wrap gap-2">
                                {order.ekartTrackingId ? (
                                  <>
                                    <button
                                      onClick={() => downloadLabel(order)}
                                      disabled={downloadingLabel === order.orderId}
                                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center"
                                    >
                                      <FileDown className="w-3 h-3 mr-1" />
                                      Label PDF
                                    </button>
                                    <button
                                      onClick={() => downloadInvoice(order)}
                                      disabled={downloadingInvoice === order.orderId}
                                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 flex items-center"
                                    >
                                      <Receipt className="w-3 h-3 mr-1" />
                                      Invoice PDF
                                    </button>
                                    <button
                                      onClick={() => downloadBoth(order)}
                                      disabled={downloadingLabel === order.orderId || downloadingInvoice === order.orderId}
                                      className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:opacity-50 flex items-center"
                                    >
                                      <Archive className="w-3 h-3 mr-1" />
                                      Both PDFs
                                    </button>
                                    <a
                                      href={`https://app.elite.ekartlogistics.in/track/${order.ekartTrackingId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 flex items-center"
                                    >
                                      <Truck className="w-3 h-3 mr-1" />
                                      Track on Ekart
                                    </a>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => createShipment(order.orderId)}
                                    disabled={creatingShipment === order.orderId}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 flex items-center"
                                  >
                                    <Truck className="w-3 h-3 mr-1" />
                                    Create Shipment
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-700 mb-2">Order Details:</div>
                              <div className="space-y-1">
                                <div>Amount: ₹{order.finalAmount}</div>
                                <div>Items: {order.items.length} products</div>
                                {order.ekartTrackingId && (
                                  <div className="font-mono text-xs">Tracking: {order.ekartTrackingId}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
      )}

      {/* CARD VIEW */}
      {viewType === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-gray-900">{order.displayOrderId}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order._id)}
                  onChange={() => toggleOrderSelection(order._id)}
                  className="rounded"
                />
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEkartStatusColor(order.ekartStatus)}`}>
                    {order.ekartStatus}
                  </span>
                  <span className="font-medium">₹{order.finalAmount}</span>
                </div>
                
                <div className="text-sm text-gray-600 mb-1">
                  <User className="w-3 h-3 inline mr-1" />
                  {order.shippingAddress?.name || 'Customer'}
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />
                  {order.shippingAddress?.mobile || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {order.shippingAddress?.city || ''}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Items:</div>
                <div className="text-sm text-gray-600">{order.displayItems}</div>
              </div>
              
              {order.ekartTrackingId && (
                <div className="mb-3 p-2 bg-blue-50 rounded">
                  <div className="text-xs font-medium text-blue-800 mb-1">Tracking ID:</div>
                  <div className="font-mono text-sm">{order.ekartTrackingId}</div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => viewOrderDetails(order)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </button>
                
                {order.ekartTrackingId && (
                  <>
                    <button
                      onClick={() => downloadLabel(order)}
                      disabled={downloadingLabel === order.orderId}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                      <FileDown className="w-3 h-3 mr-1" />
                      Label
                    </button>
                    
                    <button
                      onClick={() => downloadInvoice(order)}
                      disabled={downloadingInvoice === order.orderId}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      <Receipt className="w-3 h-3 mr-1" />
                      Invoice
                    </button>
                  </>
                )}
                
                {order.ekartStatus === 'Ready To Ship' && !order.ekartTrackingId && (
                  <button
                    onClick={() => createShipment(order.orderId)}
                    disabled={creatingShipment === order.orderId}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {creatingShipment === order.orderId ? 'Creating...' : 'Ship'}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {filteredOrders.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No orders match the selected filter'}
              </p>
            </div>
          )}
        </div>
      )}

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
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      Ekart Shipment Details
                    </h3>
                    
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
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Tracking ID:</span>
                      <div className="font-mono mt-1 bg-white p-2 rounded border">{selectedOrder.ekartTrackingId}</div>
                    </div>
                    {selectedOrder.ekartAWB && (
                      <div>
                        <span className="text-gray-600">AWB Number:</span>
                        <div className="font-mono mt-1 bg-white p-2 rounded border">{selectedOrder.ekartAWB}</div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Expected Delivery:</span>
                      <div className="mt-1 bg-white p-2 rounded border">
                        {selectedOrder.expectedDelivery 
                          ? new Date(selectedOrder.expectedDelivery).toLocaleDateString()
                          : 'Not set'}
                      </div>
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
                          Open in Ekart Portal
                        </a>
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
                  
                  {selectedOrder.ekartTrackingId && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => downloadLabel(selectedOrder)}
                        disabled={downloadingLabel === selectedOrder.orderId}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {downloadingLabel === selectedOrder.orderId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <FileDown className="w-4 h-4" />
                            Download Label
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => downloadInvoice(selectedOrder)}
                        disabled={downloadingInvoice === selectedOrder.orderId}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {downloadingInvoice === selectedOrder.orderId ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Receipt className="w-4 h-4" />
                            Download Invoice
                          </>
                        )}
                      </button>
                    </div>
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