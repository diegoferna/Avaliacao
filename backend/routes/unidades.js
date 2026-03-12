const pool = require('../database/connection');

async function unidadesRoutes(fastify) {
  fastify.get('/unidades', async (request, reply) => {
    const result = await pool.query(
      'SELECT id, nome, distrito, tipo FROM unidades ORDER BY nome'
    );
    return result.rows;
  });
}

module.exports = unidadesRoutes;
