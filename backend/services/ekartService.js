const axios = require('axios');

class EkartService {
  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID;
    this.username = process.env.EKART_USERNAME;
    this.password = process.env.EKART_PASSWORD;
    this.baseURL = process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // ✅ CRITICAL FIX: Use EXACT name from registered address in Ekart
    // This MUST match the name in your Ekart > Settings > Addresses section
    this.pickupLocationName = "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )";
    
    // Seller details from your Ekart account
    this.sellerDetails = {
      name: "ONE2ALL RECHARGE PRIVATE LIMITED",
      brand_name: "SHOPYMOL",
      registered_address_name: "SHOPYMOL ( A UNIT OF ONE2ALL RECHARGE PRIVATE LIMITED )",
      address: "RZ-13, SHIVPURI COLONY PHASE-1, DINDARPUR, NAJAFGARH",
      city: "NEW DELHI",
      state: "Delhi",
      pincode: 110043,
      phone: 7303424343,
      gst_tin: "07AACCO4657Q1ZS"
    };
  }

  // ✅ Authentication - Unchanged
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Ekart...');
      
      const authURL = `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`;
      
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

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Authentication successful');
        return this.accessToken;
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
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

  // ✅ Phone formatting
  formatPhone(phone) {
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    const cleaned = phone.toString().replace(/\D/g, '');
    const last10 = cleaned.slice(-10);
    
    if (last10.length !== 10) {
      throw new Error(`Invalid phone number: ${phone}. Must be 10 digits.`);
    }
    
    const phoneInt = parseInt(last10, 10);
    console.log(`📱 Phone formatted: ${phone} → ${phoneInt}`);
    return phoneInt;
  }

  // ✅ Weight calculation
  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const calculatedWeight = totalItems * 500;
    const finalWeight = Math.max(calculatedWeight, 1000);
    console.log(`⚖️ Weight calculated: ${totalItems} items → ${finalWeight}g`);
    return finalWeight;
  }

  // ✅ MAIN FIX: Create Shipment
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('\n🚚 ============ CREATING EKART SHIPMENT ============');
      console.log('Order ID:', orderData.orderId);
      console.log('Payment Method:', orderData.paymentMethod);
      console.log('Final Amount:', orderData.finalAmount);

      const headers = await this.createHeaders();
      console.log('✅ Authentication headers ready');

      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const finalAmount = parseFloat(orderData.finalAmount);
      const taxableAmount = parseFloat((finalAmount / 1.18).toFixed(2));
      const taxValue = parseFloat((finalAmount - taxableAmount).toFixed(2));

      let customerPhone;
      try {
        customerPhone = this.formatPhone(shippingAddress.mobile);
      } catch (phoneError) {
        console.error('❌ Customer phone formatting failed:', phoneError.message);
        throw new Error(`Invalid customer phone number: ${shippingAddress.mobile}`);
      }

      // ✅ CRITICAL FIX: Use registered address name
      const shipmentPayload = {
        seller_name: this.sellerDetails.name,
        seller_address: `${this.sellerDetails.address}, ${this.sellerDetails.city}, ${this.sellerDetails.state}, ${this.sellerDetails.pincode}`,
        seller_gst_tin: this.sellerDetails.gst_tin,
        
        order_number: orderData.orderId.toString(),
        invoice_number: orderData.orderId.toString(),
        invoice_date: new Date().toISOString().split('T')[0],
        
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        cod_amount: orderData.paymentMethod === 'cod' ? finalAmount : 0,
        
        category_of_goods: "General",
        products_desc: items.map(item => item.name).join(', ').substring(0, 100),
        
        total_amount: finalAmount,
        tax_value: taxValue,
        taxable_amount: taxableAmount,
        commodity_value: taxableAmount,
        
        quantity: totalQuantity,
        weight: totalWeight,
        length: 15,
        height: 15,
        width: 15,
        
        drop_location: {
          name: shippingAddress.name,
          phone: customerPhone,
          pin: parseInt(shippingAddress.pincode),
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India"
        },
        
        // ✅ CRITICAL FIX: Use exact registered address name
        pickup_location: {
          name: this.pickupLocationName,  // Changed from brand_name
          phone: this.sellerDetails.phone,
          pin: this.sellerDetails.pincode,
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: "India"
        },
        
        // ✅ CRITICAL FIX: Use exact registered address name for return too
        return_location: {
          name: this.pickupLocationName,  // Changed from brand_name
          phone: this.sellerDetails.phone,
          pin: this.sellerDetails.pincode,
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: "India"
        }
      };

      console.log('\n📦 Final Shipment Payload:');
      console.log(JSON.stringify(shipmentPayload, null, 2));

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
      console.log('Data:', JSON.stringify(response.data, null, 2));

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        
        const trackingId = data.tracking_id || data._id || data.data?.tracking_id || data.data?._id;
        const awbNumber = data.barcodes?.wbn || data.awb || data.data?.awb || trackingId;

        if (!trackingId) {
          console.error('❌ No tracking ID in successful response');
          console.error('Full response:', JSON.stringify(data, null, 2));
          throw new Error('Shipment created but no tracking ID received');
        }

        console.log('\n✅ ✅ ✅ SHIPMENT CREATED SUCCESSFULLY!');
        console.log('🎯 Tracking ID:', trackingId);
        console.log('📋 AWB Number:', awbNumber);
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
        console.error('❌ Ekart API returned error:');
        console.error('Status:', response.status);
        console.error('Data:', JSON.stringify(response.data, null, 2));
        
        const errorMsg = response.data?.message || 
                        response.data?.description ||
                        response.data?.remark || 
                        response.data?.error || 
                        `API error: ${response.status}`;
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('\n❌ ❌ ❌ SHIPMENT CREATION FAILED');
      console.error('Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('============================================\n');
      
      throw new Error(`Shipment creation failed: ${error.response?.data?.description || error.response?.data?.message || error.message}`);
    }
  }

  // ✅ Cancel Shipment
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

  // ✅ Track Shipment
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

  // ✅ Check Serviceability
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