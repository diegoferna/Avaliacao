/**
 * Remove equipes placeholder (ESF 1, ESF 2, ESF 3) do banco.
 *
 * Uso:
 *   npm run equipes:cleanup
 */

const pool = require("../database/connection");

const NOMES_PLACEHOLDER = ["ESF 1", "ESF 2", "ESF 3"];

async function main() {
  const client = await pool.connect();
  try {
    const who = await client.query(
      "SELECT current_database() AS database, current_user AS db_user"
    );
    console.log(
      `Conexão: banco "${who.rows[0].database}" como "${who.rows[0].db_user}"`
    );

    await client.query("BEGIN");

    const query = `
      WITH removidas AS (
        DELETE FROM equipes
        WHERE nome = ANY($1::text[])
        RETURNING id, unidade_id, nome, cor
      )
      SELECT * FROM removidas
      ORDER BY unidade_id, nome, id
    `;

    const result = await client.query(query, [NOMES_PLACEHOLDER]);
    await client.query("COMMIT");

    console.log(`Equipes removidas: ${result.rowCount}`);
    if (result.rowCount > 0) {
      for (const row of result.rows) {
        console.log(
          `- id=${row.id} unidade_id=${row.unidade_id} nome="${row.nome}" cor=${row.cor}`
        );
      }
    } else {
      console.log("Nenhuma equipe placeholder encontrada para remoção.");
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      // ignore rollback errors
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
