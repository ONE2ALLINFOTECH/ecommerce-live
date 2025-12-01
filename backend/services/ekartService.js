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

  // ✅ FIXED: Correct Ekart V1 Authentication
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ekart V1 API...');
      console.log('Username:', this.username);
      console.log('Client ID:', this.clientId);
      
      // ✅ CORRECT: V1 API authentication endpoint
      const response = await axios.post(
        `${this.baseURL}/api/v1/auth/token`,
        {
          client_id: this.clientId,  // ✅ Client ID in body, not URL
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

      console.log('✅ Auth Response Status:', response.status);
      console.log('✅ Auth Response:', JSON.stringify(response.data, null, 2));

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Authentication successful');
        console.log('✅ Token (first 30 chars):', this.accessToken.substring(0, 30) + '...');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response from Ekart');
      }
    } catch (error) {
      console.error('❌ Ekart authentication failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data
        }
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
        'Accept': 'application/json'
      };
    } catch (error) {
      console.error('❌ Failed to create headers:', error.message);
      throw error;
    }
  }

  // Format phone number - must be exactly 10 digits as INTEGER
  formatPhone(phone) {
    const cleaned = phone.toString().replace(/\D/g, '');
    const last10 = cleaned.slice(-10);
    return parseInt(last10);
  }

  // Calculate weight based on items
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedWeight = totalItems * 500; // 500g per item
    return Math.max(calculatedWeight, 1000); // minimum 1kg
  }

  // ✅ FIXED: Correct Ekart V1 Shipment Creation
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);
      console.log('📋 Full Order Data:', JSON.stringify(orderData, null, 2));
      console.log('📍 Shipping Address:', JSON.stringify(shippingAddress, null, 2));
      console.log('📦 Items:', JSON.stringify(items, null, 2));

      const headers = await this.createHeaders();
      console.log('🔑 Headers created successfully');

      // Calculate values
      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const finalAmount = parseFloat(orderData.finalAmount);
      const taxableAmount = parseFloat((finalAmount / 1.18).toFixed(2));
      const taxValue = parseFloat((finalAmount - taxableAmount).toFixed(2));

      // ✅ CORRECT: Using exact values from your Ekart dashboard
      const shipmentPayload = {
        // Seller Information - EXACTLY as in Ekart dashboard
        seller_name: "ONE2ALL RECHARGE PRIVATE LIMITED",
        seller_address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
        seller_gst_tin: "07AACCO4657Q1ZS",
        
        // Order Details
        order_number: orderData.orderId,
        invoice_number: orderData.orderId,
        invoice_date: new Date().toISOString().split('T')[0],
        
        // Consignee
        consignee_name: shippingAddress.name,
        
        // Payment Details
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        cod_amount: orderData.paymentMethod === 'cod' ? finalAmount : 0,
        
        // Product Details
        category_of_goods: "General",
        products_desc: items.map(item => item.name).join(', ').substring(0, 100),
        
        // Amount Details
        total_amount: finalAmount,
        tax_value: taxValue,
        taxable_amount: taxableAmount,
        commodity_value: taxableAmount,
        
        // Package Details
        quantity: totalQuantity,
        weight: totalWeight,
        length: 15,
        height: 15,
        width: 15,
        
        // Drop Location (Customer Address)
        drop_location: {
          name: shippingAddress.name,
          phone: this.formatPhone(shippingAddress.mobile),
          pin: parseInt(shippingAddress.pincode),
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India"
        },
        
        // ✅ FIXED: Pickup Location - Using dashboard values
        pickup_location: {
          name: "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )",
          phone: 7303424343, // ✅ From dashboard
          pin: 110043,
          address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: "NEW DELHI",
          state: "Delhi",
          country: "India"
        },
        
        // ✅ FIXED: Return Location - Using dashboard values
        return_location: {
          name: "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )",
          phone: 7303424343, // ✅ From dashboard
          pin: 110043,
          address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: "NEW DELHI",
          state: "Delhi",
          country: "India"
        }
      };

      console.log('📦 Final Ekart Shipment Payload:');
      console.log(JSON.stringify(shipmentPayload, null, 2));

      // ✅ CORRECT: V1 API endpoint
      console.log('🌐 Calling Ekart API:', `${this.baseURL}/api/v1/package/create`);
      
      const response = await axios.put(
        `${this.baseURL}/api/v1/package/create`,
        shipmentPayload,
        { 
          headers,
          timeout: 60000, // Increased timeout
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        }
      );

      console.log('📡 Ekart Response Status:', response.status);
      console.log('📡 Ekart Response Data:', JSON.stringify(response.data, null, 2));

      // Check response
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        
        // Handle both possible response structures
        const trackingId = data.tracking_id || data.data?.tracking_id || data._id;
        const awbNumber = data.barcodes?.wbn || data.data?.barcodes?.wbn || trackingId;

        if (trackingId) {
          console.log('✅ ✅ ✅ SHIPMENT CREATED SUCCESSFULLY!');
          console.log('🎯 Tracking ID:', trackingId);
          console.log('📋 AWB Number:', awbNumber);
          
          return {
            success: true,
            tracking_id: trackingId,
            awb_number: awbNumber,
            vendor: data.vendor || data.data?.vendor || 'Ekart',
            barcodes: data.barcodes || data.data?.barcodes,
            status: 'created',
            message: data.remark || data.message || 'Shipment created successfully',
            raw_response: data
          };
        } else {
          console.error('❌ No tracking ID in successful response');
          console.error('Full response:', JSON.stringify(data, null, 2));
          throw new Error('No tracking ID received despite successful API call');
        }
      } else {
        // API returned error
        console.error('❌ Ekart API Error Response:', JSON.stringify(response.data, null, 2));
        const errorMsg = response.data?.remark || response.data?.message || `API returned status ${response.status}`;
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('❌ ❌ ❌ SHIPMENT CREATION FAILED');
      console.error('Error Message:', error.message);
      console.error('Error Status:', error.response?.status);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Request Config:', {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        data: error.config?.data ? JSON.parse(error.config.data) : null
      });
      
      let errorMessage = 'Shipment creation failed: ';
      if (error.response?.data?.remark) {
        errorMessage += error.response.data.remark;
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.data) {
        errorMessage += JSON.stringify(error.response.data);
      } else {
        errorMessage += error.message;
      }
      
      throw new Error(errorMessage);
    }
  }

  // Cancel shipment
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.delete(
        `${this.baseURL}/api/v1/package/cancel`,
        {
          params: { tracking_id: trackingId },
          headers,
          timeout: 30000
        }
      );

      console.log('✅ Shipment cancelled');
      return {
        success: true,
        message: response.data.remark || 'Shipment cancelled successfully',
        data: response.data
      };

    } catch (error) {
      console.error('❌ Cancellation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        return { 
          success: true, 
          message: 'Shipment not found or already cancelled' 
        };
      }
      
      throw new Error(`Cancellation failed: ${error.response?.data?.remark || error.message}`);
    }
  }

  // Track shipment - PUBLIC API
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking shipment:', trackingId);

      const response = await axios.get(
        `${this.baseURL}/api/v1/track/${trackingId}`,
        { timeout: 30000 }
      );

      const data = response.data;
      
      return {
        tracking_id: data._id || trackingId,
        current_status: data.track?.status || 'In Transit',
        shipment_status: data.track?.status || 'pending',
        scans: this.normalizeScans(data.track?.details || []),
        estimated_delivery: data.edd,
        awb: data._id || trackingId,
        order_number: data.order_number,
        pickup_time: data.track?.pickupTime,
        raw_data: data
      };

    } catch (error) {
      console.error('❌ Tracking failed:', error.message);
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
      status: scan.status || 'Status Update',
      location: scan.location || 'N/A',
      timestamp: scan.ctime || new Date().toISOString(),
      remarks: scan.desc || ''
    }));
  }

  // Check serviceability
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v2/serviceability/${pincode}`,
        { headers, timeout: 30000 }
      );

      const data = response.data;
      
      if (data.status === false) {
        return {
          serviceable: false,
          cod_available: false,
          prepaid_available: false,
          max_cod_amount: 0,
          estimated_delivery_days: 0,
          message: data.remark || 'Pincode not serviceable',
          raw_data: data
        };
      }

      return {
        serviceable: data.status !== false,
        cod_available: data.details?.cod || false,
        prepaid_available: data.details?.forward_pickup || false,
        max_cod_amount: data.details?.max_cod_amount || 50000,
        estimated_delivery_days: 3,
        city: data.details?.city,
        state: data.details?.state,
        raw_data: data
      };

    } catch (error) {
      console.error('❌ Serviceability check failed:', error.message);
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

  // Get shipping rates
  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      console.log('💰 Getting shipping rates...');

      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/data/pricing/estimate`,
        {
          pickupPincode: pickupPincode.toString(),
          dropPincode: deliveryPincode.toString(),
          weight: weight.toString(),
          length: "15",
          height: "15",
          width: "15",
          paymentMode: codAmount > 0 ? 'COD' : 'Prepaid',
          invoiceAmount: codAmount > 0 ? codAmount.toString() : "100",
          codAmount: codAmount.toString(),
          shippingDirection: "forward",
          serviceType: "SURFACE"
        },
        { headers, timeout: 30000 }
      );

      return {
        success: true,
        ...response.data
      };

    } catch (error) {
      console.error('❌ Rate fetch failed:', error.message);
      return {
        success: false,
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50
      };
    }
  }

  // Check shipment in dashboard
  async checkShipmentInDashboard(trackingId) {
    try {
      const trackData = await this.trackShipment(trackingId);
      return {
        exists: trackData && !trackData.error,
        data: trackData
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }
}

module.exports = new EkartService();