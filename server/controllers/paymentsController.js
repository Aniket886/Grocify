import env from '../config/env.js';
import provider from '../payments/index.js';
import gatewayProvider from '../payments/gatewayProvider.js';
import { PAYMENT_METHODS } from '../payments/PaymentProvider.js';
import * as store from '../data/localStore.js';
import { badRequest } from '../middleware/validate.js';

// Deduplication store for processed webhook events (idempotency defense)
const processedEventIds = new Set();

/**
 * Public payment configuration for the web app.
 */
export function config(req, res) {
  res.json({
    provider: provider.name,
    methods: PAYMENT_METHODS,
    testMode: (provider.name === 'mock' || env.paymentGatewayEnv === 'sandbox') && env.nodeEnv !== 'production',
    gatewayUrl: env.paymentGatewayUrl,
    gatewayEnv: env.paymentGatewayEnv,
  });
}

/**
 * Creates or retrieves a payment order on UPI Gateway for an existing Grocify order.
 */
export async function initiate(req, res) {
  const order = await store.getOrder(req.params.id);
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
    throw badRequest('Order not found', 404);
  }

  if (order.status !== 'Payment Pending') {
    throw badRequest(order.status === 'Cancelled' ? 'This order was cancelled' : 'This order is already paid', 409);
  }

  const customer = await store.findUserById(order.userId);
  const redirectUrl = `${env.clientUrl}/orders/${order.id}/confirmation`;

  req.log.info('Initiating UPI Gateway payment order', { orderId: order.id, total: order.total });
  const gatewayOrder = await gatewayProvider.createOrder({
    order,
    customer,
    redirectUrl,
  });

  res.json({
    success: true,
    data: {
      orderId: gatewayOrder.order_id,
      clientOrderId: gatewayOrder.client_order_id,
      amount: gatewayOrder.amount,
      status: gatewayOrder.status,
      paymentUrl: gatewayOrder.payment_url,
      upiIntent: gatewayOrder.upi_intent,
      expiresAt: gatewayOrder.expires_at,
    },
  });
}

/**
 * Checks live order status directly on UPI Gateway and syncs if payment was made.
 */
export async function status(req, res) {
  const order = await store.getOrder(req.params.id);
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
    throw badRequest('Order not found', 404);
  }

  // If already paid in Grocify, return current state
  if (order.status === 'Order Placed' && order.paymentStatus === 'paid') {
    return res.json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paid: true,
    });
  }

  // Check with UPI Gateway
  try {
    const gatewayOrder = await gatewayProvider.getOrderStatus(order.id);

    if (gatewayOrder.status === 'paid' && order.status === 'Payment Pending') {
      const transactionId = gatewayOrder.utr || gatewayOrder.order_id;
      req.log.info('Payment confirmed via gateway status check', { orderId: order.id, transactionId });
      const { order: updated } = await store.applyPayment(order.id, {
        method: 'UPI',
        success: true,
        transactionId,
      });

      return res.json({
        status: updated.status,
        paymentStatus: updated.paymentStatus,
        paid: true,
        transactionId,
      });
    }

    res.json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      gatewayStatus: gatewayOrder.status,
      paid: gatewayOrder.status === 'paid',
      paymentUrl: gatewayOrder.payment_url,
      upiIntent: gatewayOrder.upi_intent,
    });
  } catch (err) {
    req.log.warn('Could not query gateway status', { orderId: order.id, error: err.message });
    res.json({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paid: false,
    });
  }
}

/**
 * Customer submits 12-digit UTR directly on Grocify for instant verification.
 */
export async function verifyUtr(req, res) {
  const order = await store.getOrder(req.params.id);
  if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
    throw badRequest('Order not found', 404);
  }

  const { utr } = req.body || {};
  if (!utr || !/^\s*\d{12}\s*$/.test(utr)) {
    throw badRequest('Please enter a valid 12-digit UTR / UPI Reference Number');
  }

  const cleanUtr = utr.trim();

  if (order.status === 'Order Placed' && order.paymentStatus === 'paid') {
    return res.json({ success: true, order, paid: true });
  }

  if (order.status !== 'Payment Pending') throw badRequest('This order is not awaiting payment', 409);

  // The gateway is the source of truth: make sure its order exists, hand it the
  // UTR, then only mark Grocify's order paid if the gateway reports "paid".
  let gw = await gatewayProvider.getOrderStatus(order.id).catch(() => null);
  gw ||= await gatewayProvider.createOrder({ order, customer: await store.findUserById(order.userId) });
  if (gw.status !== 'paid') {
    await gatewayProvider.submitUtr(gw.order_id, cleanUtr);
    gw = await gatewayProvider.getOrderStatus(order.id);
  }

  if (gw.status !== 'paid') {
    return res.json({
      success: true,
      paid: false,
      gatewayStatus: gw.status,
      message: gw.status === 'review'
        ? 'UTR received. The merchant will confirm your payment shortly.'
        : `Payment is ${gw.status} on the gateway.`,
    });
  }

  const transactionId = gw.utr || cleanUtr;
  const { order: updated } = await store.applyPayment(order.id, { method: 'UPI', success: true, transactionId });
  req.log.info('Payment verified via gateway UTR check', { orderId: order.id, transactionId });

  res.json({ success: true, order: updated, paid: true, transactionId });
}

/**
 * Webhook receiver for UPI Gateway signed events (e.g. order.paid).
 */
export async function webhook(req, res) {
  const signatureHeader = req.get('X-Signature') || '';
  const eventHeader = req.get('X-Event') || '';
  const eventId = req.get('X-Event-Id') || req.body?.event_id;

  req.log.info('Incoming payment webhook', { event: eventHeader, eventId });

  // 1. Verify HMAC-SHA256 signature
  const verification = gatewayProvider.verifyWebhookSignature({
    signatureHeader,
    rawBody: req.rawBody,
    secret: env.paymentWebhookSecret,
  });

  if (!verification.valid) {
    req.log.warn('Webhook rejected: invalid signature', { reason: verification.reason });
    return res.status(401).json({ error: 'Invalid webhook signature', reason: verification.reason });
  }

  // 2. Deduplicate event IDs to prevent duplicate processing
  if (eventId) {
    if (processedEventIds.has(eventId)) {
      req.log.info('Webhook event already processed (idempotent)', { eventId });
      return res.status(200).json({ received: true, deduplicated: true });
    }
    processedEventIds.add(eventId);
    if (processedEventIds.size > 5000) {
      const first = processedEventIds.values().next().value;
      processedEventIds.delete(first);
    }
  }

  const payload = req.body;
  const event = payload?.event || eventHeader;
  const data = payload?.data || {};
  const clientOrderId = data.client_order_id;
  const transactionId = data.utr || data.order_id || `UPI-${Date.now()}`;

  // 3. Handle supported webhook events
  if (event === 'order.paid' && clientOrderId) {
    try {
      const order = await store.getOrder(clientOrderId);
      if (order && order.status === 'Payment Pending') {
        await store.applyPayment(clientOrderId, {
          method: 'UPI',
          success: true,
          transactionId,
        });
        req.log.info('Order marked as PAID via webhook', { orderId: clientOrderId, transactionId });
      } else {
        req.log.info('Order already processed or not pending', { orderId: clientOrderId, status: order?.status });
      }
    } catch (err) {
      req.log.error('Error applying payment from webhook', { error: err.message, clientOrderId });
      return res.status(500).json({ error: 'Failed to apply payment' });
    }
  } else if (event === 'order.expired' && clientOrderId) {
    req.log.info('Order expired event received from gateway', { orderId: clientOrderId });
  }

  res.status(200).json({ received: true, event });
}
