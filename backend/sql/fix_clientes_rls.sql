-- Script para garantir permissões de acesso (RLS) na tabela clientes
-- Execute este script no SQL Editor do seu Supabase Dashboard

-- 1. Habilitar RLS (caso não esteja)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Clientes são visíveis por usuários autenticados" ON public.clientes;
DROP POLICY IF EXISTS "Qualquer um pode ler clientes" ON public.clientes;

-- 3. Criar política de LEITURA (SELECT)
-- Permite que qualquer usuário logado (authenticated) veja os clientes
-- Isso é necessário enquanto o backend não estiver usando a SERVICE_ROLE_KEY
CREATE POLICY "Clientes são visíveis por usuários autenticados"
ON public.clientes FOR SELECT
TO authenticated
USING (true);

-- 4. Criar política de INSERÇÃO/EDIÇÃO (Opcional, mas recomendado para o Admin)
CREATE POLICY "Usuários autenticados podem inserir/editar clientes"
ON public.clientes FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- NOTA: Após rodar isso, a lista de clientes deve aparecer se você estiver logado.
