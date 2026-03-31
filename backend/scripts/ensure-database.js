/**
 * Cria o banco de dados (DB_NAME) se ainda não existir.
 * Conecta ao banco padrão "postgres" com as mesmas credenciais do .env.
 *
 * Uso: npm run db:create
 * Depois rode as migrations normalmente (psql … -f migrations/001_…).
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const pg = require("pg");

const envBackend = path.join(__dirname, "..", ".env");
const envRoot = path.join(__dirname, "..", "..", ".env");
require("dotenv").config({ path: envBackend });
if (fs.existsSync(envRoot)) {
  require("dotenv").config({ path: envRoot, override: false });
}

function connectionStringFromEnv() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  let s = String(raw).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  try {
    const u = new URL(s);
    u.searchParams.delete("schema");
    return u.toString();
  } catch {
    return s.replace(/\?schema=[^&]*/g, "").replace(/&schema=[^&]*/g, "");
  }
}

function assertDbName(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(
      `DB_NAME inválido para CREATE DATABASE (use apenas letras, números e _): ${name}`
    );
  }
}

function configConexaoAdmin() {
  const databaseUrl =
    process.env.PG_USE_DB_VARS === "1" ? null : connectionStringFromEnv();

  if (databaseUrl) {
    const u = new URL(databaseUrl);
    u.pathname = "/postgres";
    return { connectionString: u.toString() };
  }

  return {
    host: process.env.DB_HOST || "172.22.16.62",
    port: parseInt(process.env.DB_PORT || "5433", 10),
    database: process.env.DB_NAME || "avaliacao_saude",
    user: (process.env.DB_USER || "postgres").trim(),
    password: String(process.env.DB_PASSWORD || "NE9e6BApdLzR49VIkOiDTya~nX7~a").trim(),
  };
}

async function main() {
  const dbName = process.env.DB_NAME || "avaliacao_saude";
  assertDbName(dbName);

  const client = new Client(configConexaoAdmin());
  await client.connect();

  try {
    const check = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (check.rows.length > 0) {
      console.log(`Banco "${dbName}" já existe. Nada a fazer.`);
      return;
    }

    await client.query(`CREATE DATABASE ${pg.escapeIdentifier(dbName)}`);
    console.log(`Banco "${dbName}" criado com sucesso.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  if (err && err.code === "28P01") {
    console.error(
      "\nVerifique DB_PASSWORD / DATABASE_URL no .env (mesmo usuário que consegue criar banco no Postgres)."
    );
  }
  if (err && err.code === "42501") {
    console.error(
      "\nO usuário precisa de permissão para CREATE DATABASE (ex.: superuser ou CREATEDB)."
    );
  }
  process.exit(1);
});
