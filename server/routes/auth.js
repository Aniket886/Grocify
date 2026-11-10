import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/authController.js';

const r = Router();
r.post('/register', authLimiter, c.register);
r.post('/login', authLimiter, c.login);
r.get('/me', authenticate, c.me);
r.put('/profile', authenticate, c.updateProfile);
r.put('/password', sensitiveLimiter, authenticate, c.changePassword);
r.delete('/account', sensitiveLimiter, authenticate, c.deleteAccount);
export default r;
