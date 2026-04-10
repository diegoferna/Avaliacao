const fs = require('fs');
const path = require('path');

const envBackend = path.join(__dirname, '..', '.env');
const envRoot = path.join(__dirname, '..', '..', '.env');

require('dotenv').config({ path: envBackend });
if (fs.existsSync(envRoot)) {
  require('dotenv').config({ path: envRoot, override: false });
}

/**
 * DATA_SOURCE (env):
 * - mock | test  → dados fictícios, sem gravar no PostgreSQL
 * - homolog | database | db | postgres | (vazio) → PostgreSQL como hoje
 */
function parseDataSource() {
  const raw = (process.env.DATA_SOURCE || 'homolog').toLowerCase().trim();
  if (raw === 'mock' || raw === 'test') return 'mock';
  if (
    raw === '' ||
    raw === 'homolog' ||
    raw === 'database' ||
    raw === 'db' ||
    raw === 'postgres' ||
    raw === 'postgresql'
  ) {
    return 'homolog';
  }
  console.warn(
    `[config] DATA_SOURCE="${process.env.DATA_SOURCE}" não reconhecido; usando homolog (PostgreSQL).`
  );
  return 'homolog';
}

const mode = parseDataSource();

module.exports = {
  /** 'mock' | 'homolog' */
  mode,
  isMock: () => mode === 'mock',
  isHomolog: () => mode === 'homolog',
};
