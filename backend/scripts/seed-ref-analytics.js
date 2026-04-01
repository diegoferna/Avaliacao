/**
 * Popula / atualiza tabelas de referência para analytics (migrations 004–006).
 * 004: escala, métricas, FKs das notas em ref_escala_satisfacao.
 * 005: status numérico (1/2), ref_status_entidade, view v_avaliacoes_analytics.
 * 006: ref_dimensao_avaliacao com codigo 1–5 e nome_coluna (acesso, …).
 *
 * Uso: npm run seed:ref
 * Requer: migrations 001–003 já aplicadas; PostgreSQL acessível (.env).
 */

const fs = require("fs");
const path = require("path");
const pool = require("../database/connection");

const MIGRATIONS_REF = [
  "004_ref_analytics_dicionarios.sql",
  "005_status_codigo_numerico.sql",
  "006_dimensao_codigo_numerico.sql",
];

async function main() {
  const who = await pool.query(
    "SELECT current_database() AS database, current_user AS db_user"
  );
  const row = who.rows[0];
  console.log(`Conexão: banco "${row.database}" como "${row.db_user}"`);

  const migDir = path.resolve(__dirname, "..", "migrations");
  for (const name of MIGRATIONS_REF) {
    const sqlPath = path.join(migDir, name);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo SQL não encontrado: ${sqlPath}`);
    }
    console.log(`Aplicando: ${sqlPath}`);
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
