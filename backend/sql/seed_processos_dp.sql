-- =========================================================================
-- SEED SCRIPT: DEPARTAMENTO PESSOAL (RBC)
-- Baseado em: rotinas_operacionais_rbc.md
-- =========================================================================

-- 1. Preparações de Schema (Idempotente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_processos' AND column_name = 'setor_id') THEN
        ALTER TABLE rh_processos ADD COLUMN setor_id INTEGER REFERENCES public.setores(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_tarefas' AND column_name = 'setor_id') THEN
        ALTER TABLE rh_tarefas ADD COLUMN setor_id INTEGER REFERENCES public.setores(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_tarefas' AND column_name = 'entregavel') THEN
        ALTER TABLE rh_tarefas ADD COLUMN entregavel TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_tarefas' AND column_name = 'prazo_descricao') THEN
        ALTER TABLE rh_tarefas ADD COLUMN prazo_descricao TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rh_processos_nome_unique') THEN
        ALTER TABLE rh_processos ADD CONSTRAINT rh_processos_nome_unique UNIQUE (nome);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rh_tarefas_processo_titulo_unique') THEN
        ALTER TABLE rh_tarefas ADD CONSTRAINT rh_tarefas_processo_titulo_unique UNIQUE (processo_id, titulo);
    END IF;
END $$;

-- 2. Carga de Dados DP
DO $$
DECLARE
    -- IDs de Referência
    id_setor_dp INTEGER := 3;
    id_lili     INTEGER := 14;
    id_day      INTEGER := 15;

    v_proc_id   INTEGER;
    v_task_id   INTEGER;
    task_record RECORD;
BEGIN
    -- -------------------------------------------------------------------------
    -- 2.1 PROCESSO: Folha de Pagamento
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Folha de Pagamento', 'Processo mensal de fechamento e entrega de folha de pagamento.', 'Mensal', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    -- Etapas Folha
    -- Etapa: Empréstimo Consignado
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Empréstimo Consignado', 1, 21, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, 'Importação e conferência dos arquivos') ON CONFLICT DO NOTHING;

    -- Etapa: Pré-Fechamento da Folha
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Pré-Fechamento da Folha', 2, 2, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Lançamento de variáveis'),
        (v_task_id, 'verificar admitidos, afastamentos e atestados'),
        (v_task_id, 'conferência de desconto de adiantamentos e benefícios')
    ON CONFLICT DO NOTHING;

    -- Etapa: Processamento da Folha
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Processamento da Folha', 3, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Cálculo de proventos e descontos'),
        (v_task_id, 'conferência de rubricas'),
        (v_task_id, 'fechamento do ponto')
    ON CONFLICT DO NOTHING;

    -- Etapa: Transmissão e Obrigações
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Transmissão e Obrigações', 4, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Envio da S-1200 (Remuneração)'),
        (v_task_id, 'envio do S-1210 (Pagamentos)'),
        (v_task_id, 'fechamento S-1299')
    ON CONFLICT DO NOTHING;

    -- Etapa: Entrega da Folha e Recibo
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Entrega da Folha e Recibo', 5, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_day) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, 'Folha'), (v_task_id, 'recibo') ON CONFLICT DO NOTHING;

    -- Etapa: DCTFWeb
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'DCTFWeb', 6, 13, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Conferir os valores importados do eSocial e da EFD-Reinf'),
        (v_task_id, 'transmitir a declaração')
    ON CONFLICT DO NOTHING;

    -- Etapa: Entrega das Guias
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Entrega das Guias', 7, 15, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_day) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, 'FGTS'), (v_task_id, 'DARF') ON CONFLICT DO NOTHING;


    -- -------------------------------------------------------------------------
    -- 2.2 PROCESSO: Pendência Impostos RH
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Pendência Impostos RH', 'Monitoramento de guias em aberto do setor pessoal.', 'Mensal', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id
    RETURNING id INTO v_proc_id;

    -- Etapa: Verificar impostos em aberto
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Verificar impostos em aberto', 1, 25, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, 'FGTS'), (v_task_id, 'DARF') ON CONFLICT DO NOTHING;

    -- Etapa: Enviar guia para o cliente
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
    VALUES (v_proc_id, 'Enviar guia para o cliente', 2, 27, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_day) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, 'FGTS'), (v_task_id, 'DARF') ON CONFLICT DO NOTHING;


    -- -------------------------------------------------------------------------
    -- 2.3 PROCESSO: Demais Rotinas - Departamento Pessoal
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Demais Rotinas - Departamento Pessoal', 'Rotinas eventuais e anuais do setor de DP.', 'Eventual', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id
    RETURNING id INTO v_proc_id;

    -- Admissão
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id)
    VALUES (v_proc_id, 'Admissão', 1, '1 dia', id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Documentação e qualificação cadastral'),
        (v_task_id, 'exame médico admissional'),
        (v_task_id, 'envio evento S-2190 ou S-2200'),
        (v_task_id, 'entrega contrato de trabalho e termos'),
        (v_task_id, 'informação de SST (S-2220)')
    ON CONFLICT DO NOTHING;

    -- Férias
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id)
    VALUES (v_proc_id, 'Férias', 2, '2 dias', id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Analisar dados da solicitação: período aquisitivo, data de início, dias'),
        (v_task_id, 'conferir cálculo'),
        (v_task_id, 'envio evento S-2230'),
        (v_task_id, 'entrega aviso e recibo')
    ON CONFLICT DO NOTHING;

    -- Rescisão
    INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id)
    VALUES (v_proc_id, 'Rescisão', 3, '5 dias', id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao
    RETURNING id INTO v_task_id;
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES 
        (v_task_id, 'Analisar dados da solicitação: carta de dispensa ou pedido de demissão, tipo de aviso'),
        (v_task_id, 'conferir cálculo'),
        (v_task_id, 'exame médico demissional'),
        (v_task_id, 'evento S-2299 (Desligamento)'),
        (v_task_id, 'FGTS Digital'),
        (v_task_id, 'seguro-desemprego'),
        (v_task_id, 'entrega dos documentos')
    ON CONFLICT DO NOTHING;

    -- Outras rotinas simples
    FOR task_record IN 
        SELECT 'Recálculo FGTS' as t, 4 as o, '2 dias' as p UNION ALL
        SELECT 'Recálculo INSS', 5, '2 dias' UNION ALL
        SELECT 'Dissídio Coletivo', 6, '30 dias' UNION ALL
        SELECT 'Programação Anual de Férias', 7, '30/01' UNION ALL
        SELECT 'Adiantamento do 13º Salário', 8, '30/11' UNION ALL
        SELECT '13º Salário', 9, '20/12' UNION ALL
        SELECT 'Informe de Rendimentos', 10, '28/02' UNION ALL
        SELECT 'Planejamento de Férias Coletivas', 11, '30 dias' UNION ALL
        SELECT 'FAP (Fator Acidentário de Prevenção)', 12, '31/05' UNION ALL
        SELECT 'Renovação de Exames Periódicos (SST)', 13, '30/04' UNION ALL
        SELECT 'Acordos de CCT (Convenção Coletiva)', 14, '30/09'
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, prazo_descricao, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.p, id_setor_dp)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET prazo_descricao = EXCLUDED.prazo_descricao;
        
        -- Pega o ID da tarefa inserida para o responsável
        SELECT id INTO v_task_id FROM rh_tarefas WHERE processo_id = v_proc_id AND titulo = task_record.t;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_lili) ON CONFLICT DO NOTHING;
    END LOOP;

END $$;
