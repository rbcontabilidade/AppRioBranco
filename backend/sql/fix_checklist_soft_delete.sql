-- --------------------------------------------------------------------------------
-- MIGRATE: Adicionar is_active na tabela rh_tarefas_checklists
-- MOTIVO: Permitir "soft-deletes" de checklists para não violar foreign keys
-- quando um checklist é apagado no template mas já foi utilizado em histórico de execução.
-- --------------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.rh_tarefas_checklists
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Atualizar todos como ativos (para segurança, embora com default ja aconteceria sozinho)
UPDATE public.rh_tarefas_checklists SET is_active = TRUE WHERE is_active IS NULL;
