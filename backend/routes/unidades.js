const portal = require('../repositories/portalRepository');

async function unidadesRoutes(fastify) {
  fastify.get('/unidades', async () => {
    return portal.listUnidadesAtivas();
  });
}

module.exports = unidadesRoutes;
