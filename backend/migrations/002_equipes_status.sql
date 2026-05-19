-- Estrutura de equipes e vínculo em avaliações.
-- Não insere unidades/equipes de exemplo: cadastro real via seed:eas ou sync:unidades.

DO $$
DECLARE
  u_dt text;
BEGIN
  SELECT c.data_type INTO u_dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'unidades'
    AND c.column_name = 'status';

  IF u_dt IS NULL THEN
    ALTER TABLE unidades ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'inativo';
    u_dt := 'character varying';
  END IF;

  IF u_dt = 'character varying' THEN
    UPDATE unidades
    SET status = 'inativo'
    WHERE status IS NULL OR trim(status::text) = '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS equipes (
    id SERIAL PRIMARY KEY,
    unidade_id INTEGER NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    cor VARCHAR(7) NOT NULL,
    tipo VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'inativo'
);

CREATE INDEX IF NOT EXISTS idx_equipes_unidade_id ON equipes(unidade_id);

ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS equipe_id INTEGER REFERENCES equipes(id);

DO $$
DECLARE
  e_dt text;
BEGIN
  SELECT c.data_type INTO e_dt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'equipes'
    AND c.column_name = 'status';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'avaliacoes' AND column_name = 'equipe_id'
  ) THEN
    RETURN;
  END IF;

  IF e_dt IS NULL OR e_dt = 'character varying' THEN
    UPDATE avaliacoes a
    SET equipe_id = (
        SELECT e.id FROM equipes e
        WHERE e.unidade_id = a.unidade_id AND e.status::text = 'ativo'
        ORDER BY e.id LIMIT 1
    )
    WHERE a.equipe_id IS NULL;

    UPDATE avaliacoes
    SET equipe_id = (
        SELECT id FROM equipes WHERE status::text = 'ativo' ORDER BY id LIMIT 1
    )
    WHERE equipe_id IS NULL;
  ELSIF e_dt IN ('smallint', 'integer') THEN
    UPDATE avaliacoes a
    SET equipe_id = (
        SELECT e.id FROM equipes e
        WHERE e.unidade_id = a.unidade_id AND e.status = 1
        ORDER BY e.id LIMIT 1
    )
    WHERE a.equipe_id IS NULL;

    UPDATE avaliacoes
    SET equipe_id = (
        SELECT id FROM equipes WHERE status = 1 ORDER BY id LIMIT 1
    )
    WHERE equipe_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM avaliacoes WHERE equipe_id IS NULL) THEN
    ALTER TABLE avaliacoes ALTER COLUMN equipe_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;
