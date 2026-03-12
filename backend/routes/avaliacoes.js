const pool = require('../database/connection');

async function avaliacoesRoutes(fastify) {
  // POST /avaliacoes - Salvar uma avaliação
  fastify.post('/avaliacoes', {
    schema: {
      body: {
        type: 'object',
        required: ['unidade_id', 'acesso', 'integralidade', 'longitudinalidade', 'receptividade', 'atendimento'],
        properties: {
          unidade_id: { type: 'integer', minimum: 1 },
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
    const { unidade_id, acesso, integralidade, longitudinalidade, receptividade, atendimento, comentario } = request.body;

    // Verificar se a unidade existe
    const unidade = await pool.query('SELECT id FROM unidades WHERE id = $1', [unidade_id]);
    if (unidade.rows.length === 0) {
      return reply.status(400).send({ error: 'Unidade de saúde não encontrada.' });
    }

    const result = await pool.query(
      `INSERT INTO avaliacoes (unidade_id, acesso, integralidade, longitudinalidade, receptividade, atendimento, comentario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [unidade_id, acesso, integralidade, longitudinalidade, receptividade, atendimento, comentario || null]
    );

    return reply.status(201).send({
      message: 'Avaliação registrada com sucesso!',
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
    });
  });

  // GET /avaliacoes/resumo - Média das avaliações por unidade
  fastify.get('/avaliacoes/resumo', async (request, reply) => {
    const result = await pool.query(`
      SELECT
        u.id AS unidade_id,
        u.nome,
        u.distrito,
        u.tipo,
        COUNT(a.id)::integer AS total_avaliacoes,
        ROUND(AVG(a.acesso), 2)::float AS media_acesso,
        ROUND(AVG(a.integralidade), 2)::float AS media_integralidade,
        ROUND(AVG(a.longitudinalidade), 2)::float AS media_longitudinalidade,
        ROUND(AVG(a.receptividade), 2)::float AS media_receptividade,
        ROUND(AVG(a.atendimento), 2)::float AS media_atendimento,
        ROUND(
          (AVG(a.acesso) + AVG(a.integralidade) + AVG(a.longitudinalidade) + AVG(a.receptividade) + AVG(a.atendimento)) / 5
        , 2)::float AS media_geral
      FROM unidades u
      LEFT JOIN avaliacoes a ON u.id = a.unidade_id
      GROUP BY u.id, u.nome, u.distrito, u.tipo
      ORDER BY u.nome
    `);
    return result.rows;
  });
}

module.exports = avaliacoesRoutes;
