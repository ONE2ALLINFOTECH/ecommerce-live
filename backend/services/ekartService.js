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
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 3600;
        this.tokenExpiry = Date.now() + ((expiresIn - 300) * 1000);
        console.log('✅ Ekart authentication successful');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('❌ Ekart auth failed:', error.message);
      throw new Error(`Ekart authentication failed: ${error.message}`);
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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // ✅ CRITICAL FIX: Correct endpoint + validation
  async createShipment(orderData, shippingAddress, items) {
    try {
      console.log('🚚 Creating Ekart shipment for order:', orderData.orderId);

      // ✅ Validate items exist
      if (!items || items.length === 0) {
        throw new Error('No items found for shipment creation');
      }

      const headers = await this.createHeaders();

      // Format phone numbers
      const formatPhone = (phone) => {
        const cleaned = phone.toString().replace(/\D/g, '');
        return cleaned.length === 10 ? cleaned : cleaned.slice(-10);
      };

      const totalWeight = this.calculateTotalWeight(items);
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

      // ✅ CORRECT PAYLOAD STRUCTURE
      const shipmentPayload = {
        reference_number: orderData.orderId,
        order_number: orderData.orderId,
        
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
        
        package: {
          weight: totalWeight,
          length: 15,
          breadth: 15,
          height: 15,
          quantity: totalQuantity,
          description: items.map(item => item.name).join(', ').substring(0, 100)
        },
        
        payment: {
          mode: orderData.paymentMethod === 'cod' ? 'COD' : 'PREPAID',
          amount: parseFloat(orderData.finalAmount).toFixed(2),
          cod_amount: orderData.paymentMethod === 'cod' ? parseFloat(orderData.finalAmount).toFixed(2) : "0.00"
        },
        
        invoice: {
          number: orderData.orderId,
          date: new Date().toISOString().split('T')[0],
          amount: parseFloat(orderData.finalAmount).toFixed(2)
        },
        
        seller_gst: process.env.SELLER_GST_TIN || "07AACCO4657Q1ZS",
        service_type: "STANDARD",
        
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

      console.log('📦 Ekart shipment payload:', {
        reference: shipmentPayload.reference_number,
        pickup_pincode: shipmentPayload.pickup.pincode,
        drop_pincode: shipmentPayload.drop.pincode,
        payment_mode: shipmentPayload.payment.mode,
        weight: shipmentPayload.package.weight
      });

      // ✅ CRITICAL FIX: Correct endpoint (plural: shipments)
      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipments/create`,
        shipmentPayload,
        { 
          headers,
          timeout: 45000,
          validateStatus: (status) => status >= 200 && status < 500
        }
      );

      console.log('📡 Ekart API Response Status:', response.status);

      // ✅ CRITICAL FIX: Check for tracking_id instead of success boolean
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        
        const trackingId = data.tracking_id 
          || data.reference_number 
          || data.awb_number 
          || data.shipment_id;

        const awbNumber = data.awb_number 
          || data.awb 
          || trackingId;

        if (trackingId) {
          console.log('✅ Shipment created successfully!');
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
        console.error('❌ Ekart API Error:', response.data);
        throw new Error(response.data?.message || response.data?.error || 'Shipment creation failed');
      }

    } catch (error) {
      console.error('❌ Ekart shipment creation failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      throw new Error(`Shipment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Calculate total weight
  calculateTotalWeight(items) {
    if (!items || items.length === 0) return 1000;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const calculatedWeight = totalItems * 500;
    return Math.max(calculatedWeight, 1000);
  }

  // Track shipment
  async trackShipment(trackingId) {
    try {
      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/shipment/track/${trackingId}`,
        { headers, timeout: 30000 }
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
      const headers = await this.createHeaders();

      const response = await axios.get(
        `${this.baseURL}/integrations/v2/serviceability/check/${pincode}`,
        { headers, timeout: 30000 }
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

  // Cancel shipment
  async cancelShipment(trackingId) {
    try {
      const headers = await this.createHeaders();

      const response = await axios.post(
        `${this.baseURL}/integrations/v2/shipment/cancel`,
        { reference_number: trackingId },
        { headers, timeout: 30000 }
      );

      return {
        success: true,
        message: 'Shipment cancelled successfully',
        data: response.data
      };

    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, message: 'Shipment not found or already cancelled' };
      }
      throw new Error(`Cancellation failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new EkartService();