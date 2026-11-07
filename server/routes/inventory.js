import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/inventoryController.js';

const r = Router();
r.get('/', authenticate, authorize('admin'), c.list);
export default r;
