import { Router } from 'express';
import authenticate, { bearerToken, userFromToken } from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/productsController.js';

// Public listing, but if a valid token is sent we know whether the caller is an admin.
async function optionalAuth(req, res, next) {
  const token = bearerToken(req);
  if (token) req.user = (await userFromToken(token)) || undefined; // invalid token: treated as a guest
  next();
}

const r = Router();
r.get('/', optionalAuth, c.list);
r.get('/:id', c.getOne);
r.post('/', authenticate, authorize('admin'), c.create);
r.put('/:id', authenticate, authorize('admin'), c.update);
r.delete('/:id', authenticate, authorize('admin'), c.remove);
export default r;
