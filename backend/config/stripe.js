const Stripe = require('stripe');

class StripePayment {
  constructor() {
    this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    this.currency = 'inr';
    
    console.log('💳 Stripe Configuration:', {
      environment: process.env.NODE_ENV,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ? '✓ Present' : '✗ Missing',
      secretKey: process.env.STRIPE_SECRET_KEY ? '✓ Present' : '✗ Missing',
      frontendUrl: process.env.FRONTEND_URL || 'Not Set'
    });
  }

  // Get Frontend URL with fallback
  getFrontendUrl() {
    if (process.env.FRONTEND_URL) {
      return process.env.FRONTEND_URL;
    }
    
    // Fallback URLs based on environment
    if (process.env.NODE_ENV === 'production') {
      return 'https://ecomerce-indol-eight.vercel.app';
    }
    
    return 'http://localhost:3000';
  }

  // Create Checkout Session (for hosted payment page)
  async createCheckoutSession(orderData) {
    try {
      const frontendUrl = this.getFrontendUrl();
      
      console.log('🔄 Creating Stripe Checkout Session:', {
        order_id: orderData.order_id,
        amount: orderData.amount,
        currency: orderData.currency,
        customer: orderData.customer_name,
        frontendUrl: frontendUrl
      });

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: orderData.currency,
              product_data: {
                name: `Order ${orderData.order_id}`,
                description: `Payment for order ${orderData.order_id}`,
              },
              unit_amount: Math.round(orderData.amount * 100), // Convert to paise
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/order-success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderData.order_id}`,
        cancel_url: `${frontendUrl}/order-failed?order_id=${orderData.order_id}`,
        customer_email: orderData.customer_email,
        metadata: {
          order_id: orderData.order_id,
          customer_id: orderData.customer_id,
          customer_email: orderData.customer_email,
          customer_name: orderData.customer_name
        },
        shipping_address_collection: {
          allowed_countries: ['IN'],
        },
      });

      console.log('✅ Stripe Checkout Session Created Successfully');
      console.log('📍 Success URL:', session.success_url);
      console.log('📍 Cancel URL:', session.cancel_url);
      
      return {
        session_id: session.id,
        url: session.url,
        amount: orderData.amount,
        currency: session.currency
      };
    } catch (error) {
      console.error('❌ Stripe API Error:', {
        type: error.type,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      if (error.type === 'StripeConnectionError') {
        throw new Error('Unable to connect to payment gateway. Please check your internet connection.');
      } else if (error.type === 'StripeCardError') {
        throw new Error(`Card error: ${error.message}`);
      } else if (error.code === 'url_invalid') {
        throw new Error('Payment gateway configuration error. Please contact support.');
      } else {
        throw new Error(error.message || 'Payment gateway error');
      }
    }
  }

  async retrieveSession(sessionId) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      console.error('Stripe retrieve session error:', error);
      throw new Error('Failed to fetch payment status');
    }
  }

  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log('📨 Stripe Webhook Event:', event.type);

      return event;
    } catch (error) {
      console.error('❌ Stripe Webhook Error:', error);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  // Test connection method
  async testConnection() {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: 100, // 1 INR
        currency: 'inr',
        description: 'Test connection'
      });

      await this.stripe.paymentIntents.cancel(paymentIntent.id);

      return { 
        success: true, 
        message: 'Stripe connection successful',
        frontendUrl: this.getFrontendUrl()
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        type: error.type
      };
    }
  }
}

module.exports = new StripePayment();