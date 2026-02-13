const router = require('express').Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const logger = require('../utils/logger');

router.use(auth);

// ─── Multer config ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.csv', '.xls', '.xlsx', '.txt'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Formato no soportado. Use PDF, CSV, XLS, XLSX o TXT'));
  }
});

// ─── Utilidades de parsing ────────────────────────────────

/**
 * Convierte un string de monto chileno a número.
 * Soporta: "1.234.567", "1.234.567,89", "-1.234.567", "1234567"
 */
function parseCLPAmount(str) {
  if (!str && str !== 0) return null;
  const s = String(str).trim().replace(/\s/g, '');
  if (!s || s === '-' || s === '') return null;

  // Detectar signo
  const negative = s.startsWith('-');
  let cleaned = s.replace(/^-/, '').replace(/^\+/, '');

  // Formato chileno: puntos como miles, coma como decimal
  // "1.234.567" → 1234567  |  "1.234,56" → 1234.56
  if (cleaned.includes(',')) {
    // Tiene coma → la coma es separador decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length === 1) {
    // Un solo punto → puede ser decimal o miles
    const [left, right] = cleaned.split('.');
    if (right && right.length === 3 && left.length >= 1) {
      // "1.234" → miles (3 decimales después del punto)
      cleaned = cleaned.replace('.', '');
    }
    // Si right.length != 3 asumimos decimal: "1234.56"
  } else {
    // Múltiples puntos → todos son separadores de miles
    cleaned = cleaned.replace(/\./g, '');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return negative ? -num : num;
}

/**
 * Intenta parsear una fecha en múltiples formatos usados por bancos chilenos.
 * Retorna string "YYYY-MM-DD" o null.
 */
function parseDate(str) {
  if (!str) return null;
  const s = String(str).trim();

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10));
    return isNaN(d) ? null : s.slice(0, 10);
  }

  // dd/mm/yyyy o dd-mm-yyyy o dd.mm.yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    return isNaN(date) ? null : `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // dd/mmm/yy o dd-mmm-yyyy (ej: 15/ENE/25 o 15-ene-2025)
  const MONTHS = {
    ene:1,feb:2,mar:3,abr:4,may:5,jun:6,
    jul:7,ago:8,sep:9,oct:10,nov:11,dic:12,
    jan:1,apr:4,aug:8,dec:12
  };
  const dmStr = s.match(/^(\d{1,2})[\/\-\.]([a-zA-Z]{3})[\/\-\.](\d{2,4})$/);
  if (dmStr) {
    const [, d, mon, y] = dmStr;
    const m = MONTHS[mon.toLowerCase()];
    if (m) {
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${String(m).padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
  }

  // yyyy/mm/dd
  const ymd = s.match(/^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${m}-${d}`;
  }

  // Número de serie Excel (ej: 45678)
  const serial = parseInt(s);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + serial * 86400000);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Detecta banco por patrones en el texto
 */
function detectBank(text) {
  const t = text.toUpperCase();
  const patterns = [
    { banks: ['BANCO DE CHILE', 'BANCHILE', 'REDCOMPRA CHILE'], name: 'Banco de Chile' },
    { banks: ['SANTANDER', 'BANCO SANTANDER'], name: 'Banco Santander' },
    { banks: ['BANCOESTADO', 'BANCO ESTADO', 'BANCO DEL ESTADO'], name: 'BancoEstado' },
    { banks: ['BCI', 'BANCO DE CREDITO E INVERSIONES'], name: 'BCI' },
    { banks: ['ITAU', 'ITAÚ', 'BANCO ITAU'], name: 'Itaú' },
    { banks: ['SCOTIABANK', 'NOVA SCOTIABANK'], name: 'Scotiabank' },
    { banks: ['BICE', 'BANCO BICE'], name: 'BICE' },
    { banks: ['SECURITY', 'BANCO SECURITY'], name: 'Banco Security' },
    { banks: ['FALABELLA', 'CMR FALABELLA'], name: 'Banco Falabella' },
    { banks: ['RIPLEY'], name: 'Banco Ripley' },
    { banks: ['CONSORCIO', 'BANCO CONSORCIO'], name: 'Banco Consorcio' },
    { banks: ['COOPEUCH'], name: 'COOPEUCH' },
    { banks: ['TENPO'], name: 'Tenpo' },
    { banks: ['MERCADO PAGO', 'MERCADOPAGO'], name: 'Mercado Pago' },
    { banks: ['MACH'], name: 'MACH' },
  ];
  for (const p of patterns) {
    if (p.banks.some(b => t.includes(b))) return p.name;
  }
  return 'Banco no identificado';
}

/**
 * Parser principal CSV/texto — muy tolerante a variaciones chilenas.
 * Estrategia: detecta las columnas por contenido, no por posición fija.
 */
function parseTextCartola(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 2);
  const transactions = [];
  const bank = detectBank(content);

  // Detectar separador: ; , \t
  const sampleLines = lines.slice(0, 20).join('\n');
  let sep = '\t';
  const semicolons = (sampleLines.match(/;/g) || []).length;
  const commas = (sampleLines.match(/,/g) || []).length;
  if (semicolons > 5) sep = ';';
  else if (commas > 5) sep = ',';

  const skipPatterns = [
    /^fecha/i, /^date/i, /^n[uú]mero/i, /^descripci[oó]n/i,
    /^detalle/i, /^cargo/i, /^abono/i, /^saldo/i, /^monto/i,
    /^cuenta/i, /^tipo/i, /^glosa/i, /^documento/i, /^\s*$/,
    /^-{3,}/, /^={3,}/, /^RUT/i, /^NOMBRE/i,
  ];

  for (const line of lines) {
    // Saltar headers y líneas vacías
    if (skipPatterns.some(p => p.test(line.split(sep)[0]?.trim()))) continue;
    if (line.split(sep).length < 2) continue;

    const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));

    // Buscar la columna de fecha
    let dateStr = null, dateIdx = -1;
    for (let i = 0; i < Math.min(cols.length, 5); i++) {
      const d = parseDate(cols[i]);
      if (d) { dateStr = d; dateIdx = i; break; }
    }
    if (!dateStr) continue;

    // Buscar columnas de monto (cargo, abono o monto único)
    // Estrategia: buscar todas las columnas numéricas después de la fecha
    const numericCols = [];
    for (let i = 0; i < cols.length; i++) {
      if (i === dateIdx) continue;
      const v = parseCLPAmount(cols[i]);
      if (v !== null && Math.abs(v) > 0) {
        numericCols.push({ idx: i, val: v });
      }
    }

    if (!numericCols.length) continue;

// Determinar tipo (ingreso/gasto) e importe
    // ESTRATEGIA MEJORADA: detectar patron cargo/abono de bancos chilenos
    let amount = 0, type = 'expense';

    if (numericCols.length === 1) {
      // Un solo monto: negativo=gasto, positivo=ingreso
      amount = numericCols[0].val;
      type = amount >= 0 ? 'income' : 'expense';
      amount = Math.abs(amount);
    } 
    else if (numericCols.length >= 2) {
      // Múltiples columnas numéricas
      // Patron chileno típico: [cargo] [abono] [saldo]
      // El saldo suele ser el más grande y acumulativo

      // Filtrar columnas por magnitud para detectar saldo
      const sorted = [...numericCols].sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
      const maxVal = Math.abs(sorted[0].val);

      // Si la columna más grande es >10x más grande que las otras, probablemente es saldo
      const probablySaldo = numericCols.filter(n => Math.abs(n.val) > maxVal * 0.1).length === 1;

      let cargo = null, abono = null;

      if (probablySaldo && numericCols.length >= 3) {
        // Hay saldo: las primeras 2 columnas son cargo/abono
        const nonSaldo = numericCols.filter(n => n.idx !== sorted[0].idx);
        if (nonSaldo.length >= 2) {
          // Convención: primera=cargo (negativo o positivo), segunda=abono (positivo)
          cargo = nonSaldo[0];
          abono = nonSaldo[1];
        }
      } else {
        // Sin saldo o solo 2 columnas: primera=cargo, segunda=abono
        cargo = numericCols[0];
        abono = numericCols[1];
      }

      // Determinar si es ingreso o gasto
      const cargoVal = Math.abs(cargo?.val || 0);
      const abonoVal = Math.abs(abono?.val || 0);

      if (cargoVal > 0 && abonoVal === 0) {
        // Solo cargo: es gasto
        amount = cargoVal;
        type = 'expense';
      } else if (abonoVal > 0 && cargoVal === 0) {
        // Solo abono: es ingreso
        amount = abonoVal;
        type = 'income';
      } else if (cargoVal > 0 && abonoVal > 0) {
        // Ambos tienen valor: usar el mayor
        if (cargoVal > abonoVal) {
          amount = cargoVal;
          type = 'expense';
        } else {
          amount = abonoVal;
          type = 'income';
        }
      } else {
        // Fallback: usar el primero no-cero
        const first = numericCols.find(n => Math.abs(n.val) > 0);
        if (first) {
          amount = Math.abs(first.val);
          type = first.val < 0 ? 'expense' : 'income';
        }
      }
    }

    if (amount === 0 || amount === null) continue;

    // Descripción: unir columnas de texto que no son fecha ni número
    const descCols = cols.filter((c, i) => {
      if (i === dateIdx) return false;
      if (numericCols.find(n => n.idx === i)) return false;
      return c.length > 1 && !/^[\d\s]*$/.test(c);
    });
    const description = descCols.join(' | ').slice(0, 250).trim() || 'Sin descripción';

    transactions.push({ date: dateStr, description, amount, type, raw: line });
  }

  return { bank, transactions };
}

// ─── Endpoint: upload ─────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let parsed = { bank: 'No identificado', transactions: [] };
    let parseWarning = null;

    // ── CSV / TXT ─────────────────────────────────────────
    if (ext === '.csv' || ext === '.txt') {
      // Intentar múltiples encodings (los bancos chilenos usan latin1/iso-8859-1)
      let content = '';
      try {
        content = fs.readFileSync(req.file.path, { encoding: 'latin1' });
        // Si tiene muchos caracteres raros, probar utf8
        if ((content.match(/[À-ÿ]/g) || []).length < 3 && content.includes('\uFFFD')) {
          content = fs.readFileSync(req.file.path, { encoding: 'utf8' });
        }
      } catch {
        content = fs.readFileSync(req.file.path, { encoding: 'utf8', flag: 'r' });
      }
      // Normalizar saltos de línea y limpiar BOM
      content = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      parsed = parseTextCartola(content);
    }

    // ── XLSX / XLS ───────────────────────────────────────
    else if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(req.file.path, {
        cellDates: true,   // Convierte fechas a objetos Date
        cellNF: false,
        raw: false         // Formatea los valores
      });

      // Intentar todas las hojas, tomar la que tenga más datos
      let bestSheet = null, bestRows = 0;
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        if (rows.length > bestRows) { bestRows = rows.length; bestSheet = ws; }
      }

      if (bestSheet) {
        // Convertir a CSV preservando formato chileno
        const csvData = XLSX.utils.sheet_to_csv(bestSheet, { FS: ';', RS: '\n', blankrows: false });
        parsed = parseTextCartola(csvData);

        // Si el CSV no funcionó, intentar con JSON de filas
        if (!parsed.transactions.length) {
          const rows = XLSX.utils.sheet_to_json(bestSheet, { defval: '', raw: false });
          const csvFallback = rows.map(r => Object.values(r).join(';')).join('\n');
          parsed = parseTextCartola(csvFallback);
        }
      }
      if (!parsed.transactions.length) parseWarning = 'El archivo Excel no tiene un formato reconocible. Prueba exportarlo como CSV desde tu banco.';
    }

    // ── PDF ──────────────────────────────────────────────
    else if (ext === '.pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const buffer = fs.readFileSync(req.file.path);

        // Opciones de extracción: preservar layout de tabla
        const pdfData = await pdfParse(buffer, {
          pagerender: function(pageData) {
            return pageData.getTextContent({ normalizeWhitespace: false }).then(function(textContent) {
              let text = '';
              let lastY = null;
              for (const item of textContent.items) {
                // Nuevo renglón si Y cambia significativamente
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                  text += '\n';
                }
                text += item.str + '\t';
                lastY = item.transform[5];
              }
              return text;
            });
          }
        });

        const rawText = pdfData.text;
        parsed = parseTextCartola(rawText);

        if (!parsed.transactions.length) {
          // Fallback: intentar con texto plano (sin preservar layout)
          const pdfDataSimple = await pdfParse(buffer);
          parsed = parseTextCartola(pdfDataSimple.text);
        }

        if (!parsed.transactions.length) {
          parseWarning = 'El PDF no tiene un formato tabular reconocible automáticamente. ' +
            'Esto ocurre con PDFs escaneados (imágenes) o con tablas de formato complejo. ' +
            'Descarga la cartola en formato CSV o Excel desde la banca en línea para mejores resultados.';
          parsed.bank = detectBank(rawText);
        }

      } catch (pdfErr) {
        logger.warn('PDF parse error', { error: pdfErr.message, file: req.file.originalname });
        parseWarning = `Error al leer el PDF: ${pdfErr.message}. El PDF puede estar protegido o ser una imagen escaneada.`;
      }
    }

    // Guardar registro de importación
    const { rows } = await db.query(
      `INSERT INTO statement_imports (user_id,account_id,filename,bank_detected,rows_total,status)
       VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
      [req.user.id, req.body.account_id || null, req.file.originalname,
       parsed.bank, parsed.transactions.length]
    );

    logger.logToDB(db, 'info', 'Cartola cargada', {
      filename: req.file.originalname, ext, bank: parsed.bank,
      rows: parsed.transactions.length, warning: parseWarning
    }, req.user.id, req);

    res.json({
      import_id: rows[0].id,
      bank_detected: parsed.bank,
      rows_found: parsed.transactions.length,
      warning: parseWarning,
      preview: parsed.transactions.slice(0, 20),
      all_transactions: parsed.transactions
    });

  } catch (err) {
    logger.error('Scanner upload error', { error: err.message, stack: err.stack?.slice(0, 300) });
    next(err);
  }
});

