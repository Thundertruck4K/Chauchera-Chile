const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');

router.use(auth);

router.get('/monthly', async (req,res,next) => {
  try {
    const uid = req.user.id;
    let start, end, periodLabel;

    // Determinar rango: month o from/to
    if (req.query.month) {
      const [y, m] = req.query.month.split('-');
      start = `${y}-${m}-01`;
      end = new Date(y, m, 0).toISOString().slice(0,10);
      periodLabel = req.query.month;
    } else if (req.query.from && req.query.to) {
      start = req.query.from;
      end = req.query.to;
      periodLabel = `${start} a ${end}`;
    } else {
      // Default: mes actual
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      start = `${y}-${m}-01`;
      end = new Date(y, now.getMonth() + 1, 0).toISOString().slice(0,10);
      periodLabel = `${y}-${m}`;
    }

    const [income,expense,byCategory,byAccount,trend,user] = await Promise.all([
      db.query("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE user_id=$1 AND type='income' AND date>=$2 AND date<=$3",[uid,start,end]),
      db.query("SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE user_id=$1 AND type='expense' AND date>=$2 AND date<=$3",[uid,start,end]),
      db.query(`SELECT c.name,c.color,c.icon,t.type,COALESCE(SUM(t.amount),0) as total,COUNT(*) as count
        FROM transactions t LEFT JOIN categories c ON c.id=t.category_id
        WHERE t.user_id=$1 AND t.date>=$2 AND t.date<=$3
        GROUP BY c.name,c.color,c.icon,t.type ORDER BY total DESC`,[uid,start,end]),
      db.query(`SELECT a.name,a.color,a.icon,
        SUM(CASE WHEN t.type='income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END) as expense
        FROM transactions t JOIN accounts a ON a.id=t.account_id
        WHERE t.user_id=$1 AND t.date>=$2 AND t.date<=$3 GROUP BY a.name,a.color,a.icon`,[uid,start,end]),
      db.query(`SELECT date, SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
        FROM transactions WHERE user_id=$1 AND date>=$2 AND date<=$3 GROUP BY date ORDER BY date`,[uid,start,end]),
      db.query('SELECT name,email FROM users WHERE id=$1',[uid])
    ]);

    res.json({
      period: periodLabel,
      date_from: start,
      date_to: end,
      user: user.rows[0],
      income: parseFloat(income.rows[0].t),
      expense: parseFloat(expense.rows[0].t),
      net: parseFloat(income.rows[0].t) - parseFloat(expense.rows[0].t),
      by_category: byCategory.rows,
      by_account: byAccount.rows,
      daily_trend: trend.rows,
      generated_at: new Date().toISOString()
    });
  } catch(err) { next(err); }
});

module.exports = router;