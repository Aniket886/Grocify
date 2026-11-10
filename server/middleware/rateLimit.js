import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

// Limits are per client IP (the app trusts one proxy hop in production so this is the real client,
// not the hosting proxy). The counters live in this process's memory, which suits a single instance;
// several instances would need a shared store such as Redis.
const make = (limit, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.nodeEnv === 'test' ? 1000 : limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: message },
});

// Slows down password guessing on login/register.
export const authLimiter = make(30, 'Too many attempts. Please try again later.');

// Password change and account deletion: few legitimate uses, high value to an attacker.
export const sensitiveLimiter = make(10, 'Too many attempts. Please try again later.');

// Checkout, payment and UTR verification: stops scripted order spam and UTR guessing.
export const paymentLimiter = make(60, 'Too many payment requests. Please wait a few minutes and try again.');
