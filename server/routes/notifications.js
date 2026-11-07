import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/notificationsController.js';

const r = Router();
r.use(authenticate, authorize('customer'));
r.get('/', c.list);
r.post('/read-all', c.markAllRead);
r.post('/:id/read', c.markRead);
export default r;
