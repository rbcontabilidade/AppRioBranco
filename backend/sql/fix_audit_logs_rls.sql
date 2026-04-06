-- ===========================================
-- MIGRATION: FIX AUDIT LOGS RLS
-- ===========================================

-- Remove políticas antigas caso existam para evitar conflitos
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Política: Apenas Administradores podem visualizar logs
-- Consideramos administradores aqueles com cargo_id = 1 ou permissao 'admin'
-- O match de usuário é feito tentando cruzar o nome ou o email com o cadastro
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.funcionarios f
            WHERE (f.nome = auth.jwt() -> 'user_metadata' ->> 'full_name' 
                   OR f.nome = auth.jwt() ->> 'email')
            AND (f.cargo_id = 1 OR f.permissao ILIKE 'admin')
        )
    );

-- Política: Qualquer usuário autenticado pode inserir logs (necessário para registrar ações no sistema)
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política para Delete/Update
-- O Supabase já bloqueia por padrão caso não haja política de DELETE/UPDATE
-- Portanto, a tabela permanece append-only para todos.
