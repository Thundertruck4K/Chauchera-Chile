const logger = require('../utils/logger');
module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  logger.error(`${req.method} ${req.path} - ${message}`, {
    status, stack: err.stack?.split('\n').slice(0,5), body: req.body, params: req.params
  });
  res.status(status).json({ error: message, status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};