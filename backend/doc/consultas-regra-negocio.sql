-- =============================================================================
-- Consultas de regra de negócio — Avaliação de Saúde (pgAdmin)
-- Banco: avaliacao_saude (ajuste o schema se necessário: SET search_path TO public;)
--
-- Regras principais do sistema:
--   • status 1 = ativo (aparece no formulário) | 2 = inativo (oculto, mantido no BD)
--   • Formulário: unidade ativa → equipe ativa da mesma unidade → 5 notas (1–5) + comentário
--   • Relatórios: notas convertidas para 0–10 → (valor - 1) * 2.5
--   • Unidade: CNES único; equipe: par (unidade_id, INE) único
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Panorama do schema e dicionários
-- -----------------------------------------------------------------------------
SELECT
    t.table_name,
    obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass, 'pg_class') AS comentario_tabela
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name IN (
      'unidades', 'equipes', 'avaliacoes',
      'ref_status_entidade', 'ref_escala_satisfacao',
      'ref_dimensao_avaliacao', 'ref_metrica_relatorio'
  )
ORDER BY t.table_name;

SELECT codigo, rotulo, descricao, aplica_unidade, aplica_equipe
FROM ref_status_entidade
ORDER BY codigo;

SELECT valor, rotulo, pontos_escala_0_a_10
FROM ref_escala_satisfacao
ORDER BY valor;

SELECT codigo, nome_coluna, nome_exibicao, texto_pergunta
FROM ref_dimensao_avaliacao
ORDER BY codigo;


-- -----------------------------------------------------------------------------
-- 1) Cadastro operacional — o que o formulário enxerga (status = 1)
-- -----------------------------------------------------------------------------
SELECT
    u.id,
    u.cnes,
    u.nome AS estabelecimento,
    u.distrito,
    u.tipo,
    su.rotulo AS status,
    COUNT(e.id) FILTER (WHERE e.status = 1) AS equipes_ativas,
    COUNT(e.id) FILTER (WHERE e.status = 2) AS equipes_inativas
FROM unidades u
JOIN ref_status_entidade su ON su.codigo = u.status
LEFT JOIN equipes e ON e.unidade_id = u.id
GROUP BY u.id, u.cnes, u.nome, u.distrito, u.tipo, su.rotulo
ORDER BY u.distrito, u.nome;

-- Equipes elegíveis por unidade (mesma regra do POST /avaliacoes)
SELECT
    u.id AS unidade_id,
    u.nome AS unidade_nome,
    e.id AS equipe_id,
    e.ine,
    e.nome AS equipe_nome,
    e.tipo,
    e.cor,
    e.cor_label
FROM unidades u
JOIN equipes e ON e.unidade_id = u.id
WHERE u.status = 1
  AND e.status = 1
ORDER BY u.nome, e.nome;


-- -----------------------------------------------------------------------------
-- 2) Integridade e inconsistências de negócio
-- -----------------------------------------------------------------------------
-- Unidades ativas sem nenhuma equipe ativa (usuário não consegue avaliar)
SELECT
    u.id,
    u.cnes,
    u.nome,
    u.distrito
FROM unidades u
WHERE u.status = 1
  AND NOT EXISTS (
      SELECT 1 FROM equipes e
      WHERE e.unidade_id = u.id AND e.status = 1
  )
ORDER BY u.nome;

-- Equipes ativas em unidade inativa (não deveriam aparecer no formulário)
SELECT
    e.id AS equipe_id,
    e.nome AS equipe_nome,
    e.ine,
    u.id AS unidade_id,
    u.nome AS unidade_nome,
    su.rotulo AS status_unidade
FROM equipes e
JOIN unidades u ON u.id = e.unidade_id
JOIN ref_status_entidade su ON su.codigo = u.status
WHERE e.status = 1
  AND u.status = 2
ORDER BY u.nome, e.nome;

-- Avaliações com equipe de outra unidade (viola regra do portal)
SELECT
    a.id AS avaliacao_id,
    a.created_at,
    a.unidade_id,
    u.nome AS unidade_avaliada,
    a.equipe_id,
    e.nome AS equipe_avaliada,
    e.unidade_id AS unidade_da_equipe
FROM avaliacoes a
JOIN unidades u ON u.id = a.unidade_id
JOIN equipes e ON e.id = a.equipe_id
WHERE e.unidade_id <> a.unidade_id
ORDER BY a.created_at DESC;

