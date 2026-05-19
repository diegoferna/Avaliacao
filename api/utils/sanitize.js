const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

function sanitizeString(value, maxLength = 200) {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (CONTROL_CHARS.test(s)) {
    throw Object.assign(new Error("Parâmetro inválido."), { statusCode: 400 });
  }
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

function parsePositiveInt(value, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = parseInt(String(value), 10);
  if (Number.isNaN(n) || n < min || n > max) {
    throw Object.assign(new Error("Parâmetro numérico inválido."), {
      statusCode: 400,
    });
  }
  return n;
}

function parseDateParam(value) {
  const s = sanitizeString(value, 10);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error("Data inválida. Use YYYY-MM-DD."), {
      statusCode: 400,
    });
  }
  return s;
}

function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = parsePositiveInt(query.page, { min: 1, max: 100000 }) || 1;
  const limit =
    parsePositiveInt(query.limit, { min: 1, max: maxLimit }) || defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  sanitizeString,
  parsePositiveInt,
  parseDateParam,
  parsePagination,
};
