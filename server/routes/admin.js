import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import authorize from '../middleware/authorize.js';
import * as orders from '../controllers/ordersController.js';
import * as deliveries from '../controllers/deliveriesController.js';
import * as admin from '../controllers/adminController.js';

const r = Router();
r.use(authenticate, authorize('admin'));

r.get('/orders', orders.adminList);
r.get('/orders/:id', orders.getOne);

r.get('/deliveries', deliveries.list);
r.post('/orders/:id/assign', deliveries.assign);
r.patch('/orders/:id/status', deliveries.updateStatus);

r.get('/customers', admin.customers);
r.get('/payments', admin.payments);
r.get('/reports/sales', admin.salesReport);
export default r;
