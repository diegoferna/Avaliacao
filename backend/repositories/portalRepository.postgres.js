const pool = require('../database/connection');

async function listUnidadesAtivas() {
  const result = await pool.query(
    `SELECT id, cnes, nome, distrito, tipo
     FROM unidades
     WHERE status = 1
     ORDER BY nome`
  );
  return result.rows;
}

async function listEquipesAtivasPorUnidade(unidadeId) {
  const result = await pool.query(
    `SELECT id, nome, cor, cor_label, tipo
     FROM equipes
     WHERE unidade_id = $1 AND status = 1
     ORDER BY nome`,
    [unidadeId]
  );
  return result.rows;
}

async function findUnidadeAtivaById(id) {
  const result = await pool.query(
    'SELECT id FROM unidades WHERE id = $1 AND status = $2',
    [id, 1]
  );
  return result.rows[0] || null;
}

async function findEquipeAtivaByUnidade(equipeId, unidadeId) {
  const result = await pool.query(
    `SELECT id FROM equipes
     WHERE id = $1 AND unidade_id = $2 AND status = $3`,
    [equipeId, unidadeId, 1]
  );
  return result.rows[0] || null;
}

async function insertAvaliacao(row) {
  const {
    unidade_id,
    equipe_id,
    acesso,
    integralidade,
    longitudinalidade,
    receptividade,
    atendimento,
    comentario,
  } = row;
  const result = await pool.query(
    `INSERT INTO avaliacoes (
      unidade_id, equipe_id, acesso, integralidade, longitudinalidade, receptividade, atendimento, comentario
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [
      unidade_id,
      equipe_id,
      acesso,
      integralidade,
      longitudinalidade,
      receptividade,
      atendimento,
      comentario || null,
    ]
  );
  return result.rows[0];
}

async function resumoAvaliacoesPorUnidade() {
  const result = await pool.query(`
    SELECT
      u.id AS unidade_id,
      u.nome,
      u.distrito,
      u.tipo,
      COUNT(a.id)::integer AS total_avaliacoes,
      ROUND(AVG((a.acesso - 1) * 2.5), 2)::float AS media_acesso_pontos,
      ROUND(AVG((a.integralidade - 1) * 2.5), 2)::float AS media_integralidade_pontos,
      ROUND(AVG((a.longitudinalidade - 1) * 2.5), 2)::float AS media_longitudinalidade_pontos,
      ROUND(AVG((a.receptividade - 1) * 2.5), 2)::float AS media_receptividade_pontos,
      ROUND(AVG((a.atendimento - 1) * 2.5), 2)::float AS media_atendimento_pontos,
      ROUND(
        (
          AVG((a.acesso - 1) * 2.5) +
          AVG((a.integralidade - 1) * 2.5) +
          AVG((a.longitudinalidade - 1) * 2.5) +
          AVG((a.receptividade - 1) * 2.5) +
          AVG((a.atendimento - 1) * 2.5)
        ) / 5
      , 2)::float AS media_geral_pontos
    FROM unidades u
    LEFT JOIN avaliacoes a ON u.id = a.unidade_id
    GROUP BY u.id, u.nome, u.distrito, u.tipo
    ORDER BY u.nome
  `);
  return result.rows;
}

module.exports = {
  listUnidadesAtivas,
  listEquipesAtivasPorUnidade,
  findUnidadeAtivaById,
  findEquipeAtivaByUnidade,
  insertAvaliacao,
  resumoAvaliacoesPorUnidade,
};
