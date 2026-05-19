const fp = require("fastify-plugin");

function resolvePublicBaseUrl(request) {
  const fromEnv = process.env.PUBLIC_API_URL;
  if (fromEnv) return String(fromEnv).replace(/\/$/, "");

  const proto = request.headers["x-forwarded-proto"] || request.protocol || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  if (!host) return "/";
  return `${proto}://${host}`;
}

async function swaggerPlugin(fastify) {
  const indexPrefix = process.env.API_INDEX_PREFIX || "";

  await fastify.register(require("@fastify/swagger"), {
    openapi: {
      info: {
        title: "API de Parceiros - Avaliacao de Saude",
        description:
          "API read-only para integracao com sistemas terceiros. Autenticacao via headers X-Client-Id e X-API-Key.",
        version: "1.0.0",
      },
      servers: process.env.PUBLIC_API_URL
        ? [{ url: process.env.PUBLIC_API_URL.replace(/\/$/, "") }]
        : [],
      components: {
        securitySchemes: {
          clientId: {
            type: "apiKey",
            name: "X-Client-Id",
            in: "header",
          },
          apiKey: {
            type: "apiKey",
            name: "X-API-Key",
            in: "header",
          },
        },
      },
      security: [{ clientId: [], apiKey: [] }],
    },
    transform: ({ schema, url }) => {
      if (url.startsWith("/internal")) {
        return { schema: { ...schema, hide: true }, url };
      }
      return { schema, url };
    },
  });

  await fastify.register(require("@fastify/swagger-ui"), {
    routePrefix: "/docs",
    // Prefixo extra quando a API fica atras de path no Nginx (ex.: /avaliacao-api)
    indexPrefix,
    staticCSP: false,
    transformSpecification: (swaggerObject, request) => {
      const base = resolvePublicBaseUrl(request);
      swaggerObject.servers = [{ url: base }];
      return swaggerObject;
    },
    transformSpecificationClone: true,
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
}

module.exports = fp(swaggerPlugin, { name: "swagger" });
