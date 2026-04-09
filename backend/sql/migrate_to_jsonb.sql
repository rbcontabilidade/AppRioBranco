-- MIGRATION: CAST COLUMNS TO NATIVE JSONB (ULTIMATE SAFE CAST VERSION)

-- PASSO 1: Sanitize Data (Limpa lixo)
UPDATE clientes 
SET rotinas_selecionadas = '[]' 
WHERE rotinas_selecionadas IS NULL OR btrim(rotinas_selecionadas::text) = '' OR rotinas_selecionadas::text !~ '^[\[\{].*[\]\}]$';

UPDATE clientes 
SET processos_selecionados = '[]' 
WHERE processos_selecionados IS NULL OR btrim(processos_selecionados::text) = '' OR processos_selecionados::text !~ '^[\[\{].*[\]\}]$';

UPDATE cargos_permissoes 
SET telas_permitidas = '[]' 
WHERE telas_permitidas IS NULL OR btrim(telas_permitidas::text) = '' OR telas_permitidas::text !~ '^[\[\{].*[\]\}]$';

UPDATE rotinas_base 
SET checklist_padrao = '[]' 
WHERE checklist_padrao IS NULL OR btrim(checklist_padrao::text) = '' OR checklist_padrao::text !~ '^[\[\{].*[\]\}]$';

UPDATE execucoes 
SET subitems = '[]' 
WHERE subitems IS NULL OR btrim(subitems::text) = '' OR subitems::text !~ '^[\[\{].*[\]\}]$';

UPDATE global_config 
SET menu_order = '[]' 
WHERE menu_order IS NULL OR btrim(menu_order::text) = '' OR menu_order::text !~ '^[\[\{].*[\]\}]$';


-- PASSO 2: Cast Definitivo
-- Removemos as "Defaults" antigas em formato de texto para evitar que o Postgres acuse conflito
-- de tipos ao tentar migrar a restrição. Em seguida viramos JSONB nativo, e reaplicamos o Default em JSONB puro.

ALTER TABLE clientes ALTER COLUMN rotinas_selecionadas DROP DEFAULT;
ALTER TABLE clientes ALTER COLUMN rotinas_selecionadas TYPE jsonb USING rotinas_selecionadas::text::jsonb;
ALTER TABLE clientes ALTER COLUMN rotinas_selecionadas SET DEFAULT '[]'::jsonb;

ALTER TABLE clientes ALTER COLUMN processos_selecionados DROP DEFAULT;
ALTER TABLE clientes ALTER COLUMN processos_selecionados TYPE jsonb USING processos_selecionados::text::jsonb;
ALTER TABLE clientes ALTER COLUMN processos_selecionados SET DEFAULT '[]'::jsonb;

ALTER TABLE cargos_permissoes ALTER COLUMN telas_permitidas DROP DEFAULT;
ALTER TABLE cargos_permissoes ALTER COLUMN telas_permitidas TYPE jsonb USING telas_permitidas::text::jsonb;
ALTER TABLE cargos_permissoes ALTER COLUMN telas_permitidas SET DEFAULT '[]'::jsonb;

ALTER TABLE rotinas_base ALTER COLUMN checklist_padrao DROP DEFAULT;
ALTER TABLE rotinas_base ALTER COLUMN checklist_padrao TYPE jsonb USING checklist_padrao::text::jsonb;
ALTER TABLE rotinas_base ALTER COLUMN checklist_padrao SET DEFAULT '[]'::jsonb;

ALTER TABLE execucoes ALTER COLUMN subitems DROP DEFAULT;
ALTER TABLE execucoes ALTER COLUMN subitems TYPE jsonb USING subitems::text::jsonb;
ALTER TABLE execucoes ALTER COLUMN subitems SET DEFAULT '[]'::jsonb;

ALTER TABLE global_config ALTER COLUMN menu_order DROP DEFAULT;
ALTER TABLE global_config ALTER COLUMN menu_order TYPE jsonb USING menu_order::text::jsonb;
ALTER TABLE global_config ALTER COLUMN menu_order SET DEFAULT '[]'::jsonb;
