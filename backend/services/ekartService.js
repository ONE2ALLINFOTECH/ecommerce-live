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

      console.log('🔐 Ekart Auth Response Status:', response.status);

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Ekart authentication successful');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response from Ekart');
      }
    } catch (error) {
      console.error('❌ Ekart authentication failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
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
        'Content-Type': 'application/json',
        'User-Agent': 'Ekart-API-Client/1.0.0'
      };
    } catch (error) {
      console.error('❌ Failed to create headers:', error.message);
      throw error;
    }
  }

  // Create shipment in Ekart - FIXED VERSION
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Calculate weight properly
      const totalWeight = this.calculateTotalWeight(items);

      // Prepare shipment payload according to Ekart API - FIXED STRUCTURE
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
          phone: shippingAddress.mobile.toString()
        },
        pickup_location: {
          location_type: "pickup",
          address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          country: "India",
          pincode: process.env.SELLER_PINCODE || "110043",
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          phone: "9634756593" // Default phone for pickup
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

      console.log('📦 Ekart shipment payload prepared');
      console.log('📍 Drop Location:', shipmentPayload.drop_location);
      console.log('💰 Payment Mode:', shipmentPayload.payment_mode);
      console.log('📦 Weight:', shipmentPayload.weight);

      const response = await axios.post(
        `${this.baseURL}/api/v1/package/create`,
        shipmentPayload,
        { 
          headers,
          timeout: 45000 // Increased timeout
        }
      );

      console.log('✅ Ekart shipment API response:', {
        status: response.status,
        data: response.data
      });
      
      if (!response.data) {
        throw new Error('Empty response from Ekart API');
      }

      // Extract tracking ID properly from different possible response formats
      let trackingId = null;
      let awbNumber = null;

      if (response.data.tracking_id) {
        trackingId = response.data.tracking_id;
      } else if (response.data.trackingId) {
        trackingId = response.data.trackingId;
      } else if (response.data.reference_number) {
        trackingId = response.data.reference_number;
      } else if (response.data.id) {
        trackingId = response.data.id;
      }

      if (response.data.awb_number) {
        awbNumber = response.data.awb_number;
      } else if (response.data.awb) {
        awbNumber = response.data.awb;
      } else if (response.data.tracking_id) {
        awbNumber = response.data.tracking_id;
      }

      // If no tracking ID found, throw error
      if (!trackingId) {
        console.error('❌ No tracking ID found in response:', response.data);
        throw new Error('No tracking ID received from Ekart');
      }

      console.log('🎯 Extracted Tracking ID:', trackingId);
      console.log('📋 Extracted AWB:', awbNumber);
      
      // Return normalized response
      return {
        success: true,
        tracking_id: trackingId,
        awb_number: awbNumber || trackingId,
        label_url: response.data.label_url || response.data.labelUrl,
        status: response.data.status || 'created',
        message: response.data.message || 'Shipment created successfully',
        raw_response: response.data
      };

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method
        }
      });
      
      // More detailed error message
      let errorMessage = 'Shipment creation failed: ';
      if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else {
        errorMessage += error.message;
      }
      
      throw new Error(errorMessage);
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
      return {
        success: true,
        message: 'Shipment cancelled successfully',
        data: response.data
      };

    } catch (error) {
      console.error('❌ Ekart shipment cancellation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        console.log('⚠️ Shipment not found or already cancelled');
        return { 
          success: true, 
          message: 'Shipment not found or already cancelled' 
        };
      }
      
      throw new Error(`Shipment cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Track shipment - IMPROVED
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

      console.log('📊 Tracking response received');

      const trackingData = response.data;
      
      // Normalize tracking response
      return {
        tracking_id: trackingId,
        current_status: trackingData.current_status || trackingData.status || 'In Transit',
        shipment_status: trackingData.shipment_status || trackingData.status || 'pending',
        scans: this.normalizeScans(trackingData.scans || trackingData.tracking_data || []),
        estimated_delivery: trackingData.estimated_delivery_date || trackingData.edd,
        awb: trackingData.awb_number || trackingData.awb || trackingId,
        raw_data: trackingData
      };

    } catch (error) {
      console.error('❌ Ekart tracking failed:', {
        message: error.message,
        status: error.response?.status
      });
      
      return {
        tracking_id: trackingId,
        current_status: 'Tracking information unavailable',
        shipment_status: 'pending',
        scans: [],
        error: error.message,
        warning: 'Tracking information will be available once shipment is picked up'
      };
    }
  }

  // Normalize scan data
  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.scan_type || scan.status || scan.activity || 'Status Update',
      location: scan.location || scan.scan_location || scan.city || 'N/A',
      timestamp: scan.scan_datetime || scan.timestamp || scan.date || new Date().toISOString(),
      remarks: scan.remarks || scan.instructions || scan.comment || ''
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

      return {
        success: true,
        ...response.data
      };

    } catch (error) {
      console.error('❌ Shipping rates fetch failed:', error.message);
      
      return {
        success: false,
        message: 'Unable to fetch rates, using default',
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50,
        error: error.message
      };
    }
  }

  // Check serviceability - IMPROVED
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for pincode:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v2/serviceability/${pincode}`,
        { 
          headers,
          timeout: 30000 
        }
      );

      console.log('📍 Serviceability API response received');

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
      console.error('❌ Serviceability check failed:', error.message);

      // Return serviceable = true to allow order processing even if API fails
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

  // NEW METHOD: Check if shipment exists in Ekart dashboard
  async checkShipmentInDashboard(trackingId) {
    try {
      console.log('📋 Checking shipment in Ekart dashboard:', trackingId);

      const headers = await this.createHeaders();

      // Try to get shipment details
      const response = await axios.get(
        `${this.baseURL}/api/v1/package/details/${trackingId}`,
        {
          headers,
          timeout: 30000
        }
      );

      console.log('📋 Shipment details response:', response.data);

      return {
        exists: true,
        status: response.data.status || 'unknown',
        data: response.data
      };

    } catch (error) {
      console.error('❌ Shipment not found in dashboard:', error.message);
      return {
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = new EkartService();