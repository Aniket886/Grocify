import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/cartController.js';

const r = Router();
r.use(authenticate, authorize('customer'));
r.get('/', c.get);
r.post('/items', c.add);
r.patch('/items/:productId', c.setQuantity);
r.delete('/items/:productId', c.remove);
export default r;
