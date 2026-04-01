-- ref_dimensao_avaliacao: PK codigo = SMALLINT 1–5 (não mais texto tipo 'acesso').
-- nome_coluna identifica a coluna em avaliacoes (acesso, integralidade, …).
-- Sem FK a partir de avaliacoes (as notas continuam nas colunas existentes); tabela só documenta / BI.

DROP TABLE IF EXISTS ref_dimensao_avaliacao CASCADE;

CREATE TABLE ref_dimensao_avaliacao (
    codigo SMALLINT PRIMARY KEY CHECK (codigo BETWEEN 1 AND 5),
    nome_coluna VARCHAR(32) NOT NULL,
    nome_exibicao VARCHAR(120) NOT NULL,
    texto_pergunta TEXT NOT NULL,
    versao_formulario VARCHAR(16) NOT NULL DEFAULT 'v1',
    CONSTRAINT uq_ref_dimensao_nome_coluna UNIQUE (nome_coluna)
);

COMMENT ON TABLE ref_dimensao_avaliacao IS
    'Dimensões do formulário: codigo 1–5; nome_coluna amarra à coluna de nota em avaliacoes.';

INSERT INTO ref_dimensao_avaliacao (codigo, nome_coluna, nome_exibicao, texto_pergunta, versao_formulario) VALUES
    (1, 'acesso', 'Acesso',
     'Você ficou satisfeito(a) com a facilidade para falar ou ser atendido(a) pela sua equipe quando precisou?',
     'v1'),
    (2, 'integralidade', 'Integralidade',
     'Você ficou satisfeito(a) com as orientações sobre como cuidar da sua saúde fornecidas pela equipe?',
     'v1'),
    (3, 'longitudinalidade', 'Longitudinalidade',
     'Você ficou satisfeito(a) com a confiança para conversar sobre sua vida e sua saúde com a equipe?',
     'v1'),
    (4, 'receptividade', 'Receptividade',
     'Você ficou satisfeito(a) com a forma como foi recebido(a) na unidade de saúde?',
     'v1'),
    (5, 'atendimento', 'Atendimento geral',
     'De forma geral, você ficou satisfeito(a) com o atendimento na unidade de saúde?',
     'v1')
ON CONFLICT (codigo) DO UPDATE SET
    nome_coluna = EXCLUDED.nome_coluna,
    nome_exibicao = EXCLUDED.nome_exibicao,
    texto_pergunta = EXCLUDED.texto_pergunta,
    versao_formulario = EXCLUDED.versao_formulario;
