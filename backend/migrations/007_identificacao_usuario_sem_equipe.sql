-- Identificação do usuário (CPF/CNS) e fluxo "sem equipe"

ALTER TABLE avaliacoes
  ADD COLUMN IF NOT EXISTS cpf_cns VARCHAR(15),
  ADD COLUMN IF NOT EXISTS nao_deseja_identificar BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sem_equipe BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE avaliacoes ALTER COLUMN equipe_id DROP NOT NULL;
ALTER TABLE avaliacoes ALTER COLUMN acesso DROP NOT NULL;
ALTER TABLE avaliacoes ALTER COLUMN integralidade DROP NOT NULL;
ALTER TABLE avaliacoes ALTER COLUMN longitudinalidade DROP NOT NULL;

ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_acesso_check;
ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_integralidade_check;
ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS avaliacoes_longitudinalidade_check;

ALTER TABLE avaliacoes
  ADD CONSTRAINT avaliacoes_acesso_check
    CHECK (acesso IS NULL OR (acesso BETWEEN 1 AND 5));

ALTER TABLE avaliacoes
  ADD CONSTRAINT avaliacoes_integralidade_check
    CHECK (integralidade IS NULL OR (integralidade BETWEEN 1 AND 5));

ALTER TABLE avaliacoes
  ADD CONSTRAINT avaliacoes_longitudinalidade_check
    CHECK (longitudinalidade IS NULL OR (longitudinalidade BETWEEN 1 AND 5));

-- Avaliações anteriores ao formulário com CPF/CNS: tratar como opt-out de identificação
UPDATE avaliacoes
SET nao_deseja_identificar = TRUE,
    cpf_cns = NULL
WHERE cpf_cns IS NULL;

ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS chk_avaliacoes_identificacao_equipe;

ALTER TABLE avaliacoes
  ADD CONSTRAINT chk_avaliacoes_identificacao_equipe CHECK (
    (
      nao_deseja_identificar = TRUE
      AND cpf_cns IS NULL
    )
    OR (
      nao_deseja_identificar = FALSE
      AND cpf_cns IS NOT NULL
      AND length(cpf_cns) IN (11, 15)
    )
  );

ALTER TABLE avaliacoes DROP CONSTRAINT IF EXISTS chk_avaliacoes_sem_equipe;

ALTER TABLE avaliacoes
  ADD CONSTRAINT chk_avaliacoes_sem_equipe CHECK (
    (
      sem_equipe = TRUE
      AND equipe_id IS NULL
      AND acesso IS NULL
      AND integralidade IS NULL
      AND longitudinalidade IS NULL
    )
    OR (
      sem_equipe = FALSE
      AND equipe_id IS NOT NULL
      AND acesso IS NOT NULL
      AND integralidade IS NOT NULL
      AND longitudinalidade IS NOT NULL
    )
  );

COMMENT ON COLUMN avaliacoes.cpf_cns IS 'CPF (11 dígitos) ou CNS (15 dígitos); NULL quando nao_deseja_identificar.';
COMMENT ON COLUMN avaliacoes.nao_deseja_identificar IS 'Usuário optou por não se identificar.';
COMMENT ON COLUMN avaliacoes.sem_equipe IS 'Avaliação sem vínculo com equipe; dimensões de equipe ficam NULL.';
