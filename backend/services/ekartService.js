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

  // ✅ OFFICIAL EKART AUTH API - From Documentation
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ekart Official API...');
      console.log('Base URL:', this.baseURL);
      console.log('Client ID:', this.clientId);
      console.log('Username:', this.username);
      
      // ✅ EXACT endpoint from Ekart documentation
      const authURL = `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`;
      console.log('Auth URL:', authURL);
      
      const response = await axios.post(
        authURL,
        {
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
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
        console.log('✅ Authentication successful!');
        console.log('✅ Token expires in:', expiresIn, 'seconds');
        return this.accessToken;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ Ekart authentication failed:');
      console.error('Error Message:', error.message);
      console.error('Response Status:', error.response?.status);
      console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
      throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
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

  // Format phone - must be 10 digit integer
  formatPhone(phone) {
    const cleaned = phone.toString().replace(/\D/g, '');
    const last10 = cleaned.slice(-10);
    return parseInt(last10);
  }

  // Calculate weight
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedWeight = totalItems * 500; // 500g per item
    return Math.max(calculatedWeight, 1000); // minimum 1kg
  }

  // ✅ OFFICIAL EKART CREATE SHIPMENT API - From Documentation
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('\n🚚 ============ CREATING EKART SHIPMENT ============');
      console.log('Order ID:', orderData.orderId);
      console.log('Payment Method:', orderData.paymentMethod);
      console.log('Final Amount:', orderData.finalAmount);

      const headers = await this.createHeaders();
      console.log('✅ Headers created with Bearer token');

      // Calculate values
      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const finalAmount = parseFloat(orderData.finalAmount);
      const taxableAmount = parseFloat((finalAmount / 1.18).toFixed(2));
      const taxValue = parseFloat((finalAmount - taxableAmount).toFixed(2));

      // ✅ EXACT PAYLOAD as per Ekart API Documentation
      const shipmentPayload = {
        // Seller details
        seller_name: "ONE2ALL RECHARGE PRIVATE LIMITED",
        seller_address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI, Delhi, DL, 110043",
        seller_gst_tin: "07AACCO4657Q1ZS",
        
        // Order details
        order_number: orderData.orderId.toString(),
        invoice_number: orderData.orderId.toString(),
        invoice_date: new Date().toISOString().split('T')[0],
        
        // Customer name
        consignee_name: shippingAddress.name,
        
        // Payment details
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        cod_amount: orderData.paymentMethod === 'cod' ? finalAmount : 0,
        
        // Product details
        category_of_goods: "General",
        products_desc: items.map(item => item.name).join(', ').substring(0, 100),
        
        // Amount details
        total_amount: finalAmount,
        tax_value: taxValue,
        taxable_amount: taxableAmount,
        commodity_value: taxableAmount,
        
        // Package details
        quantity: totalQuantity,
        weight: totalWeight,
        length: 15,
        height: 15,
        width: 15,
        
        // Drop location (Customer address)
        drop_location: {
          name: shippingAddress.name,
          phone: this.formatPhone(shippingAddress.mobile),
          pin: parseInt(shippingAddress.pincode),
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India"
        },
        
        // Pickup location (Your warehouse)
        pickup_location: {
          name: "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )",
          phone: 7303424343,
          pin: 110043,
          address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: "NEW DELHI",
          state: "Delhi",
          country: "India"
        },
        
        // Return location (Same as pickup)
        return_location: {
          name: "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )",
          phone: 7303424343,
          pin: 110043,
          address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
          city: "NEW DELHI",
          state: "Delhi",
          country: "India"
        }
      };

      console.log('\n📦 Shipment Payload:');
      console.log(JSON.stringify(shipmentPayload, null, 2));

      // ✅ OFFICIAL API endpoint from documentation
      const createURL = `${this.baseURL}/api/v1/package/create`;
      console.log('\n🌐 API Endpoint:', createURL);

      const response = await axios.put(
        createURL,
        shipmentPayload,
        { 
          headers,
          timeout: 60000,
          validateStatus: function (status) {
            return status >= 200 && status < 500;
          }
        }
      );

      console.log('\n📡 Ekart API Response:');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Data:', JSON.stringify(response.data, null, 2));

      // Check if shipment created successfully
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        
        // Extract tracking ID (can be in different fields)
        const trackingId = data.tracking_id || data._id || data.data?.tracking_id;
        const awbNumber = data.barcodes?.wbn || data.awb || trackingId;

        if (trackingId) {
          console.log('\n✅ ✅ ✅ SHIPMENT CREATED SUCCESSFULLY!');
          console.log('🎯 Tracking ID:', trackingId);
          console.log('📋 AWB Number:', awbNumber);
          console.log('🚚 Vendor:', data.vendor || 'Ekart');
          console.log('============================================\n');
          
          return {
            success: true,
            tracking_id: trackingId,
            awb_number: awbNumber,
            vendor: data.vendor || 'Ekart',
            barcodes: data.barcodes,
            status: 'created',
            message: data.message || data.remark || 'Shipment created successfully',
            raw_response: data
          };
        } else {
          console.error('❌ No tracking ID in response');
          console.error('Full Response:', JSON.stringify(data, null, 2));
          throw new Error('No tracking ID received from Ekart');
        }
      } else {
        // Error response
        console.error('❌ Ekart API returned error:');
        console.error('Status:', response.status);
        console.error('Data:', JSON.stringify(response.data, null, 2));
        
        const errorMsg = response.data?.message || response.data?.remark || `API error: ${response.status}`;
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('\n❌ ❌ ❌ SHIPMENT CREATION FAILED');
      console.error('Error:', error.message);
      console.error('Status:', error.response?.status);
      console.error('Response:', JSON.stringify(error.response?.data, null, 2));
      console.error('============================================\n');
      
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ CANCEL SHIPMENT - Official API
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling shipment:', trackingId);
      const headers = await this.createHeaders();

      const response = await axios.delete(
        `${this.baseURL}/api/v1/package/cancel`,
        {
          params: { tracking_id: trackingId },
          headers,
          timeout: 30000
        }
      );

      console.log('✅ Shipment cancelled successfully');
      return {
        success: true,
        message: response.data.message || response.data.remark || 'Cancelled',
        data: response.data
      };

    } catch (error) {
      console.error('❌ Cancel failed:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        return { 
          success: true, 
          message: 'Shipment not found or already cancelled' 
        };
      }
      
      throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // ✅ TRACK SHIPMENT - Public API (no auth needed)
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
        current_status: 'Tracking unavailable',
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

  // ✅ CHECK SERVICEABILITY
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for:', pincode);
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
          message: data.remark || data.message || 'Not serviceable',
          raw_data: data
        };
      }

      return {
        serviceable: true,
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
      // Return serviceable even on error to not block orders
      return {
        serviceable: true,
        cod_available: true,
        prepaid_available: true,
        max_cod_amount: 50000,
        estimated_delivery_days: 3,
        warning: 'Check temporarily unavailable',
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

  // Check if shipment exists in dashboard
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