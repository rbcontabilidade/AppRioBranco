-- Migração para Atribuição Inteligente de Funcionários
-- Foco em perfis de usuários e refinamento das etapas de processo

-- 1. Tabela de Perfis de Usuários (Public Side)
-- Esta tabela vincula os metadados do RBapp ao auth.users do Supabase
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Analista Fiscal', -- 'Fiscal', 'Gerente', 'DP', 'Contábil', etc.
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS nos perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de acesso
DROP POLICY IF EXISTS "Perfis são visíveis por usuários autenticados" ON public.profiles;
CREATE POLICY "Perfis são visíveis por usuários autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Usuários podem editar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem editar seus próprios perfis" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. Atualização das Etapas de Processo (processo_rotinas)
-- Adicionando suporte para atribuição direta de múltiplos usuários

DO $$ 
BEGIN 
    -- Adicionar coluna responsible_users (Array de UUIDs para os perfis responsáveis)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processo_rotinas' AND column_name='responsible_users') THEN
        ALTER TABLE processo_rotinas ADD COLUMN responsible_users UUID[] DEFAULT '{}';
        COMMENT ON COLUMN processo_rotinas.responsible_users IS 'Lista de IDs de Usuários (profiles.id) responsáveis especificamente por esta rotina';
    END IF;

    -- Se existisse role_responsible, removeríamos aqui. 
    -- Como a tabela 'processo_rotinas' original (visto no script 02) não tinha, 
    -- apenas garantimos que a estrutura de 'ordem' e 'dias_prazo' está correta para o novo modal.
END $$;

-- 3. Inserção de Dados Dummy (Mocks) para Testes (Opcional se já houver usuários)
-- Nota: Como auth.users é gerido pelo Supabase Auth, o correto seria criar os usuários via Dashboard/API.
-- Abaixo um exemplo de como popular se você já tiver os UUIDs.
/*
INSERT INTO public.profiles (id, name, role) VALUES 
('uuid-exemplo-1', 'João Fiscal', 'Fiscal'),
('uuid-exemplo-2', 'Maria Gerente', 'Gerente'),
('uuid-exemplo-3', 'Lucas DP', 'DP')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
*/
