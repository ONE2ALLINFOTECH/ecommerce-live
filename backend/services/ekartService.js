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

  // ✅ AUTHENTICATION - FIXED ENDPOINT
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ekart...');
      
      // ⚠️ CORRECTED: Use proper OAuth endpoint from documentation
      const response = await axios.post(
        `${this.baseURL}/api/v1/oauth/token`,  // ✅ FIXED ENDPOINT
        {
          username: this.username,
          password: this.password,
          client_id: this.clientId,
          grant_type: "password"  // ✅ REQUIRED
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ Auth Response:', response.data);

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Token received, expires in:', expiresIn, 'seconds');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('❌ Auth failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ GET VALID TOKEN
  async getAccessToken() {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      console.log('🔄 Token expired, re-authenticating...');
      await this.authenticate();
    }
    return this.accessToken;
  }

  // ✅ CREATE HEADERS WITH TOKEN
  async createHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // ✅ CREATE SHIPMENT - FIXED ENDPOINT & PAYLOAD
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('📦 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();
      const totalWeight = this.calculateTotalWeight(items);

      // ✅ CORRECTED PAYLOAD according to Ekart API documentation
      const shipmentPayload = {
        // Seller Information
        origin: {
          name: process.env.SELLER_NAME,
          address: process.env.SELLER_ADDRESS,
          city: process.env.SELLER_CITY,
          state: process.env.SELLER_STATE,
          pincode: process.env.SELLER_PINCODE,
          country: "IN",
          phone: "7303424343",  // ⚠️ ADD YOUR PHONE
          email: process.env.EKART_USERNAME
        },

        // Customer Information
        destination: {
          name: shippingAddress.name,
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: "IN",
          phone: shippingAddress.mobile,
          email: "customer@example.com"  // Optional
        },

        // Package Details
        package: {
          weight: totalWeight,  // in grams
          length: 15,  // in cm
          breadth: 15,
          height: 15,
          description: items.map(item => item.name).join(', ').substring(0, 100)
        },

        // Order Details
        order: {
          order_id: orderData.orderId,
          order_date: new Date().toISOString(),
          payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'PREPAID',
          invoice_value: parseFloat(orderData.finalAmount),
          cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount) : 0,
          total_amount: parseFloat(orderData.finalAmount)
        },

        // GST Details (if applicable)
        gst: {
          seller_gstin: process.env.SELLER_GST_TIN,
          invoice_number: orderData.orderId,
          invoice_date: new Date().toISOString().split('T')[0]
        },

        // Service Type
        service_type: "STANDARD"  // or "EXPRESS"
      };

      console.log('📤 Sending shipment payload:', JSON.stringify(shipmentPayload, null, 2));

      // ✅ CORRECTED: Use proper endpoint from documentation
      const response = await axios.post(
        `${this.baseURL}/api/cp/v1/orders`,  // ✅ FIXED ENDPOINT
        shipmentPayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('✅ Shipment created successfully:', response.data);
      
      // ✅ Return normalized response
      return {
        tracking_id: response.data.tracking_id || response.data.awb_number || response.data.order_id,
        awb_number: response.data.awb_number || response.data.tracking_id,
        label_url: response.data.label_url || response.data.manifest_url,
        status: response.data.status || 'created',
        message: response.data.message || 'Shipment created successfully',
        raw_response: response.data
      };

    } catch (error) {
      console.error('❌ Shipment creation failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        payload: error.config?.data
      });
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ CANCEL SHIPMENT - FIXED ENDPOINT
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      // ✅ CORRECTED: Use proper endpoint
      const response = await axios.post(
        `${this.baseURL}/api/cp/v1/orders/${trackingId}/cancel`,  // ✅ FIXED
        {},
        {
          headers,
          timeout: 30000
        }
      );

      console.log('✅ Shipment cancelled:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Cancellation failed:', error.response?.data || error.message);
      
      // Don't throw if already cancelled
      if (error.response?.status === 404) {
        return { success: true, message: 'Shipment not found or already cancelled' };
      }
      
      throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ TRACK SHIPMENT - FIXED ENDPOINT
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking shipment:', trackingId);

      const headers = await this.createHeaders();

      // ✅ CORRECTED: Use proper endpoint
      const response = await axios.get(
        `${this.baseURL}/api/cp/v1/awbs/${trackingId}`,  // ✅ FIXED
        {
          headers,
          timeout: 30000
        }
      );

      console.log('📊 Tracking response:', response.data);

      return {
        tracking_id: trackingId,
        current_status: response.data.current_status || response.data.status || 'In Transit',
        shipment_status: response.data.shipment_status || response.data.status,
        scans: this.normalizeScans(response.data.scans || response.data.tracking_data || []),
        estimated_delivery: response.data.estimated_delivery_date || response.data.edd,
        awb: response.data.awb_number || trackingId,
        raw_data: response.data
      };

    } catch (error) {
      console.error('❌ Tracking failed:', error.response?.data || error.message);
      
      return {
        tracking_id: trackingId,
        current_status: 'Tracking information unavailable',
        shipment_status: 'pending',
        scans: [],
        error: error.message
      };
    }
  }

  // ✅ NORMALIZE SCAN DATA
  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.scan_type || scan.status || scan.activity,
      location: scan.location || scan.scan_location || 'N/A',
      timestamp: scan.scan_datetime || scan.timestamp || scan.date,
      remarks: scan.remarks || scan.instructions || ''
    }));
  }

  // ✅ CHECK SERVICEABILITY - FIXED ENDPOINT
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability:', pincode);

      const headers = await this.createHeaders();

      // ✅ CORRECTED: Use proper endpoint
      const response = await axios.get(
        `${this.baseURL}/api/v1/serviceability/pincodes/${pincode}`,  // ✅ FIXED
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('📍 Serviceability response:', response.data);

      const data = response.data;
      return {
        serviceable: data.serviceable !== false && data.forward_drop !== false,
        cod_available: data.cod_available || data.max_cod_amount > 0,
        prepaid_available: data.prepaid_available !== false,
        max_cod_amount: data.max_cod_amount || 50000,
        estimated_delivery_days: data.delivery_days || data.edd_days || 3,
        raw_data: data
      };

    } catch (error) {
      console.error('❌ Serviceability check failed:', error.message);

      // ✅ Return default serviceable to not block orders
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

  // ✅ GET SHIPPING RATES - FIXED
  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      console.log('💰 Getting shipping rates...');

      const headers = await this.createHeaders();

      const ratePayload = {
        origin_pincode: parseInt(pickupPincode),
        destination_pincode: parseInt(deliveryPincode),
        payment_mode: codAmount > 0 ? "COD" : "PREPAID",
        weight: weight,  // in grams
        cod_amount: codAmount
      };

      const response = await axios.post(
        `${this.baseURL}/api/cp/v1/rates`,  // ✅ FIXED
        ratePayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Rates fetch failed:', error.message);
      
      // Return default rates
      return {
        success: false,
        message: 'Unable to fetch rates',
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50
      };
    }
  }

  // ✅ CALCULATE WEIGHT (in grams)
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    // 500g per item, minimum 1kg (1000g)
    const calculatedWeight = totalItems * 500;
    return Math.max(calculatedWeight, 1000);
  }
}

module.exports = new EkartService();