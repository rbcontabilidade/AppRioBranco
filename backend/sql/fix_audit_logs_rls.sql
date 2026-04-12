-- ===========================================
-- MIGRATION: FIX AUDIT LOGS RLS (PUBLIC ACCESS)
-- ===========================================
-- Esta migração relaxa as regras de RLS para a tabela de auditoria
-- para permitir que usuários autenticados via backend customizado
-- possam gravar e ler logs mesmo sem uma sessão nativa do Supabase Auth.

-- 1. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public can view audit logs" ON public.audit_logs;

-- 2. Garantir que RLS está habilitado (boa prática)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política: Permitir que QUALQUER UM (incluindo anon) insira logs
-- Isso garante que as ações sejam rastreadas independentemente da sessão.
CREATE POLICY "Public can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (true);

-- 4. Política: Permitir que QUALQUER UM leia os logs
-- ATENÇÃO: Em produção estrita, isso deve ser limitado a administradores.
-- Como o sistema usa auth customizado, esta é a forma de garantir visibilidade imediata.
CREATE POLICY "Public can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (true);

-- 5. Logs permanecem append-only (sem UPDATE ou DELETE)
-- Não criamos políticas para UPDATE/DELETE, garantindo a integridade da trilha.

COMMENT ON TABLE public.audit_logs IS 'Tabela de auditoria com acesso público para INSERT/SELECT devido ao auth customizado.';
