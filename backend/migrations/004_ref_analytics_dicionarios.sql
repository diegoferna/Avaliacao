-- Dicionários de referência para analytics: significado dos códigos gravados nas tabelas operacionais.
-- Escala 1–5 (colunas acesso, integralidade, longitudinalidade, receptividade, atendimento em avaliacoes).
-- Dimensões = código da coluna + texto da pergunta no formulário.
-- Status = SMALLINT em unidades.status e equipes.status: 1=ativo, 2=inativo (ref_status_entidade).

-- ---------------------------------------------------------------------------
-- Escala Likert 1–5 (mesma escala para todas as dimensões)
-- pontos_escala_0_a_10: conversão usada em relatórios (valor - 1) * 2.5 → faixa 0 a 10
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_escala_satisfacao (
    valor SMALLINT PRIMARY KEY CHECK (valor BETWEEN 1 AND 5),
    rotulo VARCHAR(100) NOT NULL,
    descricao TEXT,
    pontos_escala_0_a_10 NUMERIC(5, 2) GENERATED ALWAYS AS (ROUND(((valor - 1) * 2.5)::numeric, 2)) STORED
);

COMMENT ON TABLE ref_escala_satisfacao IS
    'Significado dos inteiros 1–5 nas colunas de nota de avaliacoes. Join: avaliacoes.<dimensao> = valor.';

INSERT INTO ref_escala_satisfacao (valor, rotulo, descricao) VALUES
    (1, 'Muito insatisfeito(a)', 'Pior nível na escala de satisfação (valor armazenado = 1).'),
    (2, 'Insatisfeito(a)', 'Valor armazenado = 2.'),
    (3, 'Neutro(a)', 'Valor armazenado = 3.'),
    (4, 'Satisfeito(a)', 'Valor armazenado = 4.'),
    (5, 'Muito satisfeito(a)', 'Melhor nível na escala de satisfação (valor armazenado = 5).')
ON CONFLICT (valor) DO UPDATE SET
    rotulo = EXCLUDED.rotulo,
    descricao = EXCLUDED.descricao;

-- ---------------------------------------------------------------------------
-- Dimensões: nome da coluna em avaliacoes + texto exibido no formulário (versão v1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ref_dimensao_avaliacao (
    codigo VARCHAR(32) PRIMARY KEY,
    nome_exibicao VARCHAR(120) NOT NULL,
    texto_pergunta TEXT NOT NULL,
    ordem SMALLINT NOT NULL,
    versao_formulario VARCHAR(16) NOT NULL DEFAULT 'v1'
);

COMMENT ON TABLE ref_dimensao_avaliacao IS
    'Cada linha corresponde a uma coluna numérica em avaliacoes (acesso, integralidade, …).';

INSERT INTO ref_dimensao_avaliacao (codigo, nome_exibicao, texto_pergunta, ordem, versao_formulario) VALUES
    ('acesso', 'Acesso',
     'Você ficou satisfeito(a) com a facilidade para falar ou ser atendido(a) pela sua equipe quando precisou?',
     1, 'v1'),
    ('integralidade', 'Integralidade',
     'Você ficou satisfeito(a) com as orientações sobre como cuidar da sua saúde fornecidas pela equipe?',
     2, 'v1'),
    ('longitudinalidade', 'Longitudinalidade',
     'Você ficou satisfeito(a) com a confiança para conversar sobre sua vida e sua saúde com a equipe?',
     3, 'v1'),
    ('receptividade', 'Receptividade',
     'Você ficou satisfeito(a) com a forma como foi recebido(a) na unidade de saúde?',
     4, 'v1'),
    ('atendimento', 'Atendimento geral',
     'De forma geral, você ficou satisfeito(a) com o atendimento na unidade de saúde?',
     5, 'v1')
ON CONFLICT (codigo) DO UPDATE SET
    nome_exibicao = EXCLUDED.nome_exibicao,
    texto_pergunta = EXCLUDED.texto_pergunta,
    ordem = EXCLUDED.ordem,
    versao_formulario = EXCLUDED.versao_formulario;

-- ---------------------------------------------------------------------------
-- Status: unidades.status e equipes.status = SMALLINT (1=ativo, 2=inativo)
-- Migra VARCHAR legado ('ativo'/'inativo') da migration 002 quando necessário.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_avaliacoes_analytics CASCADE;

ALTER TABLE unidades DROP CONSTRAINT IF EXISTS fk_unidades_status_ref;
ALTER TABLE equipes DROP CONSTRAINT IF EXISTS fk_equipes_status_ref;
DROP TABLE IF EXISTS ref_status_entidade CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'unidades'
      AND c.column_name = 'status' AND c.data_type = 'character varying'
  ) THEN
    ALTER TABLE unidades ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE unidades ALTER COLUMN status TYPE SMALLINT USING (
      CASE trim(lower(status::text))
        WHEN 'ativo' THEN 1::smallint
        WHEN 'inativo' THEN 2::smallint
        ELSE 2::smallint
      END
    );
    ALTER TABLE unidades ALTER COLUMN status SET DEFAULT 2;
    ALTER TABLE unidades ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'equipes'
      AND c.column_name = 'status' AND c.data_type = 'character varying'
  ) THEN
    ALTER TABLE equipes ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE equipes ALTER COLUMN status TYPE SMALLINT USING (
      CASE trim(lower(status::text))
        WHEN 'ativo' THEN 1::smallint
        WHEN 'inativo' THEN 2::smallint
        ELSE 2::smallint
      END
    );
    ALTER TABLE equipes ALTER COLUMN status SET DEFAULT 2;
    ALTER TABLE equipes ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

