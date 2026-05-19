# API de Parceiros — Avaliação de Saúde

API REST **read-only** para integração com sistemas terceiros. Serviço independente na pasta `api/`, porta padrão **3001**.

## Requisitos

- Node.js 18+
- PostgreSQL (mesmo banco `avaliacao_saude` do backend principal)
- Usuário read-only `partner_api_ro` para consultas

## Instalação

```bash
cd api
cp .env.example .env
# Edite .env com credenciais do banco
npm install
npm run migrate
```

### Usuário PostgreSQL read-only

Execute como superusuário:

```bash
psql -f doc/sql/create-partner-db-user.sql
```

## Gerenciar clientes (CLI — método principal)

```bash
npm run key:generate

# PowerShell (recomendado — npm repassa argumentos posicionais):
npm run client:create -- empresa_xyz "Empresa XYZ"

# Linux/macOS ou quando --funciona:
npm run client:create -- --client-id empresa_xyz --nome "Empresa XYZ"

npm run client:status -- 1 false
```

A `api_key` é exibida **uma única vez** na criação.

## Consumo (parceiros)

Headers obrigatórios em todas as rotas `/api/v1/*` (exceto `/health`):

```
X-Client-Id: empresa_xyz
X-API-Key: sua_chave_secreta
```

### Exemplo

```bash
curl -s "http://localhost:3001/api/v1/avaliacoes?unidade_id=1&data_inicio=2026-01-01" \
  -H "X-Client-Id: empresa_xyz" \
  -H "X-API-Key: SUA_CHAVE"
```

## Documentação interativa

Com o servidor rodando:

```
http://localhost:3001/docs
```

Rotas `/internal/*` **não** aparecem no Swagger.

## Admin HTTP (fallback)

```bash
curl -X POST http://localhost:3001/internal/api-clients \
  -H "X-Admin-Key: SEU_INTERNAL_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"nome_empresa":"Empresa","client_id":"empresa_xyz"}'
```

Opcional: restringir por IP com `ADMIN_ALLOWED_IPS=1.2.3.4` no `.env`.

## Executar

```bash
npm run dev    # desenvolvimento
npm start      # produção
```

## Endpoints parceiros (somente GET)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/health` | Health check (sem auth) |
| GET | `/api/v1/avaliacoes` | Avaliações com pontuações 0–10 |
| GET | `/api/v1/unidades` | Estabelecimentos |
| GET | `/api/v1/equipes` | Equipes |

Veja também `doc/partner-api.md` e `examples/`.
