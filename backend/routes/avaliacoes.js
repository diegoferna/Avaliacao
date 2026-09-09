const portal = require('../repositories/portalRepository');
const { validarCpfOuCns, somenteDigitos } = require('../utils/documento');

const LOCAIS_ATENDIMENTO = [
  'Consultório Médico/Enfermagem',
  'Consultório Odontológico',
  'Sala de Vacina',
  'Sala de Curativo',
  'Sala de Procedimentos',
  'Recepção',
  'Atividade Coletiva',
  'Farmácia',
];

function validarBodyAvaliacao(body) {
  const errors = [];
  const naoDesejaIdentificar = Boolean(body.nao_deseja_identificar);
  const semEquipe = Boolean(body.sem_equipe);

  if (naoDesejaIdentificar) {
    if (body.cpf_cns != null && body.cpf_cns !== '') {
      errors.push('CPF ou CNS não deve ser informado quando optar por não se identificar.');
    }
  } else {
    const resultado = validarCpfOuCns(body.cpf_cns);
    if (!resultado.ok) {
      errors.push('CPF ou CNS inválido.');
    }
  }

  if (!body.local_atendimento || !LOCAIS_ATENDIMENTO.includes(body.local_atendimento)) {
    errors.push('Local do atendimento é obrigatório.');
  }

  if (semEquipe) {
    if (body.equipe_id != null) {
      errors.push('Equipe não deve ser informada quando marcado "Sem equipe".');
    }
    for (const campo of ['acesso', 'integralidade', 'longitudinalidade']) {
      if (body[campo] != null) {
        errors.push(`O campo ${campo} não deve ser informado quando marcado "Sem equipe".`);
      }
    }
  } else {
    if (!body.equipe_id) {
      errors.push('Equipe de saúde é obrigatória.');
    }
    for (const campo of ['acesso', 'integralidade', 'longitudinalidade']) {
      if (body[campo] == null) {
        errors.push(`O campo ${campo} é obrigatório.`);
      }
    }
  }

  for (const campo of ['receptividade', 'atendimento']) {
    if (body[campo] == null) {
      errors.push(`O campo ${campo} é obrigatório.`);
    }
  }

  return errors;
}

async function avaliacoesRoutes(fastify) {
  fastify.post('/avaliacoes', {
    schema: {
      body: {
        type: 'object',
        required: [
          'unidade_id',
          'nao_deseja_identificar',
          'sem_equipe',
          'local_atendimento',
          'receptividade',
          'atendimento',
        ],
        properties: {
          cpf_cns: { type: ['string', 'null'] },
          nao_deseja_identificar: { type: 'boolean' },
          sem_equipe: { type: 'boolean' },
          unidade_id: { type: 'integer', minimum: 1 },
          local_atendimento: { type: 'string', enum: LOCAIS_ATENDIMENTO },
          equipe_id: {
            anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1 }],
          },
          acesso: {
            anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1, maximum: 5 }],
          },
          integralidade: {
            anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1, maximum: 5 }],
          },
          longitudinalidade: {
            anyOf: [{ type: 'null' }, { type: 'integer', minimum: 1, maximum: 5 }],
          },
          receptividade: { type: 'integer', minimum: 1, maximum: 5 },
          atendimento: { type: 'integer', minimum: 1, maximum: 5 },
          comentario: { type: 'string', maxLength: 1000 },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body;
    const validationErrors = validarBodyAvaliacao(body);
    if (validationErrors.length > 0) {
      return reply.status(400).send({ error: validationErrors[0] });
    }

    const {
      unidade_id,
      equipe_id,
      acesso,
      integralidade,
      longitudinalidade,
      receptividade,
      atendimento,
      comentario,
      nao_deseja_identificar,
      sem_equipe,
      local_atendimento,
    } = body;

    const cpf_cns = nao_deseja_identificar
      ? null
      : somenteDigitos(body.cpf_cns);

    const unidade = await portal.findUnidadeAtivaById(unidade_id);
    if (!unidade) {
      return reply.status(400).send({ error: 'Estabelecimento de saúde não encontrado ou inativo.' });
    }

    if (!sem_equipe) {
      const equipe = await portal.findEquipeAtivaByUnidade(equipe_id, unidade_id);
      if (!equipe) {
        return reply.status(400).send({
          error: 'Equipe de saúde não encontrada ou não pertence ao estabelecimento selecionado.',
        });
      }
    }

    const row = await portal.insertAvaliacao({
      unidade_id,
      equipe_id: sem_equipe ? null : equipe_id,
      acesso: sem_equipe ? null : acesso,
      integralidade: sem_equipe ? null : integralidade,
      longitudinalidade: sem_equipe ? null : longitudinalidade,
      receptividade,
      atendimento,
      comentario,
      cpf_cns,
      nao_deseja_identificar,
      sem_equipe,
      local_atendimento,
    });

    return reply.status(201).send({
      message: 'Avaliação registrada com sucesso!',
      id: row.id,
      created_at: row.created_at,
    });
  });

  fastify.get('/avaliacoes/resumo', async () => {
    return portal.resumoAvaliacoesPorUnidade();
  });
}

module.exports = avaliacoesRoutes;
