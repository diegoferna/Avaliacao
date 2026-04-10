const fixtures = require('../data/mock/fixtures.json');

let nextAvaliacaoId = 900001;

function listUnidadesAtivas() {
  return Promise.resolve(
    [...fixtures.unidades].sort((a, b) =>
      String(a.nome).localeCompare(String(b.nome), 'pt-BR')
    )
  );
}

function listEquipesAtivasPorUnidade(unidadeId) {
  const rows = fixtures.equipes
    .filter((e) => e.unidade_id === unidadeId)
    .map(({ id, nome, cor, cor_label, tipo }) => ({
      id,
      nome,
      cor,
      cor_label,
      tipo,
    }));
  return Promise.resolve(rows.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')));
}

function findUnidadeAtivaById(id) {
  const u = fixtures.unidades.find((x) => x.id === id);
  return Promise.resolve(u ? { id: u.id } : null);
}

function findEquipeAtivaByUnidade(equipeId, unidadeId) {
  const e = fixtures.equipes.find(
    (x) => x.id === equipeId && x.unidade_id === unidadeId
  );
  return Promise.resolve(e ? { id: e.id } : null);
}

function insertAvaliacao() {
  const id = nextAvaliacaoId++;
  const created_at = new Date().toISOString();
  return Promise.resolve({ id, created_at });
}

/** Resposta compatível com a query de homolog; sem tabela, devolve zeros para cada unidade mock. */
function resumoAvaliacoesPorUnidade() {
  const rows = fixtures.unidades.map((u) => ({
    unidade_id: u.id,
    nome: u.nome,
    distrito: u.distrito,
    tipo: u.tipo,
    total_avaliacoes: 0,
    media_acesso_pontos: null,
    media_integralidade_pontos: null,
    media_longitudinalidade_pontos: null,
    media_receptividade_pontos: null,
    media_atendimento_pontos: null,
    media_geral_pontos: null,
  }));
  return Promise.resolve(
    rows.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
  );
}

module.exports = {
  listUnidadesAtivas,
  listEquipesAtivasPorUnidade,
  findUnidadeAtivaById,
  findEquipeAtivaByUnidade,
  insertAvaliacao,
  resumoAvaliacoesPorUnidade,
};
