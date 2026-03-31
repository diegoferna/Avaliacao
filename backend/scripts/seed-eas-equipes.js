/**
 * Importa estabelecimentos e equipes a partir do Excel "EAS E EQUIPES.xlsx".
 *
 * Comportamento:
 * - Grava TODAS as linhas da planilha (ATIVO e INATIVO), mapeando para as colunas
 *   existentes em `unidades` e `equipes` (CNES, nome, status, INE, cor, tipos, etc.).
 * - O portal usa apenas GET /unidades e GET /equipes, que retornam somente registros
 *   com status = 'ativo'. Os inativos ficam no banco para relatórios e expansão futura.
 *
 * Arquivo padrão (se não passar argumento nem EAS_EXCEL_PATH):
 *   backend/database/EAS E EQUIPES.xlsx
 *
 * Uso:
 *   npm run seed:eas
 *   npm run seed:eas -- "C:\\outro\\caminho\\EAS E EQUIPES.xlsx"
 *
 * Variável de ambiente (opcional, sobrescreve o padrão):
 *   EAS_EXCEL_PATH=caminho/para/EAS E EQUIPES.xlsx
 *
 * Requer: migration 003 aplicada; dependências xlsx e dotenv instaladas.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const pool = require('../database/connection');

const DEFAULT_COR = '#6B7280';

const MAPA_COR = {
  AZUL: '#1565C0',
  ROSA: '#E91E63',
  VERMELHA: '#C62828',
  VERDE: '#2E7D32',
  AMARELA: '#F9A825',
  LARANJA: '#EF6C00',
  VINHO: '#880E4F',
  CINZA: '#607D8B',
  BRANCA: '#ECEFF1',
  PRETA: '#212121',
  MARROM: '#5D4037',
  ROXA: '#6A1B9A',
  LILAS: '#9C27B0',
};

function normalizarNumeroId(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return String(Math.round(v));
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'nan') return null;
  const n = parseFloat(s.replace(',', '.'));
  if (!Number.isNaN(n)) return String(Math.round(n));
  const digits = s.replace(/\D/g, '');
  return digits || null;
}

function normalizarStatus(v) {
  const s = String(v || '').trim().toUpperCase();
  if (s === 'ATIVO') return 'ativo';
  if (s === 'INATIVO') return 'inativo';
  return s === 'ATIVO' ? 'ativo' : 'inativo';
}

function corParaHex(label) {
  if (label === null || label === undefined) return DEFAULT_COR;
  const raw = String(label).trim();
  if (raw === '' || raw.toLowerCase() === 'nan') return DEFAULT_COR;
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw;
  const key = raw.toUpperCase();
  return MAPA_COR[key] || DEFAULT_COR;
}

function inferirTipoUnidade(nome) {
  const n = (nome || '').toUpperCase();
  if (n.startsWith('USF')) return 'USF';
  if (n.startsWith('UBS')) return 'UBS';
  if (n.startsWith('UPA')) return 'UPA';
  if (n.includes('HOSPITAL')) return 'Hospital';
  if (n.includes('POLICL')) return 'Policlínica';
  if (n.includes('CENTRO DE SA')) return 'Centro de Saúde';
  return 'Outro';
}

function inferirTipoEquipe(desc) {
  const d = (desc || '').toUpperCase();
  if (d.includes('ESF')) return 'ESF';
  if (d.includes('ESB')) return 'ESB';
  if (d.includes('NASF')) return 'NASF';
  if (d.includes('EMULTI')) return 'EMULTI';
  return 'Outro';
}

/** Padrão: planilha versionada em backend/database/EAS E EQUIPES.xlsx */
const CAMINHO_EXCEL_PADRAO = path.join(
  __dirname,
  '..',
  'database',
  'EAS E EQUIPES.xlsx'
);

function resolverCaminhoExcel() {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('-')) return path.resolve(arg);
  if (process.env.EAS_EXCEL_PATH) return path.resolve(process.env.EAS_EXCEL_PATH);
  return CAMINHO_EXCEL_PADRAO;
}

