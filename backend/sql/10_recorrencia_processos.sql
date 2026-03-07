
-- 1. Adicionar colunas necessárias se não existirem
ALTER TABLE rh_processos ADD COLUMN IF NOT EXISTS mes_referencia INTEGER;

-- 2. Atualizar a função geradora para respeitar as regras:
--    MENSAL: Sempre clona
--    ANUAL: Clona se v_mes = mes_referencia
--    AVULSO: Nunca clona via gerador automático (apenas manual)

CREATE OR REPLACE FUNCTION gerador_nova_competencia(
    v_mes INTEGER,
    v_ano INTEGER
) RETURNS INTEGER AS $$
DECLARE
    nova_comp_id INTEGER;
    v_processo RECORD;
    v_exec_proc_id INTEGER;
    v_tarefa RECORD;
    v_exec_tarefa_id INTEGER;
    v_resp RECORD;
    v_check RECORD;
BEGIN
    -- 1. Cria a Competência
    INSERT INTO rh_competencias (mes, ano, status)
    VALUES (v_mes, v_ano, 'ABERTA')
    ON CONFLICT (mes, ano) DO UPDATE SET status = 'ABERTA' -- Se já existir, garante que está aberta
    RETURNING id INTO nova_comp_id;

    -- 2. Para cada vinculo Cliente <-> Processo (somente processos ativos)
    FOR v_processo IN 
        SELECT pc.processo_id, pc.cliente_id, p.frequencia, p.mes_referencia
        FROM rh_processos_clientes pc
        JOIN rh_processos p ON p.id = pc.processo_id
        WHERE p.is_active = TRUE
    LOOP
        -- REGRA DE RECORRÊNCIA:
        -- Se for 'Mensal', cria sempre.
        -- Se for 'Anual', só cria se v_mes for igual ao mes_referencia.
        -- Se for 'Avulso', não cria automaticamente (usuário deve disparar).
        
        IF (v_processo.frequencia = 'Mensal') OR 
           (v_processo.frequencia = 'Anual' AND v_processo.mes_referencia = v_mes) THEN
           
            -- Verifica se já existe execução para evitar duplicidade
            IF NOT EXISTS (
                SELECT 1 FROM rh_execucao_processos 
                WHERE processo_id = v_processo.processo_id 
                  AND cliente_id = v_processo.cliente_id 
                  AND competencia_id = nova_comp_id
            ) THEN

                -- Cria a Instância do Processo
                INSERT INTO rh_execucao_processos (processo_id, cliente_id, competencia_id)
                VALUES (v_processo.processo_id, v_processo.cliente_id, nova_comp_id)
                RETURNING id INTO v_exec_proc_id;

                -- 3. Puxa as Tarefas deste processo
                FOR v_tarefa IN 
                    SELECT id, dependente_de_id, ordem
                    FROM rh_tarefas 
                    WHERE processo_id = v_processo.processo_id
                    ORDER BY ordem ASC
                LOOP
                    -- Cria a Instância da Tarefa
                    INSERT INTO rh_execucao_tarefas (execucao_processo_id, tarefa_id, status)
                    VALUES (
                        v_exec_proc_id, 
                        v_tarefa.id, 
                        CASE WHEN v_tarefa.dependente_de_id IS NULL THEN 'PENDENTE' ELSE 'BLOQUEADA' END
                    )
                    RETURNING id INTO v_exec_tarefa_id;

                    -- 3.1 Puxa os Responsáveis
                    FOR v_resp IN 
                        SELECT funcionario_id FROM rh_tarefas_responsaveis WHERE tarefa_id = v_tarefa.id
                    LOOP
                        INSERT INTO rh_execucao_tarefas_responsaveis (execucao_tarefa_id, funcionario_id)
                        VALUES (v_exec_tarefa_id, v_resp.funcionario_id);
                    END LOOP;

                    -- 3.2 Puxa os checklits
                    FOR v_check IN
                        SELECT id, item_texto FROM rh_tarefas_checklists WHERE tarefa_id = v_tarefa.id
                    LOOP
                        INSERT INTO rh_execucao_checklists (execucao_tarefa_id, checklist_id, item_texto)
                        VALUES (v_exec_tarefa_id, v_check.id, v_check.item_texto);
                    END LOOP;
                    
                END LOOP;
                
                -- Link de Dependência Espelhado
                UPDATE rh_execucao_tarefas rt1
                SET dependente_de_id = (
                    SELECT rt2.id 
                    FROM rh_execucao_tarefas rt2
                    JOIN rh_tarefas mat_rt2 ON mat_rt2.id = rt2.tarefa_id
                    JOIN rh_tarefas mat_rt1 ON mat_rt1.id = rt1.tarefa_id
                    WHERE rt2.execucao_processo_id = v_exec_proc_id
                      AND mat_rt1.dependente_de_id = mat_rt2.id
                )
                WHERE rt1.execucao_processo_id = v_exec_proc_id
                  AND dependente_de_id IS NULL 
                  AND EXISTS (SELECT 1 FROM rh_tarefas tb WHERE tb.id = rt1.tarefa_id AND tb.dependente_de_id IS NOT NULL);

            END IF; -- Fim check existe exec
        END IF; -- Fim check frequencia
    END LOOP;

    RETURN nova_comp_id;
END;
$$ LANGUAGE plpgsql;
