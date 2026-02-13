const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

// ─── Depósitos a plazo ───────────────────────────────────
router.get('/deposits', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT d.*, b.name as bank_name FROM time_deposits d LEFT JOIN banks b ON b.id=d.bank_id WHERE d.user_id=$1 ORDER BY d.created_at DESC', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});
router.post('/deposits', async (req,res,next) => {
  try {
    const { bank_id, name, principal, rate_pct, rate_type, start_date, end_date, renewal_mode, notes } = req.body;
    const days = Math.ceil((new Date(end_date)-new Date(start_date))/(1000*60*60*24));
    const final_amount = principal * (1 + (rate_pct/100) * days/365);
    const { rows } = await db.query(`INSERT INTO time_deposits (user_id,bank_id,name,principal,rate_pct,rate_type,start_date,end_date,renewal_mode,final_amount,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id,bank_id||null,name||'DAP',principal,rate_pct,rate_type||'tae',start_date,end_date,renewal_mode||'capital',final_amount,notes||null]);
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});
router.delete('/deposits/:id', async (req,res,next) => {
  try {
    await db.query('DELETE FROM time_deposits WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Eliminado' });
  } catch(err) { next(err); }
});

// ─── Metas de ahorro ─────────────────────────────────────
router.get('/savings', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM savings_goals WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});
router.post('/savings', async (req,res,next) => {
  try {
    const { name, target_amount, current_amount, target_date, icon, color } = req.body;
    const { rows } = await db.query(`INSERT INTO savings_goals (user_id,name,target_amount,current_amount,target_date,icon,color)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id,name,target_amount,current_amount||0,target_date||null,icon||'piggy-bank',color||'#22c55e']);
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});
router.put('/savings/:id', async (req,res,next) => {
  try {
    const { current_amount } = req.body;
    const { rows } = await db.query('UPDATE savings_goals SET current_amount=$1 WHERE id=$2 AND user_id=$3 RETURNING *', [current_amount, req.params.id, req.user.id]);
    res.json(rows[0]);
  } catch(err) { next(err); }
});

// ─── Créditos ─────────────────────────────────────────────
router.get('/credits', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT c.*, b.name as bank_name FROM credits c LEFT JOIN banks b ON b.id=c.bank_id WHERE c.user_id=$1 ORDER BY c.created_at DESC', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});
router.post('/credits', async (req,res,next) => {
  try {
    const d = req.body;
    const { rows } = await db.query(`INSERT INTO credits (user_id,bank_id,name,credit_type,total_amount,pending_amount,rate_pct,rate_type,monthly_payment,start_date,end_date,total_fees,paid_fees,next_payment_date,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.user.id,d.bank_id||null,d.name,d.credit_type,d.total_amount,d.pending_amount,d.rate_pct||null,
       d.rate_type||'tae',d.monthly_payment||null,d.start_date||null,d.end_date||null,
       d.total_fees||null,d.paid_fees||0,d.next_payment_date||null,d.notes||null]);
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

// ─── AFP ─────────────────────────────────────────────────
router.get('/pension', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM pension_accounts WHERE user_id=$1', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});
router.post('/pension', async (req,res,next) => {
  try {
    const { afp_name, fund_type, balance_obligatorio, balance_voluntario, last_updated, notes } = req.body;
    const { rows } = await db.query(`INSERT INTO pension_accounts (user_id,afp_name,fund_type,balance_obligatorio,balance_voluntario,last_updated,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id,afp_name,fund_type||null,balance_obligatorio||0,balance_voluntario||0,last_updated||null,notes||null]);
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

// ─── Calculadora DAP ─────────────────────────────────────
router.post('/calc/deposit', (req,res) => {
  const { principal, rate_pct, days, rate_type } = req.body;
  const p = parseFloat(principal), r = parseFloat(rate_pct)/100, d = parseInt(days);
  const interest = p * r * (d/365);
  const final = p + interest;
  const net_tax = interest * 0; // exento impuesto
  res.json({ principal: p, interest: parseFloat(interest.toFixed(2)), final_amount: parseFloat(final.toFixed(2)), days: d, effective_rate: parseFloat((r*d/365*100).toFixed(4)) });
});

// ─── Calculadora crédito ──────────────────────────────────
router.post('/calc/credit', (req,res) => {
  const { amount, rate_pct, months } = req.body;
  const p = parseFloat(amount), r = parseFloat(rate_pct)/100/12, n = parseInt(months);
  const payment = r===0 ? p/n : p * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
  const total = payment * n;
  const interest_total = total - p;
  res.json({ monthly_payment: parseFloat(payment.toFixed(2)), total_payment: parseFloat(total.toFixed(2)), interest_total: parseFloat(interest_total.toFixed(2)), months: n });
});

// ─── Fondos Mutuos ────────────────────────────────────────
router.get('/mutual-funds', async (req,res,next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM mutual_funds WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/mutual-funds', async (req,res,next) => {
  try {
    const { fund_name, fund_type, manager, series, shares, value_per_share, total_invested, last_updated, notes } = req.body;
    const current_value = (shares || 0) * (value_per_share || 0);
    const return_pct = total_invested > 0 ? ((current_value - total_invested) / total_invested * 100) : 0;
    
    const { rows } = await db.query(`
      INSERT INTO mutual_funds (user_id,fund_name,fund_type,manager,series,shares,value_per_share,total_invested,current_value,return_pct,last_updated,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.user.id, fund_name, fund_type||null, manager||null, series||null, shares||0, value_per_share||0, total_invested||0, current_value, return_pct, last_updated||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

router.delete('/mutual-funds/:id', async (req,res,next) => {
  try {
    await db.query('DELETE FROM mutual_funds WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Fondo mutuo eliminado' });
  } catch(err) { next(err); }
});

// ─── APV ──────────────────────────────────────────────────
router.get('/apv', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM apv_accounts WHERE user_id=$1', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/apv', async (req,res,next) => {
  try {
    const { institution, plan_type, balance, monthly_contribution, tax_benefit, last_updated, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO apv_accounts (user_id,institution,plan_type,balance,monthly_contribution,tax_benefit,last_updated,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, institution, plan_type||null, balance||0, monthly_contribution||0, tax_benefit||'no_benefit', last_updated||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

// ─── Acciones ─────────────────────────────────────────────
router.get('/stocks', async (req,res,next) => {
  try {
    const { rows } = await db.query('SELECT * FROM stock_holdings WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch(err) { next(err); }
});

router.post('/stocks', async (req,res,next) => {
  try {
    const { ticker, company_name, market, shares, avg_price, current_price, broker, last_updated, notes } = req.body;
    const total_invested = (shares || 0) * (avg_price || 0);
    const current_value = (shares || 0) * (current_price || avg_price || 0);
    const return_pct = total_invested > 0 ? ((current_value - total_invested) / total_invested * 100) : 0;
    
    const { rows } = await db.query(`
      INSERT INTO stock_holdings (user_id,ticker,company_name,market,shares,avg_price,current_price,total_invested,current_value,return_pct,broker,last_updated,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, ticker.toUpperCase(), company_name||null, market||'Chile', shares||0, avg_price||0, current_price||avg_price||0, total_invested, current_value, return_pct, broker||null, last_updated||null, notes||null]
    );
    res.status(201).json(rows[0]);
  } catch(err) { next(err); }
});

router.delete('/stocks/:id', async (req,res,next) => {
  try {
    await db.query('DELETE FROM stock_holdings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Acción eliminada' });
  } catch(err) { next(err); }
});

module.exports = router;