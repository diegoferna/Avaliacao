const fs = require("fs");
const path = require("path");

const envApi = path.join(__dirname, "..", ".env");
const envRoot = path.join(__dirname, "..", "..", ".env");
require("dotenv").config({ path: envApi });
if (fs.existsSync(envRoot)) {
  require("dotenv").config({ path: envRoot, override: false });
}

const { Pool } = require("pg");

function connectionStringFromEnv(rawUrl) {
  if (!rawUrl) return null;
  let s = String(rawUrl).trim();
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

const partnerUrl =
  process.env.PARTNER_PG_USE_DB_VARS === "1"
    ? null
    : connectionStringFromEnv(process.env.PARTNER_DATABASE_URL);

const poolPartner = partnerUrl
  ? new Pool({
      connectionString: partnerUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.PARTNER_DB_HOST || process.env.DB_HOST || "localhost",
      port: parseInt(
        process.env.PARTNER_DB_PORT || process.env.DB_PORT || "5433",
        10,
      ),
      database:
        process.env.PARTNER_DB_NAME || process.env.DB_NAME || "avaliacao_saude",
      user: (process.env.PARTNER_DB_USER || "partner_api_ro").trim(),
      password: String(process.env.PARTNER_DB_PASSWORD || "").trim(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

module.exports = poolPartner;
