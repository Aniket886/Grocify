import env from '../config/env.js';
import { assertProvider } from './PaymentProvider.js';
import mockProvider from './mockProvider.js';
import gatewayProvider from './gatewayProvider.js';

// Chosen by PAYMENT_PROVIDER in .env ("mock" by default).
const providers = { mock: mockProvider, gateway: gatewayProvider };
const provider = assertProvider(providers[env.paymentProvider] || mockProvider);

export default provider;