function normalizarNomeAba(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
}

function lerPlanilhas(caminho) {
  if (!fs.existsSync(caminho)) {
    throw new Error(`Arquivo não encontrado: ${caminho}`);
  }
  const wb = XLSX.readFile(caminho, { cellDates: false });
  if (wb.SheetNames.length < 2) {
    throw new Error('Esperado workbook com 2 abas (Estabelecimento e Equipes).');
  }

  const nomeEst = wb.SheetNames.find((n) => normalizarNomeAba(n).includes('ESTABELECIMENTO'));
  const nomeEq = wb.SheetNames.find(
    (n) => normalizarNomeAba(n).includes('EQUIPE') && !normalizarNomeAba(n).includes('ESTABELECIMENTO')
  );
  const estWs = nomeEst ? wb.Sheets[nomeEst] : wb.Sheets[wb.SheetNames[0]];
  let eqWs = nomeEq ? wb.Sheets[nomeEq] : null;
  if (!eqWs || eqWs === estWs) {
    const outro = wb.SheetNames.find((n) => wb.Sheets[n] !== estWs);
    eqWs = outro ? wb.Sheets[outro] : wb.Sheets[wb.SheetNames[1]];
  }

  console.log(
    `Abas no arquivo: ${wb.SheetNames.join(' | ')} | estabelecimentos: "${nomeEst || wb.SheetNames[0]}" | equipes: "${nomeEq || 'segunda aba'}"`
  );

  const estMat = XLSX.utils.sheet_to_json(estWs, { header: 1, defval: null, raw: true });
  const eqMat = XLSX.utils.sheet_to_json(eqWs, { header: 1, defval: null, raw: true });

  const estabelecimentos = [];
  for (let i = 1; i < estMat.length; i += 1) {
    const row = estMat[i];
    if (!row || row.length === 0) continue;
    const cnes = normalizarNumeroId(row[0]);
    const nome = row[1] != null ? String(row[1]).trim() : '';
    if (!cnes || !nome) continue;
    estabelecimentos.push({
      cnes,
      nome,
      status: normalizarStatus(row[2]),
    });
  }

  const equipes = [];
  for (let i = 1; i < eqMat.length; i += 1) {
    const row = eqMat[i];
    if (!row || row.length === 0) continue;
    const cnes = normalizarNumeroId(row[0]);
    const ine = normalizarNumeroId(row[2]);
    const nomeEquipe = row[3] != null ? String(row[3]).trim() : '';
    if (!cnes || !ine || !nomeEquipe) continue;
    const corLabel = row[5] != null && String(row[5]).trim() !== '' && String(row[5]).toLowerCase() !== 'nan'
      ? String(row[5]).trim()
      : null;
    const codTipo = row[6] != null && row[6] !== ''
      ? Math.round(Number(row[6]))
      : null;
    const descTipo = row[7] != null ? String(row[7]).trim() : '';
    equipes.push({
      cnes,
      ine,
      nome: nomeEquipe,
      status: normalizarStatus(row[4]),
      corLabel,
      corHex: corParaHex(corLabel),
      codTipoEquipe: Number.isFinite(codTipo) ? codTipo : null,
      descTipoEquipe: descTipo || null,
      tipoEquipe: inferirTipoEquipe(descTipo),
    });
  }

  return { estabelecimentos, equipes };
}

async function upsertUnidades(client, rows) {
  const sql = `
    INSERT INTO unidades (cnes, nome, status, distrito, tipo)
    VALUES ($1, $2, $3, NULL, $4)
    ON CONFLICT (cnes) DO UPDATE SET
      nome = EXCLUDED.nome,
      status = EXCLUDED.status,
      tipo = COALESCE(EXCLUDED.tipo, unidades.tipo)
  `;
  let n = 0;
  for (const r of rows) {
    const tipo = inferirTipoUnidade(r.nome);
    await client.query(
      `UPDATE unidades SET cnes = $1, nome = $2, status = $3, tipo = $4
       WHERE UPPER(TRIM(nome)) = UPPER(TRIM($2)) AND (cnes IS NULL OR cnes = $1)`,
      [r.cnes, r.nome, r.status, tipo]
    );
    await client.query(sql, [r.cnes, r.nome, r.status, tipo]);
    n += 1;
  }
  return n;
}