-- CNES duplicado ou ausente em unidades ativas
SELECT
    cnes,
    COUNT(*) AS qtd,
    STRING_AGG(nome, ' | ' ORDER BY nome) AS nomes
FROM unidades
WHERE cnes IS NOT NULL
GROUP BY cnes
HAVING COUNT(*) > 1;

SELECT id, nome, distrito, tipo
FROM unidades
WHERE status = 1 AND (cnes IS NULL OR TRIM(cnes) = '')
ORDER BY nome;


-- -----------------------------------------------------------------------------
-- 3) Volume e cobertura de avaliações
-- -----------------------------------------------------------------------------
SELECT
    COUNT(*) AS total_avaliacoes,
    COUNT(DISTINCT unidade_id) AS unidades_com_avaliacao,
    COUNT(DISTINCT equipe_id) AS equipes_com_avaliacao,
    MIN(created_at) AS primeira_avaliacao,
    MAX(created_at) AS ultima_avaliacao
FROM avaliacoes;

-- Unidades ativas ainda sem nenhuma avaliação
SELECT
    u.id,
    u.cnes,
    u.nome,
    u.distrito,
    u.tipo
FROM unidades u
WHERE u.status = 1
  AND NOT EXISTS (SELECT 1 FROM avaliacoes a WHERE a.unidade_id = u.id)
ORDER BY u.distrito, u.nome;

-- Avaliações por distrito sanitário
SELECT
    u.distrito,
    COUNT(a.id) AS total_avaliacoes,
    COUNT(DISTINCT u.id) AS unidades_distintas,
    COUNT(DISTINCT a.equipe_id) AS equipes_distintas
FROM unidades u
LEFT JOIN avaliacoes a ON a.unidade_id = u.id
GROUP BY u.distrito
ORDER BY total_avaliacoes DESC NULLS LAST, u.distrito;


-- -----------------------------------------------------------------------------
-- 4) Indicadores — mesma lógica do GET /avaliacoes/resumo (escala 0–10)
-- -----------------------------------------------------------------------------
SELECT
    u.id AS unidade_id,
    u.cnes,
    u.nome,
    u.distrito,
    u.tipo,
    su.rotulo AS status_unidade,
    COUNT(a.id) AS total_avaliacoes,
    ROUND(AVG((a.acesso - 1) * 2.5), 2) AS media_acesso_pontos,
    ROUND(AVG((a.integralidade - 1) * 2.5), 2) AS media_integralidade_pontos,
    ROUND(AVG((a.longitudinalidade - 1) * 2.5), 2) AS media_longitudinalidade_pontos,
    ROUND(AVG((a.receptividade - 1) * 2.5), 2) AS media_receptividade_pontos,
    ROUND(AVG((a.atendimento - 1) * 2.5), 2) AS media_atendimento_pontos,
    ROUND(
        (
            COALESCE(AVG((a.acesso - 1) * 2.5), 0) +
            COALESCE(AVG((a.integralidade - 1) * 2.5), 0) +
            COALESCE(AVG((a.longitudinalidade - 1) * 2.5), 0) +
            COALESCE(AVG((a.receptividade - 1) * 2.5), 0) +
            COALESCE(AVG((a.atendimento - 1) * 2.5), 0)
        ) / 5
    , 2) AS media_geral_pontos
FROM unidades u
JOIN ref_status_entidade su ON su.codigo = u.status
LEFT JOIN avaliacoes a ON a.unidade_id = u.id
GROUP BY u.id, u.cnes, u.nome, u.distrito, u.tipo, su.rotulo
ORDER BY total_avaliacoes DESC, u.nome;

-- Médias por equipe (somente unidades/equipes com avaliação)
SELECT
    u.distrito,
    u.nome AS unidade,
    e.nome AS equipe,
    e.ine,
    e.tipo AS tipo_equipe,
    COUNT(a.id) AS total_avaliacoes,
    ROUND(AVG((a.acesso - 1) * 2.5), 2) AS media_acesso,
    ROUND(AVG((a.integralidade - 1) * 2.5), 2) AS media_integralidade,
    ROUND(AVG((a.longitudinalidade - 1) * 2.5), 2) AS media_longitudinalidade,
    ROUND(AVG((a.receptividade - 1) * 2.5), 2) AS media_receptividade,
    ROUND(AVG((a.atendimento - 1) * 2.5), 2) AS media_atendimento,
    ROUND(
        (
            AVG((a.acesso - 1) * 2.5) +
            AVG((a.integralidade - 1) * 2.5) +
            AVG((a.longitudinalidade - 1) * 2.5) +
            AVG((a.receptividade - 1) * 2.5) +
            AVG((a.atendimento - 1) * 2.5)
        ) / 5
    , 2) AS media_geral_pontos
