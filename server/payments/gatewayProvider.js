// Placeholder for the real payment gateway (after the PBL).
// To add it:
//  1. Fill PAYMENT_GATEWAY_KEY_ID / PAYMENT_GATEWAY_SECRET / PAYMENT_WEBHOOK_SECRET in .env.
//  2. Implement pay() to create the gateway order and return its result (use order.id as the idempotency key
//     so a repeated call can never charge twice).
//  3. Add a webhook route that verifies the gateway's signature and calls store.applyPayment once per transactionId.
//  4. Set PAYMENT_PROVIDER to the gateway name in .env.
const gatewayProvider = {
  name: 'gateway',
  async pay() {
    throw Object.assign(new Error('The payment gateway is not configured yet'), { status: 501 });
  },
};

export default gatewayProvider;
