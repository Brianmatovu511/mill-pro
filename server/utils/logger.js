const { createLogger, format, transports } = require('winston');
const { combine, timestamp, json, errors, colorize, printf } = format;

const devFormat = printf(({ level, message, timestamp, correlationId, ...meta }) => {
  const corr = correlationId ? ` [${correlationId}]` : '';
  const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${timestamp} ${level}${corr}: ${message}${extra}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    json()
  ),
  transports: [
    new transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? combine(errors({ stack: true }), timestamp(), json())
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),
    }),
  ],
  exitOnError: false,
});

module.exports = logger;
