-- Criação do banco de dados (executar separadamente se necessário)
-- CREATE DATABASE avaliacao_saude;

-- Tabela de unidades de saúde
CREATE TABLE IF NOT EXISTS unidades (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    distrito VARCHAR(100) NOT NULL,
    tipo VARCHAR(100) NOT NULL
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS avaliacoes (
    id SERIAL PRIMARY KEY,
    unidade_id INTEGER NOT NULL REFERENCES unidades(id),
    acesso INTEGER NOT NULL CHECK (acesso BETWEEN 1 AND 5),
    integralidade INTEGER NOT NULL CHECK (integralidade BETWEEN 1 AND 5),
    longitudinalidade INTEGER NOT NULL CHECK (longitudinalidade BETWEEN 1 AND 5),
    receptividade INTEGER NOT NULL CHECK (receptividade BETWEEN 1 AND 5),
    atendimento INTEGER NOT NULL CHECK (atendimento BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para consultas por unidade
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unidade_id ON avaliacoes(unidade_id);

-- Dados iniciais: unidades de saúde de exemplo
INSERT INTO unidades (nome, distrito, tipo) VALUES
    ('UBS Central', 'Centro', 'UBS'),
    ('UBS Vila Nova', 'Norte', 'UBS'),
    ('UBS Jardim das Flores', 'Sul', 'UBS'),
    ('USF Esperança', 'Leste', 'USF'),
    ('USF Boa Vista', 'Oeste', 'USF'),
    ('UPA 24h Centro', 'Centro', 'UPA'),
    ('UPA 24h Norte', 'Norte', 'UPA'),
    ('Hospital Municipal', 'Centro', 'Hospital'),
    ('Centro de Saúde São José', 'Leste', 'Centro de Saúde'),
    ('Policlínica Sul', 'Sul', 'Policlínica');
