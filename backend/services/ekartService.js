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

  // ✅ FIXED: Create shipment with correct endpoint and payload
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Calculate weight properly
      const totalWeight = this.calculateTotalWeight(items);

      // ✅ CORRECT PAYLOAD STRUCTURE for Ekart Elite API v2
      const shipmentPayload = {
        // Seller Information
        seller_details: {
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          gstin: process.env.SELLER_GST_TIN || "07AACCO4657Q1ZS",
          address_line_1: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1",
          address_line_2: "DINDARPUR, NAJAFGARH",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          pincode: process.env.SELLER_PINCODE || "110043",
          country: "India"
        },

        // Customer Information
        customer_details: {
          name: shippingAddress.name,
          phone: shippingAddress.mobile,
          alternate_phone: shippingAddress.alternatePhone || "",
          address_line_1: shippingAddress.address,
          address_line_2: shippingAddress.locality,
          landmark: shippingAddress.landmark || "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          country: "India"
        },

        // Order Information
        order_details: {
          reference_number: orderData.orderId, // Your order ID
          order_date: new Date().toISOString().split('T')[0],
          payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
          total_amount: parseFloat(orderData.finalAmount),
          cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount) : 0
        },

        // Package Information
        package_details: {
          weight: totalWeight, // in grams
          length: 15, // in cm
          breadth: 15, // in cm
          height: 15, // in cm
          quantity: items.reduce((sum, item) => sum + item.quantity, 0),
          description: items.map(item => item.name).join(', ').substring(0, 100),
          category: 'GENERAL',
          invoice_number: orderData.orderId,
          invoice_date: new Date().toISOString().split('T')[0],
          invoice_amount: parseFloat(orderData.finalAmount),
          hsn_code: "" // Add if you have HSN codes
        },

        // Shipping Details
        shipping_details: {
          service_type: "SURFACE", // or "EXPRESS"
          pickup_type: "WAREHOUSE" // or "DOORSTEP"
        }
      };

      console.log('📦 Ekart shipment payload:', JSON.stringify(shipmentPayload, null, 2));

      // ✅ CORRECT ENDPOINT
      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipment/forward`,
        shipmentPayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('✅ Ekart shipment created successfully:', response.data);
      
      // Return normalized response
      return {
        tracking_id: response.data.data?.tracking_id || response.data.tracking_id,
        awb_number: response.data.data?.awb_number || response.data.awb,
        label_url: response.data.data?.label_url || response.data.labelUrl,
        status: response.data.status || 'created',
        message: response.data.message || 'Shipment created successfully',
        raw_response: response.data
      };

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        payload: error.config?.data
      });
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ FIXED: Cancel shipment endpoint
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipment/cancel`,
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
      
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        console.log('⚠️ Shipment not found or already cancelled');
        return { success: true, message: 'Shipment not found or already cancelled' };
      }
      
      throw new Error(`Shipment cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ FIXED: Track shipment endpoint
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/track/${trackingId}`,
        {
          headers,
          timeout: 30000
        }
      );

      console.log('📊 Tracking response:', response.data);

      const trackingData = response.data.data || response.data;
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
      
      return {
        tracking_id: trackingId,
        current_status: 'Tracking information unavailable',
        shipment_status: 'pending',
        scans: [],
        error: error.message
      };
    }
  }

  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.scan_type || scan.status || scan.activity,
      location: scan.location || scan.scan_location || 'N/A',
      timestamp: scan.scan_datetime || scan.timestamp || scan.date,
      remarks: scan.remarks || scan.instructions || ''
    }));
  }

  // ✅ FIXED: Serviceability check endpoint
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for pincode:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/serviceability/${pincode}`,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('📍 Serviceability response:', response.data);

      const serviceData = response.data.data || response.data;
      return {
        serviceable: serviceData.serviceable !== false && serviceData.forward_drop !== false,
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

  // ✅ FIXED: Shipping rates endpoint
  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      console.log('💰 Getting shipping rates...');

      const headers = await this.createHeaders();

      const ratePayload = {
        pickup_pincode: parseInt(pickupPincode),
        delivery_pincode: parseInt(deliveryPincode),
        cod_amount: codAmount,
        weight: weight,
        length: 15,
        breadth: 15,
        height: 15,
        payment_mode: codAmount > 0 ? "COD" : "Prepaid"
      };

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/calculator/rate`,
        ratePayload,
        { 
          headers,
          timeout: 30000 
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Shipping rates fetch failed:', error.response?.data || error.message);
      
      return {
        success: false,
        message: 'Unable to fetch rates, using default',
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50
      };
    }
  }

  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    // 500g per item, minimum 1kg (1000g)
    const calculatedWeight = totalItems * 500;
    return Math.max(calculatedWeight, 1000);
  }
}

module.exports = new EkartService();