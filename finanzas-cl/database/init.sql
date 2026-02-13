-- ============================================================
--  FinanzasCL – Esquema PostgreSQL completo
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── App config / Setup ──────────────────────────────────
CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO app_config (key, value) VALUES ('setup_complete', 'false') ON CONFLICT DO NOTHING;

-- ─── Usuarios ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bancos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banks (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  code     TEXT UNIQUE,
  color    TEXT,
  active   BOOLEAN DEFAULT TRUE
);

-- ─── Tipos de cuenta ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT
);

-- ─── Cuentas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id      INTEGER REFERENCES banks(id),
  type_id      INTEGER REFERENCES account_types(id),
  name         TEXT NOT NULL,
  number       TEXT,
  currency     TEXT DEFAULT 'CLP',
  balance      NUMERIC(18,2) DEFAULT 0,
  credit_limit NUMERIC(18,2),
  cut_day      INTEGER,
  pay_day      INTEGER,
  color        TEXT DEFAULT '#6366f1',
  icon         TEXT DEFAULT 'wallet',
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categorías ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'expense',
  color      TEXT DEFAULT '#6366f1',
  icon       TEXT DEFAULT 'tag',
  is_default BOOLEAN DEFAULT FALSE
);

-- ─── Transacciones ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id   INTEGER REFERENCES categories(id),
  type          TEXT NOT NULL,
  amount        NUMERIC(18,2) NOT NULL,
  currency      TEXT DEFAULT 'CLP',
  description   TEXT,
  merchant      TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  reference     TEXT,
  to_account_id UUID REFERENCES accounts(id),
  is_recurring  BOOLEAN DEFAULT FALSE,
  tags          TEXT[],
  source        TEXT DEFAULT 'manual',
  raw_import    JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Depósitos a plazo ───────────────────────────────────
CREATE TABLE IF NOT EXISTS time_deposits (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id      INTEGER REFERENCES banks(id),
  account_id   UUID REFERENCES accounts(id),
  name         TEXT,
  principal    NUMERIC(18,2) NOT NULL,
  rate_pct     NUMERIC(8,4) NOT NULL,
  rate_type    TEXT DEFAULT 'tae',
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  renewal_mode TEXT DEFAULT 'capital',
  status       TEXT DEFAULT 'active',
  final_amount NUMERIC(18,2),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Metas de ahorro ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id     UUID REFERENCES accounts(id),
  name           TEXT NOT NULL,
  target_amount  NUMERIC(18,2) NOT NULL,
  current_amount NUMERIC(18,2) DEFAULT 0,
  target_date    DATE,
  icon           TEXT DEFAULT 'piggy-bank',
  color          TEXT DEFAULT '#22c55e',
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Créditos / préstamos ────────────────────────────────
CREATE TABLE IF NOT EXISTS credits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_id           INTEGER REFERENCES banks(id),
  name              TEXT NOT NULL,
  credit_type       TEXT NOT NULL,
  total_amount      NUMERIC(18,2) NOT NULL,
  pending_amount    NUMERIC(18,2) NOT NULL,
  rate_pct          NUMERIC(8,4),
  rate_type         TEXT DEFAULT 'tae',
  monthly_payment   NUMERIC(18,2),
  start_date        DATE,
  end_date          DATE,
  total_fees        INTEGER,
  paid_fees         INTEGER DEFAULT 0,
  next_payment_date DATE,
  status            TEXT DEFAULT 'active',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seguros ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurances (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  insurer         TEXT,
  insurance_type  TEXT,
  premium         NUMERIC(18,2),
  frequency       TEXT DEFAULT 'monthly',
  start_date      DATE,
  end_date        DATE,
  policy_number   TEXT,
  coverage_amount NUMERIC(18,2),
  status          TEXT DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AFP ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pension_accounts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  afp_name             TEXT,
  fund_type            TEXT,
  balance_obligatorio  NUMERIC(18,2) DEFAULT 0,
  balance_voluntario   NUMERIC(18,2) DEFAULT 0,
  last_updated         DATE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Importaciones de cartolas ───────────────────────────
CREATE TABLE IF NOT EXISTS statement_imports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES accounts(id),
  filename      TEXT,
  bank_detected TEXT,
  rows_total    INTEGER DEFAULT 0,
  rows_imported INTEGER DEFAULT 0,
  rows_skipped  INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'pending',
  error_msg     TEXT,
  imported_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Presupuestos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  name        TEXT NOT NULL,
  amount      NUMERIC(18,2) NOT NULL,
  period      TEXT DEFAULT 'monthly',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Logs de debug ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_logs (
  id         BIGSERIAL PRIMARY KEY,
  level      TEXT NOT NULL,
  message    TEXT NOT NULL,
  context    JSONB,
  user_id    UUID REFERENCES users(id),
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indicadores económicos cache ────────────────────────
CREATE TABLE IF NOT EXISTS economic_indicators (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  value      NUMERIC(18,4),
  date       DATE,
  source     TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Índices ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user    ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date    ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_user        ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_level       ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_created     ON app_logs(created_at DESC);

-- ─── Seed: bancos chilenos ────────────────────────────────
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
ON CONFLICT (code) DO NOTHING;

-- ─── Seed: tipos de cuenta ───────────────────────────────
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
ON CONFLICT DO NOTHING;

-- ─── Seed: categorías por defecto ────────────────────────
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
ON CONFLICT DO NOTHING;

-- ─── Seed: indicadores vacíos ────────────────────────────
INSERT INTO economic_indicators (name, value, date, source) VALUES
  ('UF',   0, CURRENT_DATE, 'mindicador'),
  ('UTM',  0, CURRENT_DATE, 'mindicador'),
  ('USD',  0, CURRENT_DATE, 'mindicador'),
  ('EUR',  0, CURRENT_DATE, 'mindicador'),
  ('IPC',  0, CURRENT_DATE, 'mindicador')
ON CONFLICT (name) DO NOTHING;
