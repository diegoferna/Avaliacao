const pool = require("../database/connection");
const poolPartner = require("../database/connectionPartner");

async function findActiveByClientIdForAuth(clientId) {
  const result = await poolPartner.query(
    `SELECT id, client_id, api_key_hash, ativo, nome_empresa
     FROM api_clients
     WHERE client_id = $1 AND ativo = TRUE`,
    [clientId],
  );
  return result.rows[0] || null;
}

async function touchUltimoAcesso(id) {
  pool
    .query(
      `UPDATE api_clients SET ultimo_acesso = NOW(), updated_at = NOW() WHERE id = $1`,
      [id],
    )
    .catch(() => {});
}

async function insertLog({ apiClientId, clientId, endpoint, metodo, statusCode, ip }) {
  pool
    .query(
      `INSERT INTO api_logs (api_client_id, client_id, endpoint, metodo, status_code, ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [apiClientId, clientId, endpoint, metodo, statusCode, ip],
    )
    .catch(() => {});
}

async function createClient({ nomeEmpresa, clientId, apiKeyHash }) {
  const result = await pool.query(
    `INSERT INTO api_clients (nome_empresa, client_id, api_key_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nome_empresa, client_id, ativo, created_at`,
    [nomeEmpresa, clientId, apiKeyHash],
  );
  return result.rows[0];
}

async function setActiveById(id, ativo) {
  const result = await pool.query(
    `UPDATE api_clients
     SET ativo = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nome_empresa, client_id, ativo, updated_at`,
    [id, ativo],
  );
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await pool.query(
    `SELECT id, nome_empresa, client_id, ativo, ultimo_acesso, created_at, updated_at
     FROM api_clients WHERE id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

module.exports = {
  findActiveByClientIdForAuth,
  touchUltimoAcesso,
  insertLog,
  createClient,
  setActiveById,
  findById,
};
