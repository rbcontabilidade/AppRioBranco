-- =========================================================================
-- SEED SCRIPT REFINADO (V2): GESTÃO DE PROCESSOS RH
-- Adiciona vínculos de setor_id e preenche dias_prazo (deadlines).
-- =========================================================================

-- 1. Garantir que as colunas de setor existem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_processos' AND column_name = 'setor_id') THEN
        ALTER TABLE rh_processos ADD COLUMN setor_id INTEGER REFERENCES public.setores(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rh_tarefas' AND column_name = 'setor_id') THEN
        ALTER TABLE rh_tarefas ADD COLUMN setor_id INTEGER REFERENCES public.setores(id) ON DELETE SET NULL;
    END IF;

    -- Garantir restrições de unicidade para ON CONFLICT
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rh_processos_nome_unique') THEN
        ALTER TABLE rh_processos ADD CONSTRAINT rh_processos_nome_unique UNIQUE (nome);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rh_tarefas_processo_titulo_unique') THEN
        ALTER TABLE rh_tarefas ADD CONSTRAINT rh_tarefas_processo_titulo_unique UNIQUE (processo_id, titulo);
    END IF;
END $$;

-- 2. Carga de Dados com Estratégia de Atualização
DO $$
DECLARE
    -- IDs de Referência
    id_setor_dp INTEGER := 3;         -- Departamento Pessoal
    id_lili INTEGER := 14;            -- Funcionario Responsavel
    id_day INTEGER := 15;             -- Funcionario Responsavel
    
    -- Variáveis de Controle
    id_proc_folha INTEGER;
    id_proc_pendencia INTEGER;
    id_tarefa INTEGER;
BEGIN
    -- ==========================================
    -- 1. PROCESSO: Folha de Pagamento
    -- ==========================================
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Folha de Pagamento', 'Processo mensal de fechamento e entrega de folha de pagamento.', 'Mensal', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET 
        descricao = EXCLUDED.descricao,
        setor_id = EXCLUDED.setor_id,
        frequencia = EXCLUDED.frequencia
    RETURNING id INTO id_proc_folha;

    -- 1.1 Tarefa: Emprestimo consignado (Dia 21)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Emprestimo consignado', 'Atividade relacionada a empréstimos consignados.', 1, 21, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'importacao e conferencia dos arquivos') ON CONFLICT DO NOTHING;

    -- 1.2 Tarefa: Pre-fechamento da folha (Dia 2)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Pre-fechamento da folha', 'Preparação para o fechamento da folha.', 2, 2, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'lancamento de variaveis') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'verificar admitidos, afastamentos e atestados') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'conferencia de desconto de adiantamentos e beneficios') ON CONFLICT DO NOTHING;

    -- 1.3 Tarefa: Processamento da folha (Dia 5)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Processamento da folha', 'Cálculos e fechamento de ponto.', 3, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'calculo de proventos e descontos') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'conferencia de rubricas') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'fechamento do ponto') ON CONFLICT DO NOTHING;

    -- 1.4 Tarefa: Transmissao e obrigacoes (Dia 5)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Transmissao e obrigacoes', 'Envio de eventos ao eSocial.', 4, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'envio da S-1200 (remuneracao)') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'envio da S-1210 (pagamentos)') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'fechamento S-1299') ON CONFLICT DO NOTHING;

    -- 1.5 Tarefa: Entrega da folha e recibo (Dia 5)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Entrega da folha e recibo', 'Envio de recibos ao cliente.', 5, 5, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_day) ON CONFLICT DO NOTHING;

    -- 1.6 Tarefa: DCTFWeb (Dia 13)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'DCTFWeb', 'Conferência e transmissão da DCTFWeb.', 6, 13, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'conferir valores importados do eSocial e da EFD-Reinf') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'transmitir a declaracao') ON CONFLICT DO NOTHING;

    -- 1.7 Tarefa: Entrega das guias (Dia 15)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_folha, 'Entrega das guias', 'Envio de FGTS e DARF.', 7, 15, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_day) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'FGTS') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'DARF') ON CONFLICT DO NOTHING;


    -- ==========================================
    -- 2. PROCESSO: Pendencia Impostos RH
    -- ==========================================
    INSERT INTO rh_processos (nome, descricao, frequencia, setor_id)
    VALUES ('Pendencia Impostos RH', 'Monitoramento e envio de impostos em aberto.', 'Mensal', id_setor_dp)
    ON CONFLICT (nome) DO UPDATE SET 
        descricao = EXCLUDED.descricao,
        setor_id = EXCLUDED.setor_id,
        frequencia = EXCLUDED.frequencia
    RETURNING id INTO id_proc_pendencia;

    -- 2.1 Tarefa: Verificar impostos em aberto (Dia 25)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_pendencia, 'Verificar impostos em aberto', 'Verificação sistemática de pendências.', 1, 25, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_lili) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'FGTS') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'DARF') ON CONFLICT DO NOTHING;

    -- 2.2 Tarefa: Enviar guia para o cliente (Dia 27)
    INSERT INTO rh_tarefas (processo_id, titulo, descricao, ordem, dias_prazo, setor_id)
    VALUES (id_proc_pendencia, 'Enviar guia para o cliente', 'Envio das guias apuradas.', 2, 27, id_setor_dp)
    ON CONFLICT (processo_id, titulo) DO UPDATE SET 
        ordem = EXCLUDED.ordem,
        dias_prazo = EXCLUDED.dias_prazo,
        setor_id = EXCLUDED.setor_id
    RETURNING id INTO id_tarefa;
    
    INSERT INTO rh_tarefas_responsaveis (tarefa_id, funcionario_id) VALUES (id_tarefa, id_day) ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'FGTS') ON CONFLICT DO NOTHING;
    INSERT INTO rh_tarefas_checklists (tarefa_id, item_texto) VALUES (id_tarefa, 'DARF') ON CONFLICT DO NOTHING;

END $$;
