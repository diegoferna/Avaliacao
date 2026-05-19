/**
 * Remove unidades de exemplo inseridas pelas migrations 001/002 em bancos que
 * já tinham cadastro real (planilha EAS). Não remove unidades com avaliações.
 *
 * Uso:
 *   npm run cleanup:sample-unidades
 *   npm run cleanup:sample-unidades -- --dry-run
 */

const pool = require('../database/connection');

const DRY_RUN = process.argv.includes('--dry-run');

/** Nomes exatos da migration 001 (dados de demonstração). */
const UNIDADES_EXEMPLO_001 = [
  'UBS Central',
  'UBS Vila Nova',
  'UBS Jardim das Flores',
  'USF Esperança',
  'USF Boa Vista',
  'UPA 24h Centro',
  'UPA 24h Norte',
  'Hospital Municipal',
  'Centro de Saúde São José',
  'Policlínica Sul',
];

/** Piloto da migration 002 antiga (duplicata da planilha em outro casing). */
const NOME_PILOTO_002 = 'USF Olga de Alaketu Vale do Matatu';

async function listarCandidatas(client) {
  const { rows: porNome } = await client.query(
    `SELECT id, nome, cnes, status
     FROM unidades
     WHERE nome = ANY($1::text[])`,
    [UNIDADES_EXEMPLO_001]
  );

  const { rows: pilotoDup } = await client.query(
    `SELECT u.id, u.nome, u.cnes, u.status
     FROM unidades u
     WHERE UPPER(TRIM(u.nome)) = UPPER(TRIM($1))
       AND u.cnes IS NULL
       AND EXISTS (
         SELECT 1 FROM unidades o
         WHERE o.id <> u.id
           AND UPPER(TRIM(o.nome)) = UPPER(TRIM(u.nome))
           AND o.cnes IS NOT NULL
       )`,
    [NOME_PILOTO_002]
  );

  const ids = new Map();
  for (const r of [...porNome, ...pilotoDup]) {
    ids.set(r.id, r);
  }
  return [...ids.values()];
}

async function removerUnidade(client, unidade) {
  const av = await client.query(
    'SELECT COUNT(*)::int AS n FROM avaliacoes WHERE unidade_id = $1',
    [unidade.id]
  );
  if (av.rows[0].n > 0) {
    console.log(
      `IGNORADA id=${unidade.id} "${unidade.nome}" — ${av.rows[0].n} avaliação(ões) vinculada(s).`
    );
    return { removida: false, motivo: 'avaliacoes' };
  }

  const eq = await client.query(
    'SELECT COUNT(*)::int AS n FROM equipes WHERE unidade_id = $1',
    [unidade.id]
  );

  if (DRY_RUN) {
    console.log(
      `DRY-RUN removeria id=${unidade.id} "${unidade.nome}" (${eq.rows[0].n} equipe(s)).`
    );
    return { removida: true, dryRun: true };
  }

  await client.query('DELETE FROM equipes WHERE unidade_id = $1', [unidade.id]);
  await client.query('DELETE FROM unidades WHERE id = $1', [unidade.id]);
  console.log(
    `REMOVIDA id=${unidade.id} "${unidade.nome}" (${eq.rows[0].n} equipe(s) excluída(s)).`
  );
  return { removida: true };
}

async function main() {
  const client = await pool.connect();
  try {
    const candidatas = await listarCandidatas(client);
    if (candidatas.length === 0) {
      console.log('Nenhuma unidade de exemplo encontrada para remover.');
      return;
    }

    console.log(
      DRY_RUN
        ? 'Modo simulação (--dry-run). Nada será alterado.\n'
        : 'Removendo unidades de exemplo das migrations...\n'
    );

    if (!DRY_RUN) await client.query('BEGIN');

    let removidas = 0;
    let ignoradas = 0;
    for (const u of candidatas) {
      const r = await removerUnidade(client, u);
      if (r.motivo === 'avaliacoes') ignoradas += 1;
      else if (r.removida && !r.dryRun) removidas += 1;
    }

    if (!DRY_RUN) await client.query('COMMIT');

    console.log(`\nResumo: ${removidas} removida(s), ${ignoradas} ignorada(s).`);
    if (DRY_RUN) {
      console.log('Execute sem --dry-run para aplicar.');
    }
  } catch (err) {
    if (!DRY_RUN) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        // ignore
      }
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
