const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

router.get('/', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM economic_indicators ORDER BY id');
    // Try to fetch fresh from mindicador.cl API
    try {
      const fetch = require('node-fetch');
      const today = new Date().toISOString().slice(0,10);
      const cached = rows.find(r => r.name==='UF');
      if (!cached?.date || cached.date.toISOString().slice(0,10) < today) {
        const r = await fetch('https://mindicador.cl/api', { timeout: 5000 });
        if (r.ok) {
          const data = await r.json();
          const updates = [
            ['UF', data.uf?.valor], ['UTM', data.utm?.valor],
            ['USD', data.dolar?.valor], ['EUR', data.euro?.valor],
            ['IPC', data.ipc?.valor]
          ];
          for (const [name, value] of updates) {
            if (value) await db.query('UPDATE economic_indicators SET value=$1, date=$2, updated_at=NOW() WHERE name=$3', [value, today, name]);
          }
          const { rows: fresh } = await db.query('SELECT * FROM economic_indicators ORDER BY id');
          return res.json(fresh);
        }
      }
    } catch(_) {}
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;