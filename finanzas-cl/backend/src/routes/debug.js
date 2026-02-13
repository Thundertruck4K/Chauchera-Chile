const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

router.get('/logs', async (req,res,next) => {
  try {
    const { level, limit=100, offset=0 } = req.query;
    let where = []; let params = []; let i=1;
    if (level) { where.push(`level=$${i++}`); params.push(level); }
    const w = where.length ? 'WHERE '+where.join(' AND ') : '';
    const { rows } = await db.query(`SELECT * FROM app_logs ${w} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`, [...params, parseInt(limit), parseInt(offset)]);
    const count = await db.query(`SELECT COUNT(*) FROM app_logs ${w}`, params);
    res.json({ data: rows, total: parseInt(count.rows[0].count) });
  } catch(err) { next(err); }
});

router.get('/stats', async (req,res,next) => {
  try {
    const [logs, txCount, accCount, dbSize] = await Promise.all([
      db.query("SELECT level, COUNT(*) as count FROM app_logs WHERE created_at>NOW()-INTERVAL '24 hours' GROUP BY level"),
      db.query('SELECT COUNT(*) FROM transactions'),
      db.query('SELECT COUNT(*) FROM accounts WHERE active=true'),
      db.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size")
    ]);
    res.json({
      logs_24h: logs.rows,
      transactions: parseInt(txCount.rows[0].count),
      accounts: parseInt(accCount.rows[0].count),
      db_size: dbSize.rows[0].size,
      node_version: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch(err) { next(err); }
});

router.delete('/logs', async (req,res,next) => {
  try {
    const { days=30 } = req.query;
    const daysInt = parseInt(days);
    // Validar que days es un número para prevenir SQL injection
    if (isNaN(daysInt) || daysInt < 1 || daysInt > 365) {
      return res.status(400).json({ error: 'Días debe ser un número entre 1 y 365' });
    }
    const { rowCount } = await db.query(
      `DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL '${daysInt} days'`
    );
    res.json({ deleted: rowCount, message: `Logs más antiguos de ${days} días eliminados` });
  } catch(err) { next(err); }
});

module.exports = router;