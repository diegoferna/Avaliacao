const apiClientRepo = require("../repositories/apiClientRepository");
const { getClientIp } = require("../utils/requestIp");

async function partnerLoggingPlugin(fastify) {
  fastify.addHook("onResponse", async (request, reply) => {
    if (!request.partnerClient) return;

    apiClientRepo.insertLog({
      apiClientId: request.partnerClient.id,
      clientId: request.partnerClient.clientId,
      endpoint: request.url,
      metodo: request.method,
      statusCode: reply.statusCode,
      ip: getClientIp(request),
    });
  });
}

module.exports = partnerLoggingPlugin;
