import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import * as c from '../controllers/paymentsController.js';

const r = Router();

// Public configuration endpoint
r.get('/config', c.config);

// Gateway Webhook receiver (signature authenticated)
r.post('/webhook', c.webhook);

// Customer gateway initiation, status polling & instant UTR verification
r.post('/initiate/:id', authenticate, c.initiate);
r.get('/status/:id', authenticate, c.status);
r.post('/verify-utr/:id', authenticate, c.verifyUtr);

export default r;
