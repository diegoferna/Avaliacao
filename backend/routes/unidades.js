const pool = require('../database/connection');

async function unidadesRoutes(fastify) {
  // Lista apenas estabelecimentos ativos (portal / formulário público).
  // O seed grava todos os status; inativos permanecem no banco para outros usos.
  fastify.get('/unidades', async (request, reply) => {
    const result = await pool.query(
      `SELECT id, cnes, nome, distrito, tipo
       FROM unidades
       WHERE status = 'ativo'
       ORDER BY nome`
    );
    return result.rows;
  });
}

module.exports = unidadesRoutes;
