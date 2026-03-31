/**
 * Popula / atualiza tabelas de referência para analytics (004 + 005).
 * 005 corrige ref_status_entidade quando ainda tinha codigo VARCHAR (bug do IF NOT EXISTS antigo).
 *
 * Uso: npm run seed:ref
 * Requer: migrations 001–003 já aplicadas; PostgreSQL acessível (.env).
 */

const fs = require("fs");
const path = require("path");
const pool = require("../database/connection");

const MIGRATIONS = [
  "004_ref_analytics_dicionarios.sql",
  "005_ref_status_numerico_fix.sql",
];

async function main() {
  const migrationsDir = path.join(__dirname, "..", "migrations");
  for (const name of MIGRATIONS) {
    const sqlPath = path.join(migrationsDir, name);
    if (!fs.existsSync(sqlPath)) {
      console.warn(`Aviso: ignorando ${name} (arquivo não encontrado).`);
      continue;
    }
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);
    console.log(`OK: ${name}`);
  }
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
