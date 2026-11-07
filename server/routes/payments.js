import { Router } from 'express';
import * as c from '../controllers/paymentsController.js';

const r = Router();
r.get('/config', c.config);
export default r;