-- Sem IF NOT EXISTS: após DROP TABLE acima, recria sempre com SMALLINT.
-- (IF NOT EXISTS deixaria tabela antiga VARCHAR se já existisse — bug comum.)
CREATE TABLE ref_status_entidade (
    codigo SMALLINT PRIMARY KEY CHECK (codigo IN (1, 2)),
    rotulo VARCHAR(80) NOT NULL,
    descricao TEXT NOT NULL,
    aplica_unidade BOOLEAN NOT NULL DEFAULT TRUE,
    aplica_equipe BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE ref_status_entidade IS
    'Códigos numéricos: 1=ativo (aparece no portal), 2=inativo. Colunas unidades.status e equipes.status.';

INSERT INTO ref_status_entidade (codigo, rotulo, descricao, aplica_unidade, aplica_equipe) VALUES
    (1, 'Ativo',
     'Estabelecimento ou equipe elegível para seleção no formulário e em novas avaliações.',
     TRUE, TRUE),
    (2, 'Inativo',
     'Oculto no formulário; registros históricos podem permanecer vinculados.',
     TRUE, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
    rotulo = EXCLUDED.rotulo,
    descricao = EXCLUDED.descricao,
    aplica_unidade = EXCLUDED.aplica_unidade,
    aplica_equipe = EXCLUDED.aplica_equipe;

DO $$
BEGIN
    ALTER TABLE unidades
        ADD CONSTRAINT fk_unidades_status_ref
        FOREIGN KEY (status) REFERENCES ref_status_entidade (codigo);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE equipes
        ADD CONSTRAINT fk_equipes_status_ref
        FOREIGN KEY (status) REFERENCES ref_status_entidade (codigo);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

-- ---------------------------------------------------------------------------
-- View para consultas analíticas com rótulos (evita cinco joins manuais à escala)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_avaliacoes_analytics AS
SELECT
    a.id,
    a.created_at,
    a.unidade_id,
    u.nome AS unidade_nome,
    u.cnes AS unidade_cnes,
    u.status AS unidade_status,
    us.rotulo AS unidade_status_rotulo,
    a.equipe_id,
    e.nome AS equipe_nome,
    e.ine AS equipe_ine,
    e.tipo AS equipe_tipo,
    e.status AS equipe_status,
    es.rotulo AS equipe_status_rotulo,
    a.acesso,
    ea.rotulo AS acesso_rotulo,
    ea.pontos_escala_0_a_10 AS acesso_pontos_0_10,
    a.integralidade,
    ei.rotulo AS integralidade_rotulo,
    ei.pontos_escala_0_a_10 AS integralidade_pontos_0_10,
    a.longitudinalidade,
    el.rotulo AS longitudinalidade_rotulo,
    el.pontos_escala_0_a_10 AS longitudinalidade_pontos_0_10,
    a.receptividade,
    er.rotulo AS receptividade_rotulo,
    er.pontos_escala_0_a_10 AS receptividade_pontos_0_10,
    a.atendimento,
    et.rotulo AS atendimento_rotulo,
    et.pontos_escala_0_a_10 AS atendimento_pontos_0_10,
    a.comentario
FROM avaliacoes a
JOIN unidades u ON u.id = a.unidade_id
JOIN equipes e ON e.id = a.equipe_id
JOIN ref_status_entidade us ON us.codigo = u.status
JOIN ref_status_entidade es ON es.codigo = e.status
JOIN ref_escala_satisfacao ea ON ea.valor = a.acesso
JOIN ref_escala_satisfacao ei ON ei.valor = a.integralidade
JOIN ref_escala_satisfacao el ON el.valor = a.longitudinalidade
JOIN ref_escala_satisfacao er ON er.valor = a.receptividade
JOIN ref_escala_satisfacao et ON et.valor = a.atendimento;

COMMENT ON VIEW v_avaliacoes_analytics IS
    'Avaliações com rótulos da escala, pontos 0–10 por dimensão e rótulos de status (1/2); use para BI/exportação.';
