require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./utils/logger');
const db = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const authRoutes       = require('./routes/auth');
const setupRoutes      = require('./routes/setup');
const accountRoutes    = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes  = require('./routes/dashboard');
const toolsRoutes      = require('./routes/tools');
const scannerRoutes    = require('./routes/scanner');
const reportsRoutes    = require('./routes/reports');
const debugRoutes      = require('./routes/debug');
const indicatorsRoutes = require('./routes/indicators');
const resetRoutes      = require('./routes/reset');
const taxRoutes        = require('./routes/tax'); 

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { error: 'Demasiadas peticiones, intente más tarde' }
});
app.use('/api', limiter);
app.use(requestLogger);

app.use('/api/auth',         authRoutes);
app.use('/api/setup',        setupRoutes);
app.use('/api/accounts',     accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/tools',        toolsRoutes);
app.use('/api/scanner',      scannerRoutes);
app.use('/api/tax', 	     taxRoutes);
app.use('/api/reports',      reportsRoutes);
app.use('/api/debug',        debugRoutes);
app.use('/api/indicators',   indicatorsRoutes);
app.use('/api/reset',        resetRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '1.0.0' });
});

app.use(errorHandler);

async function start() {
  try {
    await db.connect();
    logger.info('✅ Conectado a PostgreSQL');
    const indicators = require('./services/updateIndicators');
    indicators.startScheduler();
    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 FinanzasCL API corriendo en puerto ${PORT}`);
      logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
    });
  } catch (err) {
    logger.error('❌ Error al iniciar:', { error: err.message });
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason: reason?.message || reason });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

start();
