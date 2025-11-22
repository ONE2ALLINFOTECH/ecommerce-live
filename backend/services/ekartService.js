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
          }
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        console.log('✅ Ekart authentication successful');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response from Ekart');
      }
    } catch (error) {
      console.error('❌ Ekart authentication failed:', error.response?.data || error.message);
      throw new Error(`Ekart authentication failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAccessToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  async createHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Create shipment in Ekart
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      const headers = await this.createHeaders();

      // Prepare shipment payload according to Ekart API
      const shipmentPayload = {
        seller_name: process.env.SELLER_NAME || "Your Store Name",
        seller_address: process.env.SELLER_ADDRESS || "Your Store Address",
        seller_gst_tin: process.env.SELLER_GST_TIN || "",
        consignee_name: shippingAddress.name,
        consignee_gst_tin: "",
        invoice_number: orderData.orderId,
        invoice_date: new Date().toISOString().split('T')[0],
        document_number: orderData.orderId,
        document_date: new Date().toISOString().split('T')[0],
        products_desc: items.map(item => item.name).join(', '),
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        category_of_goods: 'GENERAL',
        hsn_code: '',
        total_amount: orderData.finalAmount,
        tax_value: 0,
        taxable_amount: orderData.finalAmount,
        commodity_value: orderData.finalAmount.toString(),
        cod_amount: orderData.paymentMethod === 'cod' ? orderData.finalAmount : 0,
        quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        weight: this.calculateTotalWeight(items),
        length: 10,
        width: 10,
        height: 10,
        drop_location: {
          location_type: "drop",
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: "India",
          pincode: shippingAddress.pincode,
          name: shippingAddress.name,
          phone: shippingAddress.mobile
        },
        pickup_location: {
          location_type: "pickup",
          address: process.env.SELLER_ADDRESS || "Your Store Address",
          city: process.env.SELLER_CITY || "Your City",
          state: process.env.SELLER_STATE || "Your State",
          country: "India",
          pincode: process.env.SELLER_PINCODE || "000000"
        }
      };

      console.log('📦 Ekart shipment payload:', JSON.stringify(shipmentPayload, null, 2));

      const response = await axios.post(
        `${this.baseURL}/api/v1/package/create`,
        shipmentPayload,
        { headers }
      );

      console.log('✅ Ekart shipment created successfully:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', error.response?.data || error.message);
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Cancel shipment in Ekart
  async cancelShipment(trackingId) {
    try {
      console.log('🗑️ Canceling Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.delete(
        `${this.baseURL}/api/v1/package/cancel`,
        {
          headers,
          data: { tracking_id: trackingId }
        }
      );

      console.log('✅ Ekart shipment cancelled successfully');
      return response.data;

    } catch (error) {
      console.error('❌ Ekart shipment cancellation failed:', error.response?.data || error.message);
      throw new Error(`Shipment cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Track shipment
  async trackShipment(trackingId) {
    try {
      console.log('📊 Tracking Ekart shipment:', trackingId);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v1/package/track`,
        {
          headers,
          params: { tracking_id: trackingId }
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Ekart tracking failed:', error.response?.data || error.message);
      throw new Error(`Tracking failed: ${error.response?.data?.message || error.message}`);
    }
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
            length: 10,
            width: 10,
            height: 10
          }
        ]
      };

      const response = await axios.post(
        `${this.baseURL}/data/pricing/estimate`,
        ratePayload,
        { headers }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Shipping rates fetch failed:', error.response?.data || error.message);
      throw new Error(`Shipping rates fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Check serviceability
  async checkServiceability(pincode) {
    try {
      console.log('📍 Checking serviceability for pincode:', pincode);

      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/api/v2/serviceability/${pincode}`,
        { headers }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Serviceability check failed:', error.response?.data || error.message);
      throw new Error(`Serviceability check failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Helper method to calculate total weight
  calculateTotalWeight(items) {
    // Assuming average weight of 500g per item, you can customize this
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return Math.max(totalItems * 500, 1000); // Minimum 1kg
  }
}

module.exports = new EkartService();