// services/ekartService.js - SMART VERSION (Auto-retry with different format)
const axios = require('axios');

class EkartService {
  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID;
    this.username = process.env.EKART_USERNAME;
    this.password = process.env.EKART_PASSWORD;

    const base = process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in';
    this.baseURL = base.replace(/\/+$/, '');

    this.accessToken = null;
    this.tokenExpiry = null;

    this.pickupLocationName = process.env.PICKUP_LOCATION_NAME || 
      'SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )';

    this.sellerDetails = {
      name: process.env.SELLER_NAME || 'ONE2ALL RECHARGE PRIVATE LIMITED',
      brand_name: process.env.SELLER_BRAND_NAME || 'SHOPYMOL',
      address: process.env.SELLER_ADDRESS || 'RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH',
      city: process.env.SELLER_CITY || 'NEW DELHI',
      state: process.env.SELLER_STATE || 'Delhi',
      pincode: process.env.SELLER_PINCODE || '110043',
      phone: process.env.SELLER_PHONE || '7303424343',
      gst_tin: process.env.SELLER_GST_TIN || '07AACCO4657Q1ZS'
    };
  }

  async authenticate() {
    try {
      console.log('🔐 [Ekart] Authenticating...');
      const authURL = `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`;

      const response = await axios.post(
        authURL,
        { username: this.username, password: this.password },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data?.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;
        console.log('✅ [Ekart] Authentication successful');
        return this.accessToken;
      }

      throw new Error('No access token in response');
    } catch (error) {
      console.error('❌ [Ekart] Auth failed:', error.message);
      throw new Error(`Authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAccessToken() {
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  async createHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  formatPhone(phone) {
    if (!phone) throw new Error('Phone number is required');
    const cleaned = phone.toString().replace(/\D/g, '');
    const last10 = cleaned.slice(-10);
    if (last10.length !== 10) {
      throw new Error(`Invalid phone: ${phone}. Must be 10 digits.`);
    }
    return last10;
  }

  calculateWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const weight = Math.max(totalItems * 500, 1000);
    return weight;
  }

  // Helper to build payload with different amount formats
  buildShipmentPayload(orderData, shippingAddress, items, useNumberFormat = true) {
    const totalWeight = this.calculateWeight(items);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    const finalAmount = Number(orderData.finalAmount) || 0;
    const taxableAmount = finalAmount / 1.18;
    const taxValue = finalAmount - taxableAmount;

    const customerPhone = this.formatPhone(shippingAddress.mobile);
    const sellerPhone = this.formatPhone(this.sellerDetails.phone);

    const productsDesc = items
      .map(item => item.name || 'Product')
      .join(', ')
      .substring(0, 100);

    // Build base payload
    const payload = {
      seller_name: this.sellerDetails.name,
      seller_address: `${this.sellerDetails.address}, ${this.sellerDetails.city}, ${this.sellerDetails.state}, ${this.sellerDetails.pincode}`,
      seller_gst_tin: this.sellerDetails.gst_tin,

      order_number: orderData.orderId.toString(),
      invoice_number: orderData.orderId.toString(),
      invoice_date: new Date().toISOString().split('T')[0],

      payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      cod_amount: orderData.paymentMethod === 'cod' ? finalAmount.toFixed(2) : '0.00',

      category_of_goods: 'General',
      products_desc: productsDesc,

      quantity: totalQuantity.toString(),
      weight: (totalWeight / 1000).toFixed(2),

      length: 15,
      height: 15,
      width: 15,

      drop_location: {
        name: shippingAddress.name.substring(0, 50),
        phone: customerPhone,
        pin: shippingAddress.pincode.toString(),
        address: `${shippingAddress.address}, ${shippingAddress.locality}`.substring(0, 200),
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: 'India'
      },

      pickup_location: {
        name: this.pickupLocationName,
        phone: sellerPhone,
        pin: this.sellerDetails.pincode.toString(),
        address: this.sellerDetails.address,
        city: this.sellerDetails.city,
        state: this.sellerDetails.state,
        country: 'India'
      },

      return_location: {
        name: this.pickupLocationName,
        phone: sellerPhone,
        pin: this.sellerDetails.pincode.toString(),
        address: this.sellerDetails.address,
        city: this.sellerDetails.city,
        state: this.sellerDetails.state,
        country: 'India'
      }
    };

    // Add amount fields based on format
    if (useNumberFormat) {
      // Try with NUMBERS first
      payload.total_amount = Number(finalAmount.toFixed(2));
      payload.tax_value = Number(taxValue.toFixed(2));
      payload.taxable_amount = Number(taxableAmount.toFixed(2));
      payload.commodity_value = Number(taxableAmount.toFixed(2));
    } else {
      // Fallback to STRINGS
      payload.total_amount = finalAmount.toFixed(2);
      payload.tax_value = taxValue.toFixed(2);
      payload.taxable_amount = taxableAmount.toFixed(2);
      payload.commodity_value = taxableAmount.toFixed(2);
    }

    return payload;
  }

  // ================== CREATE SHIPMENT - SMART RETRY ==================
  async createShipment(orderData, shippingAddress, items) {
    console.log('\n🚚 ====== EKART: CREATE SHIPMENT START ======');
    console.log('📦 Order ID:', orderData.orderId);
    console.log('💳 Payment:', orderData.paymentMethod);
    console.log('💰 Amount:', orderData.finalAmount);

    const headers = await this.createHeaders();
    const createURL = `${this.baseURL}/api/v1/package/create`;

    // Try with NUMBERS first (most common)
    try {
      console.log('\n🔄 Attempt 1: Using NUMBER format for amounts...');
      const payload = this.buildShipmentPayload(orderData, shippingAddress, items, true);
      
      console.log('📋 Payload (Numbers):');
      console.log(JSON.stringify(payload, null, 2));
      console.log('🌐 API Endpoint:', createURL);

      const response = await axios.put(createURL, payload, {
        headers,
        timeout: 60000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      console.log('📡 Response Status:', response.status);
      console.log('📡 Response Data:', JSON.stringify(response.data, null, 2));

      if (response.status >= 200 && response.status < 300 && response.data) {
        return this.handleSuccessResponse(response.data);
      }

      // Check if error is about data type
      const errorDesc = response.data?.description || '';
      if (errorDesc.includes('string found, number expected') || 
          errorDesc.includes('number found, string expected')) {
        console.log('⚠️ Format mismatch detected, retrying with STRING format...');
        throw new Error('FORMAT_MISMATCH');
      }

      throw new Error(response.data?.description || response.data?.message || 'API Error');
    } catch (error) {
      if (error.message === 'FORMAT_MISMATCH' || 
          error.response?.data?.description?.includes('number found, string expected')) {
        
        // Retry with STRINGS
        try {
          console.log('\n🔄 Attempt 2: Using STRING format for amounts...');
          const payload = this.buildShipmentPayload(orderData, shippingAddress, items, false);
          
          console.log('📋 Payload (Strings):');
          console.log(JSON.stringify(payload, null, 2));

          const response = await axios.put(createURL, payload, {
            headers,
            timeout: 60000,
            validateStatus: (status) => status >= 200 && status < 500
          });

          console.log('📡 Response Status:', response.status);
          console.log('📡 Response Data:', JSON.stringify(response.data, null, 2));

          if (response.status >= 200 && response.status < 300 && response.data) {
            return this.handleSuccessResponse(response.data);
          }

          throw new Error(response.data?.description || response.data?.message || 'API Error');
        } catch (retryError) {
          console.error('\n❌❌❌ SHIPMENT CREATION FAILED (Both attempts)');
          console.error('Error:', retryError.message);
          if (retryError.response) {
            console.error('Response:', JSON.stringify(retryError.response.data, null, 2));
          }
          throw new Error(`Shipment failed: ${retryError.response?.data?.description || retryError.message}`);
        }
      }

      console.error('\n❌❌❌ SHIPMENT CREATION FAILED');
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Shipment failed: ${error.response?.data?.description || error.message}`);
    }
  }

  handleSuccessResponse(data) {
    const trackingId = data.tracking_id || data._id || data.data?.tracking_id || data.data?._id;
    const awbNumber = data.barcodes?.wbn || data.awb || data.data?.awb || trackingId;

    if (!trackingId) {
      console.error('❌ No tracking ID in response');
      throw new Error('Shipment created but no tracking ID received');
    }

    console.log('\n✅✅✅ SHIPMENT CREATED SUCCESSFULLY');
    console.log('🎯 Tracking ID:', trackingId);
    console.log('📋 AWB:', awbNumber);
    console.log('🚚 ====================================\n');

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
  }

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

      console.log('✅ Shipment cancelled');
      return {
        success: true,
        message: response.data.message || 'Cancelled',
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

  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking:', trackingId);
      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v1/track/${trackingId}`,
        { headers, timeout: 30000 }
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
          message: data.remark || 'Not serviceable',
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
}

module.exports = new EkartService();