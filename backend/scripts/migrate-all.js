/**
 * Aplica todas as migrations SQL em ordem em um banco existente.
 *
 * Regras:
 * - Usa tabela schema_migrations para não reaplicar arquivos já executados.
 * - Executa cada arquivo em transação isolada.
 * - Inclui populações necessárias da regra de negócio presentes nas migrations.
 *
 * Uso:
 *   npm run migrate:all
 *   npm run migrate:all -- --force
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../database/connection");

const MIGRATIONS = [
  "001_create_tables.sql",
  "002_equipes_status.sql",
  "003_unidades_eas_estrutura.sql",
  "004_ref_analytics_dicionarios.sql",
  "005_status_codigo_numerico.sql",
  "006_dimensao_codigo_numerico.sql",
];

const FORCE = process.argv.includes("--force");

function checksum(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function wasApplied(client, filename) {
  const { rows } = await client.query(
    "SELECT filename, checksum, applied_at FROM schema_migrations WHERE filename = $1",
    [filename]
  );
  return rows[0] || null;
}

async function markApplied(client, filename, hash) {
  await client.query(
    `INSERT INTO schema_migrations (filename, checksum)
     VALUES ($1, $2)
     ON CONFLICT (filename) DO UPDATE
     SET checksum = EXCLUDED.checksum, applied_at = NOW()`,
    [filename, hash]
  );
}

async function main() {
  const who = await pool.query(
    "SELECT current_database() AS database, current_user AS db_user"
  );
  console.log(
    `Conexão: banco "${who.rows[0].database}" como "${who.rows[0].db_user}"`
  );

  const migrationsDir = path.resolve(__dirname, "..", "migrations");

  const bootstrapClient = await pool.connect();
  try {
    await ensureMigrationsTable(bootstrapClient);
  } finally {
    bootstrapClient.release();
  }

  for (const filename of MIGRATIONS) {
    const sqlPath = path.join(migrationsDir, filename);
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration não encontrada: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, "utf8");
    const hash = checksum(sql);

    const client = await pool.connect();
    try {
      const existing = await wasApplied(client, filename);
      if (existing && existing.checksum === hash && !FORCE) {
        console.log(`SKIP: ${filename} (já aplicada em ${existing.applied_at})`);
        continue;
      }

      console.log(`Aplicando: ${filename}`);
      await client.query("BEGIN");
      await client.query(sql);
      await markApplied(client, filename, hash);
      await client.query("COMMIT");
      console.log(`OK: ${filename}`);
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // ignore rollback errors
      }
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(
    "Concluído: migrations aplicadas e dados iniciais/referenciais populados."
  );
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
