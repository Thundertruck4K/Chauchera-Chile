const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');

// Check setup status
router.get('/status', async (req, res, next) => {
  try {
    const { rows } = await db.query("SELECT value FROM app_config WHERE key='setup_complete'");
    res.json({ setup_complete: rows[0]?.value === 'true' });
  } catch(err) { next(err); }
});

// First-time setup
router.post('/init', async (req, res, next) => {
  try {
    const { setup_token, name, email, password } = req.body;
    const cfg = await db.query("SELECT value FROM app_config WHERE key='setup_complete'");
    if (cfg.rows[0]?.value === 'true') return res.status(400).json({ error: 'Ya configurado' });
    const envToken = process.env.SETUP_TOKEN;
    if (envToken && envToken !== setup_token) return res.status(403).json({ error: 'Token de setup incorrecto' });
    if (!name || !email || !password) return res.status(400).json({ error: 'Datos incompletos' });
    if (password.length < 8) return res.status(400).json({ error: 'Contraseña debe tener mínimo 8 caracteres' });
    const hash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO users (name,email,password) VALUES ($1,$2,$3)', [name,email,hash]);
    await db.query("UPDATE app_config SET value='true', updated_at=NOW() WHERE key='setup_complete'");
    logger.logToDB(db, 'info', 'Setup inicial completado', { email }, null, req);
    logger.info('Setup inicial completado', { email });
    res.json({ message: 'Configuración inicial completada exitosamente' });
  } catch(err) { next(err); }
});

module.exports = router;