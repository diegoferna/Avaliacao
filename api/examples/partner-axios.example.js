/**
 * Exemplo de consumo com axios.
 * npm install axios  (no seu projeto consumidor)
 */
const axios = require("axios");

const client = axios.create({
  baseURL: process.env.PARTNER_API_URL || "http://localhost:3001",
  headers: {
    "X-Client-Id": process.env.PARTNER_CLIENT_ID || "empresa_xyz",
    "X-API-Key": process.env.PARTNER_API_KEY || "sua_api_key",
  },
});

async function main() {
  const health = await client.get("/api/v1/health");
  console.log("health:", health.data);

  const avaliacoes = await client.get("/api/v1/avaliacoes", {
    params: {
      unidade_id: 1,
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      page: 1,
      limit: 50,
    },
  });
  console.log("total:", avaliacoes.data.meta.total);

  const unidades = await client.get("/api/v1/unidades", { params: { status: 1 } });
  console.log("unidades:", unidades.data.data.length);
}

main().catch((err) => {
  console.error(err.response?.data || err.message);
  process.exit(1);
});
