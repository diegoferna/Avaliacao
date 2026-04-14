const path = require("path");
const { mode: dataSourceMode } = require("./config/dataSource");
const fastify = require("fastify")({ logger: true });

const repoRoot = path.join(__dirname, "..");

function resolveDevPort() {
  const raw = process.env.PORT;
  const envPort = raw !== undefined && raw !== "" ? parseInt(raw, 10) : NaN;
  const hasValidEnvPort = !Number.isNaN(envPort);

  if (hasValidEnvPort) {
    return envPort;
  }
  return 8080;
}

// CORS para permitir requisições do frontend
fastify.register(require("@fastify/cors"), {
  origin: true,
});

// Servir arquivos estáticos do frontend
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "..", "frontend"),
  prefix: "/",
});

// Registrar rotas
fastify.register(require("./routes/unidades"));
fastify.register(require("./routes/equipes"));
fastify.register(require("./routes/avaliacoes"));

// Tratamento global de erros
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: "Dados inválidos. Verifique os campos e tente novamente.",
      details: error.validation,
    });
  }

  return reply.status(500).send({
    error: "Erro interno do servidor. Tente novamente mais tarde.",
  });
});

// Iniciar servidor
const start = async () => {
  try {
    const port = resolveDevPort();
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(
      `Fonte de dados: ${dataSourceMode === "mock" ? "mock (fixtures)" : "homolog (PostgreSQL)"}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
