const fetch = require('node-fetch');
const db = require('../config/database');
const logger = require('../utils/logger');

async function updateIndicators() {
  try {
    logger.info('Actualizando indicadores económicos...');
    
    const res = await fetch('https://mindicador.cl/api', { timeout: 10000 });
    if (!res.ok) {
      logger.warn('mindicador.cl no disponible');
      return false;
    }

    const data = await res.json();
    const today = new Date().toISOString().slice(0, 10);

    const updates = [
      ['UF', data.uf?.valor],
      ['UTM', data.utm?.valor],
      ['USD', data.dolar?.valor],
      ['EUR', data.euro?.valor],
      ['IPC', data.ipc?.valor]
    ];

    for (const [name, value] of updates) {
      if (value) {
        await db.query(
          'UPDATE economic_indicators SET value=$1, date=$2, updated_at=NOW() WHERE name=$3',
          [value, today, name]
        );
        logger.info(`${name} actualizado: ${value}`);
      }
    }

    return true;
  } catch (err) {
    logger.error('Error actualizando indicadores:', { error: err.message });
    return false;
  }
}

// Ejecutar cada 6 horas
function startScheduler() {
  updateIndicators(); // Ejecutar al inicio
  setInterval(updateIndicators, 6 * 60 * 60 * 1000); // Cada 6 horas
}

module.exports = { updateIndicators, startScheduler };
