const apiClientRepo = require("../../repositories/apiClientRepository");
const { generateApiKey, hashApiKey } = require("../../utils/apiKey");

async function apiClientsRoutes(fastify) {
  fastify.post("/api-clients", {
    schema: { hide: true },
  }, async (request, reply) => {
    const { nome_empresa, client_id } = request.body || {};
    if (!nome_empresa || !client_id) {
      return reply.status(400).send({
        error: "Campos obrigatórios: nome_empresa, client_id",
      });
    }

    const plainKey = generateApiKey();
    const apiKeyHash = await hashApiKey(plainKey);

    try {
      const row = await apiClientRepo.createClient({
        nomeEmpresa: nome_empresa,
        clientId: String(client_id).trim(),
        apiKeyHash,
      });
      return reply.status(201).send({
        ...row,
        api_key: plainKey,
        aviso: "Guarde a api_key — não será exibida novamente.",
      });
    } catch (err) {
      if (err.code === "23505") {
        return reply.status(409).send({ error: "client_id já cadastrado." });
      }
      throw err;
    }
  });

  fastify.post("/api-clients/:id/activate", {
    schema: { hide: true },
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const row = await apiClientRepo.setActiveById(id, true);
    if (!row) return reply.status(404).send({ error: "Cliente não encontrado." });
    return row;
  });

  fastify.post("/api-clients/:id/deactivate", {
    schema: { hide: true },
  }, async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    const row = await apiClientRepo.setActiveById(id, false);
    if (!row) return reply.status(404).send({ error: "Cliente não encontrado." });
    return row;
  });
}

module.exports = apiClientsRoutes;
