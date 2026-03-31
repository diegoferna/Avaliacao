-- Estrutura alinhada ao Excel "EAS E EQUIPES":
-- Estabelecimentos: CNES, nome, STATUS (distrito/tipo opcionais no legado)
-- Equipes: INE por estabelecimento (chave natural CNES + INE), cor (hex + rótulo), tipo e descrição

ALTER TABLE unidades ADD COLUMN IF NOT EXISTS cnes VARCHAR(20);

ALTER TABLE unidades ALTER COLUMN distrito DROP NOT NULL;
ALTER TABLE unidades ALTER COLUMN tipo DROP NOT NULL;

ALTER TABLE equipes ADD COLUMN IF NOT EXISTS ine VARCHAR(20);
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS cod_tipo_equipe INTEGER;
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS desc_tipo_equipe VARCHAR(255);
ALTER TABLE equipes ADD COLUMN IF NOT EXISTS cor_label VARCHAR(50);

-- CNES único (vários NULL permitidos no PostgreSQL). Mesmo INE pode existir em outro CNES; por unidade + INE é único.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_cnes ON unidades(cnes);
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipes_unidade_ine ON equipes(unidade_id, ine);
