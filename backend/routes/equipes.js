const pool = require('../database/connection');

async function equipesRoutes(fastify) {
  // Equipes ativas da unidade selecionada (portal). Inativas ficam só no banco.
  fastify.get('/equipes', async (request, reply) => {
    const unidadeId = request.query.unidade_id;
    if (unidadeId === undefined || unidadeId === null || String(unidadeId).trim() === '') {
      return reply.status(400).send({ error: 'Parâmetro unidade_id é obrigatório.' });
    }
    const id = parseInt(String(unidadeId), 10);
    if (Number.isNaN(id) || id < 1) {
      return reply.status(400).send({ error: 'unidade_id inválido.' });
    }

    const result = await pool.query(
      `SELECT id, nome, cor, cor_label, tipo
       FROM equipes
       WHERE unidade_id = $1 AND status = 'ativo'
       ORDER BY nome`,
      [id]
    );
    return result.rows;
  });
}

module.exports = equipesRoutes;
