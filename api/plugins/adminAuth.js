const { getClientIp } = require("../utils/requestIp");

function parseAllowedIps() {
  const raw = process.env.ADMIN_ALLOWED_IPS;
  if (!raw || !String(raw).trim()) return null;
  return String(raw)
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

async function adminAuthPlugin(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    const expected = process.env.INTERNAL_ADMIN_KEY;
    if (!expected) {
      return reply.status(503).send({
        error: "Administração interna não configurada.",
      });
    }

    const provided = request.headers["x-admin-key"];
    if (!provided || provided !== expected) {
      return reply.status(401).send({ error: "Não autorizado." });
    }

    const allowedIps = parseAllowedIps();
    if (allowedIps?.length) {
      const clientIp = getClientIp(request);
      if (!clientIp || !allowedIps.includes(clientIp)) {
        return reply.status(403).send({
          error: "Acesso negado para este endereço IP.",
        });
      }
    }
  });
}

// Sem fastify-plugin: hook fica só nas rotas /internal (encapsulado)
module.exports = adminAuthPlugin;
