const partnerRepo = require("../../repositories/partnerRepository");
const { responses } = require("../../schemas/common");

async function unidadesRoutes(fastify) {
  fastify.get("/unidades", {
    schema: {
      tags: ["Unidades"],
      summary: "Lista estabelecimentos de saúde",
      querystring: {
        type: "object",
        properties: {
          status: { type: "integer", enum: [1, 2] },
          distrito: { type: "string" },
          cnes: { type: "string" },
          nome: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
        401: responses[401],
        429: responses[429],
        500: responses[500],
      },
    },
  }, async (request, reply) => {
    try {
      const data = await partnerRepo.listUnidades(request.query);
      return { data };
    } catch (err) {
      if (err.statusCode === 400) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }
  });
}

module.exports = unidadesRoutes;
