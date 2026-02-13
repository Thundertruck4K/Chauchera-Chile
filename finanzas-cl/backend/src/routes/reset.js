const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

router.use(auth);

// Hard reset - PELIGROSO: borra todo y reinicia la DB
router.post('/hard-reset', async (req, res, next) => {
  try {
    const { confirmation } = req.body;
    
    // Requiere que el usuario escriba exactamente "RESET TODO"
    if (confirmation !== 'RESET TODO') {
      return res.status(400).json({ 
        error: 'Debes escribir exactamente "RESET TODO" para confirmar' 
      });
    }

    logger.logToDB(db, 'warn', 'HARD RESET iniciado', {}, req.user.id, req);
    
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Orden importante: eliminar primero las tablas con foreign keys
      const tables = [
        'transactions',
        'statement_imports',
        'budgets',
        'time_deposits',
        'savings_goals',
        'credits',
        'insurances',
        'pension_accounts',
        'accounts',
        'categories',
        'app_logs',
        'users',
        'app_config',
        'economic_indicators'
      ];

      for (const table of tables) {
        await client.query(`DELETE FROM ${table}`);
        logger.info(`Tabla ${table} vaciada`);
      }

      // Re-insertar datos de seed (bancos, tipos de cuenta, categorías, config)
// Re-insertar datos de seed directamente (sin leer archivo)
// Bancos
await client.query(`
  INSERT INTO banks (name, code, color) VALUES
    ('Banco de Chile',   'BCH', '#E31837'),
    ('Banco Santander',  'BST', '#EC0000'),
    ('BancoEstado',      'BCE', '#003087'),
    ('Banco BCI',        'BCI', '#0033A0'),
    ('Itaú',             'ITU', '#EC7000'),
    ('Scotiabank',       'SCO', '#EC1C24'),
    ('BICE',             'BIC', '#004B87'),
    ('Banco Security',   'SEC', '#1B3F6A'),
    ('Banco Falabella',  'FAL', '#82B817'),
    ('Banco Ripley',     'RIP', '#6D1F7A'),
    ('Banco Consorcio',  'CON', '#003DA5'),
    ('COOPEUCH',         'COO', '#E30613'),
    ('Tenpo',            'TEN', '#7C3AED'),
    ('MACH',             'MAC', '#00B4D8'),
    ('Mercado Pago',     'MPG', '#009EE3')
  ON CONFLICT (code) DO NOTHING
`);

// Tipos de cuenta
await client.query(`
  INSERT INTO account_types (name, category, description) VALUES
    ('Cuenta Corriente',   'cuenta_corriente', 'Cuenta corriente bancaria'),
    ('Cuenta Vista / RUT', 'vista',            'Cuenta vista o RUT'),
    ('Cuenta de Ahorro',   'ahorro',           'Cuenta de ahorro tradicional'),
    ('Tarjeta de Crédito', 'credito',          'Tarjeta de crédito bancaria o comercial'),
    ('Línea de Crédito',   'credito',          'Línea de crédito asociada'),
    ('Cuenta 2',           'vista',            'Cuenta 2 BancoEstado'),
    ('Wallet Digital',     'vista',            'Billetera digital (Tenpo, MACH, etc.)'),
    ('AFP / Previsión',    'inversion',        'Cuenta de ahorro previsional'),
    ('Inversiones',        'inversion',        'Fondos mutuos, acciones, ETF')
  ON CONFLICT DO NOTHING
`);

// Categorías por defecto
await client.query(`
  INSERT INTO categories (name, type, color, icon, is_default) VALUES
    ('Sueldo',             'income',   '#22c55e', 'briefcase',     TRUE),
    ('Freelance',          'income',   '#10b981', 'laptop',        TRUE),
    ('Arriendo cobrado',   'income',   '#34d399', 'home',          TRUE),
    ('Inversiones ret.',   'income',   '#6ee7b7', 'trending-up',   TRUE),
    ('Otros ingresos',     'income',   '#a7f3d0', 'plus-circle',   TRUE),
    ('Supermercado',       'expense',  '#f59e0b', 'shopping-cart', TRUE),
    ('Restaurantes',       'expense',  '#f97316', 'utensils',      TRUE),
    ('Transporte público', 'expense',  '#3b82f6', 'bus',           TRUE),
    ('Bencina',            'expense',  '#60a5fa', 'fuel',          TRUE),
    ('Arriendo pagado',    'expense',  '#8b5cf6', 'home',          TRUE),
    ('Salud',              'expense',  '#ec4899', 'heart',         TRUE),
    ('Educación',          'expense',  '#14b8a6', 'book',          TRUE),
    ('Entretenimiento',    'expense',  '#e879f9', 'tv',            TRUE),
    ('Ropa',               'expense',  '#fb7185', 'shirt',         TRUE),
    ('Servicios básicos',  'expense',  '#94a3b8', 'zap',           TRUE),
    ('Internet / TV',      'expense',  '#64748b', 'wifi',          TRUE),
    ('Seguros',            'expense',  '#475569', 'shield',        TRUE),
    ('Cuotas / Créditos',  'expense',  '#dc2626', 'credit-card',   TRUE),
    ('Transferencia',      'transfer', '#6366f1', 'arrow-right-left', TRUE)
  ON CONFLICT DO NOTHING
`);

// Indicadores económicos
await client.query(`
  INSERT INTO economic_indicators (name, value, date, source) VALUES
    ('UF',   0, CURRENT_DATE, 'mindicador'),
    ('UTM',  0, CURRENT_DATE, 'mindicador'),
    ('USD',  0, CURRENT_DATE, 'mindicador'),
    ('EUR',  0, CURRENT_DATE, 'mindicador'),
    ('IPC',  0, CURRENT_DATE, 'mindicador')
  ON CONFLICT (name) DO NOTHING
`);

logger.info('✅ Datos de seed re-insertados');
      // Resetear setup
      await client.query(
        "INSERT INTO app_config (key, value) VALUES ('setup_complete', 'false') " +
        "ON CONFLICT (key) DO UPDATE SET value='false', updated_at=NOW()"
      );

      await client.query('COMMIT');

      logger.info('✅ Hard reset completado exitosamente');
      logger.logToDB(db, 'warn', 'HARD RESET completado', {}, req.user.id, req);

      res.json({ 
        success: true, 
        message: 'Base de datos reseteada completamente. Debes volver a hacer el setup inicial.' 
      });

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

  } catch (err) {
    logger.error('Error en hard reset:', { error: err.message });
    next(err);
  }
});

module.exports = router;