FROM avaliacoes a
JOIN unidades u ON u.id = a.unidade_id
JOIN equipes e ON e.id = a.equipe_id
GROUP BY u.distrito, u.nome, e.nome, e.ine, e.tipo
ORDER BY media_geral_pontos DESC, total_avaliacoes DESC;


-- -----------------------------------------------------------------------------
-- 5) Detalhe analítico — view oficial do projeto (rótulos + pontos 0–10)
-- -----------------------------------------------------------------------------
SELECT *
FROM v_avaliacoes_analytics
ORDER BY created_at DESC
LIMIT 100;

-- Distribuição de notas por dimensão (valor bruto 1–5)
SELECT 'acesso' AS dimensao, a.acesso AS valor, COUNT(*) AS qtd
FROM avaliacoes a GROUP BY a.acesso
UNION ALL
SELECT 'integralidade', a.integralidade, COUNT(*) FROM avaliacoes a GROUP BY a.integralidade
UNION ALL
SELECT 'longitudinalidade', a.longitudinalidade, COUNT(*) FROM avaliacoes a GROUP BY a.longitudinalidade
UNION ALL
SELECT 'receptividade', a.receptividade, COUNT(*) FROM avaliacoes a GROUP BY a.receptividade
UNION ALL
SELECT 'atendimento', a.atendimento, COUNT(*) FROM avaliacoes a GROUP BY a.atendimento
ORDER BY dimensao, valor;


-- -----------------------------------------------------------------------------
-- 6) Resumo executivo (uma linha — painel rápido no pgAdmin)
-- -----------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM unidades WHERE status = 1) AS unidades_ativas,
    (SELECT COUNT(*) FROM unidades WHERE status = 2) AS unidades_inativas,
    (SELECT COUNT(*) FROM equipes WHERE status = 1) AS equipes_ativas,
    (SELECT COUNT(*) FROM equipes WHERE status = 2) AS equipes_inativas,
    (SELECT COUNT(*) FROM avaliacoes) AS total_avaliacoes,
    (SELECT COUNT(*) FROM unidades u WHERE u.status = 1 AND NOT EXISTS (
        SELECT 1 FROM equipes e WHERE e.unidade_id = u.id AND e.status = 1
    )) AS unidades_ativas_sem_equipe,
    (SELECT COUNT(*) FROM avaliacoes a
     JOIN equipes e ON e.id = a.equipe_id
     WHERE e.unidade_id <> a.unidade_id) AS avaliacoes_equipe_unidade_inconsistente,
    ROUND(AVG((a.acesso - 1) * 2.5), 2) AS media_geral_acesso_0_10,
    ROUND(AVG((a.atendimento - 1) * 2.5), 2) AS media_geral_atendimento_0_10
FROM avaliacoes a;


-- -----------------------------------------------------------------------------
-- 7) Quantidade de avaliações por equipe — distrito BROTAS
-- -----------------------------------------------------------------------------
SELECT
    u.id AS unidade_id,
    u.cnes,
    u.nome AS unidade,
    u.distrito,
    e.id AS equipe_id,
    e.ine,
    e.nome AS equipe,
    e.tipo AS tipo_equipe,
    se.rotulo AS status_equipe,
    COUNT(a.id) AS qtd_avaliacoes
FROM unidades u
JOIN equipes e ON e.unidade_id = u.id
LEFT JOIN avaliacoes a ON a.equipe_id = e.id AND a.unidade_id = u.id
JOIN ref_status_entidade se ON se.codigo = e.status
WHERE UPPER(TRIM(u.distrito)) = 'BROTAS'
GROUP BY
    u.id, u.cnes, u.nome, u.distrito,
    e.id, e.ine, e.nome, e.tipo, se.rotulo
HAVING COUNT(a.id) > 0
ORDER BY u.nome, qtd_avaliacoes DESC, e.nome;
