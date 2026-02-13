const winston = require('winston');
const path = require('path');
const fs = require('fs');
const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const fmt = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), winston.format.json()
);
const con = winston.format.combine(
  winston.format.colorize(), winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${message}${m}`;
  })
);
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', format: fmt,
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.Console({ format: con, level: 'debug' })
  ]
});
logger.logToDB = async (db, level, message, context = {}, userId = null, req = null) => {
  try {
    await db.query(
      'INSERT INTO app_logs (level,message,context,user_id,ip,user_agent) VALUES ($1,$2,$3,$4,$5,$6)',
      [level, message, JSON.stringify(context), userId,
       req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress) : null,
       req ? req.headers['user-agent'] : null]
    );
  } catch (_) {}
};
module.exports = logger;
