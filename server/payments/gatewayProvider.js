import crypto from 'node:crypto';
import env from '../config/env.js';

/**
 * UPI Gateway Payment Provider for Grocify.
 * Integrates with the self-hosted Laravel UPI Gateway platform:
 *  - REST API order creation (POST /api/v1/orders)
 *  - Order status polling (GET /api/v1/orders/:orderNo)
 *  - Timestamped HMAC-SHA256 signature verification for webhooks (t=...,v1=...)
 *  - Dynamic UPI QR code & hosted checkout links
 */
const gatewayProvider = {
  name: 'gateway',

  /**
   * Returns API authorization headers for UPI Gateway
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': env.paymentGatewayKeyId,
      'X-Api-Secret': env.paymentGatewaySecret,
    };
  },

  /**
   * Create or retrieve a payment order on UPI Gateway.
   * Uses Grocify's order ID as client_order_id for strict idempotency.
   */
  async createOrder({ order, customer, redirectUrl }) {
    if (!env.paymentGatewayKeyId || !env.paymentGatewaySecret) {
      throw Object.assign(new Error('UPI Gateway API credentials are not configured in .env'), { status: 500 });
    }

    const payload = {
      amount: Number(order.total).toFixed(2),
      client_order_id: String(order.id),
      customer_name: customer?.name || undefined,
      customer_email: customer?.email || undefined,
      customer_mobile: customer?.phone || undefined,
      note: `Grocify Order #${order.id}`.slice(0, 50),
      redirect_url: redirectUrl || `${env.clientUrl}/orders/${order.id}/confirmation`,
    };

    const res = await fetch(`${env.paymentGatewayUrl}/api/v1/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    // If order already exists with this client_order_id, retrieve existing
    if (!res.ok) {
      if (res.status === 422 && body?.errors?.client_order_id) {
        return this.getOrderStatus(order.id);
      }
      const errMsg = body?.message || Object.values(body?.errors || {})[0]?.[0] || `Gateway error (${res.status})`;
      throw Object.assign(new Error(`Failed to create order on UPI Gateway: ${errMsg}`), { status: res.status });
    }

    return body.data;
  },

  /**
   * Retrieve order status from UPI Gateway by order ID or client_order_id.
   */
  async getOrderStatus(orderIdOrNo) {
    if (!env.paymentGatewayKeyId || !env.paymentGatewaySecret) {
      throw Object.assign(new Error('UPI Gateway API credentials are not configured in .env'), { status: 500 });
    }

    const res = await fetch(`${env.paymentGatewayUrl}/api/v1/orders/${encodeURIComponent(orderIdOrNo)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errMsg = body?.message || `Gateway returned status ${res.status}`;
      throw Object.assign(new Error(`Failed to retrieve order from UPI Gateway: ${errMsg}`), { status: res.status });
    }

    const body = await res.json();
    return body.data;
  },

  /**
   * Submit the customer's UTR to the gateway's own verification (rate limited,
   * duplicate-UTR protected). The gateway decides whether the order is paid.
   */
  async submitUtr(gatewayOrderNo, utr) {
    const res = await fetch(`${env.paymentGatewayUrl}/pay/${encodeURIComponent(gatewayOrderNo)}/utr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ utr }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.errors?.utr?.[0] || body?.message || `Gateway returned status ${res.status}`;
      throw Object.assign(new Error(msg), { status: res.status === 429 ? 429 : 400 });
    }
    return body.data;
  },

  /**
   * Verifies timestamped HMAC-SHA256 signature from UPI Gateway webhooks:
   * Header format: X-Signature: t=<timestamp>,v1=<signature>
   * Tolerance: 5 minutes (300 seconds)
   */
  verifyWebhookSignature({ signatureHeader, rawBody, secret }) {
    if (!signatureHeader || !rawBody || !secret) {
      return { valid: false, reason: 'Missing signature header, raw body, or secret' };
    }

    const match = /^t=(\d+),v1=([a-f0-9]{64})$/i.exec(signatureHeader.trim());
    if (!match) {
      return { valid: false, reason: 'Malformed signature header format' };
    }

    const timestamp = parseInt(match[1], 10);
    const signature = match[2].toLowerCase();

    // Replay defense: verify timestamp is within 300s window
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestamp) > 300) {
      return { valid: false, reason: `Timestamp outside tolerance window (${Math.abs(nowSec - timestamp)}s > 300s)` };
    }

    const payload = `${timestamp}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expected, 'hex');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, reason: 'Signature mismatch' };
    }

    return { valid: true, timestamp };
  },

  /**
   * Standard payment method required by PaymentProvider contract.
   */
  async pay({ order, outcome }) {
    if (outcome === 'failure') {
      return { success: false, failureReason: 'Payment declined (simulated)' };
    }

    try {
      // Check if order was already paid on gateway
      const gatewayOrder = await this.getOrderStatus(order.id).catch(() => null);

      if (gatewayOrder && gatewayOrder.status === 'paid') {
        return {
          success: true,
          transactionId: gatewayOrder.utr || gatewayOrder.order_id,
        };
      }

      // If pending on gateway, return pending info
      if (gatewayOrder && gatewayOrder.status === 'pending') {
        return {
          success: false,
          pending: true,
          paymentUrl: gatewayOrder.payment_url,
          upiIntent: gatewayOrder.upi_intent,
          failureReason: 'Payment pending on UPI Gateway. Complete payment via UPI QR or checkout link.',
        };
      }

      // If not yet created on gateway, create it
      const created = await this.createOrder({ order });
      return {
        success: false,
        pending: true,
        paymentUrl: created.payment_url,
        upiIntent: created.upi_intent,
        failureReason: 'Payment order initiated. Please scan the UPI QR code to complete payment.',
      };
    } catch (err) {
      return {
        success: false,
        failureReason: err.message || 'Payment gateway connection error',
      };
    }
  },
};

export default gatewayProvider;
