import env from '../config/env.js';
import provider from '../payments/index.js';
import { PAYMENT_METHODS } from '../payments/PaymentProvider.js';

// Tells the website which provider is active, so the demo "simulate failure" button only shows in test mode.
export function config(req, res) {
  res.json({ provider: provider.name, methods: PAYMENT_METHODS, testMode: provider.name === 'mock' && env.nodeEnv !== 'production' });
}
