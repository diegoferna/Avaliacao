async function partnerApiRoutes(fastify) {
  await fastify.register(require("@fastify/rate-limit"), {
    max: parseInt(process.env.PARTNER_RATE_LIMIT_MAX || "100", 10),
    timeWindow: process.env.PARTNER_RATE_LIMIT_WINDOW || "1 minute",
    keyGenerator: (request) =>
      request.partnerClient?.clientId || request.ip,
    errorResponseBuilder: () => ({
      error: "Limite de requisições excedido. Tente novamente em instantes.",
    }),
  });

  await fastify.register(require("../../plugins/partnerAuth"));
  await fastify.register(require("../../plugins/partnerLogging"));

  fastify.get("/health", {
    config: { skipPartnerAuth: true },
    schema: {
      tags: ["Sistema"],
      summary: "Health check da API",
      security: [],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            service: { type: "string" },
          },
        },
      },
    },
  }, async () => ({
    status: "ok",
    service: "partner-api",
  }));

  await fastify.register(require("./avaliacoes"));
  await fastify.register(require("./unidades"));
  await fastify.register(require("./equipes"));
}

module.exports = partnerApiRoutes;
