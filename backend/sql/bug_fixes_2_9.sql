-- =========================================================================
-- BUG FIXES #2 & #9: INTEGRIDADE DE COMPETÊNCIAS E EXCLUSÃO ATÔMICA
-- =========================================================================

-- 1. Atualiza gerador_nova_competencia para impedir reabertura de meses FECHADOS
CREATE OR REPLACE FUNCTION public.gerador_nova_competencia(
    v_mes INTEGER,
    v_ano INTEGER
) RETURNS INTEGER AS $$
DECLARE
    nova_comp_id INTEGER;
    v_status_atual VARCHAR(50);
    v_processo RECORD;
    v_exec_proc_id INTEGER;
    v_tarefa RECORD;
    v_exec_tarefa_id INTEGER;
    v_resp RECORD;
    v_check RECORD;
BEGIN
    -- Verificar se já existe e qual o status
    SELECT id, status INTO nova_comp_id, v_status_atual 
    FROM rh_competencias 
    WHERE mes = v_mes AND ano = v_ano;

    IF nova_comp_id IS NOT NULL THEN
        IF v_status_atual = 'FECHADA' THEN
            RAISE EXCEPTION 'A competência %/% já está FECHADA e não pode ser reaberta. Se deseja gerar novas execuções, exclua a competência fechada primeiro (se permitido).', v_mes, v_ano;
        END IF;
        -- Se estiver aberta, apenas retornamos o ID para continuar (idempotência)
        RETURN nova_comp_id;
    END IF;

    -- Cria a Competência nova
    INSERT INTO rh_competencias (mes, ano, status)
    VALUES (v_mes, v_ano, 'ABERTA')
    RETURNING id INTO nova_comp_id;

    -- B. Itera sobre os vínculos Cliente <-> Processo ativos
    FOR v_processo IN 
        SELECT pc.processo_id, pc.cliente_id, p.frequencia, p.mes_referencia
        FROM rh_processos_clientes pc
        JOIN rh_processos p ON p.id = pc.processo_id
        WHERE p.is_active = TRUE
    LOOP
        -- REGRA DE RECORRÊNCIA:
        -- Mensal: Sempre | Anual: Somente no mês de referência | Avulso: Ignora automático
        IF (v_processo.frequencia = 'Mensal') OR 
           (v_processo.frequencia = 'Anual' AND v_processo.mes_referencia = v_mes) THEN
           
            -- Evita duplicidade se já houver execução
            IF NOT EXISTS (
                SELECT 1 FROM rh_execucao_processos 
                WHERE processo_id = v_processo.processo_id 
                  AND cliente_id = v_processo.cliente_id 
                  AND competencia_id = nova_comp_id
            ) THEN

                -- Instancia o Processo
                INSERT INTO rh_execucao_processos (processo_id, cliente_id, competencia_id)
                VALUES (v_processo.processo_id, v_processo.cliente_id, nova_comp_id)
                RETURNING id INTO v_exec_proc_id;

                -- Instancia as Tarefas
                FOR v_tarefa IN 
                    SELECT id, dependente_de_id, ordem
                    FROM rh_tarefas 
                    WHERE processo_id = v_processo.processo_id
                    ORDER BY ordem ASC
                LOOP
                    -- Status inicial: BLOQUEADA se tiver dependência, PENDENTE se não
                    INSERT INTO rh_execucao_tarefas (execucao_processo_id, tarefa_id, status)
                    VALUES (
                        v_exec_proc_id, 
                        v_tarefa.id, 
                        CASE WHEN v_tarefa.dependente_de_id IS NULL THEN 'PENDENTE' ELSE 'BLOQUEADA' END
                    )
                    RETURNING id INTO v_exec_tarefa_id;

                    -- Clona Responsáveis
                    FOR v_resp IN 
                        SELECT funcionario_id FROM rh_tarefas_responsaveis WHERE tarefa_id = v_tarefa.id
                    LOOP
                        INSERT INTO rh_execucao_tarefas_responsaveis (execucao_tarefa_id, funcionario_id)
                        VALUES (v_exec_tarefa_id, v_resp.funcionario_id);
                    END LOOP;

                    -- Clona Checklist
                    FOR v_check IN
                        SELECT id, item_texto FROM rh_tarefas_checklists WHERE tarefa_id = v_tarefa.id
                    LOOP
                        INSERT INTO rh_execucao_checklists (execucao_tarefa_id, checklist_id, item_texto)
                        VALUES (v_exec_tarefa_id, v_check.id, v_check.item_texto);
                    END LOOP;
                    
                END LOOP;
                
                -- Ajuste das dependências espelhadas
                UPDATE rh_execucao_tarefas rt1
                SET dependente_de_id = (
                    SELECT rt2.id 
                    FROM rh_execucao_tarefas rt2
                    JOIN rh_tarefas t2 ON t2.id = rt2.tarefa_id
                    JOIN rh_tarefas t1 ON t1.id = rt1.tarefa_id
                    WHERE rt2.execucao_processo_id = v_exec_proc_id
                      AND t1.dependente_de_id = t2.id
                )
                WHERE rt1.execucao_processo_id = v_exec_proc_id
                  AND EXISTS (SELECT 1 FROM rh_tarefas tb WHERE tb.id = rt1.tarefa_id AND tb.dependente_de_id IS NOT NULL);

            END IF;
        END IF;
    END LOOP;

    RETURN nova_comp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função para Exclusão Atômica (Cascade) da Competência
-- Garante que todas as execuções vinculadas sejam removidas em uma única transação
CREATE OR REPLACE FUNCTION public.rh_delete_competencia_cascade(p_competencia_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_status VARCHAR(50);
BEGIN
    -- 1. Verificar status
    SELECT status INTO v_status FROM rh_competencias WHERE id = p_competencia_id;
    
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Competência com ID % não encontrada.', p_competencia_id;
    END IF;
    
    -- Opcional: Impedir excluir ABERTA se esse for o desejo para Bug #2
    -- Mas geralmente queremos impedir excluir se houver dados sensíveis.
    -- O Bug #2 fala em impedir REABERTURA. A exclusão de aberta é tratada no Python.
    
    -- 2. Deletar execuções vinculadas (O Postgres fará cascade se as FKs permitirem, 
    -- mas aqui garantimos a ordem e atomicidade se houver triggers ou problemas)
    DELETE FROM rh_execucao_processos WHERE competencia_id = p_competencia_id;
    
    -- 3. Deletar a competência
    DELETE FROM rh_competencias WHERE id = p_competencia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
