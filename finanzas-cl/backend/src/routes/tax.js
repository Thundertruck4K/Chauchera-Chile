const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');

router.use(auth);

// ─── Tax Config ───────────────────────────────────────────
router.get('/config', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM tax_config WHERE user_id=$1',
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

router.post('/config', async (req, res, next) => {
  try {
    const { rut, tax_regime, company_name, company_rut, giro, retencion_pct, exempt_amount, iva_registered, monthly_target, notes } = req.body;
    const { rows } = await db.query(`
      INSERT INTO tax_config (user_id, rut, tax_regime, company_name, company_rut, giro, retencion_pct, exempt_amount, iva_registered, monthly_target, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (user_id) DO UPDATE SET
        rut=$2, tax_regime=$3, company_name=$4, company_rut=$5, giro=$6, retencion_pct=$7, exempt_amount=$8, iva_registered=$9, monthly_target=$10, notes=$11
      RETURNING *`,
      [req.user.id, rut, tax_regime || 'honorarios', company_name || null, company_rut || null, giro || null,
       retencion_pct || 11.5, exempt_amount || 0, iva_registered || false, monthly_target || 0, notes || null]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Boletas de Honorarios ────────────────────────────────
router.get('/boletas', async (req, res, next) => {
  try {
    const { year, month, type } = req.query;
    let where = ['user_id=$1'];
    let params = [req.user.id];
    let i = 2;
    
    if (year) {
      where.push(`EXTRACT(YEAR FROM date)=$${i++}`);
      params.push(parseInt(year));
    }
    if (month) {
      where.push(`EXTRACT(MONTH FROM date)=$${i++}`);
      params.push(parseInt(month));
    }
    if (type) {
      where.push(`type=$${i++}`);
      params.push(type);
    }

    const { rows } = await db.query(
      `SELECT * FROM boletas_honorarios WHERE ${where.join(' AND ')} ORDER BY date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/boletas', async (req, res, next) => {
  try {
    const { folio, type, client_rut, client_name, date, amount_bruto, retencion_pct, description, status, payment_date, notes } = req.body;
    const retencion = (parseFloat(retencion_pct) || 11.5) / 100;
    const retencion_monto = parseFloat(amount_bruto) * retencion;
    const amount_liquido = parseFloat(amount_bruto) - retencion_monto;

    const { rows } = await db.query(`
      INSERT INTO boletas_honorarios (user_id, folio, type, client_rut, client_name, date, amount_bruto, retencion_pct, retencion_monto, amount_liquido, description, status, payment_date, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, folio || null, type || 'emitida', client_rut || null, client_name || null, date,
       amount_bruto, retencion_pct || 11.5, retencion_monto, amount_liquido, description || null,
       status || 'emitida', payment_date || null, notes || null]
    );
    
    logger.logToDB(db, 'info', 'Boleta honorarios registrada', { folio, amount: amount_bruto }, req.user.id, req);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/boletas/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM boletas_honorarios WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Boleta eliminada' });
  } catch (err) { next(err); }
});

// ─── Facturas (IVA) ───────────────────────────────────────
router.get('/facturas', async (req, res, next) => {
  try {
    const { year, month, type } = req.query;
    let where = ['user_id=$1'];
    let params = [req.user.id];
    let i = 2;

    if (year) {
      where.push(`EXTRACT(YEAR FROM date)=$${i++}`);
      params.push(parseInt(year));
    }
    if (month) {
      where.push(`EXTRACT(MONTH FROM date)=$${i++}`);
      params.push(parseInt(month));
    }
    if (type) {
      where.push(`type=$${i++}`);
      params.push(type);
    }

    const { rows } = await db.query(
      `SELECT * FROM facturas WHERE ${where.join(' AND ')} ORDER BY date DESC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/facturas', async (req, res, next) => {
  try {
    const { type, folio, provider_rut, provider_name, date, amount_neto, description, category, status, payment_date, notes } = req.body;
    const iva = parseFloat(amount_neto) * 0.19;
    const amount_total = parseFloat(amount_neto) + iva;

    const { rows } = await db.query(`
      INSERT INTO facturas (user_id, type, folio, provider_rut, provider_name, date, amount_neto, iva, amount_total, description, category, status, payment_date, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, type, folio || null, provider_rut || null, provider_name || null, date,
       amount_neto, iva, amount_total, description || null, category || null,
       status || 'vigente', payment_date || null, notes || null]
    );

    logger.logToDB(db, 'info', 'Factura registrada', { type, folio, amount: amount_total }, req.user.id, req);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/facturas/:id', async (req, res, next) => {
  try {
    await db.query('DELETE FROM facturas WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Factura eliminada' });
  } catch (err) { next(err); }
});

// ─── PPM ──────────────────────────────────────────────────
router.get('/ppm', async (req, res, next) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();
    const { rows } = await db.query(
      'SELECT * FROM ppm_payments WHERE user_id=$1 AND year=$2 ORDER BY month',
      [req.user.id, y]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/ppm', async (req, res, next) => {
  try {
    const { year, month, income_period, expenses_period, ppm_paid, payment_date, f29_folio, status, notes } = req.body;
    const base = (parseFloat(income_period) || 0) - (parseFloat(expenses_period) || 0);
    
    // Cálculo simplificado PPM (puede mejorarse con tramos reales)
    let ppm_calc = 0;
    if (base > 0) {
      if (base <= 750000) ppm_calc = 0;
      else if (base <= 1500000) ppm_calc = base * 0.04;
      else if (base <= 2500000) ppm_calc = base * 0.08;
      else if (base <= 3500000) ppm_calc = base * 0.135;
      else if (base <= 4500000) ppm_calc = base * 0.23;
      else if (base <= 6000000) ppm_calc = base * 0.304;
      else ppm_calc = base * 0.35;
    }

    const { rows } = await db.query(`
      INSERT INTO ppm_payments (user_id, year, month, income_period, expenses_period, base_imponible, ppm_calculated, ppm_paid, payment_date, f29_folio, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (user_id, year, month) DO UPDATE SET
        income_period=$4, expenses_period=$5, base_imponible=$6, ppm_calculated=$7, ppm_paid=$8, payment_date=$9, f29_folio=$10, status=$11, notes=$12
      RETURNING *`,
      [req.user.id, year, month, income_period || 0, expenses_period || 0, base,
       ppm_calc, ppm_paid || 0, payment_date || null, f29_folio || null, status || 'pendiente', notes || null]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ─── Calculadoras ─────────────────────────────────────────

// Calcular impuesto a la renta anual
router.post('/calc/renta', (req, res) => {
  const { income_annual, deductions } = req.body;
  const base = parseFloat(income_annual) - (parseFloat(deductions) || 0);
  
  // Tramos 2024 (en UTA - aprox 7.5M anual)
  const UTA = 762240; // UTA mensual aprox
  const tramos = [
    { hasta: 13.5 * UTA, tasa: 0, rebaja: 0 },
    { hasta: 30 * UTA, tasa: 0.04, rebaja: 0.54 * UTA },
    { hasta: 50 * UTA, tasa: 0.08, rebaja: 1.74 * UTA },
    { hasta: 70 * UTA, tasa: 0.135, rebaja: 4.49 * UTA },
    { hasta: 90 * UTA, tasa: 0.23, rebaja: 11.14 * UTA },
    { hasta: 120 * UTA, tasa: 0.304, rebaja: 17.8 * UTA },
    { hasta: Infinity, tasa: 0.35, rebaja: 23.32 * UTA }
  ];

  let tramo = tramos.find(t => base <= t.hasta);
  if (!tramo) tramo = tramos[tramos.length - 1];

  const impuesto = Math.max(0, base * tramo.tasa - tramo.rebaja);
  const tasa_efectiva = base > 0 ? (impuesto / base * 100) : 0;

  res.json({
    income_annual: parseFloat(income_annual),
    deductions: parseFloat(deductions) || 0,
    base_imponible: base,
    impuesto_calculado: parseFloat(impuesto.toFixed(0)),
    tasa_efectiva: parseFloat(tasa_efectiva.toFixed(2)),
    income_liquido: base - impuesto
  });
});

// Calcular boleta honorarios
router.post('/calc/boleta', (req, res) => {
  const { amount_bruto, retencion_pct } = req.body;
  const bruto = parseFloat(amount_bruto);
  const ret_pct = parseFloat(retencion_pct) || 11.5;
  const retencion = bruto * (ret_pct / 100);
  const liquido = bruto - retencion;

  res.json({
    amount_bruto: bruto,
    retencion_pct: ret_pct,
    retencion_monto: parseFloat(retencion.toFixed(0)),
    amount_liquido: parseFloat(liquido.toFixed(0))
  });
});

// Calcular IVA
router.post('/calc/iva', (req, res) => {
  const { amount, type } = req.body; // type: 'neto' o 'bruto'
  const amt = parseFloat(amount);
  
  if (type === 'neto') {
    const iva = amt * 0.19;
    const bruto = amt + iva;
    res.json({ neto: amt, iva, bruto });
  } else {
    const neto = amt / 1.19;
    const iva = amt - neto;
    res.json({ neto, iva, bruto: amt });
  }
});

// ─── Resumen Anual (Operación Renta) ─────────────────────
router.get('/summary/:year', async (req, res, next) => {
  try {
    const { year } = req.params;
    const uid = req.user.id;

    const [boletas, facturas, ppm] = await Promise.all([
      db.query("SELECT * FROM boletas_honorarios WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2", [uid, year]),
      db.query("SELECT * FROM facturas WHERE user_id=$1 AND EXTRACT(YEAR FROM date)=$2", [uid, year]),
      db.query("SELECT * FROM ppm_payments WHERE user_id=$1 AND year=$2", [uid, year])
    ]);

    const total_honorarios = boletas.rows.reduce((s, b) => s + parseFloat(b.amount_bruto || 0), 0);
    const total_retenido = boletas.rows.reduce((s, b) => s + parseFloat(b.retencion_monto || 0), 0);
    
    const facturas_compra = facturas.rows.filter(f => f.type === 'compra');
    const facturas_venta = facturas.rows.filter(f => f.type === 'venta');
    
    const total_compras = facturas_compra.reduce((s, f) => s + parseFloat(f.amount_total || 0), 0);
    const total_ventas = facturas_venta.reduce((s, f) => s + parseFloat(f.amount_total || 0), 0);
    const iva_compras = facturas_compra.reduce((s, f) => s + parseFloat(f.iva || 0), 0);
    const iva_ventas = facturas_venta.reduce((s, f) => s + parseFloat(f.iva || 0), 0);

    const total_ppm_pagado = ppm.rows.reduce((s, p) => s + parseFloat(p.ppm_paid || 0), 0);

    res.json({
      year: parseInt(year),
      honorarios: {
        total_bruto: total_honorarios,
        total_retenido,
        cantidad: boletas.rows.length
      },
      iva: {
        ventas: total_ventas,
        compras: total_compras,
        iva_debito: iva_ventas,
        iva_credito: iva_compras,
        iva_a_pagar: Math.max(0, iva_ventas - iva_compras)
      },
      ppm: {
        total_pagado: total_ppm_pagado,
        meses_declarados: ppm.rows.filter(p => p.status === 'pagado').length
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
