-- ===========================================
-- MIGRATION: CRIAR TABELA DE AUDITORIA (LOGS)
-- ===========================================

-- 1. Criar a tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Dados do Usuário
    user_id UUID, -- Referência ao auth.users (opcional se for ação do sistema)
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_role VARCHAR(100),
    
    -- Contexto da Ação
    action_type VARCHAR(50) NOT NULL, -- login, create, update, delete, etc.
    module VARCHAR(100) NOT NULL,      -- clientes, processos, permissões, etc.
    
    -- Entidade Afetada
    entity_type VARCHAR(100),         -- cliente, tarefa, cargo, etc.
    entity_id VARCHAR(255),
    entity_label VARCHAR(255),        -- Nome amigável da entidade (ex: Nome do Cliente)
    
    -- Detalhes da Mudança
    description TEXT,
    old_values JSONB DEFAULT '{}'::jsonb,
    new_values JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Informações Técnicas
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'success', -- success, failure, warning
    severity VARCHAR(50) DEFAULT 'low'     -- low, medium, high, critical
);

-- 2. Configurar RLS (Row Level Security)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Apenas Administradores podem visualizar logs
-- Nota: Ajuste a lógica de verificação de admin conforme o seu sistema de permissões atual
-- Baseado na tabela public.funcionarios e public.cargos_permissoes
-- DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.funcionarios f
            WHERE f.nome = auth.jwt() -> 'user_metadata' ->> 'full_name' 
            AND (f.cargo_id = 1 OR f.permissao ILIKE 'admin')
        )
    );

-- Política: Qualquer usuário autenticado pode inserir logs (para registrar suas próprias ações)
-- DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política: Logs são append-only (sem UPDATE ou DELETE por usuários normais)
-- O Supabase por padrão não permite se não houver política explícita.

-- 3. Criar Índices para Performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (severity);

-- Comentário na tabela
COMMENT ON TABLE public.audit_logs IS 'Tabela de trilha de auditoria para rastreamento de ações sensíveis no sistema.';
