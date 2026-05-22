const apiClientRepo = require("../repositories/apiClientRepository");
const { verifyApiKey } = require("../utils/apiKey");

async function partnerAuthPlugin(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions?.config?.skipPartnerAuth) {
      return;
    }

    const clientId = request.headers["x-client-id"];
    const apiKey = request.headers["x-api-key"];

    if (!clientId || !apiKey) {
      return reply.status(401).send({
        error: "Credenciais ausentes. Informe X-Client-Id e X-API-Key.",
      });
    }

    const client = await apiClientRepo.findActiveByClientIdForAuth(
      String(clientId).trim(),
    );

    if (!client) {
      return reply.status(401).send({ error: "Credenciais inválidas." });
    }

    const valid = await verifyApiKey(String(apiKey), client.api_key_hash);
    if (!valid) {
      return reply.status(401).send({ error: "Credenciais inválidas." });
    }

    request.partnerClient = {
      id: client.id,
      clientId: client.client_id,
      nomeEmpresa: client.nome_empresa,
    };

    apiClientRepo.touchUltimoAcesso(client.id);
  });
}

module.exports = partnerAuthPlugin;
