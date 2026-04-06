-- View para calcular o progresso de cada execução de processo
-- Retorna o total de tarefas e o número de tarefas concluídas por execução
CREATE OR REPLACE VIEW rh_view_processo_progresso AS
SELECT 
    execucao_processo_id,
    COUNT(*) AS total_steps,
    COUNT(*) FILTER (WHERE status = 'CONCLUIDA') AS completed_steps
FROM 
    rh_execucao_tarefas
GROUP BY 
    execucao_processo_id;
