async function internalRoutes(fastify) {
  await fastify.register(require("@fastify/rate-limit"), {
    max: parseInt(process.env.ADMIN_RATE_LIMIT_MAX || "10", 10),
    timeWindow: process.env.ADMIN_RATE_LIMIT_WINDOW || "1 minute",
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: () => ({
      error: "Limite de requisições administrativas excedido.",
    }),
  });

  await fastify.register(require("../../plugins/adminAuth"));
  await fastify.register(require("./api-clients"));
}

module.exports = internalRoutes;
