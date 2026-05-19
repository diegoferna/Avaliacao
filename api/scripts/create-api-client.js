const apiClientRepo = require("../repositories/apiClientRepository");
const { generateApiKey, hashApiKey } = require("../utils/apiKey");
const pool = require("../database/connection");

function parseArgs(argv) {
  const out = {};
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if ((arg === "--client-id" || arg === "-client-id") && args[i + 1]) {
      out.clientId = args[++i];
    } else if ((arg === "--nome" || arg === "-nome") && args[i + 1]) {
      out.nome = args[++i];
    }
  }

  // Fallback: npm no Windows/PowerShell costuma repassar só posicionais
  // node create-api-client.js empresa_xyz "Nome da Empresa"
  if (!out.clientId && args.length >= 1 && !args[0].startsWith("-")) {
    out.clientId = args[0];
  }
  if (!out.nome && args.length >= 2 && !args[1].startsWith("-")) {
    out.nome = args[1];
  }

  return out;
}

async function main() {
  const { clientId, nome } = parseArgs(process.argv);
  if (!clientId || !nome) {
    console.error("Uso (flags):");
    console.error(
      '  npm run client:create -- --client-id ID --nome "Nome da empresa"',
    );
    console.error("Uso (posicional — recomendado no PowerShell):");
    console.error('  npm run client:create -- empresa_xyz "Nome da Empresa"');
    process.exit(1);
  }

  const plainKey = generateApiKey();
  const apiKeyHash = await hashApiKey(plainKey);

  const row = await apiClientRepo.createClient({
    nomeEmpresa: nome,
    clientId: clientId.trim(),
    apiKeyHash,
  });

  console.log("Cliente criado com sucesso.");
  console.log(JSON.stringify({ ...row, api_key: plainKey }, null, 2));
  console.log("\nGuarde a api_key agora — não será exibida novamente.");
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
