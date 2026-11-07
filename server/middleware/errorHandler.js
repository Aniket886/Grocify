import logger from '../config/logger.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error('Unhandled error', { requestId: req.id, message: err.message, stack: err.stack, path: req.path });
    // The customer gets a friendly message plus the request ID, which support can look up in the logs.
    return res.status(500).json({ error: 'Something went wrong. Please try again.', requestId: req.id });
  }
  logger.warn('Request rejected', { requestId: req.id, status, message: err.message, path: req.path });
  res.status(status).json({ error: err.message });
}
