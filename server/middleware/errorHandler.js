const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

const errorHandler = (err, req, res, _next) => {
  const correlationId = req.correlationId;
  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  logger.error(err.message, {
    correlationId,
    statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: isProd ? undefined : err.stack,
  });

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002')
      return res.status(409).json({ error: 'Duplicate entry', correlationId });
    if (err.code === 'P2025')
      return res.status(404).json({ error: 'Record not found', correlationId });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    return res.status(401).json({ error: 'Invalid or expired token', correlationId });

  if (err.name === 'ValidationError')
    return res.status(422).json({ error: err.message, details: err.details, correlationId });

  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'Internal server error',
    code: err.code,
    correlationId,
    ...(isProd ? {} : { stack: err.stack }),
  });
};

module.exports = { errorHandler, AppError };
