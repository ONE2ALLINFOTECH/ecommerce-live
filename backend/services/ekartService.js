const axios = require('axios');

class EkartService {
  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID;
    this.username = process.env.EKART_USERNAME;
    this.password = process.env.EKART_PASSWORD;
    this.baseURL = process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ekart...');
      console.log('Client ID:', this.clientId);
      console.log('Username:', this.username);
      
      const response = await axios.post(
        `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`,
        {
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('🔐 Ekart Auth Response:', response.data);

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Set expiry with 5 minute buffer
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Ekart authentication successful');
        console.log('🔑 Token expires in:', expiresIn, 'seconds');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response from Ekart');
      }
    } catch (error) {
      console.error('❌ Ekart authentication failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      throw new Error(`Ekart authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAccessToken() {
    // Check if token exists and is not expired
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      console.log('🔄 Token expired or missing, re-authenticating...');
      await this.authenticate();
    }
    return this.accessToken;
  }

  async createHeaders() {
    try {
      const token = await this.getAccessToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('❌ Failed to create headers:', error.message);
      throw error;
    }
  }

  // Create shipment in Ekart
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Calculate weight properly
      const totalWeight = this.calculateTotalWeight(items);

      // Prepare shipment payload according to Ekart API
      const shipmentPayload = {
        seller_name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
        seller_address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
        seller_gst_tin: process.env.SELLER_GST_TIN || "07AACCO4657Q1ZS",
        consignee_name: shippingAddress.name,
        consignee_gst_tin: "",
        invoice_number: orderData.orderId,
        invoice_date: new Date().toISOString().split('T')[0],
        document_number: orderData.orderId,
        document_date: new Date().toISOString().split('T')[0],
        products_desc: items.map(item => item.name).join(', ').substring(0, 100),
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        category_of_goods: 'GENERAL',
        hsn_code: '',
        total_amount: parseFloat(orderData.finalAmount),
        tax_value: 0,
        taxable_amount: parseFloat(orderData.finalAmount),
        commodity_value: parseFloat(orderData.finalAmount).toString(),
        cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount) : 0,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        weight: totalWeight,
        length: 15,
        width: 15,
        height: 15,
        drop_location: {
          location_type: "drop",
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India",
          pincode: shippingAddress.pincode,
          name: shippingAddress.name,
          phone: shippingAddress.mobile
        },
        pickup_location: {
          location_type: "pickup",
          address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          country: "India",
          pincode: process.env.SELLER_PINCODE || "110043"
        },
        return_location: {
          location_type: "return",
          address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          country: "India",
          pincode: process.env.SELLER_PINCODE || "110043"
        }
      };

      console.log('📦 Ekart shipment payload:', JSON.stringify(shipmentPayload, null, 2));

      const response = await axios.post(
        `${this.baseURL}/api/v1/package/create`,
        shipmentPayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('✅ Ekart shipment created successfully:', response.data);
      
      // Return normalized response
      return {
        tracking_id: response.data.tracking_id || response.data.trackingId || response.data.reference_number,
        awb_number: response.data.awb_number || response.data.awb || response.data.tracking_id,
        label_url: response.data.label_url || response.data.labelUrl,
        status: response.data.status || 'created',
        message: response.data.message || 'Shipment created successfully',
        raw_response: response.data
      };

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Cancel shipment in Ekart
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/api/v1/package/cancel`,
        { 
          tracking_id: trackingId 
        },
        {
          headers,
          timeout: 30000
        }
      );

      console.log('✅ Ekart shipment cancelled successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Ekart shipment cancellation failed:', error.response?.data || error.message);
      
      // Don't throw error if shipment is already cancelled or not found
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        console.log('⚠️ Shipment not found or already cancelled');
        return { success: true, message: 'Shipment not found or already cancelled' };
      }
      
      throw new Error(`Shipment cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Track shipment
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v1/package/track/${trackingId}`,
        {
          headers,
          timeout: 30000
        }
      );

      console.log('📊 Tracking response:', response.data);

      // Normalize tracking response
      const trackingData = response.data;
      return {
        tracking_id: trackingId,
        current_status: trackingData.current_status || trackingData.status || 'In Transit',
        shipment_status: trackingData.shipment_status || trackingData.status,
        scans: this.normalizeScans(trackingData.scans || trackingData.tracking_data || []),
        estimated_delivery: trackingData.estimated_delivery_date || trackingData.edd,
        awb: trackingData.awb_number || trackingData.awb,
        raw_data: trackingData
      };

    } catch (error) {
      console.error('❌ Ekart tracking failed:', error.response?.data || error.message);
      
      // Return basic tracking info even if API fails
      return {
        tracking_id: trackingId,
        current_status: 'Tracking information unavailable',
        shipment_status: 'pending',
        scans: [],
        error: error.message
      };
    }
  }

  // Normalize scan data
  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.scan_type || scan.status || scan.activity,
      location: scan.location || scan.scan_location || 'N/A',
      timestamp: scan.scan_datetime || scan.timestamp || scan.date,
      remarks: scan.remarks || scan.instructions || ''
    }));
  }

  // Get shipping rates
  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      console.log('💰 Getting shipping rates...');

      const headers = await this.createHeaders();

      const ratePayload = {
        pickupPincode: parseInt(pickupPincode),
        deliveryPincode: parseInt(deliveryPincode),
        codAmount: codAmount,
        serviceType: "SURFACE",
        packages: [
          {
            weight: weight,
            length: 15,
            width: 15,
            height: 15
          }
        ]
      };

      const response = await axios.post(
        `${this.baseURL}/data/pricing/estimate`,
        ratePayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Shipping rates fetch failed:', error.response?.data || error.message);
      
      // Return default rates if API fails
      return {
        success: false,
        message: 'Unable to fetch rates, using default',
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50
      };
    }
  }

  // Check serviceability - IMPROVED VERSION
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for pincode:', pincode);

      const headers = await this.createHeaders();

      console.log('🔑 Headers for serviceability:', headers);

      const response = await axios.get(
        `${this.baseURL}/api/v2/serviceability/${pincode}`,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('📍 Serviceability response:', response.data);

      // Normalize response
      const serviceData = response.data;
      return {
        serviceable: serviceData.forward_drop !== false && serviceData.serviceable !== false,
        cod_available: serviceData.cod_available || serviceData.max_cod_amount > 0,
        prepaid_available: serviceData.prepaid_available !== false,
        max_cod_amount: serviceData.max_cod_amount || 50000,
        estimated_delivery_days: serviceData.delivery_days || serviceData.edd_days || 3,
        raw_data: serviceData
      };

    } catch (error) {
      console.error('❌ Serviceability check failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // IMPORTANT: Return serviceable = true to allow order processing
      // This ensures orders aren't blocked due to API issues
      console.log('🔄 Returning default serviceable response (API unavailable)');
      return {
        serviceable: true,
        cod_available: true,
        prepaid_available: true,
        max_cod_amount: 50000,
        estimated_delivery_days: 3,
        warning: 'Serviceability check temporarily unavailable',
        error: error.message
      };
    }
  }

  // Helper method to calculate total weight
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    // Assume 500g per item, minimum 1kg (1000g)
    const calculatedWeight = totalItems * 500;
    return Math.max(calculatedWeight, 1000);
  }
}

module.exports = new EkartService();