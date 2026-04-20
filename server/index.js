require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const correlationId = require('./middleware/correlationId');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & compression
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());

// Correlation ID on every request
app.use(correlationId);

// Structured request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
      correlationId: req.correlationId,
    });
  });
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL || true
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.use('/api/auth/', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));

// Routes
app.use('/api/auth',             require('./routes/auth'));
app.use('/api/company',          require('./routes/company'));
app.use('/api/users',            require('./routes/users'));
app.use('/api/employees',        require('./routes/employees'));
app.use('/api/task-types',       require('./routes/taskTypes'));
app.use('/api/work-logs',        require('./routes/workLogs'));
app.use('/api/payments',         require('./routes/payments'));
app.use('/api/batches',          require('./routes/batches'));
app.use('/api/purchases',        require('./routes/purchases'));
app.use('/api/expenses',         require('./routes/expenses'));
app.use('/api/sales',            require('./routes/sales'));
app.use('/api/orders',           require('./routes/orders'));
app.use('/api/customers',        require('./routes/customers'));
app.use('/api/stock-adjustments',require('./routes/stockAdjustments'));
app.use('/api/audit',            require('./routes/audit'));
app.use('/api/dashboard',        require('./routes/dashboard'));
app.use('/api/finance',          require('./routes/finance'));
app.use('/api/backup',           require('./routes/backup'));
app.use('/api/inventory',        require('./routes/inventory'));
app.use('/api/reports',          require('./routes/reports'));
app.use('/api/pending',          require('./routes/pending'));
app.use('/api/fhir',             require('./routes/fhir'));
app.use('/api/demo',             require('./routes/demo'));

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

// Centralized error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`MillPro Enterprise started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});

module.exports = app;