// ─── Endpoint: confirm ────────────────────────────────────
router.post('/confirm/:import_id', async (req, res, next) => {
  try {
    const { account_id, transactions } = req.body;
    if (!account_id || !transactions?.length) {
      return res.status(400).json({ error: 'Se requiere account_id y transacciones' });
    }

    let imported = 0, skipped = 0;
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      for (const tx of transactions) {
        if (!tx.include) { skipped++; continue; }
        if (!tx.amount || !tx.date) { skipped++; continue; }

        await client.query(
          `INSERT INTO transactions (user_id,account_id,type,amount,description,date,source)
           VALUES ($1,$2,$3,$4,$5,$6,'scan')`,
          [req.user.id, account_id, tx.type, Math.abs(parseFloat(tx.amount)),
           tx.description || 'Importado de cartola', tx.date]
        );

        const delta = tx.type === 'income' ? Math.abs(tx.amount) : -Math.abs(tx.amount);
        await client.query(
          'UPDATE accounts SET balance=balance+$1,updated_at=NOW() WHERE id=$2',
          [delta, account_id]
        );
        imported++;
      }

      await client.query(
        'UPDATE statement_imports SET rows_imported=$1,rows_skipped=$2,status=$3 WHERE id=$4',
        [imported, skipped, 'done', req.params.import_id]
      );
      await client.query('COMMIT');

      logger.logToDB(db, 'info', 'Cartola confirmada', {
        import_id: req.params.import_id, imported, skipped
      }, req.user.id, req);

      res.json({ imported, skipped, message: `${imported} transacciones importadas exitosamente` });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ─── Endpoint: debug – ver texto extraído ─────────────────
router.post('/debug-extract', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(req.file.path, { cellDates: true, raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      extractedText = XLSX.utils.sheet_to_csv(ws, { FS: ' | ' });
    } else {
      extractedText = fs.readFileSync(req.file.path, { encoding: 'latin1' });
    }

    const preview = extractedText.slice(0, 3000);
    const parsed = parseTextCartola(extractedText);

    res.json({
      ext, text_preview: preview, text_length: extractedText.length,
      lines_total: extractedText.split('\n').length,
      transactions_found: parsed.transactions.length,
      bank_detected: parsed.bank,
      first_10: parsed.transactions.slice(0, 10)
    });
  } catch (err) { next(err); }
});

module.exports = router;