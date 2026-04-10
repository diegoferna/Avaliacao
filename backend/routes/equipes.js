const portal = require('../repositories/portalRepository');

async function equipesRoutes(fastify) {
  fastify.get('/equipes', async (request, reply) => {
    const unidadeId = request.query.unidade_id;
    if (unidadeId === undefined || unidadeId === null || String(unidadeId).trim() === '') {
      return reply.status(400).send({ error: 'Parâmetro unidade_id é obrigatório.' });
    }
    const id = parseInt(String(unidadeId), 10);
    if (Number.isNaN(id) || id < 1) {
      return reply.status(400).send({ error: 'unidade_id inválido.' });
    }

    return portal.listEquipesAtivasPorUnidade(id);
  });
}

module.exports = equipesRoutes;
