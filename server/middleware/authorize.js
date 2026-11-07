import { badRequest } from './validate.js';

// Usage: authorize('admin'). Role is checked on the server, not just hidden in the UI.
export default function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.log.warn('Access denied', { userId: req.user?.id, role: req.user?.role, path: req.originalUrl.split('?')[0] });
      return next(badRequest('You do not have permission to do this', 403));
    }
    next();
  };
}
