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

  /* ================= AUTH ================= */

  async authenticate() {
    try {
      const response = await axios.post(
        `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`,
        {
          username: this.username,
          password: this.password
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.data?.access_token) {
        throw new Error('Invalid auth response from Ekart');
      }

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);

      console.log('✅ Ekart Token Generated');
      return this.accessToken;

    } catch (err) {
      console.error('❌ Ekart Auth Error:', err.response?.data || err.message);
      throw err;
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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /* ================= CREATE SHIPMENT ================= */

  async createShipment(orderData, shippingAddress, items) {
    try {
      const headers = await this.createHeaders();
      const totalWeight = this.calculateTotalWeight(items);

      const payload = {
        reference_number: orderData.orderId,
        payment_mode: orderData.paymentMethod === 'cod' ? 'COD' : 'PREPAID',
        order_amount: orderData.finalAmount,
        cod_amount: orderData.paymentMethod === 'cod' ? orderData.finalAmount : 0,

        length: 15,
        breadth: 15,
        height: 15,
        weight: totalWeight,

        pickup_location: {
          name: process.env.SELLER_NAME,
          address: process.env.SELLER_ADDRESS,
          city: process.env.SELLER_CITY,
          state: process.env.SELLER_STATE,
          pincode: process.env.SELLER_PINCODE,
          phone: shippingAddress.mobile
        },

        drop_location: {
          name: shippingAddress.name,
          address: `${shippingAddress.address}, ${shippingAddress.locality}`,
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          phone: shippingAddress.mobile
        },

        item_details: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.sellingPrice
        }))
      };

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipments/create`,
        payload,
        { headers }
      );

      console.log('✅ Ekart Shipment Created:', response.data);

      return {
        tracking_id: response.data.tracking_id,
        awb_number: response.data.awb_number,
        raw_response: response.data
      };

    } catch (error) {
      console.error('❌ Shipment create failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /* ================= TRACK ================= */

  async trackShipment(trackingId) {
    try {
      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/shipments/track/${trackingId}`,
        { headers }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Tracking failed:', error.response?.data || error.message);
      return { status: 'Tracking unavailable' };
    }
  }

  /* ================= CANCEL ================= */

  async cancelShipment(trackingId) {
    try {
      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipments/cancel`,
        { tracking_id: trackingId },
        { headers }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Cancel failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /* ================= SERVICEABILITY ================= */

  async checkServiceability(pincode) {
    try {
      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/serviceability/${pincode}`,
        { headers }
      );

      return response.data;

    } catch {
      return {
        serviceable: true,
        warning: 'Serviceability fallback mode'
      };
    }
  }

  /* ================= WEIGHT CALC ================= */

  calculateTotalWeight(items) {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    return Math.max(totalItems * 500, 1000);
  }
}

module.exports = new EkartService();
