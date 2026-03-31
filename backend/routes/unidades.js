const pool = require('../database/connection');

async function unidadesRoutes(fastify) {
  fastify.get('/unidades', async (request, reply) => {
    const result = await pool.query(
      `SELECT id, nome, distrito, tipo
       FROM unidades
       WHERE status = 'ativo'
       ORDER BY nome`
    );
    return result.rows;
  });
}

module.exports = unidadesRoutes;
