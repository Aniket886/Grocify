import { Router } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import { findUserById } from '../data/localStore.js';
import * as c from '../controllers/productsController.js';

// Public listing, but if a valid token is sent we know whether the caller is an admin.
async function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) {
    try {
      req.user = await findUserById(jwt.verify(h.slice(7), env.jwtSecret).sub);
    } catch { /* ignore: treated as a guest */ }
  }
  next();
}

const r = Router();
r.get('/', optionalAuth, c.list);
r.get('/:id', c.getOne);
r.post('/', authenticate, authorize('admin'), c.create);
r.put('/:id', authenticate, authorize('admin'), c.update);
r.delete('/:id', authenticate, authorize('admin'), c.remove);
export default r;
