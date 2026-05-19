const apiClientRepo = require("../repositories/apiClientRepository");
const pool = require("../database/connection");

function parseArgs(argv) {
  const out = {};
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--id" || arg === "-id") && args[i + 1]) {
      out.id = parseInt(args[++i], 10);
    } else if ((arg === "--ativo" || arg === "-ativo") && args[i + 1]) {
      out.ativo = args[++i] === "true";
    }
  }

  if (!out.id && args.length >= 1 && !args[0].startsWith("-")) {
    out.id = parseInt(args[0], 10);
  }
  if (out.ativo === undefined && args.length >= 2 && !args[1].startsWith("-")) {
    const v = args[1].toLowerCase();
    out.ativo = v === "true" || v === "1" || v === "ativo";
  }

  return out;
}

async function main() {
  const { id, ativo } = parseArgs(process.argv);
  if (!id || ativo === undefined) {
    console.error("Uso (flags): npm run client:status -- --id 1 --ativo false");
    console.error("Uso (posicional): npm run client:status -- 1 false");
    process.exit(1);
  }

  const row = await apiClientRepo.setActiveById(id, ativo);
  if (!row) {
    console.error("Cliente não encontrado.");
    process.exit(1);
  }
  console.log(JSON.stringify(row, null, 2));
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
