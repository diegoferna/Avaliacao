const fs = require("fs");
const path = require("path");

const envApi = path.join(__dirname, "..", ".env");
const envRoot = path.join(__dirname, "..", "..", ".env");
require("dotenv").config({ path: envApi });
if (fs.existsSync(envRoot)) {
  require("dotenv").config({ path: envRoot, override: false });
}

const { Pool } = require("pg");

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

const databaseUrl =
  process.env.PG_USE_DB_VARS === "1" ? null : connectionStringFromEnv();

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433", 10),
      database: process.env.DB_NAME || "avaliacao_saude",
      user: (process.env.DB_USER || "postgres").trim(),
      password: String(process.env.DB_PASSWORD || "").trim(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

module.exports = pool;
