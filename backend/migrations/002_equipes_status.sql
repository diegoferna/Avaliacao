-- Status do estabelecimento (piloto: apenas um ativo conforme DR)
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'inativo';

UPDATE unidades SET status = 'inativo' WHERE status IS NULL OR status = '';

-- Unidade piloto (única ativa no cenário do DR)
INSERT INTO unidades (nome, distrito, tipo, status)
SELECT 'USF Olga de Alaketu Vale do Matatu', 'Matatu', 'USF', 'ativo'
WHERE NOT EXISTS (
  SELECT 1 FROM unidades WHERE nome = 'USF Olga de Alaketu Vale do Matatu'
);

CREATE TABLE IF NOT EXISTS equipes (
    id SERIAL PRIMARY KEY,
    unidade_id INTEGER NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    cor VARCHAR(7) NOT NULL,
    tipo VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'inativo'
);

CREATE INDEX IF NOT EXISTS idx_equipes_unidade_id ON equipes(unidade_id);

-- Equipes ESF de exemplo vinculadas à USF piloto (cores identificadoras)
INSERT INTO equipes (unidade_id, nome, cor, tipo, status)
SELECT u.id, t.nome, t.cor, 'ESF', 'ativo'
FROM unidades u
CROSS JOIN (VALUES
    ('ESF 1', '#1B5E20'),
    ('ESF 2', '#1565C0'),
    ('ESF 3', '#6A1B9A')
) AS t(nome, cor)
WHERE u.nome = 'USF Olga de Alaketu Vale do Matatu'
AND NOT EXISTS (
    SELECT 1 FROM equipes e WHERE e.unidade_id = u.id AND e.nome = t.nome
);

ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS equipe_id INTEGER REFERENCES equipes(id);

UPDATE avaliacoes a
SET equipe_id = (
    SELECT e.id FROM equipes e
    WHERE e.unidade_id = a.unidade_id AND e.status = 'ativo'
    ORDER BY e.id LIMIT 1
)
WHERE a.equipe_id IS NULL;

UPDATE avaliacoes
SET equipe_id = (SELECT id FROM equipes WHERE status = 'ativo' ORDER BY id LIMIT 1)
WHERE equipe_id IS NULL;

ALTER TABLE avaliacoes ALTER COLUMN equipe_id SET NOT NULL;
