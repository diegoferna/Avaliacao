-- Correção operacional: CNES sem zeros à esquerda + garantir textos/coluna da 008
-- Motivo: a 008 pode ter sido aplicada buscando '0006963'/'0006807', enquanto o cadastro
-- usa '6963'/'6807'. Esta migration é idempotente.

-- 1) Textos das perguntas (v2)
UPDATE ref_dimensao_avaliacao SET
  texto_pergunta = CASE codigo
    WHEN 1 THEN 'Quanto você está satisfeito(a) com a possibilidade de conseguir atendimento com a equipe quando precisa?'
    WHEN 2 THEN 'Quanto você está satisfeito(a) com a forma como a equipe cuida da sua saúde?'
    WHEN 3 THEN 'Quanto você está satisfeito(a) com a proximidade que tem com a equipe para falar sobre sua saúde?'
    WHEN 4 THEN 'Quanto você está satisfeito(a) com a forma como foi recebido(a) na unidade de saúde?'
    WHEN 5 THEN 'De forma geral, quanto você está satisfeito(a) com o atendimento nesta unidade de saúde?'
    ELSE texto_pergunta
  END,
  versao_formulario = 'v2'
WHERE codigo BETWEEN 1 AND 5;

-- 2) Garantir coluna local_atendimento
ALTER TABLE avaliacoes
  ADD COLUMN IF NOT EXISTS local_atendimento VARCHAR(80);

DO $$
BEGIN
  ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS chk_avaliacoes_local_atendimento;
  ALTER TABLE avaliacoes
    ADD CONSTRAINT chk_avaliacoes_local_atendimento CHECK (
      local_atendimento IS NULL
      OR local_atendimento IN (
        'Consultório Médico/Enfermagem',
        'Consultório Odontológico',
        'Sala de Vacina',
        'Sala de Curativo',
        'Sala de Procedimentos',
        'Recepção',
        'Atividade Coletiva',
        'Farmácia'
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Habilitar USF ILHA AMARELA (CNES 6963 / 0006963)
UPDATE unidades
SET status = 1
WHERE REGEXP_REPLACE(TRIM(COALESCE(cnes, '')), '^0+', '') = '6963';

-- 4) Ativar equipes 76–79 com cor cinza e rótulo no formato de cor_label
UPDATE equipes e
SET
  status = 1,
  cor = '#9E9E9E',
  cor_label = CASE TRIM(e.ine)
    WHEN '211206' THEN 'Equipe 78'
    WHEN '211192' THEN 'Equipe 79'
    WHEN '211176' THEN 'Equipe 77'
    WHEN '211184' THEN 'Equipe 76'
    ELSE e.cor_label
  END
FROM unidades u
WHERE e.unidade_id = u.id
  AND REGEXP_REPLACE(TRIM(COALESCE(u.cnes, '')), '^0+', '') = '6963'
  AND TRIM(e.ine) IN ('211206', '211192', '211176', '211184');

-- 5) Desabilitar equipes ativas das unidades CNES 6807 / 0006807 e 3015785
UPDATE equipes e
SET status = 2
FROM unidades u
WHERE e.unidade_id = u.id
  AND REGEXP_REPLACE(TRIM(COALESCE(u.cnes, '')), '^0+', '') IN ('6807', '3015785')
  AND e.status = 1;
