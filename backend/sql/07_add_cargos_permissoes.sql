-- ===========================================
-- MIGRATION: ADICIONAR CARGOS E PERMISSÕES
-- ===========================================

-- 1. Criar a tabela de Cargos e Permissões
CREATE TABLE IF NOT EXISTS public.cargos_permissoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL, -- Ex: Financeiro, Gerente DP, etc.
    nivel VARCHAR(50) NOT NULL, -- Ex: 'operacional', 'gerente', 'admin'
    permite_excluir BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inserir os cargos padrões baseados no que já existia no código
INSERT INTO public.cargos_permissoes (id, nome, nivel, permite_excluir)
VALUES 
    (1, 'Administrador Geral', 'admin', true),
    (2, 'Gerente Fiscal', 'gerente', false),
    (3, 'Gerente DP', 'gerente', false),
    (4, 'Gerente Contábil', 'gerente', false),
    (5, 'Auxiliar Fiscal', 'operacional', false),
    (6, 'Analista Contábil', 'operacional', false),
    (7, 'Assistente Administrativo', 'operacional', false),
    (8, 'Operador de Atendimento', 'operacional', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Adicionar a coluna cargo_id na tabela funcionarios
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS cargo_id INTEGER REFERENCES public.cargos_permissoes(id) ON DELETE SET NULL;

-- 4. Migração de Dados (Update em Lote)
-- Mapear os cargos existentes (textuais) para IDs fixos da nova tabela
UPDATE public.funcionarios
SET cargo_id = 1 WHERE permissao ILIKE 'admin' AND cargo_id IS NULL;

UPDATE public.funcionarios
SET cargo_id = 2 WHERE permissao ILIKE 'gerente' AND cargo_id IS NULL;

UPDATE public.funcionarios
SET cargo_id = 5 WHERE permissao ILIKE 'operacional' AND cargo_id IS NULL;

-- 5. (Opcional Futuro) Remover a coluna antiga
-- ALTER TABLE public.funcionarios DROP COLUMN permissao;
