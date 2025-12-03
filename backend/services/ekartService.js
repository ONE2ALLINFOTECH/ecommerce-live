// services/ekartService.js - FIXED VERSION (Matches PHP)
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

    // Pickup location - EXACT from PHP
    this.pickupLocationName = 'SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )';

    this.sellerDetails = {
      name: 'ONE2ALL RECHARGE PRIVATE LIMITED',
      brand_name: 'SHOPYMOL',
      address: 'RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH, NEW DELHI , Delhi, Delhi - (110043)',
      city: 'NEW DELHI',
      state: 'Delhi',
      pincode: 110043,
      phone: 7303424343,
      gst_tin: '07AACCO4657Q1ZS'
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
    return parseInt(last10, 10); // Return as integer like PHP
  }

  calculateWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const weight = Math.max(totalItems * 500, 1000); // Min 1kg
    return weight;
  }

  // Generate EWBN like PHP
  generateEWBN() {
    return Math.floor(Math.random() * 999999999999).toString().padStart(12, '0');
  }

  // Get current date in Y:m:d format like PHP
  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}:${month}:${day}`;
  }

  // ================== CREATE SHIPMENT - FIXED TO MATCH PHP ==================
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('\n🚚 ====== EKART: CREATE SHIPMENT START ======');
      console.log('📦 Order ID:', orderData.orderId);
      console.log('💳 Payment:', orderData.paymentMethod);
      console.log('💰 Amount:', orderData.finalAmount);

      const headers = await this.createHeaders();

      // Weight & Quantity
      const totalWeight = this.calculateWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      // Amount calculations
      const finalAmount = Number(orderData.finalAmount) || 0;
      const taxRate = 0.18; // 18% GST
      const taxableAmount = Number((finalAmount / (1 + taxRate)).toFixed(2));
      const taxValue = Number((finalAmount - taxableAmount).toFixed(2));

      // Phone validation - return as INTEGER like PHP
      const customerPhone = this.formatPhone(shippingAddress.mobile);
      const sellerPhone = this.formatPhone(this.sellerDetails.phone);

      // Products description
      const productsDesc = items
        .map(item => `${item.name || 'Product'}(Qty: ${item.quantity})`)
        .join('\n')
        .substring(0, 200);

      // Generate EWBN and dates
      const ewbn = this.generateEWBN();
      const currentDate = this.getCurrentDate();

      // Build items array with detailed structure like PHP
      const itemsArray = items.map(item => ({
        product_name: item.name || 'Product',
        sku: `SKU_${item.productId}`,
        taxable_value: parseInt(item.sellingPrice * item.quantity),
        description: productsDesc,
        quantity: parseInt(item.quantity),
        length: 15,
        height: 15,
        breadth: 15,
        weight: Math.max(1, 500), // 500g per item, min 1kg
        hsn: '0000',
        cgst_tax_value: 0,
        sgst_tax_value: 0,
        igst_tax_value: 0
      }));

      // ✅ PAYLOAD MATCHING PHP STRUCTURE
      const shipmentPayload = {
        // Seller info
        seller_name: this.sellerDetails.name,
        seller_address: this.sellerDetails.address,
        seller_gst_tin: this.sellerDetails.gst_tin,
        seller_gst_amount: 0,
        consignee_gst_amount: 0,
        integrated_gst_amount: 0,

        // Order info - MATCH PHP FORMAT
        ewbn: ewbn,
        order_number: orderData.orderId.toString(),
        invoice_number: `INV_${orderData.orderId}`,
        invoice_date: `INV_${currentDate}`,
        document_number: `DOC_${orderData.orderId}`,
        document_date: `DOC_${currentDate}`,
        consignee_gst_tin: 'string',
        consignee_name: shippingAddress.name,

        // Product info
        products_desc: productsDesc,
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        category_of_goods: 'General',
        hsn_code: '0000',

        // Amounts - INTEGERS like PHP
        total_amount: parseInt(finalAmount),
        tax_value: parseInt(taxValue),
        taxable_amount: 1,
        commodity_value: parseInt(finalAmount),
        cod_amount: orderData.paymentMethod === 'cod' ? parseInt(finalAmount) : 0,

        // Quantity & Weight - INTEGERS
        quantity: parseInt(totalQuantity),
        weight: Math.max(1, parseInt(totalWeight / 1000)), // kg
        length: 15,
        height: 15,
        width: 15,

        return_reason: 'NA',

        // Drop location - INTEGERS for phone/pin like PHP
        drop_location: {
          location_type: 'Home',
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: 'IND',
          name: shippingAddress.name.substring(0, 50),
          phone: customerPhone, // INTEGER
          pin: parseInt(shippingAddress.pincode) // INTEGER
        },

        // Pickup location - INTEGERS like PHP
        pickup_location: {
          location_type: 'Office',
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: 'IND',
          name: this.pickupLocationName,
          phone: sellerPhone, // INTEGER
          pin: parseInt(this.sellerDetails.pincode) // INTEGER
        },

        // Return location - INTEGERS like PHP
        return_location: {
          location_type: 'Office',
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: 'IND',
          name: this.pickupLocationName,
          phone: sellerPhone, // INTEGER
          pin: parseInt(this.sellerDetails.pincode) // INTEGER
        },

        // QC Details - MATCH PHP
        qc_details: {
          qc_shipment: true,
          product_name: 'string',
          product_desc: 'string',
          product_sku: 'string',
          product_color: 'string',
          product_size: 'string',
          brand_name: 'string',
          product_category: 'string',
          ean_barcode: 'string',
          serial_number: 'string',
          imei_number: 'string',
          product_images: ['string']
        },

        // Items array
        items: itemsArray,

        what3words_address: 'apple.orange.grapes'
      };

      console.log('\n📋 Final Payload (Matching PHP):');
      console.log(JSON.stringify(shipmentPayload, null, 2));

      // API call - Ekart uses PUT method
      const createURL = `${this.baseURL}/api/v1/package/create`;
      console.log('\n🌐 API Endpoint:', createURL);

      const response = await axios({
        method: 'PUT',
        url: createURL,
        data: shipmentPayload,
        headers,
        timeout: 60000,
        validateStatus: (status) => status >= 200 && status < 500
      });

      console.log('\n📡 Response Status:', response.status);
      console.log('📡 Response Data:', JSON.stringify(response.data, null, 2));

      // Success check - MATCH PHP validation
      if (response.data && response.data.remark === 'Successfully created shipment') {
        const trackingId = response.data.tracking_id;

        if (!trackingId) {
          throw new Error('Shipment created but no tracking ID received');
        }

        console.log('\n✅✅✅ SHIPMENT CREATED SUCCESSFULLY');
        console.log('🎯 Tracking ID:', trackingId);
        console.log('🚚 ====================================\n');

        return {
          success: true,
          tracking_id: trackingId,
          awb_number: response.data.barcodes?.wbn || trackingId,
          vendor: response.data.vendor || 'Ekart',
          barcodes: response.data.barcodes,
          status: 'created',
          message: response.data.remark,
          raw_response: response.data
        };
      }

      // Error response
      const errorMsg = response.data?.message || 
                      response.data?.description || 
                      response.data?.remark || 
                      `API error: ${response.status}`;

      console.error('❌ API Error:', errorMsg);
      throw new Error(errorMsg);

    } catch (error) {
      console.error('\n❌❌❌ SHIPMENT CREATION FAILED');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(
        `Shipment creation failed: ${
          error.response?.data?.description || 
          error.response?.data?.message || 
          error.message
        }`
      );
    }
  }

  // ================== CANCEL SHIPMENT ==================
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