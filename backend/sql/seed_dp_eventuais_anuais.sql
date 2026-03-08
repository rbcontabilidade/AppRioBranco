-- =========================================================================
-- SEED SCRIPT: PROCESSOS EVENTUAIS E ANUAIS DEPARTAMENTO PESSOAL (DP)
-- Baseado em: rotinas_dp.md
-- =========================================================================

DO $$
DECLARE
    -- IDs de Referência (Baseados no seed_processos_dp.sql existente)
    id_setor_dp INTEGER := 3;
    id_lili     INTEGER := 14;

    v_proc_id   INTEGER;
    v_task_id   INTEGER;
BEGIN
    -- 1. ADMISSÃO (Eventual)
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Admissão de Funcionário', 'Processo de integração de novo colaborador.', 'Eventual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET descricao = EXCLUDED.descricao, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel)
    VALUES (v_proc_id, 'Executar Admissão', 1, '1 dia', id_setor_dp, 'Admissão concluída')
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Documentação e qualificação cadastral'),
        (v_task_id, 'Exame médico admissional'),
        (v_task_id, 'Envio evento S-2190 ou S-2200'),
        (v_task_id, 'Entrega de contrato de trabalho e termos'),
        (v_task_id, 'Informação de SST (S-2220)')
    ON CONFLICT DO NOTHING;

    -- 2. FÉRIAS (Eventual)
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Processamento de Férias', 'Concessão e cálculo de férias.', 'Eventual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel)
    VALUES (v_proc_id, 'Executar Férias', 1, '2 dias', id_setor_dp, 'Férias processadas')
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Analisar período aquisitivo, data de início e dias'),
        (v_task_id, 'Conferir cálculo'),
        (v_task_id, 'Envio evento S-2230'),
        (v_task_id, 'Entrega de aviso e recibo')
    ON CONFLICT DO NOTHING;

    -- 3. RESCISÃO (Eventual)
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Rescisão de Contrato', 'Desligamento de colaborador.', 'Eventual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel)
    VALUES (v_proc_id, 'Executar Rescisão', 1, '5 dias', id_setor_dp, 'Rescisão concluída')
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Analisar carta de dispensa ou pedido de demissão'),
        (v_task_id, 'Verificar tipo de aviso'),
        (v_task_id, 'Conferir cálculo'),
        (v_task_id, 'Exame médico demissional'),
        (v_task_id, 'Evento S-2299 (Desligamento)'),
        (v_task_id, 'FGTS Digital'),
        (v_task_id, 'Seguro-desemprego'),
        (v_task_id, 'Entrega dos documentos')
    ON CONFLICT DO NOTHING;

    -- 4. PROGRAMAÇÃO ANUAL DE FÉRIAS (Anual)
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Programação Anual de Férias', 'Planejamento de férias do quadro de funcionários.', 'Anual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel)
    VALUES (v_proc_id, 'Realizar Programação', 1, '30/01', id_setor_dp, 'Programação anual enviada')
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Relação de período aquisitivo'),
        (v_task_id, 'Envio para o cliente'),
        (v_task_id, 'Solicitar retorno do cliente')
    ON CONFLICT DO NOTHING;

    -- 5. ACORDOS DE CCT (Anual)
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Acordos de CCT', 'Gestão de convenções coletivas.', 'Anual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel)
    VALUES (v_proc_id, 'Gerir Acordos', 1, '30/09', id_setor_dp, 'Quadro atualizado')
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Atualização do quadro de dissídio'),
        (v_task_id, 'Programação para o próximo ano')
    ON CONFLICT DO NOTHING;

    -- 6. DEMAIS ROTINAS SIMPLES (Eventuais)
    -- Recálculo FGTS
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Recálculo de FGTS', 'Eventual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Executar Recálculo', 1, '2 dias', id_setor_dp, 'FGTS recalculado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- Recálculo INSS
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Recálculo de INSS', 'Eventual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Executar Recálculo', 1, '2 dias', id_setor_dp, 'INSS recalculado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- Dissídio Coletivo
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Dissídio Coletivo', 'Eventual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Processar Dissídio', 1, '30 dias', id_setor_dp, 'Dissídio processado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- 7. DEMAIS ROTINAS SIMPLES (Anuais)
    -- Adiantamento 13º
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Adiantamento do 13º Salário', 'Anual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Processar Adiantamento', 1, '30/11', id_setor_dp, 'Adiantamento processado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- 13º Salário
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('13º Salário', 'Anual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Processar 13º', 1, '20/12', id_setor_dp, '13º salário processado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- Informe de Rendimentos
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Informe de Rendimentos', 'Anual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Emitir Informe', 1, '28/02', id_setor_dp, 'Informe entregue') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- FAP
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('FAP (Fator Acidentário de Prevenção)', 'Anual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Controle/Entrega FAP', 1, '31/05', id_setor_dp, 'FAP atualizado') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

    -- Renovação Exames
    INSERT INTO rh_processos (nome, frequencia, setor_id) VALUES ('Renovação de Exames Periódicos (SST)', 'Anual', id_setor_dp) ON CONFLICT (nome) DO NOTHING RETURNING id INTO v_proc_id;
    IF v_proc_id IS NOT NULL THEN
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id, entregavel) VALUES (v_proc_id, 'Renovar Exames', 1, '30/04', id_setor_dp, 'Exames renovados') ON CONFLICT DO NOTHING RETURNING id INTO v_task_id;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END IF;

END $$;
