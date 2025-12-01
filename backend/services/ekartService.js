




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
        'Accept': 'application/json'
      };
    } catch (error) {
      console.error('❌ Failed to create headers:', error.message);
      throw error;
    }
  }

  // ✅ CORRECT EKART API V1 PAYLOAD - AS PER OFFICIAL DOCS
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Format phone number - must be exactly 10 digits
      const formatPhone = (phone) => {
        const cleaned = phone.toString().replace(/\D/g, '');
        return cleaned.length === 10 ? parseInt(cleaned) : parseInt(cleaned.slice(-10));
      };

      // Calculate weight and dimensions
      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // ✅ CORRECT PAYLOAD STRUCTURE for Ekart V1 API (as per official docs)
      const shipmentPayload = {
        // Seller Information - REQUIRED
        seller_name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
        seller_address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
        seller_gst_tin: process.env.SELLER_GST_TIN || "07AACCO4657Q1ZS",
        
        // Order Details - REQUIRED
        order_number: orderData.orderId,
        invoice_number: orderData.orderId,
        invoice_date: new Date().toISOString().split('T')[0],
        
        // Consignee Information - REQUIRED
        consignee_name: shippingAddress.name,
        
        // Payment Details - REQUIRED
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount) : 0,
        
        // Product Details - REQUIRED
        category_of_goods: "General",
        products_desc: items.map(item => item.name).join(', ').substring(0, 100),
        
        // Amount Details - REQUIRED
        total_amount: parseFloat(orderData.finalAmount),
        tax_value: parseFloat((orderData.finalAmount * 0.18).toFixed(2)), // 18% GST
        taxable_amount: parseFloat((orderData.finalAmount / 1.18).toFixed(2)),
        commodity_value: (orderData.finalAmount / 1.18).toFixed(2),
        
        // Package Details - REQUIRED
        quantity: totalQuantity,
        weight: totalWeight, // in grams
        length: 15, // in cm
        height: 15,
        width: 15,
        
        // Drop Location (Customer Address) - REQUIRED
        drop_location: {
          name: shippingAddress.name,
          phone: formatPhone(shippingAddress.mobile),
          pin: parseInt(shippingAddress.pincode),
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India"
        },
        
        // Pickup Location (Seller Address) - REQUIRED
        pickup_location: {
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          phone: formatPhone(process.env.SELLER_PHONE || "7303424343"),
          pin: parseInt(process.env.SELLER_PINCODE || "110043"),
          address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          country: "India"
        },
        
        // Return Location (same as pickup) - REQUIRED
        return_location: {
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          phone: formatPhone(process.env.SELLER_PHONE || "9634756593"),
          pin: parseInt(process.env.SELLER_PINCODE || "110043"),
          address: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          country: "India"
        }
      };

      console.log('📦 Ekart shipment payload:');
      console.log('  - Order Number:', shipmentPayload.order_number);
      console.log('  - Drop City:', shipmentPayload.drop_location.city);
      console.log('  - Drop Pincode:', shipmentPayload.drop_location.pin);
      console.log('  - Payment Mode:', shipmentPayload.payment_mode);
      console.log('  - COD Amount:', shipmentPayload.cod_amount);
      console.log('  - Weight:', shipmentPayload.weight + 'g');

      // ✅ CORRECT ENDPOINT - /api/v1/package/create (as per official docs)
      const response = await axios.put(
        `${this.baseURL}/api/v1/package/create`,
        shipmentPayload,
        { 
          headers,
          timeout: 45000,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        }
      );

      console.log('📡 Ekart API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // Check response
      if (response.status >= 200 && response.status < 300 && response.data.status === true) {
        const data = response.data;
        
        // Extract tracking ID from response (as per official docs)
        const trackingId = data.tracking_id;
        const awbNumber = data.barcodes?.wbn || trackingId;

        if (trackingId) {
          console.log('✅ Shipment created successfully in Ekart!');
          console.log('🎯 Tracking ID:', trackingId);
          console.log('📋 AWB Number:', awbNumber);
          console.log('🚚 Vendor:', data.vendor);
          
          return {
            success: true,
            tracking_id: trackingId,
            awb_number: awbNumber,
            vendor: data.vendor,
            barcodes: data.barcodes,
            status: 'created',
            message: data.remark || 'Shipment created successfully',
            raw_response: data
          };
        } else {
          console.error('❌ No tracking ID in response:', data);
          throw new Error('No tracking ID received from Ekart');
        }
      } else {
        // API returned error
        console.error('❌ Ekart API Error Response:', response.data);
        const errorMsg = response.data?.remark || response.data?.message || 'Shipment creation failed';
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
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

  // Cancel shipment - CORRECT ENDPOINT
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

      console.log('✅ Ekart shipment cancelled successfully');
      return {
        success: true,
        message: response.data.remark || 'Shipment cancelled successfully',
        data: response.data
      };

    } catch (error) {
      console.error('❌ Ekart shipment cancellation failed:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        return { 
          success: true, 
          message: 'Shipment not found or already cancelled' 
        };
      }
      
      throw new Error(`Cancellation failed: ${error.response?.data?.remark || error.message}`);
    }
  }

  // Track shipment - CORRECT ENDPOINT
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking Ekart shipment:', trackingId);

      // ✅ This is a PUBLIC API - No authentication required
      const response = await axios.get(
        `${this.baseURL}/api/v1/track/${trackingId}`,
        {
          timeout: 30000
        }
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

  // Normalize scan data - AS PER API RESPONSE
  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.status || 'Status Update',
      location: scan.location || 'N/A',
      timestamp: scan.ctime || new Date().toISOString(),
      remarks: scan.desc || ''
    }));
  }

  // Check serviceability - CORRECT ENDPOINT
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v2/serviceability/${pincode}`,
        { 
          headers,
          timeout: 30000 
        }
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

  // Calculate weight
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedWeight = totalItems * 500; // 500g per item
    return Math.max(calculatedWeight, 1000); // minimum 1kg
  }

  // Get shipping rates (V1 Estimate API)
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
      console.error('❌ Rate fetch failed:', error.message);
      return {
        success: false,
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50
      };
    }
  }

  // Check shipment in dashboard (helper method)
  async checkShipmentInDashboard(trackingId) {
    try {
      // Try to track the shipment - if it returns data, it exists
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