async function mapaCnesParaId(client) {
  const { rows } = await client.query('SELECT id, cnes FROM unidades WHERE cnes IS NOT NULL');
  const m = new Map();
  rows.forEach((r) => m.set(r.cnes, r.id));
  return m;
}

async function upsertEquipes(client, equipes, cnesToId) {
  const sql = `
    INSERT INTO equipes (
      unidade_id, nome, cor, tipo, status, ine,
      cod_tipo_equipe, desc_tipo_equipe, cor_label
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (unidade_id, ine) DO UPDATE SET
      nome = EXCLUDED.nome,
      cor = EXCLUDED.cor,
      tipo = EXCLUDED.tipo,
      status = EXCLUDED.status,
      cod_tipo_equipe = EXCLUDED.cod_tipo_equipe,
      desc_tipo_equipe = EXCLUDED.desc_tipo_equipe,
      cor_label = EXCLUDED.cor_label
  `;
  let inseridas = 0;
  let ignoradas = 0;
  for (const e of equipes) {
    const unidadeId = cnesToId.get(e.cnes);
    if (!unidadeId) {
      ignoradas += 1;
      continue;
    }
    await client.query(sql, [
      unidadeId,
      e.nome,
      e.corHex,
      e.tipoEquipe,
      e.status,
      e.ine,
      e.codTipoEquipe,
      e.descTipoEquipe,
      e.corLabel,
    ]);
    inseridas += 1;
  }
  return { inseridas, ignoradas };
}

async function main() {
  const caminho = resolverCaminhoExcel();
  if (!fs.existsSync(caminho)) {
    console.error(
      `Arquivo não encontrado: ${caminho}\n` +
        'Coloque "EAS E EQUIPES.xlsx" em backend/database/ ou defina EAS_EXCEL_PATH / passo o caminho como argumento.'
    );
    process.exit(1);
  }

  const { estabelecimentos, equipes } = lerPlanilhas(caminho);
  console.log(`Lidos: ${estabelecimentos.length} estabelecimentos, ${equipes.length} equipes.`);

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const nUni = await upsertUnidades(client, estabelecimentos);
    const cnesToId = await mapaCnesParaId(client);
    const { inseridas, ignoradas } = await upsertEquipes(client, equipes, cnesToId);
    await client.query('COMMIT');
    console.log(`Unidades aplicadas (upsert linha a linha): ${nUni}.`);
    console.log(`Equipes aplicadas: ${inseridas}. Sem estabelecimento correspondente (ignoradas): ${ignoradas}.`);

    const resU = await pool.query(
      `SELECT status, COUNT(*)::int AS total FROM unidades GROUP BY status ORDER BY status`
    );
    const resE = await pool.query(
      `SELECT status, COUNT(*)::int AS total FROM equipes GROUP BY status ORDER BY status`
    );
    console.log('Resumo no banco — unidades por status:', resU.rows);
    console.log('Resumo no banco — equipes por status:', resE.rows);
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
    }
    if (err && err.code === '28P01') {
      console.error(`
[Falha de login no PostgreSQL]
- Ajuste DB_PASSWORD e DB_USER em: backend/.env
- Se existir DATABASE_URL, ela tem prioridade sobre DB_PASSWORD. Corrija a senha na URL ou remova a linha.
- Para forçar só DB_HOST / DB_USER / DB_PASSWORD: defina PG_USE_DB_VARS=1 no .env.
- Confirme a senha com a que funciona no pgAdmin ou com:
  psql -h localhost -U postgres -d avaliacao_saude
- Arquivo .env também pode estar na pasta do projeto (Avaliacao/.env); o backend/.env tem prioridade.
`);
    }
    console.error(err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

main();
