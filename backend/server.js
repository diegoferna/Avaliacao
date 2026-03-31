const path = require('path');
const fastify = require('fastify')({ logger: true });

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
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
