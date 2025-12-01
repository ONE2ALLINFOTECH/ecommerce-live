// services/ekartService.js
const axios = require("axios");

class EkartService {
  constructor() {
    this.clientId = process.env.EKART_CLIENT_ID;
    this.username = process.env.EKART_USERNAME;
    this.password = process.env.EKART_PASSWORD;
    this.baseURL = "https://app.elite.ekartlogistics.com"; // ALWAYS .com
    this.accessToken = null;
    this.tokenExpiry = null;
    this.pickupCode = process.env.EKART_PICKUP_CODE;

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      validateStatus: (s) => s >= 200 && s < 500,
    });
  }

  log(...args) {
    console.log("[EkartService]", ...args);
  }

  sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  async withRetries(fn, attempts = 3, delay = 600) {
    let err;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        err = e;
        await this.sleep(delay * (i + 1));
      }
    }
    throw err;
  }

  //---------------------------
  //  AUTHENTICATION
  //---------------------------

  async authenticate() {
    try {
      const url = `/integrations/v2/auth/token/${this.clientId}`;

      const res = await this.axios.post(
        url,
        { username: this.username, password: this.password },
        { headers: { "client-id": this.clientId } }
      );

      if (res.data?.access_token) {
        this.accessToken = res.data.access_token;
        const expires = (res.data.expires_in || 3600) - 300;
        this.tokenExpiry = Date.now() + expires * 1000;
        return this.accessToken;
      }

      throw new Error(res.data?.message || "Authentication error");
    } catch (error) {
      throw new Error(
        "Ekart Authentication Failed: " +
          (error.response?.data?.message || error.message)
      );
    }
  }

  async getAccessToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  async authHeaders() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      "client-id": this.clientId,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  formatPhone(phone) {
    if (!phone) return "";
    return phone.toString().replace(/\D/g, "").slice(-10);
  }

  calculateWeight(items) {
    if (!items.length) return 1000;
    return Math.max(
      1000,
      items.reduce((t, i) => t + (i.quantity || 1) * 500, 0)
    );
  }

  //---------------------------
  //  CREATE SHIPMENT
  //---------------------------

  async createShipment(order, address, items) {
    return this.withRetries(async () => {
      if (!order || !address || !items) {
        throw new Error("Invalid createShipment params");
      }

      const product_list = items.map((i) => ({
        product_name: i.name,
        quantity: i.quantity,
        price: i.sellingPrice || 0,
        sku: String(i.productId || ""),
      }));

      const payload = {
        order_number: String(order.orderId),
        invoice_number: String(order.orderId),
        invoice_date: new Date().toISOString().split("T")[0],

        pickup_code: this.pickupCode,

        drop_pin: Number(address.pincode),

        payment_mode: order.paymentMethod === "cod" ? "COD" : "Prepaid",
        cod_amount: order.paymentMethod === "cod" ? Number(order.finalAmount) : 0,
        total_amount: Number(order.finalAmount),

        product_list,
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        weight: this.calculateWeight(items),

        seller_name: process.env.EKART_SELLER_NAME,
        seller_phone: process.env.EKART_SELLER_PHONE,
        seller_pin: Number(process.env.EKART_SELLER_PINCODE),

        customer_details: {
          name: address.name,
          phone: this.formatPhone(address.mobile),
          address: `${address.address}, ${address.locality || ""}`.trim(),
          city: address.city,
          state: address.state,
          pincode: Number(address.pincode),
        },
      };

      const res = await this.axios.post(
        "/integrations/v2/order/create",
        payload,
        { headers: await this.authHeaders() }
      );

      if (!res.data) throw new Error("No response from Ekart");

      const tracking =
        res.data.tracking_id ||
        res.data.trackingId ||
        res.data.data?.tracking_id;

      if (!tracking) {
        throw new Error(
          "No Tracking ID from Ekart: " + JSON.stringify(res.data)
        );
      }

      return {
        success: true,
        tracking_id: tracking,
        awb_number:
          res.data.awb ||
          res.data.barcodes?.wbn ||
          res.data.awb_number ||
          tracking,
        raw: res.data,
      };
    });
  }

  //---------------------------
  //  TRACK SHIPMENT
  //---------------------------

  async trackShipment(trackingId) {
    try {
      const res = await this.axios.get(
        `/integrations/v2/track/${trackingId}`,
        { headers: await this.authHeaders() }
      );

      const data = res.data || {};
      const track = data.track || data.data || {};

      const scans = (track.details || []).map((s) => ({
        status: s.status,
        location: s.location,
        timestamp: s.ctime || new Date().toISOString(),
      }));

      return {
        tracking_id: trackingId,
        current_status: track.status || "Pending",
        scans,
        awb: data.awb || trackingId,
        estimated_delivery: data.edd,
        raw: data,
      };
    } catch (error) {
      return {
        tracking_id: trackingId,
        error: error.response?.data || error.message,
        scans: [],
      };
    }
  }

  //---------------------------
  //  CANCEL SHIPMENT
  //---------------------------

  async cancelShipment(trackingId) {
    try {
      const res = await this.axios.post(
        "/integrations/v2/order/cancel",
        { tracking_id: trackingId },
        { headers: await this.authHeaders() }
      );

      if (res.status === 404)
        return { success: true, message: "Already cancelled" };

      return {
        success: res.status >= 200 && res.status < 300,
        message: res.data?.message || "Cancelled",
        raw: res.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  //---------------------------
  //  SERVICEABILITY
  //---------------------------

  async checkServiceability(pincode) {
    try {
      const res = await this.axios.post(
        "/integrations/v2/serviceability/check",
        { pincode: String(pincode) },
        { headers: await this.authHeaders() }
      );

      const d = res.data?.details || res.data?.data || {};

      return {
        serviceable: !!(d.cod || d.prepaid),
        cod_available: !!d.cod,
        prepaid_available: !!d.prepaid,
        city: d.city,
        state: d.state,
        raw: res.data,
      };
    } catch (error) {
      return {
        serviceable: true,
        cod_available: true,
        prepaid_available: true,
        error: error.message,
      };
    }
  }

  //---------------------------
  //  PRICING ESTIMATE
  //---------------------------

  async getShippingRates(pickupPincode, deliveryPincode, weight, codAmount = 0) {
    try {
      const payload = {
        pickupPincode: String(pickupPincode),
        dropPincode: String(deliveryPincode),
        weight: String(weight),
        length: "15",
        height: "15",
        width: "15",
        paymentMode: codAmount > 0 ? "COD" : "Prepaid",
        invoiceAmount: String(codAmount || 100),
        codAmount: String(codAmount),
        shippingDirection: "forward",
        serviceType: "SURFACE",
      };

      const res = await this.axios.post(
        "/data/pricing/estimate",
        payload,
        { headers: await this.authHeaders() }
      );

      return { success: true, ...res.data };
    } catch (error) {
      return {
        success: false,
        freight_charge: 50,
        cod_charge: codAmount > 0 ? 30 : 0,
        total_charge: codAmount > 0 ? 80 : 50,
      };
    }
  }
}

module.exports = new EkartService();
