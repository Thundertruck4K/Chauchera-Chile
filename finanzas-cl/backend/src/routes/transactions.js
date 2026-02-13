const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

router.get('/', async (req,res,next) => {
  try {
    const { account_id, type, category_id, from, to, limit=50, offset=0, search } = req.query;
    let where = ['t.user_id=$1']; let params = [req.user.id]; let i=2;
    if (account_id) { where.push(`t.account_id=$${i++}`); params.push(account_id); }
    if (type) { where.push(`t.type=$${i++}`); params.push(type); }
    if (category_id) { where.push(`t.category_id=$${i++}`); params.push(category_id); }
    if (from) { where.push(`t.date>=$${i++}`); params.push(from); }
    if (to) { where.push(`t.date<=$${i++}`); params.push(to); }
    if (search) { where.push(`(t.description ILIKE $${i} OR t.merchant ILIKE $${i})`); params.push(`%${search}%`); i++; }
    const q = `SELECT t.*, a.name as account_name, a.color as account_color,
      c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN accounts a ON a.id=t.account_id
      LEFT JOIN categories c ON c.id=t.category_id
      WHERE ${where.join(' AND ')}
      ORDER BY t.date DESC, t.created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(parseInt(limit), parseInt(offset));
    const { rows } = await db.query(q, params);
    const count = await db.query(`SELECT COUNT(*) FROM transactions t WHERE ${where.join(' AND ')}`, params.slice(0,-2));
    res.json({ data: rows, total: parseInt(count.rows[0].count), limit: parseInt(limit), offset: parseInt(offset) });
  } catch(err) { next(err); }
});

router.post('/', async (req,res,next) => {
  try {
    const { account_id, category_id, type, amount, currency, description, merchant, date, reference, to_account_id, is_recurring, tags } = req.body;
    if (!account_id || !type || !amount) return res.status(400).json({ error: 'Campos requeridos: account_id, type, amount' });
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`
        INSERT INTO transactions (user_id,account_id,category_id,type,amount,currency,description,merchant,date,reference,to_account_id,is_recurring,tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [req.user.id, account_id, category_id||null, type, Math.abs(amount), currency||'CLP',
         description||null, merchant||null, date||new Date(), reference||null, to_account_id||null,
         is_recurring||false, tags||null]
      );
      // Update account balance
      const delta = type==='income' ? Math.abs(amount) : type==='expense' ? -Math.abs(amount) : 0;
      if (delta !== 0) {
        await client.query('UPDATE accounts SET balance=balance+$1,updated_at=NOW() WHERE id=$2', [delta, account_id]);
      }
      if (type==='transfer' && to_account_id) {
        await client.query('UPDATE accounts SET balance=balance+$1,updated_at=NOW() WHERE id=$2', [Math.abs(amount), to_account_id]);
      }
      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch(err) { next(err); }
});

router.delete('/:id', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM transactions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Transacción no encontrada' });
    const t = rows[0];
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM transactions WHERE id=$1', [t.id]);
      const delta = t.type==='income' ? -t.amount : t.type==='expense' ? t.amount : 0;
      if (delta!==0) await client.query('UPDATE accounts SET balance=balance+$1 WHERE id=$2', [delta, t.account_id]);
      if (t.type==='transfer' && t.to_account_id) {
        await client.query('UPDATE accounts SET balance=balance-$1 WHERE id=$2', [t.amount, t.to_account_id]);
      }
      await client.query('COMMIT');
      res.json({ message: 'Transacción eliminada' });
    } catch(e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch(err) { next(err); }
});

router.get('/categories', async (req,res,next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM categories WHERE is_default=true OR user_id=$1 ORDER BY type,name',
      [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
});

module.exports = router;