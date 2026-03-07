-- =========================================================================
-- OPTIMIZE PERFORMANCE ISSUE #3: MISSING DATABASE INDEXES
-- Objetivo: Eliminar Full Table Scans em filtros de Funcionário e Competência
-- =========================================================================

-- 1. Acelera consultas de tarefas filtradas por funcionário (Dashboard Operacional)
-- Nota: No esquema atual, o funcionário está vinculado via rh_execucao_tarefas_responsaveis
CREATE INDEX IF NOT EXISTS idx_exec_resp_funcionario ON rh_execucao_tarefas_responsaveis(funcionario_id);

-- 2. Acelera filtros por Competência (Visualização de Histórico e Painel Admin)
CREATE INDEX IF NOT EXISTS idx_exec_competencia ON rh_execucao_processos(competencia_id);

-- 3. Otimiza a busca de definições de tarefas por processo (Templates)
CREATE INDEX IF NOT EXISTS idx_tarefas_processo ON rh_tarefas(processo_id);

-- 4. ÍNDICE EXTRA: Acelera o JOIN entre Processo e suas Tarefas na execução (Crítico p/ Performance)
CREATE INDEX IF NOT EXISTS idx_exec_tarefas_processo_join ON rh_execucao_tarefas(execucao_processo_id);

-- =========================================================================
-- VERIFICAÇÃO COM EXPLAIN ANALYZE (Use no SQL Editor do Supabase)
-- =========================================================================
-- EXPLAIN ANALYZE SELECT * FROM rh_execucao_processos WHERE competencia_id = 1;
-- EXPLAIN ANALYZE SELECT * FROM rh_execucao_tarefas_responsaveis WHERE funcionario_id = 1;
-- EXPLAIN ANALYZE SELECT * FROM rh_tarefas WHERE processo_id = 1;
