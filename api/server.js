const fastify = require("fastify")({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production",
});

function resolvePort() {
  const raw = process.env.API_PORT || process.env.PORT;
  const port = raw ? parseInt(raw, 10) : 3003;
  return Number.isNaN(port) ? 3003 : port;
}

const isProduction = process.env.NODE_ENV === "production";

fastify.register(require("./plugins/swagger"));

fastify.register(require("./routes/internal"), { prefix: "/internal" });

fastify.register(require("./routes/partner-api"), { prefix: "/api/v1" });

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.statusCode === 400 || error.validation) {
    return reply.status(400).send({
      error: error.message || "Requisição inválida.",
      ...(isProduction ? {} : { details: error.validation }),
    });
  }

  if (error.statusCode && error.statusCode < 500) {
    return reply.status(error.statusCode).send({
      error: error.message || "Erro na requisição.",
    });
  }

  return reply.status(500).send({
    error: "Erro interno do servidor.",
    ...(isProduction ? {} : { detail: error.message }),
  });
});

const start = async () => {
  try {
    const port = resolvePort();
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`API parceiros: http://localhost:${port}`);
    console.log(`Documentação: http://localhost:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
