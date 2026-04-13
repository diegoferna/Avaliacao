const path = require('path');
const { execSync } = require('child_process');
const { mode: dataSourceMode } = require('./config/dataSource');
const fastify = require('fastify')({ logger: true });

const repoRoot = path.join(__dirname, '..');

function resolveDevPort() {
  const raw = process.env.PORT;
  const envPort =
    raw !== undefined && raw !== '' ? parseInt(raw, 10) : NaN;
  const hasValidEnvPort = !Number.isNaN(envPort);

  try {
    const branch = execSync('git branch --show-current', {
      encoding: 'utf8',
      cwd: repoRoot,
    }).trim();
    if (branch === 'dev' && process.env.NODE_ENV !== 'production') {
      return 3003;
    }
  } catch {
    // fora do git ou git indisponível
  }

  if (hasValidEnvPort) {
    return envPort;
  }
  return 3001;
}

// CORS para permitir requisições do frontend
fastify.register(require('@fastify/cors'), {
  origin: true,
});

// Servir arquivos estáticos do frontend
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '..', 'frontend'),
  prefix: '/',
});

// Registrar rotas
fastify.register(require('./routes/unidades'));
fastify.register(require('./routes/equipes'));
fastify.register(require('./routes/avaliacoes'));

// Tratamento global de erros
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.validation) {
    return reply.status(400).send({
      error: 'Dados inválidos. Verifique os campos e tente novamente.',
      details: error.validation,
    });
  }

  return reply.status(500).send({
    error: 'Erro interno do servidor. Tente novamente mais tarde.',
  });
});

// Iniciar servidor
const start = async () => {
  try {
    const port = resolveDevPort();
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(
      `Fonte de dados: ${dataSourceMode === 'mock' ? 'mock (fixtures)' : 'homolog (PostgreSQL)'}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
