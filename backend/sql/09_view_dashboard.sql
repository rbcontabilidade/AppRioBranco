-- =========================================================================
-- VISÃO DO DASHBOARD (RPC)
-- Objetivo: Retornar de forma consolidada todas as tarefas pendentes/ativas
-- de uma competência aberta para o painel operacional.
-- =========================================================================

CREATE OR REPLACE FUNCTION get_dashboard_tarefas(p_funcionario_id INT)
RETURNS TABLE (
    execution_id INT,
    client_id INT,
    client_name VARCHAR,
    process_id INT,
    process_name VARCHAR,
    step_id INT,
    task_name VARCHAR,
    assigned_role VARCHAR,
    my_step_order INT,
    current_step_order INT,
    total_steps INT,
    previous_routine_name VARCHAR,
    status VARCHAR
) AS $$
DECLARE
    v_comp_aberta_id INT;
BEGIN
    -- 1. Identificar qual a competência atual aberta
    SELECT id INTO v_comp_aberta_id FROM rh_competencias WHERE status = 'ABERTA' LIMIT 1;

    IF v_comp_aberta_id IS NULL THEN
        RETURN; -- Nenhuma competência aberta
    END IF;

    -- 2. Retornar os dados consolidados das Tarefas da Execucao dessa competencia
    RETURN QUERY
    SELECT 
        ep.id AS execution_id,
        ep.cliente_id AS client_id,
        c.nome AS client_name,
        ep.processo_tem_id AS process_id,
        p.nome AS process_name,
        et.id AS step_id,
        t.titulo AS task_name,
        t.role AS assigned_role,
        et.ordem AS my_step_order,
        ep.etapa_atual AS current_step_order,
        ep.total_etapas AS total_steps,
        (SELECT titulo FROM processos_mensais_tarefas WHERE id = et.dependente_de_id) AS previous_routine_name,
        et.status AS status
    FROM rh_execucao_tarefas et
    JOIN rh_execucao_processos ep ON et.execucao_processo_id = ep.id
    JOIN processos_mensais p ON ep.processo_tem_id = p.id
    JOIN processos_mensais_tarefas t ON et.tarefa_tem_id = t.id
    JOIN clientes c ON ep.cliente_id = c.id
    WHERE ep.competencia_id = v_comp_aberta_id
      AND et.status != 'CONCLUIDA'
      AND (
          -- Condição de acesso: O usuário faz parte dos responsáveis ou a tarefa é pro Cargo dele
          EXISTS (
              SELECT 1 FROM execucao_tarefas_responsaveis etr 
              WHERE etr.execucao_tarefa_id = et.id AND etr.funcionario_id = p_funcionario_id
          )
          -- OU não tem responsáveis específicos, mas o cargo bate (será filtrado no frontend tbm pelo role)
          OR NOT EXISTS (
              SELECT 1 FROM execucao_tarefas_responsaveis etr 
              WHERE etr.execucao_tarefa_id = et.id
          )
      )
    ORDER BY ep.etapa_atual ASC, et.ordem ASC;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------
-- Função RPC para buscar KPIs gerais da Competência Aberta
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS TABLE (
    total INT,
    pendentes INT,
    concluidos INT,
    atrasados INT
) AS $$
DECLARE
    v_comp_aberta_id INT;
    v_total INT := 0;
    v_concluidos INT := 0;
    v_pendentes INT := 0;
    v_atrasados INT := 0;
BEGIN
    SELECT id INTO v_comp_aberta_id FROM rh_competencias WHERE status = 'ABERTA' LIMIT 1;

    IF v_comp_aberta_id IS NOT NULL THEN
        -- Conta Tarefas Totais
        SELECT COUNT(id) INTO v_total FROM rh_execucao_tarefas 
        WHERE execucao_processo_id IN (SELECT id FROM rh_execucao_processos WHERE competencia_id = v_comp_aberta_id);

        -- Conta Concluidas
        SELECT COUNT(id) INTO v_concluidos FROM rh_execucao_tarefas 
        WHERE status = 'CONCLUIDA' 
          AND execucao_processo_id IN (SELECT id FROM rh_execucao_processos WHERE competencia_id = v_comp_aberta_id);

        -- Conta Pendentes
        SELECT COUNT(id) INTO v_pendentes FROM rh_execucao_tarefas 
        WHERE status != 'CONCLUIDA' 
          AND execucao_processo_id IN (SELECT id FROM rh_execucao_processos WHERE competencia_id = v_comp_aberta_id);

        -- (Opcional: Atrasados baseado no SLA)
        v_atrasados := 0; 
    END IF;

    RETURN QUERY SELECT v_total, v_pendentes, v_concluidos, v_atrasados;
END;
$$ LANGUAGE plpgsql;
