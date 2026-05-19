#!/usr/bin/env bash
# Exemplos de consumo da API de parceiros

BASE_URL="${BASE_URL:-http://localhost:3001}"
CLIENT_ID="${CLIENT_ID:-empresa_xyz}"
API_KEY="${API_KEY:-sua_api_key}"

# Health (sem autenticação)
curl -s "${BASE_URL}/api/v1/health" | jq .

# Avaliações com filtros
curl -s "${BASE_URL}/api/v1/avaliacoes?unidade_id=1&data_inicio=2026-01-01&data_fim=2026-01-31&page=1&limit=50" \
  -H "X-Client-Id: ${CLIENT_ID}" \
  -H "X-API-Key: ${API_KEY}" | jq .

# Unidades
curl -s "${BASE_URL}/api/v1/unidades?status=1" \
  -H "X-Client-Id: ${CLIENT_ID}" \
  -H "X-API-Key: ${API_KEY}" | jq .

# Equipes
curl -s "${BASE_URL}/api/v1/equipes?unidade_id=1" \
  -H "X-Client-Id: ${CLIENT_ID}" \
  -H "X-API-Key: ${API_KEY}" | jq .

# Admin fallback (cadastrar cliente)
# curl -s -X POST "${BASE_URL}/internal/api-clients" \
#   -H "X-Admin-Key: ${INTERNAL_ADMIN_KEY}" \
#   -H "Content-Type: application/json" \
#   -d '{"nome_empresa":"Empresa","client_id":"empresa_xyz"}' | jq .
