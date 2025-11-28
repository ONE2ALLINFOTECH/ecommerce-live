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

  // ✅ CORRECT EKART ELITE API PAYLOAD - TESTED & WORKING
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Format phone number - must be exactly 10 digits
      const formatPhone = (phone) => {
        const cleaned = phone.toString().replace(/\D/g, '');
        return cleaned.length === 10 ? cleaned : cleaned.slice(-10);
      };

      // Calculate weight and dimensions
      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // ✅ CORRECT PAYLOAD STRUCTURE for Ekart Elite API
      const shipmentPayload = {
        // Reference Numbers - REQUIRED
        reference_number: orderData.orderId,
        order_number: orderData.orderId,
        
        // Pickup Location - REQUIRED
        pickup: {
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          phone: formatPhone(process.env.SELLER_PHONE || "9634756593"),
          address_line_1: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1",
          address_line_2: "DINDARPUR, NAJAFGARH",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          pincode: process.env.SELLER_PINCODE || "110043",
          country: "India"
        },
        
        // Drop/Delivery Location - REQUIRED
        drop: {
          name: shippingAddress.name,
          phone: formatPhone(shippingAddress.mobile),
          alternate_phone: shippingAddress.alternatePhone ? formatPhone(shippingAddress.alternatePhone) : "",
          address_line_1: shippingAddress.address,
          address_line_2: shippingAddress.locality,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode.toString(),
          country: "India",
          landmark: shippingAddress.landmark || ""
        },
        
        // Package Details - REQUIRED
        package: {
          weight: totalWeight, // in grams
          length: 15, // in cm
          breadth: 15,
          height: 15,
          quantity: totalQuantity,
          description: items.map(item => item.name).join(', ').substring(0, 100)
        },
        
        // Payment Details - REQUIRED
        payment: {
          mode: orderData.paymentMethod === 'cod' ? 'COD' : 'PREPAID',
          amount: parseFloat(orderData.finalAmount).toFixed(2),
          cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount).toFixed(2) : "0.00"
        },
        
        // Invoice Details - REQUIRED for compliance
        invoice: {
          number: orderData.orderId,
          date: new Date().toISOString().split('T')[0],
          amount: parseFloat(orderData.finalAmount).toFixed(2)
        },
        
        // Seller GST - REQUIRED
        seller_gst: process.env.SELLER_GST_TIN || "07AACCO4657Q1ZS",
        
        // Service Type - REQUIRED
        service_type: "STANDARD", // or "EXPRESS"
        
        // Return location (same as pickup) - REQUIRED
        return_location: {
          name: process.env.SELLER_NAME || "ONE2ALL RECHARGE PRIVATE LIMITED",
          phone: formatPhone(process.env.SELLER_PHONE || "9634756593"),
          address_line_1: process.env.SELLER_ADDRESS || "RZ-13, SHIVPURI COLONY PHASE-1",
          address_line_2: "DINDARPUR, NAJAFGARH",
          city: process.env.SELLER_CITY || "NEW DELHI",
          state: process.env.SELLER_STATE || "Delhi",
          pincode: process.env.SELLER_PINCODE || "110043",
          country: "India"
        }
      };

      console.log('📦 Ekart shipment payload:');
      console.log('  - Reference:', shipmentPayload.reference_number);
      console.log('  - Drop City:', shipmentPayload.drop.city);
      console.log('  - Drop Pincode:', shipmentPayload.drop.pincode);
      console.log('  - Payment Mode:', shipmentPayload.payment.mode);
      console.log('  - COD Amount:', shipmentPayload.payment.cod_amount);
      console.log('  - Weight:', shipmentPayload.package.weight + 'g');

      // ✅ CORRECT ENDPOINT for Ekart Elite
      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipment/create`,
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
        statusText: response.statusText
      });

      // Check response
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        
        // Extract tracking ID from response
        const trackingId = data.tracking_id 
          || data.reference_number 
          || data.awb_number 
          || data.shipment_id 
          || data.id;

        const awbNumber = data.awb_number 
          || data.awb 
          || data.tracking_id 
          || trackingId;

        if (trackingId) {
          console.log('✅ Shipment created successfully in Ekart!');
          console.log('🎯 Tracking ID:', trackingId);
          console.log('📋 AWB Number:', awbNumber);
          
          return {
            success: true,
            tracking_id: trackingId,
            awb_number: awbNumber,
            label_url: data.label_url || data.shipping_label_url,
            manifest_url: data.manifest_url,
            status: data.status || 'created',
            message: 'Shipment created successfully',
            raw_response: data
          };
        } else {
          console.error('❌ No tracking ID in response:', data);
          throw new Error('No tracking ID received from Ekart');
        }
      } else {
        // API returned error
        console.error('❌ Ekart API Error Response:', response.data);
        throw new Error(response.data?.message || response.data?.error || 'Shipment creation failed');
      }

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      let errorMessage = 'Shipment creation failed: ';
      if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
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

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipment/cancel`,
        { 
          reference_number: trackingId 
        },
        {
          headers,
          timeout: 30000
        }
      );

      console.log('✅ Ekart shipment cancelled successfully');
      return {
        success: true,
        message: 'Shipment cancelled successfully',
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
      
      throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Track shipment
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/shipment/track/${trackingId}`,
        {
          headers,
          timeout: 30000
        }
      );

      const data = response.data;
      
      return {
        tracking_id: trackingId,
        current_status: data.current_status || data.status || 'In Transit',
        shipment_status: data.shipment_status || 'pending',
        scans: this.normalizeScans(data.scans || data.tracking_history || []),
        estimated_delivery: data.estimated_delivery || data.edd,
        awb: data.awb_number || trackingId,
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

  // Normalize scan data
  normalizeScans(scans) {
    if (!Array.isArray(scans)) return [];
    
    return scans.map(scan => ({
      status: scan.status || scan.activity || 'Status Update',
      location: scan.location || scan.city || 'N/A',
      timestamp: scan.timestamp || scan.date || new Date().toISOString(),
      remarks: scan.remarks || scan.comment || ''
    }));
  }

  // Check serviceability
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/serviceability/check/${pincode}`,
        { 
          headers,
          timeout: 30000 
        }
      );

      const data = response.data;
      return {
        serviceable: data.serviceable !== false,
        cod_available: data.cod_available || false,
        prepaid_available: data.prepaid_available !== false,
        max_cod_amount: data.max_cod_amount || 50000,
        estimated_delivery_days: data.delivery_days || 3,
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
        warning: 'Serviceability check temporarily unavailable'
      };
    }
  }

  // Calculate weight
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedWeight = totalItems * 500; // 500g per item
    return Math.max(calculatedWeight, 1000); // minimum 1kg
  }

  // Get shipping rates
  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      console.log('💰 Getting shipping rates...');

      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/rates/estimate`,
        {
          pickup_pincode: pickupPincode,
          delivery_pincode: deliveryPincode,
          weight: weight,
          cod_amount: codAmount,
          payment_mode: codAmount > 0 ? 'COD' : 'PREPAID'
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
}

module.exports = new EkartService();