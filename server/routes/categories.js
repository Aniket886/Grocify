import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as c from '../controllers/categoriesController.js';

const r = Router();
r.get('/', c.list);
r.post('/', authenticate, authorize('admin'), c.create);
r.put('/:id', authenticate, authorize('admin'), c.update);
r.delete('/:id', authenticate, authorize('admin'), c.remove);
export default r;
