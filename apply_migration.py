import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

sql = """
-- 1. Adicionar constraint de unicidade para nome_cargo
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

-- 4. Criar trigger para cargo_niveis
DROP TRIGGER IF EXISTS tr_cargo_niveis_updated_at ON public.cargo_niveis;
CREATE TRIGGER tr_cargo_niveis_updated_at
    BEFORE UPDATE ON public.cargo_niveis
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
"""

def apply_migration():
    try:
        res = supabase.rpc("exec_sql", {"query": sql}).execute()
        print("MIGRATION_SUCCESS")
    except Exception as e:
        print(f"MIGRATION_FAILED: {e}")

if __name__ == "__main__":
    apply_migration()
