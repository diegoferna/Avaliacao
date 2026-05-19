const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const pool = require('../database/connection');

const CAMINHO_PADRAO = path.join(__dirname, '..', 'doc', 'EAS e EQUIPES.xlsx');

function resolverCaminhoPlanilha() {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('-')) return path.resolve(arg);
  if (process.env.EAS_EXCEL_PATH) return path.resolve(process.env.EAS_EXCEL_PATH);
  return CAMINHO_PADRAO;
}

function normalizarStatus(statusRaw) {
  const s = String(statusRaw || '').trim().toUpperCase();
  if (s === 'ATIVO') return 1;
  if (s === 'INATIVO') return 2;
  return 2;
}

function normalizarCnes(cnesRaw) {
  if (cnesRaw === null || cnesRaw === undefined || cnesRaw === '') return null;
  if (typeof cnesRaw === 'number' && !Number.isNaN(cnesRaw)) return String(Math.trunc(cnesRaw));
  const s = String(cnesRaw).trim();
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  return digits || null;
}

function normalizarDistrito(distritoRaw) {
  if (distritoRaw === null || distritoRaw === undefined) return null;
  const s = String(distritoRaw).trim();
  return s || null;
}

function lerUnidadesPlanilha(caminhoPlanilha) {
  if (!fs.existsSync(caminhoPlanilha)) {
    throw new Error(`Planilha não encontrada: ${caminhoPlanilha}`);
  }

  const wb = XLSX.readFile(caminhoPlanilha, { cellDates: false });
  const nomeAba = wb.SheetNames[0];
  const ws = wb.Sheets[nomeAba];
  const matriz = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

  const unidades = [];
  const dedup = new Set();

  for (let i = 1; i < matriz.length; i += 1) {
    const row = matriz[i];
    if (!row || row.length === 0) continue;

    const distrito = normalizarDistrito(row[0]); // coluna A
    const cnes = normalizarCnes(row[1]); // coluna B
    const nome = row[2] != null ? String(row[2]).trim() : ''; // coluna C
    const status = normalizarStatus(row[3]); // coluna D
    if (!nome) continue;

    const chave = nome.toUpperCase();
    if (dedup.has(chave)) continue;
    dedup.add(chave);

    unidades.push({ cnes, nome, status, distrito });
  }

  if (unidades.length === 0) {
    throw new Error('Nenhuma unidade válida encontrada na coluna C da planilha.');
  }

  return { unidades, nomeAba };
}

async function inserirTempUnidades(client, unidades) {
  await client.query(`
    CREATE TEMP TABLE tmp_unidades_sync (
      nome VARCHAR(255) NOT NULL,
      distrito VARCHAR(100),
      cnes VARCHAR(20),
      status SMALLINT NOT NULL
    ) ON COMMIT DROP
  `);

  const sqlInsert = `
    INSERT INTO tmp_unidades_sync (nome, distrito, cnes, status)
    VALUES ($1, $2, $3, $4)
  `;

  for (const u of unidades) {
    await client.query(sqlInsert, [u.nome, u.distrito, u.cnes, u.status]);
  }
}

async function validarExclusaoSegura(client) {
  const sql = `
    SELECT COUNT(*)::int AS total
    FROM avaliacoes a
    JOIN unidades u ON u.id = a.unidade_id
    WHERE UPPER(TRIM(u.nome)) NOT IN (
      SELECT UPPER(TRIM(t.nome)) FROM tmp_unidades_sync t
    )
  `;
  const { rows } = await client.query(sql);
  const total = rows[0]?.total || 0;
  if (total > 0) {
    throw new Error(
      `Existem ${total} avaliação(ões) vinculadas a unidades fora da planilha. ` +
        'Sincronização abortada para evitar perda de histórico.'
    );
  }
}

async function sincronizarUnidades(client) {
  await client.query(`
    UPDATE unidades u
    SET
      nome = t.nome,
      distrito = t.distrito,
      status = t.status,
      cnes = COALESCE(t.cnes, u.cnes)
    FROM tmp_unidades_sync t
    WHERE t.cnes IS NOT NULL
      AND u.cnes = t.cnes
  `);

  await client.query(`
    UPDATE unidades u
    SET
      nome = t.nome,
      distrito = t.distrito,
      status = t.status,
      cnes = COALESCE(t.cnes, u.cnes)
    FROM tmp_unidades_sync t
    WHERE UPPER(TRIM(u.nome)) = UPPER(TRIM(t.nome))
  `);

  const { rows: insertedRows } = await client.query(`
    INSERT INTO unidades (nome, cnes, status, distrito, tipo)
    SELECT t.nome, t.cnes, t.status, t.distrito, NULL
    FROM tmp_unidades_sync t
    WHERE NOT EXISTS (
      SELECT 1
      FROM unidades u
      WHERE UPPER(TRIM(u.nome)) = UPPER(TRIM(t.nome))
         OR (t.cnes IS NOT NULL AND u.cnes = t.cnes)
    )
    RETURNING id
  `);

  await validarExclusaoSegura(client);

  await client.query(`
    DELETE FROM equipes e
    WHERE e.unidade_id IN (
      SELECT u.id
      FROM unidades u
      WHERE UPPER(TRIM(u.nome)) NOT IN (
        SELECT UPPER(TRIM(t.nome)) FROM tmp_unidades_sync t
      )
    )
  `);

  const { rows: deletedRows } = await client.query(`
    DELETE FROM unidades u
    WHERE UPPER(TRIM(u.nome)) NOT IN (
      SELECT UPPER(TRIM(t.nome)) FROM tmp_unidades_sync t
    )
    RETURNING id
  `);

  const { rows: totalRows } = await client.query('SELECT COUNT(*)::int AS total FROM unidades');

  return {
    inseridas: insertedRows.length,
    removidas: deletedRows.length,
    totalFinal: totalRows[0]?.total || 0,
  };
}

async function main() {
  const caminhoPlanilha = resolverCaminhoPlanilha();
  const { unidades, nomeAba } = lerUnidadesPlanilha(caminhoPlanilha);

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await inserirTempUnidades(client, unidades);
    const resultado = await sincronizarUnidades(client);
    await client.query('COMMIT');

    console.log(`Aba lida: ${nomeAba}`);
    console.log(`Unidades lidas da planilha (coluna C): ${unidades.length}`);
    console.log(`Unidades inseridas: ${resultado.inseridas}`);
    console.log(`Unidades removidas: ${resultado.removidas}`);
    console.log(`Total final na tabela unidades: ${resultado.totalFinal}`);
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // ignore
      }
    }
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main();
