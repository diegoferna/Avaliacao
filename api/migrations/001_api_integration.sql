-- API de integração com parceiros: clientes e logs de acesso

CREATE TABLE IF NOT EXISTS api_clients (
    id SERIAL PRIMARY KEY,
    nome_empresa VARCHAR(255) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acesso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_api_clients_client_id UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_api_clients_client_id_ativo
    ON api_clients (client_id) WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    api_client_id INTEGER REFERENCES api_clients(id) ON DELETE SET NULL,
    client_id VARCHAR(100),
    endpoint VARCHAR(500) NOT NULL,
    metodo VARCHAR(10) NOT NULL,
    status_code SMALLINT NOT NULL,
    ip VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_logs_client_created
    ON api_logs (api_client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_created
    ON api_logs (created_at DESC);

COMMENT ON TABLE api_clients IS 'Clientes externos autorizados a consumir a API de parceiros (read-only).';
COMMENT ON TABLE api_logs IS 'Registro de requisições autenticadas na API de parceiros.';
