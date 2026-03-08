-- Migration: Add `cargo_niveis` table for Roles and Permissions expand/collapse hierarchy
-- Description: Creates the table to store levels/steps associated with a specific role.

CREATE TABLE IF NOT EXISTS public.cargo_niveis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cargo_id UUID NOT NULL REFERENCES public.cargos_permissoes(id) ON DELETE CASCADE,
    nome_nivel TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for faster lookups by cargo_id
CREATE INDEX IF NOT EXISTS idx_cargo_niveis_cargo_id ON public.cargo_niveis(cargo_id);

-- Optional Row Level Security (RLS) setup mapping (If using RLS)
ALTER TABLE public.cargo_niveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to cargo_niveis"
    ON public.cargo_niveis
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- End of migration
