const partnerRepo = require("../../repositories/partnerRepository");
const { responses } = require("../../schemas/common");

const querySchema = {
  type: "object",
  properties: {
    unidade_id: { type: "integer", minimum: 1 },
    equipe_id: { type: "integer", minimum: 1 },
    cnes: { type: "string", maxLength: 20 },
    ine: { type: "string", maxLength: 20 },
    distrito: { type: "string", maxLength: 100 },
    data_inicio: { type: "string", format: "date" },
    data_fim: { type: "string", format: "date" },
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
  },
};

async function avaliacoesRoutes(fastify) {
  fastify.get("/avaliacoes", {
    schema: {
      tags: ["Avaliações"],
      summary: "Lista avaliações com pontuações convertidas (0–10)",
      querystring: querySchema,
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
            meta: {
              type: "object",
              properties: {
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
              },
            },
          },
        },
        400: {
          description: "Parâmetros inválidos",
          content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } },
        },
        401: responses[401],
        429: responses[429],
        500: responses[500],
      },
    },
  }, async (request, reply) => {
    try {
      const result = await partnerRepo.listAvaliacoes(request.query);
      return result;
    } catch (err) {
      if (err.statusCode === 400) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }
  });
}

module.exports = avaliacoesRoutes;
