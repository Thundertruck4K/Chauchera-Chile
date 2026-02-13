const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

router.get('/summary', async (req,res,next) => {
  try {
    const uid = req.user.id;
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const [y,m] = month.split('-');
    const start = `${y}-${m}-01`;
    const end = new Date(y,m,0).toISOString().slice(0,10);

    const [accounts, inMonth, expMonth, balance, recentTx, topCats] = await Promise.all([
      db.query('SELECT * FROM accounts WHERE user_id=$1 AND active=true', [uid]),
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND type='income' AND date>=$2 AND date<=$3", [uid,start,end]),
      db.query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND type='expense' AND date>=$2 AND date<=$3", [uid,start,end]),
      db.query('SELECT COALESCE(SUM(balance),0) as total FROM accounts WHERE user_id=$1 AND active=true', [uid]),
      db.query(`SELECT t.*, a.name as account_name, c.name as category_name, c.color as category_color, c.icon as category_icon
        FROM transactions t LEFT JOIN accounts a ON a.id=t.account_id LEFT JOIN categories c ON c.id=t.category_id
        WHERE t.user_id=$1 ORDER BY t.date DESC, t.created_at DESC LIMIT 10`, [uid]),
      db.query(`SELECT c.name, c.color, c.icon, COALESCE(SUM(t.amount),0) as total
        FROM transactions t JOIN categories c ON c.id=t.category_id
        WHERE t.user_id=$1 AND t.type='expense' AND t.date>=$2 AND t.date<=$3
        GROUP BY c.id ORDER BY total DESC LIMIT 6`, [uid,start,end]),
    ]);

    // Monthly trend last 6 months
    const trend = await db.query(`
      SELECT DATE_TRUNC('month', date) as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
      FROM transactions WHERE user_id=$1 AND date >= NOW()-INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1`, [uid]);

    res.json({
      total_balance: parseFloat(balance.rows[0].total),
      month_income: parseFloat(inMonth.rows[0].total),
      month_expense: parseFloat(expMonth.rows[0].total),
      accounts: accounts.rows,
      recent_transactions: recentTx.rows,
      top_categories: topCats.rows,
      monthly_trend: trend.rows
    });
  } catch(err) { next(err); }
});

module.exports = router;