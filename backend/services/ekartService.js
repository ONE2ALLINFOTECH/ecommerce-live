// services/ekartService.js - COMPLETE WITH PROPER CANCELLATION
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

  // ================== AUTH ==================
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

  // ================== HELPERS ==================
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

  // ================== CREATE SHIPMENT ==================
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('\n🚚 ====== EKART: CREATE SHIPMENT START ======');
      console.log('📦 Order ID:', orderData.orderId);
      console.log('💳 Payment:', orderData.paymentMethod);
      console.log('💰 Amount:', orderData.finalAmount);

      const headers = await this.createHeaders();

      const totalWeight = this.calculateWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      const finalAmount = Number(orderData.finalAmount) || 0;
      const taxableAmount = Number((finalAmount / 1.18).toFixed(2));
      const taxValue = Number((finalAmount - taxableAmount).toFixed(2));

      const customerPhone = this.formatPhone(shippingAddress.mobile);
      const sellerPhone = this.formatPhone(this.sellerDetails.phone);

      const productsDesc = items
        .map(item => item.name || 'Product')
        .join(', ')
        .substring(0, 100);

      const shipmentPayload = {
        seller_name: this.sellerDetails.name,
        seller_address: `${this.sellerDetails.address}, ${this.sellerDetails.city}, ${this.sellerDetails.state}, ${this.sellerDetails.pincode}`,
        seller_gst_tin: this.sellerDetails.gst_tin,
        consignee_name: shippingAddress.name.substring(0, 50),
        consignee_gst_amount: 0,
        order_number: orderData.orderId.toString(),
        invoice_number: orderData.orderId.toString(),
        invoice_date: new Date().toISOString().split('T')[0],
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        cod_amount: orderData.paymentMethod === 'cod' ? finalAmount : 0,
        category_of_goods: 'General',
        products_desc: productsDesc,
        total_amount: finalAmount,
        tax_value: taxValue,
        taxable_amount: taxableAmount,
        commodity_value: taxableAmount.toFixed(2),
        quantity: totalQuantity,
        weight: totalWeight,
        length: 15,
        height: 15,
        width: 15,
        drop_location: {
          name: shippingAddress.name.substring(0, 50),
          phone: parseInt(customerPhone, 10),
          pin: parseInt(shippingAddress.pincode, 10),
          address: `${shippingAddress.address}, ${shippingAddress.locality}`.substring(0, 200),
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: 'India'
        },
        pickup_location: {
          name: this.pickupLocationName,
          phone: parseInt(sellerPhone, 10),
          pin: parseInt(this.sellerDetails.pincode, 10),
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: 'India'
        },
        return_location: {
          name: this.pickupLocationName,
          phone: parseInt(sellerPhone, 10),
          pin: parseInt(this.sellerDetails.pincode, 10),
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: 'India'
        }
      };

      console.log('\n📋 Final Payload:');
      console.log(JSON.stringify(shipmentPayload, null, 2));

      const createURL = `${this.baseURL}/api/v1/package/create`;
      console.log('\n🌐 API Endpoint:', createURL);

      const response = await axios.put(createURL, shipmentPayload, {
        headers,
        timeout: 60000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      console.log('\n📡 Response Status:', response.status);
      console.log('📡 Response Data:', JSON.stringify(response.data, null, 2));

      if (response.status >= 200 && response.status < 300 && response.data) {
        const data = response.data;
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

      const errorMsg = response.data?.message || 
                      response.data?.description || 
                      response.data?.remark || 
                      response.data?.error ||
                      `API error: ${response.status}`;

      console.error('❌ API Error:', errorMsg);
      console.error('Full response:', JSON.stringify(response.data, null, 2));
      throw new Error(errorMsg);

    } catch (error) {
      console.error('\n❌❌❌ SHIPMENT CREATION FAILED');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('====================================\n');

      throw new Error(
        `Shipment creation failed: ${
          error.response?.data?.description || 
          error.response?.data?.message || 
          error.message
        }`
      );
    }
  }

  // ================== ✅ UPDATED CANCEL SHIPMENT ==================
  async cancelShipment(trackingId) {
    try {
      console.log('\n🗑️ ====== EKART: CANCEL SHIPMENT START ======');
      console.log('📦 Tracking ID:', trackingId);
      
      const headers = await this.createHeaders();

      // ✅ CORRECT: Using DELETE method with query parameter as per docs
      const cancelURL = `${this.baseURL}/api/v1/package/cancel`;
      console.log('🌐 Cancel URL:', cancelURL);
      console.log('🔍 Query Params: tracking_id =', trackingId);

      const response = await axios.delete(cancelURL, {
        params: { tracking_id: trackingId },
        headers,
        timeout: 30000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      console.log('📡 Response Status:', response.status);
      console.log('📡 Response Data:', JSON.stringify(response.data, null, 2));

      // ✅ Success response
      if (response.status >= 200 && response.status < 300) {
        // ✅ Check if Ekart confirmed cancellation
        const isCancelled = response.data.status === true || 
                           response.data.status === 'true' ||
                           response.status === 200;

        const message = response.data.remark || 
                       response.data.message || 
                       (isCancelled ? 'Shipment cancelled successfully on Ekart' : 'Cancellation response received');

        console.log('✅✅✅ SHIPMENT CANCELLED SUCCESSFULLY');
        console.log('📦 Tracking ID:', trackingId);
        console.log('💬 Message:', message);
        console.log('🗑️ ====================================\n');

        return {
          success: true,
          tracking_id: trackingId,
          message: message,
          status: response.data.status,
          data: response.data
        };
      }

      // ⚠️ 404 - Shipment not found or already cancelled
      if (response.status === 404) {
        console.warn('⚠️ Shipment not found or already cancelled');
        console.log('🗑️ ====================================\n');
        
        return {
          success: true,
          tracking_id: trackingId,
          message: 'Shipment not found or already cancelled',
          warning: true
        };
      }

      // ❌ Other error responses
      const errorMsg = response.data?.message || 
                      response.data?.remark || 
                      response.data?.description ||
                      `Cancellation failed with status ${response.status}`;
      
      console.error('❌ Cancellation Error:', errorMsg);
      console.log('🗑️ ====================================\n');

      return {
        success: false,
        tracking_id: trackingId,
        message: errorMsg,
        error: true
      };

    } catch (error) {
      console.error('\n❌❌❌ SHIPMENT CANCELLATION FAILED');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('🗑️ ====================================\n');

      // ⚠️ Special handling for 404
      if (error.response?.status === 404) {
        return {
          success: true,
          tracking_id: trackingId,
          message: 'Shipment not found or already cancelled',
          warning: true
        };
      }

      // ❌ Other errors
      throw new Error(
        `Cancellation failed: ${
          error.response?.data?.message || 
          error.response?.data?.description ||
          error.message
        }`
      );
    }
  }

  // ================== TRACK SHIPMENT ==================
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

  // ================== SERVICEABILITY ==================
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