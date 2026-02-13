const jwt = require('jsonwebtoken');
const db = require('../config/database');
module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id,email,name FROM users WHERE id=$1', [decoded.userId]);
    if (!rows.length) return res.status(401).json({ error: 'Usuario no encontrado' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};