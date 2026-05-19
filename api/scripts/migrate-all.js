const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pool = require("../database/connection");

const MIGRATIONS = ["001_api_integration.sql"];
const FORCE = process.argv.includes("--force");

function checksum(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS api_schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function wasApplied(client, filename) {
  const { rows } = await client.query(
    "SELECT filename, checksum, applied_at FROM api_schema_migrations WHERE filename = $1",
    [filename],
  );
  return rows[0] || null;
}

async function markApplied(client, filename, hash) {
  await client.query(
    `INSERT INTO api_schema_migrations (filename, checksum)
     VALUES ($1, $2)
     ON CONFLICT (filename) DO UPDATE
     SET checksum = EXCLUDED.checksum, applied_at = NOW()`,
    [filename, hash],
  );
}

async function main() {
  const who = await pool.query(
    "SELECT current_database() AS database, current_user AS db_user",
  );
  console.log(
    `Conexão: banco "${who.rows[0].database}" como "${who.rows[0].db_user}"`,
  );

  const migrationsDir = path.resolve(__dirname, "..", "migrations");
  const bootstrap = await pool.connect();
  try {
    await ensureMigrationsTable(bootstrap);
  } finally {
    bootstrap.release();
  }

  for (const filename of MIGRATIONS) {
    const sqlPath = path.join(migrationsDir, filename);
    const sql = fs.readFileSync(sqlPath, "utf8");
    const hash = checksum(sql);
    const client = await pool.connect();
    try {
      const existing = await wasApplied(client, filename);
      if (existing && existing.checksum === hash && !FORCE) {
        console.log(`SKIP: ${filename}`);
        continue;
      }
      console.log(`Aplicando: ${filename}`);
      await client.query("BEGIN");
      await client.query(sql);
      await markApplied(client, filename, hash);
      await client.query("COMMIT");
      console.log(`OK: ${filename}`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  console.log("Migrations da API concluídas.");
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
