-- Migration: Professionalize cargos_permissoes table
-- Description: Adds uniqueness constraint to nome_cargo and ensures updated_at triggers.

-- 1. Adicionar constraint de unicidade para nome_cargo
-- Nota: Se existirem nomes duplicados, esta migration falahará. 
-- O ideal é que o usuário resolva duplicatas antes ou usemos um script de limpeza.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cargos_permissoes_nome_cargo_key') THEN
        ALTER TABLE public.cargos_permissoes ADD CONSTRAINT cargos_permissoes_nome_cargo_key UNIQUE (nome_cargo);
    END IF;
END $$;

-- 2. Garantir que updated_at seja atualizado automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para cargos_permissoes
DROP TRIGGER IF EXISTS tr_cargos_permissoes_updated_at ON public.cargos_permissoes;
CREATE TRIGGER tr_cargos_permissoes_updated_at
    BEFORE UPDATE ON public.cargos_permissoes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Criar trigger para cargo_niveis (reforço)
DROP TRIGGER IF EXISTS tr_cargo_niveis_updated_at ON public.cargo_niveis;
CREATE TRIGGER tr_cargo_niveis_updated_at
    BEFORE UPDATE ON public.cargo_niveis
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
