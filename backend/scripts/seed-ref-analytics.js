/**
 * Popula / atualiza tabelas de referência para analytics (migration 004).
 * Idempotente: pode rodar várias vezes (INSERT ... ON CONFLICT e constraints com IF NOT EXISTS).
 *
 * Uso: npm run seed:ref
 * Requer: migrations 001–003 já aplicadas; PostgreSQL acessível (.env).
 */

const fs = require("fs");
const path = require("path");
const pool = require("../database/connection");

async function main() {
  const sqlPath = path.join(
    __dirname,
    "..",
    "migrations",
    "004_ref_analytics_dicionarios.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  await pool.query(sql);
  console.log("OK: 004_ref_analytics_dicionarios.sql aplicado (tabelas ref + view v_avaliacoes_analytics).");
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
