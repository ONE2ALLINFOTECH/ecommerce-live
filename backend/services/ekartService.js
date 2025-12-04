// ================== FIXED EKART SERVICE ==================
const axios = require("axios");

class EkartService {
  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID;
    this.username = process.env.EKART_USERNAME;
    this.password = process.env.EKART_PASSWORD;

    this.baseURL = (process.env.EKART_BASE_URL || "https://app.elite.ekartlogistics.in").replace(/\/+$/, "");

    this.accessToken = null;
    this.tokenExpiry = null;

    this.pickupLocationName = process.env.PICKUP_LOCATION_NAME;
    this.sellerDetails = {
      name: process.env.SELLER_NAME,
      address: process.env.SELLER_ADDRESS,
      city: process.env.SELLER_CITY,
      state: process.env.SELLER_STATE,
      pincode: process.env.SELLER_PINCODE,
      phone: process.env.SELLER_PHONE,
      gst_tin: process.env.SELLER_GST_TIN
    };
  }

  // ================= AUTH (CORRECTED) =================
  async authenticate() {
    try {
      const url = `${this.baseURL}/integrations/v2/auth/token/${this.clientId}`;

      const res = await axios.post(url, {
        username: this.username,
        password: this.password
      });

      if (!res.data?.access_token) throw new Error("No token received");

      this.accessToken = res.data.access_token;
      this.tokenExpiry = Date.now() + (res.data.expires_in - 300) * 1000;

      return this.accessToken;

    } catch (err) {
      throw new Error("Ekart auth failed: " + (err.response?.data?.message || err.message));
    }
  }

  async getAccessToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  async getHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }

  // ================= CREATE SHIPMENT (CORRECTED URL) =================
  async createShipment(order, address, items) {
    try {
      const url = `${this.baseURL}/api/v1/package/create`;
      const headers = await this.getHeaders();

      const payload = {
        seller_name: this.sellerDetails.name,
        seller_address: `${this.sellerDetails.address}, ${this.sellerDetails.city}, ${this.sellerDetails.state}, ${this.sellerDetails.pincode}`,
        seller_gst_tin: this.sellerDetails.gst_tin,

        order_number: order.orderId,
        invoice_number: order.orderId,
        invoice_date: new Date().toISOString().split("T")[0],

        consignee_name: address.name,
        products_desc: items.map(i => i.name).join(", ").slice(0, 100),

        payment_mode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
        cod_amount: order.paymentMethod === "cod" ? order.finalAmount : 0,

        category_of_goods: "General",

        total_amount: Number(order.finalAmount),
        taxable_amount: Number((order.finalAmount / 1.18).toFixed(2)),
        tax_value: Number((order.finalAmount - order.finalAmount / 1.18).toFixed(2)),
        commodity_value: String(Number((order.finalAmount / 1.18).toFixed(2))),

        quantity: items.reduce((s, i) => s + i.quantity, 0),
        weight: 1000,  // grams
        length: 20,
        width: 20,
        height: 20,

        drop_location: {
          name: address.name,
          phone: address.mobile,
          pin: Number(address.pincode),
          address: address.address,
          city: address.city,
          state: address.state,
          country: "India"
        },

        pickup_location: {
          name: this.pickupLocationName,
          phone: this.sellerDetails.phone,
          pin: Number(this.sellerDetails.pincode),
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: "India"
        },

        return_location: {
          name: this.pickupLocationName,
          phone: this.sellerDetails.phone,
          pin: Number(this.sellerDetails.pincode),
          address: this.sellerDetails.address,
          city: this.sellerDetails.city,
          state: this.sellerDetails.state,
          country: "India"
        }
      };

      const res = await axios.put(url, payload, { headers });

      if (!res.data?.tracking_id) {
        throw new Error("Shipment created but no tracking id returned");
      }

      return {
        success: true,
        tracking_id: res.data.tracking_id,
        vendor: res.data.vendor,
        barcodes: res.data.barcodes,
        raw_response: res.data
      };

    } catch (err) {
      throw new Error("Shipment creation failed: " + (err.response?.data?.remark || err.message));
    }
  }

  // ================= CANCEL SHIPMENT =================
  async cancelShipment(trackingId) {
    const url = `${this.baseURL}/api/v1/package/cancel?tracking_id=${trackingId}`;
    const headers = await this.getHeaders();
    return axios.delete(url, { headers }).then(r => r.data);
  }

  // ================= TRACK SHIPMENT =================
  async trackShipment(trackingId) {
    const url = `${this.baseURL}/api/v1/track/${trackingId}`;
    const headers = await this.getHeaders();
    return axios.get(url, { headers }).then(r => r.data);
  }

  // ================= SERVICEABILITY (CORRECTED URL) =================
  async checkServiceability(pincode) {
    try {
      const url = `${this.baseURL}/api/v2/serviceability/${pincode}`;
      const headers = await this.getHeaders();
      const res = await axios.get(url, { headers });
      return res.data;
    } catch (err) {
      return { status: true, remark: "fallback", error: err.message };
    }
  }
}

module.exports = new EkartService();
