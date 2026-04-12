-- Script para adicionar o campo de ÚLTIMO LOGIN à tabela de funcionários
-- AppRioBranco - Sistema de Auditoria Profissional

ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.funcionarios.last_login IS 'Registra a data e hora do último login bem-sucedido na plataforma.';
