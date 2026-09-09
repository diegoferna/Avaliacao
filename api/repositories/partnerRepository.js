const poolPartner = require("../database/connectionPartner");
const {
  sanitizeString,
  parsePositiveInt,
  parseDateParam,
  parsePagination,
} = require("../utils/sanitize");

const AVALIACOES_SELECT = `
  SELECT
    a.id AS avaliacao_id,
    a.created_at AS data_avaliacao,
    u.cnes AS unidade_cnes,
    u.nome AS unidade_nome,
    u.distrito AS unidade_distrito,
    e.ine AS equipe_ine,
    e.nome AS equipe_nome,
    e.tipo AS equipe_tipo,
    a.acesso AS resp_acesso,
    a.integralidade AS resp_integralidade,
    a.longitudinalidade AS resp_longitudinalidade,
    a.receptividade AS resp_receptividade,
    a.atendimento AS resp_atendimento,
    a.local_atendimento,
    (a.acesso - 1) * 2.5 AS pontuacao_acesso,
    (a.integralidade - 1) * 2.5 AS pontuacao_integralidade,
    (a.longitudinalidade - 1) * 2.5 AS pontuacao_longitudinalidade,
    (a.receptividade - 1) * 2.5 AS pontuacao_receptividade,
    (a.atendimento - 1) * 2.5 AS pontuacao_atendimento,
    (
      (a.acesso - 1) * 2.5 +
      (a.integralidade - 1) * 2.5 +
      (a.longitudinalidade - 1) * 2.5 +
      (a.receptividade - 1) * 2.5 +
      (a.atendimento - 1) * 2.5
    ) / 5.0 AS pontuacao_total_avaliacao,
    a.comentario
  FROM avaliacoes a
  JOIN unidades u ON a.unidade_id = u.id
  JOIN equipes e ON a.equipe_id = e.id
`;

const AVALIACOES_WHERE_BASE = `
  WHERE a.acesso IS NOT NULL
    AND a.integralidade IS NOT NULL
    AND a.longitudinalidade IS NOT NULL
    AND a.receptividade IS NOT NULL
    AND a.atendimento IS NOT NULL
`;

function buildAvaliacoesFilters(query) {
  const conditions = [];
  const params = [];
  let idx = 1;

  const unidadeId = parsePositiveInt(query.unidade_id, { min: 1 });
  if (unidadeId) {
    conditions.push(`a.unidade_id = $${idx++}`);
    params.push(unidadeId);
  }

  const equipeId = parsePositiveInt(query.equipe_id, { min: 1 });
  if (equipeId) {
    conditions.push(`a.equipe_id = $${idx++}`);
    params.push(equipeId);
  }

  const cnes = sanitizeString(query.cnes, 20);
  if (cnes) {
    conditions.push(`u.cnes = $${idx++}`);
    params.push(cnes);
  }

  const ine = sanitizeString(query.ine, 20);
  if (ine) {
    conditions.push(`e.ine = $${idx++}`);
    params.push(ine);
  }

  const distrito = sanitizeString(query.distrito, 100);
  if (distrito) {
    conditions.push(`u.distrito ILIKE $${idx++}`);
    params.push(`%${distrito}%`);
  }

  const dataInicio = parseDateParam(query.data_inicio);
  if (dataInicio) {
    conditions.push(`a.created_at >= $${idx++}::date`);
    params.push(dataInicio);
  }

  const dataFim = parseDateParam(query.data_fim);
  if (dataFim) {
    conditions.push(`a.created_at < ($${idx++}::date + INTERVAL '1 day')`);
    params.push(dataFim);
  }

  const extraWhere =
    conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";

  return { extraWhere, params, nextIdx: idx };
}

async function listAvaliacoes(query) {
  const { page, limit, offset } = parsePagination(query);
  const { extraWhere, params, nextIdx } = buildAvaliacoesFilters(query);

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM avaliacoes a
    JOIN unidades u ON a.unidade_id = u.id
    JOIN equipes e ON a.equipe_id = e.id
    ${AVALIACOES_WHERE_BASE}
    ${extraWhere}
  `;

  const dataSql = `
    ${AVALIACOES_SELECT}
    ${AVALIACOES_WHERE_BASE}
    ${extraWhere}
    ORDER BY a.created_at DESC
    LIMIT $${nextIdx} OFFSET $${nextIdx + 1}
  `;

  const countParams = [...params];
  const dataParams = [...params, limit, offset];

  const [countResult, dataResult] = await Promise.all([
    poolPartner.query(countSql, countParams),
    poolPartner.query(dataSql, dataParams),
  ]);

  return {
    data: dataResult.rows,
    meta: {
      page,
      limit,
      total: countResult.rows[0]?.total ?? 0,
    },
  };
}

async function listUnidades(query) {
  const conditions = [];
  const params = [];
  let idx = 1;

  const status = parsePositiveInt(query.status, { min: 1, max: 2 });
  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const distrito = sanitizeString(query.distrito, 100);
  if (distrito) {
    conditions.push(`distrito ILIKE $${idx++}`);
    params.push(`%${distrito}%`);
  }

  const cnes = sanitizeString(query.cnes, 20);
  if (cnes) {
    conditions.push(`cnes = $${idx++}`);
    params.push(cnes);
  }

  const nome = sanitizeString(query.nome, 255);
  if (nome) {
    conditions.push(`nome ILIKE $${idx++}`);
    params.push(`%${nome}%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await poolPartner.query(
    `SELECT id, cnes, nome, distrito, tipo, status
     FROM unidades
     ${where}
     ORDER BY nome`,
    params,
  );

  return result.rows;
}

async function listEquipes(query) {
  const conditions = [];
  const params = [];
  let idx = 1;

  const unidadeId = parsePositiveInt(query.unidade_id, { min: 1 });
  if (unidadeId) {
    conditions.push(`unidade_id = $${idx++}`);
    params.push(unidadeId);
  }

  const status = parsePositiveInt(query.status, { min: 1, max: 2 });
  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const ine = sanitizeString(query.ine, 20);
  if (ine) {
    conditions.push(`ine = $${idx++}`);
    params.push(ine);
  }

  const tipo = sanitizeString(query.tipo, 50);
  if (tipo) {
    conditions.push(`tipo ILIKE $${idx++}`);
    params.push(`%${tipo}%`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await poolPartner.query(
    `SELECT id, unidade_id, ine, nome, tipo, status
     FROM equipes
     ${where}
     ORDER BY nome`,
    params,
  );

  return result.rows;
}

module.exports = {
  listAvaliacoes,
  listUnidades,
  listEquipes,
};
