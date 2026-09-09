-- Textos das perguntas, local do atendimento e ajuste operacional de unidades/equipes

-- 1) Novos textos das dimensões (ref + alinhamento com formulário)
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

-- 2) Local do atendimento (obrigatório em novas avaliações via app; NULL em registros antigos)
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

COMMENT ON COLUMN avaliacoes.local_atendimento IS
  'Local do atendimento informado no bloco Identificação do atendimento.';

-- 3) Habilitar unidade CNES 0006963 e equipes INE 211206/211192/211176/211184
UPDATE unidades
SET status = 1
WHERE TRIM(cnes) = '0006963';

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
  AND TRIM(u.cnes) = '0006963'
  AND TRIM(e.ine) IN ('211206', '211192', '211176', '211184');

-- 4) Desabilitar equipes ativas das unidades CNES 0006807 e 3015785
UPDATE equipes e
SET status = 2
FROM unidades u
WHERE e.unidade_id = u.id
  AND TRIM(u.cnes) IN ('0006807', '3015785')
  AND e.status = 1;
