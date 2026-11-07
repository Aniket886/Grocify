import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { findUserById } from '../data/localStore.js';
import { badRequest } from './validate.js';

// Verifies the Bearer token and loads the current user (so role changes apply immediately).
// When Firebase is connected, replace the jwt.verify call with Firebase Admin token verification.
export default async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw badRequest('Please log in', 401);

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw badRequest('Session expired. Please log in again', 401);
    }
    const user = await findUserById(payload.sub);
    if (!user) throw badRequest('Account not found', 401);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
