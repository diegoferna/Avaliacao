const partnerRepo = require("../../repositories/partnerRepository");
const { responses } = require("../../schemas/common");

async function equipesRoutes(fastify) {
  fastify.get("/equipes", {
    schema: {
      tags: ["Equipes"],
      summary: "Lista equipes de saúde",
      querystring: {
        type: "object",
        properties: {
          unidade_id: { type: "integer", minimum: 1 },
          status: { type: "integer", enum: [1, 2] },
          ine: { type: "string" },
          tipo: { type: "string" },
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
      const data = await partnerRepo.listEquipes(request.query);
      return { data };
    } catch (err) {
      if (err.statusCode === 400) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }
  });
}

module.exports = equipesRoutes;
