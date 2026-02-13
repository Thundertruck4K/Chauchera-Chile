const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

router.use(auth);

router.get('/', async (req,res,next) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, b.name as bank_name, b.color as bank_color, at.name as type_name, at.category
      FROM accounts a
      LEFT JOIN banks b ON b.id=a.bank_id
      LEFT JOIN account_types at ON at.id=a.type_id
      WHERE a.user_id=$1 AND a.active=true ORDER BY a.created_at
    `, [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/', async (req,res,next) => {
  try {
    const { bank_id, type_id, name, number, currency, balance, credit_limit, cut_day, pay_day, color, icon } = req.body;
    const { rows } = await db.query(`
      INSERT INTO accounts (user_id,bank_id,type_id,name,number,currency,balance,credit_limit,cut_day,pay_day,color,icon)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [req.user.id, bank_id||null, type_id||null, name, number||null, currency||'CLP',
        balance||0, credit_limit||null, cut_day||null, pay_day||null, color||'#6366f1', icon||'wallet']);
    logger.logToDB(db, 'info', 'Cuenta creada', { name }, req.user.id, req);
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

router.put('/:id', async (req,res,next) => {
  try {
    const { bank_id, type_id, name, number, currency, balance, credit_limit, cut_day, pay_day, color, icon } = req.body;
    const { rows } = await db.query(`
      UPDATE accounts SET bank_id=$1,type_id=$2,name=$3,number=$4,currency=$5,balance=$6,
      credit_limit=$7,cut_day=$8,pay_day=$9,color=$10,icon=$11,updated_at=NOW()
      WHERE id=$12 AND user_id=$13 RETURNING *
    `, [bank_id||null, type_id||null, name, number||null, currency||'CLP', balance||0,
        credit_limit||null, cut_day||null, pay_day||null, color||'#6366f1', icon||'wallet',
        req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cuenta no encontrada' });
    res.json(rows[0]);
  } catch(err) { next(err); }
});

router.delete('/:id', async (req,res,next) => {
  try {
    await db.query('UPDATE accounts SET active=false WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Cuenta desactivada' });
  } catch(err) { next(err); }
});

router.get('/banks', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM banks WHERE active=true ORDER BY name');
    res.json(rows);
  } catch(err) { next(err); }
});

router.get('/types', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM account_types ORDER BY id');
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;