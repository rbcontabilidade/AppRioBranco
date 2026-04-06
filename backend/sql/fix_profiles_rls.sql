-- Script para garantir permissões de acesso (RLS) na tabela profiles
-- Execute este script no SQL Editor do seu Supabase Dashboard

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Perfis são visíveis por usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;

-- 3. Criar política de LEITURA (SELECT)
-- Permite que qualquer usuário logado veja os perfis (ou apenas o seu próprio)
CREATE POLICY "Perfis são visíveis por usuários autenticados"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 4. Criar política de ATUALIZAÇÃO (UPDATE)
-- Permite que o usuário edite apenas o seu próprio perfil
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- NOTA: Isso garante que o comando .from('profiles').select('*') funcione corretamente no seu sistema.
