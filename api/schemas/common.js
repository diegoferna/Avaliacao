const errorResponse = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

const securityHeaders = [
  { name: "X-Client-Id", in: "header", required: true, schema: { type: "string" } },
  { name: "X-API-Key", in: "header", required: true, schema: { type: "string" } },
];

module.exports = {
  errorResponse,
  securityHeaders,
  responses: {
    401: {
      description: "Credenciais ausentes ou inválidas",
      content: { "application/json": { schema: errorResponse } },
    },
    429: {
      description: "Limite de requisições excedido",
      content: { "application/json": { schema: errorResponse } },
    },
    500: {
      description: "Erro interno",
      content: { "application/json": { schema: errorResponse } },
    },
  },
};
