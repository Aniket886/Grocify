import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/ordersController.js';

const r = Router();
r.use(authenticate);
r.post('/', authorize('customer'), c.place);
r.get('/', authorize('customer'), c.listMine);
r.get('/:id', c.getOne);                              // own order, or any order for admin
r.post('/:id/pay', authorize('customer'), c.pay);
r.post('/:id/cancel', c.cancel);                      // own unpaid order, or any unpaid order for admin
export default r;
