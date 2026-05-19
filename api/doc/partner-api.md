# Guia da API de Parceiros

## Arquitetura

- Serviço em `api/` (porta 3001), separado do portal em `backend/` (porta 8080)
- **Dois pools PostgreSQL:**
  - `pool` (app): migrations, `api_clients`, `api_logs`
  - `poolPartner` (read-only): consultas em `unidades`, `equipes`, `avaliacoes`
- Parceiros: apenas **GET** — sem escrita em dados de negócio

## Segurança

| Camada | Detalhe |
|--------|---------|
| Auth parceiro | `X-Client-Id` + `X-API-Key` (bcrypt no banco) |
| Auth admin | `X-Admin-Key` + opcional `ADMIN_ALLOWED_IPS` |
| Rate limit parceiro | 100 req/min (padrão) |
| Rate limit admin | 10 req/min (padrão) |
| DB parceiro | Usuário `partner_api_ro` somente SELECT |

## SQL de avaliações

Pontuação na escala 0–10: `(nota - 1) * 2.5`.  
Média total: média das 5 dimensões convertidas.

Filtros: `unidade_id`, `equipe_id`, `cnes`, `ine`, `distrito`, `data_inicio`, `data_fim`, `page`, `limit`.

## Status de unidades/equipes

- `1` = ativo  
- `2` = inativo  
