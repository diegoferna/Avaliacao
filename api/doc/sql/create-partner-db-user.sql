-- Executar como superusuário (postgres) no banco avaliacao_saude.
-- Ajuste a senha antes de aplicar em produção.

-- CREATE USER partner_api_ro WITH PASSWORD 'ALTERE_ESTA_SENHA';

GRANT CONNECT ON DATABASE avaliacao_saude TO partner_api_ro;
GRANT USAGE ON SCHEMA public TO partner_api_ro;

GRANT SELECT ON TABLE unidades TO partner_api_ro;
GRANT SELECT ON TABLE equipes TO partner_api_ro;
GRANT SELECT ON TABLE avaliacoes TO partner_api_ro;
GRANT SELECT ON TABLE api_clients TO partner_api_ro;

-- Sem INSERT, UPDATE, DELETE, TRUNCATE, DROP ou ALTER em tabelas de negócio.
-- Logs e ultimo_acesso são gravados pelo pool da aplicação (usuário com permissão em api_*).
