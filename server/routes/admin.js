import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as orders from '../controllers/ordersController.js';

const r = Router();
r.use(authenticate, authorize('admin'));
r.get('/orders', orders.adminList);
r.get('/orders/:id', orders.getOne);
export default r;
