-- =========================================================================
-- SEED SCRIPT: FISCAL / TRIBUTÁRIO (RBC) - V3 FINAL
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

-- 2. Carga de Dados FISCAL
DO $$
DECLARE
    -- IDs de Referência
    id_setor_fiscal INTEGER := 1;
    id_dandara      INTEGER := 2;
    id_day          INTEGER := 15;
    id_amanda       INTEGER := 17;

    v_proc_id       INTEGER;
    v_task_id       INTEGER;
    task_record     RECORD;
BEGIN

    -- -------------------------------------------------------------------------
    -- 2.1 PROCESSO: Rotina Mensal MEI
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Rotina Mensal MEI', 'Gestão mensal de obrigações para microempreendedores individuais.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    -- Tarefas MEI
    FOR task_record IN 
        SELECT 'Controle de Faturamento' as t, 1 as o, NULL::INTEGER as d, 'Acompanhamento' as p, id_dandara as r, 'Vendas, despesas e compras; monitorar limite anual do MEI' as c UNION ALL
        SELECT 'Verificar risco de desenquadramento', 2, NULL, '—', id_dandara, 'Sim ou Não' UNION ALL
        SELECT 'Gerar DAS-MEI', 3, NULL, '—', id_dandara, '—' UNION ALL
        SELECT 'Gerar DIFAL', 4, NULL, '—', id_dandara, 'Verificar compras fora do estado; gerar guia' UNION ALL
        SELECT 'Entregar Guias', 5, 10, 'Dia 10', id_day, 'DAS; DIFAL' UNION ALL
        SELECT 'Panorama do fechamento', 6, 10, 'Dia 10', id_dandara, 'Informar para a gerência um resumo dos pontos importantes do fechamento mensal'
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, prazo_descricao, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.d, task_record.p, id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo, prazo_descricao = EXCLUDED.prazo_descricao
        RETURNING id INTO v_task_id;

        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, task_record.r) ON CONFLICT DO NOTHING;
        IF task_record.c <> '—' THEN
            INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, task_record.c) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 2.2 PROCESSO: Rotina Mensal Simples Nacional
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Rotina Mensal Simples Nacional', 'Apurar e entregar guias do Simples Nacional.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    FOR task_record IN 
        SELECT 'Classificar receitas por anexo' as t, 1 as o, 12 as d, id_dandara as r UNION ALL
        SELECT 'Apurar DAS Simples Nacional', 2, 12, id_dandara UNION ALL
        SELECT 'Conferir Fator R', 3, 12, id_dandara UNION ALL
        SELECT 'Conferir ICMS e ISS retidos', 4, 12, id_dandara UNION ALL
        SELECT 'Emitir DAS', 5, 12, id_dandara UNION ALL
        SELECT 'Conferência Final', 6, 13, id_amanda UNION ALL
        SELECT 'Entregar DAS', 7, 15, id_day UNION ALL
        SELECT 'Panorama do fechamento', 8, 15, id_dandara
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.d, id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
        RETURNING id INTO v_task_id;

        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, task_record.r) ON CONFLICT DO NOTHING;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 2.3 PROCESSO: Rotina Mensal Lucro Presumido
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Rotina Mensal Lucro Presumido', 'Apurar tributos federais e estaduais do Lucro Presumido.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    FOR task_record IN 
        SELECT 'Apurar PIS e COFINS' as t, 1 as o, 20 as d, id_dandara as r UNION ALL
        SELECT 'MIT - Módulo de Inclusão de Tributos', 2, 20, id_dandara UNION ALL
        SELECT 'DCTFWeb', 3, 20, id_dandara UNION ALL
        SELECT 'Conferência Final', 4, 13, id_amanda UNION ALL
        SELECT 'Entrega Guias', 5, 25, id_dandara
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.d, id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
        RETURNING id INTO v_task_id;

        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, task_record.r) ON CONFLICT DO NOTHING;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 2.4 PROCESSO: ICMS
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('ICMS', 'Apurar e gerar guias de ICMS.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id, frequencia = EXCLUDED.frequencia
    RETURNING id INTO v_proc_id;

    FOR task_record IN 
        SELECT 'Apuração ICMS' as t, 1 as o, 10 as d, id_dandara as r UNION ALL
        SELECT 'Geração Guia', 2, 12, id_dandara UNION ALL
        SELECT 'Conferência', 3, 14, id_amanda UNION ALL
        SELECT 'Entrega ICMS', 4, 15, id_dandara
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.d, id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
        RETURNING id INTO v_task_id;

        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, task_record.r) ON CONFLICT DO NOTHING;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 2.5 PROCESSO: Pendência Impostos Fiscal
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Pendência Impostos Fiscal', 'Monitoramento e envio de guias em atraso do setor fiscal.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id
    RETURNING id INTO v_proc_id;

    FOR task_record IN 
        SELECT 'Verificar impostos em aberto' as t, 1 as o, 25 as d, id_dandara as r, 'DAS; ICMS; DAM' as c UNION ALL
        SELECT 'Enviar guia para o cliente', 2, 27, id_day, 'DAS; ICMS; DAM'
    LOOP
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, task_record.d, id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo
        RETURNING id INTO v_task_id;

        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, task_record.r) ON CONFLICT DO NOTHING;
        INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (v_task_id, task_record.c) ON CONFLICT DO NOTHING;
    END LOOP;

    -- -------------------------------------------------------------------------
    -- 2.6 PROCESSO: Demais Rotinas Fiscais
    -- -------------------------------------------------------------------------
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Demais Rotinas Fiscais', 'Importações manuais, obrigações anuais e atendimentos eventuais.', 'Mensal', id_setor_fiscal)
    ON CONFLICT (nome) DO UPDATE SET setor_id = EXCLUDED.setor_id
    RETURNING id INTO v_proc_id;

    FOR task_record IN 
        SELECT 'Importar e conferir notas fiscais emitidas' as t, 1 as o, 5 as d, 'Dia 5' as p UNION ALL
        SELECT 'Importar e conferir notas fiscais recebidas', 2, 5, 'Dia 5' UNION ALL
        SELECT 'Importar folha de pagamento', 3, 5, 'Dia 5' UNION ALL
        SELECT 'Declaração Eletrônica de ISS (DMS/DAN/DMA)', 4, 5, 'Dia 5' UNION ALL
        SELECT 'Apuração e emissão da guia de ISS', 5, 5, 'Dia 5' UNION ALL
        SELECT 'EFD ICMS/IPI', 6, 10, 'Dia 10' UNION ALL
        SELECT 'Recálculo imposto', 7, NULL, '2 dias' UNION ALL
        SELECT 'Emissão Nota Fiscal', 8, NULL, '1 dia' UNION ALL
        SELECT 'Parcelamento de Impostos', 9, NULL, '2 dias' UNION ALL
        SELECT 'Atendimento de Malha Fiscal', 10, NULL, '10 dias' UNION ALL
        SELECT 'Entregar DMED', 11, NULL, '28/02' UNION ALL
        SELECT 'Entregar DEFIS', 12, NULL, '31/03' UNION ALL
        SELECT 'Entregar DASN-MEI', 13, NULL, '31/05' UNION ALL
        SELECT 'Entregar ECF', 14, NULL, '29/06'
    LOOP
        -- Se d for nulo, usamos p como prazo_descricao
        INSERT INTO rh_tarefas (processo_id, titulo, ordem, dias_prazo, prazo_descricao, setor_id)
        VALUES (v_proc_id, task_record.t, task_record.o, 
                CASE WHEN task_record.d IS NOT NULL THEN (task_record.d)::INTEGER ELSE NULL END, 
                CASE WHEN task_record.d IS NOT NULL THEN 'Dia ' || task_record.d ELSE task_record.p END, 
                id_setor_fiscal)
        ON CONFLICT (processo_id, titulo) DO UPDATE SET dias_prazo = EXCLUDED.dias_prazo, prazo_descricao = EXCLUDED.prazo_descricao;
        
        -- Garante responsável Dandara para todas essas
        SELECT id INTO v_task_id FROM rh_tarefas WHERE processo_id = v_proc_id AND titulo = task_record.t;
        INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (v_task_id, id_dandara) ON CONFLICT DO NOTHING;
    END LOOP;

END $$;
