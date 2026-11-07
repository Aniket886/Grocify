import crypto from 'node:crypto';

// Fake gateway for the prototype. No money moves and no card data is handled.
// `outcome: 'failure'` lets the demo show a failed payment (ignored in production).
const mockProvider = {
  name: 'mock',
  async pay({ outcome }) {
    if (outcome === 'failure') return { success: false, failureReason: 'Payment declined (simulated)' };
    return { success: true, transactionId: `MOCK-${crypto.randomBytes(6).toString('hex').toUpperCase()}` };
  },
};

export default mockProvider;
