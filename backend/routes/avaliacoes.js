const portal = require('../repositories/portalRepository');

async function avaliacoesRoutes(fastify) {
  fastify.post('/avaliacoes', {
    schema: {
      body: {
        type: 'object',
        required: [
          'unidade_id',
          'equipe_id',
          'acesso',
          'integralidade',
          'longitudinalidade',
          'receptividade',
          'atendimento',
        ],
        properties: {
          unidade_id: { type: 'integer', minimum: 1 },
          equipe_id: { type: 'integer', minimum: 1 },
          acesso: { type: 'integer', minimum: 1, maximum: 5 },
          integralidade: { type: 'integer', minimum: 1, maximum: 5 },
          longitudinalidade: { type: 'integer', minimum: 1, maximum: 5 },
          receptividade: { type: 'integer', minimum: 1, maximum: 5 },
          atendimento: { type: 'integer', minimum: 1, maximum: 5 },
          comentario: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request, reply) => {
    const {
      unidade_id,
      equipe_id,
      acesso,
      integralidade,
      longitudinalidade,
      receptividade,
      atendimento,
      comentario,
    } = request.body;

    const unidade = await portal.findUnidadeAtivaById(unidade_id);
    if (!unidade) {
      return reply.status(400).send({ error: 'Estabelecimento de saúde não encontrado ou inativo.' });
    }

    const equipe = await portal.findEquipeAtivaByUnidade(equipe_id, unidade_id);
    if (!equipe) {
      return reply.status(400).send({
        error: 'Equipe de saúde não encontrada ou não pertence ao estabelecimento selecionado.',
      });
    }

    const row = await portal.insertAvaliacao({
      unidade_id,
      equipe_id,
      acesso,
      integralidade,
      longitudinalidade,
      receptividade,
      atendimento,
      comentario,
    });

    return reply.status(201).send({
      message: 'Avaliação registrada com sucesso!',
      id: row.id,
      created_at: row.created_at,
    });
  });

  fastify.get('/avaliacoes/resumo', async () => {
    return portal.resumoAvaliacoesPorUnidade();
  });
}

module.exports = avaliacoesRoutes;
