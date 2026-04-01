-- Dicionários de referência para analytics: significado dos códigos gravados nas tabelas operacionais.
-- Escala 1–5 (colunas acesso, integralidade, longitudinalidade, receptividade, atendimento em avaliacoes).
-- Dimensões (código 1–5 + nome da coluna): migration 006_dimensao_codigo_numerico.sql.
-- Status numérico (1 = ativo, 2 = inativo): ver migration 005_status_codigo_numerico.sql.

-- ---------------------------------------------------------------------------
-- Escala Likert 1–5 (mesma escala para todas as dimensões)
-- pontos_escala_0_a_10: conversão usada em relatórios (valor - 1) * 2.5 → faixa 0 a 10
-- ---------------------------------------------------------------------------
-- Coluna calculada sem GENERATED STORED: compatível com PostgreSQL < 12 (fórmula: (valor - 1) * 2.5).
CREATE TABLE IF NOT EXISTS ref_escala_satisfacao (
    valor SMALLINT PRIMARY KEY CHECK (valor BETWEEN 1 AND 5),
    rotulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    pontos_escala_0_a_10 NUMERIC(5, 2) NOT NULL
);

COMMENT ON TABLE ref_escala_satisfacao IS
    'Significado dos inteiros 1–5 nas colunas de nota de avaliacoes. Join: avaliacoes.<dimensao> = valor.';

INSERT INTO ref_escala_satisfacao (valor, rotulo, descricao, pontos_escala_0_a_10) VALUES
    (1, 'Muito insatisfeito(a)', 'Pior nível na escala de satisfação (valor armazenado = 1).', 0),
    (2, 'Insatisfeito(a)', 'Valor armazenado = 2.', 2.5),
    (3, 'Neutro(a)', 'Valor armazenado = 3.', 5),
    (4, 'Satisfeito(a)', 'Valor armazenado = 4.', 7.5),
    (5, 'Muito satisfeito(a)', 'Melhor nível na escala de satisfação (valor armazenado = 5).', 10)
ON CONFLICT (valor) DO UPDATE SET
    rotulo = EXCLUDED.rotulo,
    descricao = EXCLUDED.descricao,
    pontos_escala_0_a_10 = EXCLUDED.pontos_escala_0_a_10;

-- ---------------------------------------------------------------------------
-- Documentação da métrica agregada (endpoint GET /avaliacoes/resumo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_metrica_relatorio (
    codigo VARCHAR(40) PRIMARY KEY,
    titulo VARCHAR(160) NOT NULL,
    formula_expressao TEXT NOT NULL,
    descricao TEXT NOT NULL
);

COMMENT ON TABLE ref_metrica_relatorio IS
    'Explica como médias em “pontos” 0–10 são derivadas das notas 1–5.';

INSERT INTO ref_metrica_relatorio (codigo, titulo, formula_expressao, descricao) VALUES
    ('media_dimensao_pontos_0_10', 'Média por dimensão (0 a 10 pontos)',
     '(AVG((nota - 1) * 2.5))',
     'Cada coluna de nota em avaliacoes armazena 1–5. Para relatórios, converte-se para escala 0–10: (valor - 1) * 2.5. A API /avaliacoes/resumo usa essa transformação antes de AVG por unidade.'),
    ('media_geral_pontos_0_10', 'Média geral (0 a 10 pontos)',
     'média das cinco médias por dimensão já convertidas',
     'No resumo, a média geral é a média aritmética das cinco médias por dimensão (cada uma já em 0–10).')
ON CONFLICT (codigo) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    formula_expressao = EXCLUDED.formula_expressao,
    descricao = EXCLUDED.descricao;

-- ---------------------------------------------------------------------------
-- Integridade: notas em avaliacoes devem existir na escala de referência
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_acesso_ref_escala
        FOREIGN KEY (acesso) REFERENCES ref_escala_satisfacao (valor);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_integralidade_ref_escala
        FOREIGN KEY (integralidade) REFERENCES ref_escala_satisfacao (valor);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_longitudinalidade_ref_escala
        FOREIGN KEY (longitudinalidade) REFERENCES ref_escala_satisfacao (valor);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_receptividade_ref_escala
        FOREIGN KEY (receptividade) REFERENCES ref_escala_satisfacao (valor);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE avaliacoes
        ADD CONSTRAINT fk_avaliacoes_atendimento_ref_escala
        FOREIGN KEY (atendimento) REFERENCES ref_escala_satisfacao (valor);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- View v_avaliacoes_analytics: criada/atualizada em 005_status_codigo_numerico.sql (depende de status numérico + ref_status_entidade).
