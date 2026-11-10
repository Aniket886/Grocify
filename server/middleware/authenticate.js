import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { findUserById } from '../data/localStore.js';
import { badRequest } from './validate.js';

/** Signs a login token. `tv` (token version) lets a password change sign out every older token. */
export const signToken = (user) =>
  jwt.sign({ sub: user.id, tv: user.tokenVersion || 0 }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });

/**
 * Returns the user a token belongs to, or null. A token is accepted only when:
 *  - its signature and expiry verify with HS256 (no other algorithm, never "none"),
 *  - the account still exists, and
 *  - its version matches the account's current token version (so revoked tokens stop working).
 */
export async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  const user = await findUserById(payload.sub);
  if (!user) return null;
  if ((payload.tv || 0) !== (user.tokenVersion || 0)) return null;
  return user;
}

export const bearerToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

// Verifies the Bearer token and loads the current user (so role changes apply immediately).
export default async function authenticate(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) throw badRequest('Please log in', 401);
    const user = await userFromToken(token);
    if (!user) throw badRequest('Session expired. Please log in again', 401);
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
