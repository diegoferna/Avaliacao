const pool = require('../database/connection');

async function avaliacoesRoutes(fastify) {
  fastify.post('/avaliacoes', {
    schema: {
      body: {
        type: 'object',
        required: [
          'unidade_id',
          'equipe_id',
          'acesso',
          'integralidade',
          'longitudinalidade',
          'receptividade',
          'atendimento',
        ],
        properties: {
          unidade_id: { type: 'integer', minimum: 1 },
          equipe_id: { type: 'integer', minimum: 1 },
          acesso: { type: 'integer', minimum: 1, maximum: 5 },
          integralidade: { type: 'integer', minimum: 1, maximum: 5 },
          longitudinalidade: { type: 'integer', minimum: 1, maximum: 5 },
          receptividade: { type: 'integer', minimum: 1, maximum: 5 },
          atendimento: { type: 'integer', minimum: 1, maximum: 5 },
          comentario: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request, reply) => {
    const {
      unidade_id,
      equipe_id,
      acesso,
      integralidade,
      longitudinalidade,
      receptividade,
      atendimento,
      comentario,
    } = request.body;

    const unidade = await pool.query(
      'SELECT id FROM unidades WHERE id = $1 AND status = $2',
      [unidade_id, 1]
    );
    if (unidade.rows.length === 0) {
      return reply.status(400).send({ error: 'Estabelecimento de saúde não encontrado ou inativo.' });
    }

    const equipe = await pool.query(
      `SELECT id FROM equipes
       WHERE id = $1 AND unidade_id = $2 AND status = $3`,
      [equipe_id, unidade_id, 1]
    );
    if (equipe.rows.length === 0) {
      return reply.status(400).send({ error: 'Equipe de saúde não encontrada ou não pertence ao estabelecimento selecionado.' });
    }

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

    return reply.status(201).send({
      message: 'Avaliação registrada com sucesso!',
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });
  });

  fastify.get('/avaliacoes/resumo', async (request, reply) => {
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
  });
}

module.exports = avaliacoesRoutes;
