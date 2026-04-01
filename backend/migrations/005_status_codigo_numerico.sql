-- Converte unidades.status e equipes.status de texto ('ativo' / 'inativo') para SMALLINT:
--   1 = ativo (visível no formulário), 2 = inativo.
-- Recria ref_status_entidade com codigo numérico, FKs e a view v_avaliacoes_analytics.
-- Idempotente: se status já for smallint, só sincroniza ref + view + constraints.

DROP VIEW IF EXISTS v_avaliacoes_analytics;

ALTER TABLE unidades DROP CONSTRAINT IF EXISTS fk_unidades_status_ref;
ALTER TABLE equipes DROP CONSTRAINT IF EXISTS fk_equipes_status_ref;

DO $$
DECLARE
  u_dt text;
  e_dt text;
BEGIN
  SELECT c.data_type INTO u_dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'unidades' AND c.column_name = 'status';

  IF u_dt = 'character varying' THEN
    ALTER TABLE unidades ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE unidades
      ALTER COLUMN status TYPE SMALLINT
      USING (
        CASE
          WHEN lower(trim(status::text)) = 'ativo' THEN 1::smallint
          WHEN lower(trim(status::text)) = 'inativo' THEN 2::smallint
          ELSE 2::smallint
        END
      );
    ALTER TABLE unidades ALTER COLUMN status SET DEFAULT 2;
  END IF;

  SELECT c.data_type INTO e_dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'equipes' AND c.column_name = 'status';

  IF e_dt = 'character varying' THEN
    ALTER TABLE equipes ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE equipes
      ALTER COLUMN status TYPE SMALLINT
      USING (
        CASE
          WHEN lower(trim(status::text)) = 'ativo' THEN 1::smallint
          WHEN lower(trim(status::text)) = 'inativo' THEN 2::smallint
          ELSE 2::smallint
        END
      );
    ALTER TABLE equipes ALTER COLUMN status SET DEFAULT 2;
  END IF;
END $$;

DROP TABLE IF EXISTS ref_status_entidade CASCADE;

CREATE TABLE ref_status_entidade (
    codigo SMALLINT PRIMARY KEY CHECK (codigo IN (1, 2)),
    rotulo VARCHAR(80) NOT NULL,
    descricao TEXT NOT NULL,
    aplica_unidade BOOLEAN NOT NULL DEFAULT TRUE,
    aplica_equipe BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE ref_status_entidade IS
    '1 = ativo (formulário), 2 = inativo. FK em unidades.status e equipes.status.';

INSERT INTO ref_status_entidade (codigo, rotulo, descricao, aplica_unidade, aplica_equipe) VALUES
    (1, 'Ativo',
     'Estabelecimento ou equipe elegível para seleção no formulário e em novas avaliações.',
     TRUE, TRUE),
    (2, 'Inativo',
     'Oculto no formulário; registros históricos podem permanecer vinculados.',
     TRUE, TRUE);

DO $$
BEGIN
  ALTER TABLE unidades DROP CONSTRAINT chk_unidades_status;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE unidades ADD CONSTRAINT chk_unidades_status CHECK (status IN (1, 2));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE equipes DROP CONSTRAINT chk_equipes_status;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE equipes ADD CONSTRAINT chk_equipes_status CHECK (status IN (1, 2));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

CREATE OR REPLACE VIEW v_avaliacoes_analytics AS
SELECT
    a.id,
    a.created_at,
    a.unidade_id,
    u.nome AS unidade_nome,
    u.cnes AS unidade_cnes,
    u.status AS unidade_status,
    su.rotulo AS unidade_status_rotulo,
    a.equipe_id,
    e.nome AS equipe_nome,
    e.ine AS equipe_ine,
    e.tipo AS equipe_tipo,
    e.status AS equipe_status,
    se.rotulo AS equipe_status_rotulo,
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
JOIN ref_status_entidade su ON su.codigo = u.status
JOIN ref_status_entidade se ON se.codigo = e.status
JOIN ref_escala_satisfacao ea ON ea.valor = a.acesso
JOIN ref_escala_satisfacao ei ON ei.valor = a.integralidade
JOIN ref_escala_satisfacao el ON el.valor = a.longitudinalidade
JOIN ref_escala_satisfacao er ON er.valor = a.receptividade
JOIN ref_escala_satisfacao et ON et.valor = a.atendimento;

COMMENT ON VIEW v_avaliacoes_analytics IS
    'Avaliações com rótulos; unidade_status/equipe_status = 1 ou 2; *_rotulo = texto do dicionário.';
