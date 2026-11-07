import logger from '../config/logger.js';
import { badRequest } from './validate.js';

// Usage: authorize('admin'). Role is checked on the server, not just hidden in the UI.
export default function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Access denied', { userId: req.user?.id, role: req.user?.role, path: req.path });
      return next(badRequest('You do not have permission to do this', 403));
    }
    next();
  };
}
