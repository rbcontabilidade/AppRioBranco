-- =========================================================================
-- SISTEMA DE GESTÃO DE PROCESSOS E TAREFAS MENSAIS
-- Vínculo Cliente <-> Processo e criação de Instâncias Mensais
-- =========================================================================

-- ==========================================
-- 1. ESTRUTURAS DE TEMPLATES (A BASE DE TUDO)
-- ==========================================

-- 1.1 Processos Base (Ex: Fechamento Fiscal, Admissão de Funcionário)
CREATE TABLE IF NOT EXISTS rh_processos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.2 Tarefas do Processo (Ex: Baixar Notas, Apurar ICMS)
CREATE TABLE IF NOT EXISTS rh_tarefas (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL REFERENCES rh_processos(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    dependente_de_id INTEGER REFERENCES rh_tarefas(id) ON DELETE SET NULL, -- Se NULL, é a primeira do fluxo
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.3 Responsáveis por Executar a Tarefa no Template (Para qual ou quais colaboradores vai cair?)
CREATE TABLE IF NOT EXISTS rh_tarefas_responsaveis (
    tarefa_id INTEGER NOT NULL REFERENCES rh_tarefas(id) ON DELETE CASCADE,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    PRIMARY KEY(tarefa_id, funcionario_id)
);

-- 1.4 Checklist das Tarefas
CREATE TABLE IF NOT EXISTS rh_tarefas_checklists (
    id SERIAL PRIMARY KEY,
    tarefa_id INTEGER NOT NULL REFERENCES rh_tarefas(id) ON DELETE CASCADE,
    item_texto VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 1.5 Vínculo Clientes x Processos (Quais clientes farão este processo todo mês?)
CREATE TABLE IF NOT EXISTS rh_processos_clientes (
    processo_id INTEGER NOT NULL REFERENCES rh_processos(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    adicionado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY(processo_id, cliente_id)
);


-- ==========================================
-- 2. ESTRUTURAS DE EXECUÇÃO (MENSAL/INSTÂNCIA)
-- ==========================================

-- 2.1 Controle de Competência (O mês de trabalho. Ex: Jan/2026, Fev/2026)
CREATE TABLE IF NOT EXISTS rh_competencias (
    id SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'ABERTA', -- ABERTA, FECHADA
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    data_fechamento TIMESTAMP WITH TIME ZONE,
    UNIQUE(mes, ano)
);

-- 2.2 Execução do Processo (Cópia da Matriz para a Competência Corrente)
CREATE TABLE IF NOT EXISTS rh_execucao_processos (
    id SERIAL PRIMARY KEY,
    processo_id INTEGER NOT NULL REFERENCES rh_processos(id) ON DELETE RESTRICT,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    competencia_id INTEGER NOT NULL REFERENCES rh_competencias(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDENTE', -- PENDENTE, CONCLUIDO
    iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    concluido_em TIMESTAMP WITH TIME ZONE,
    UNIQUE(processo_id, cliente_id, competencia_id)
);

-- 2.3 Execução das Tarefas (A Tarefa Individual para o Funcionário)
CREATE TABLE IF NOT EXISTS rh_execucao_tarefas (
    id SERIAL PRIMARY KEY,
    execucao_processo_id INTEGER NOT NULL REFERENCES rh_execucao_processos(id) ON DELETE CASCADE,
    tarefa_id INTEGER NOT NULL REFERENCES rh_tarefas(id) ON DELETE RESTRICT,
    dependente_de_id INTEGER REFERENCES rh_execucao_tarefas(id) ON DELETE SET NULL, -- A dependência espelhada
    status VARCHAR(50) DEFAULT 'BLOQUEADA', -- BLOQUEADA (esperando a anterior), PENDENTE (liberada para fazer), CONCLUIDA
    iniciado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    concluido_em TIMESTAMP WITH TIME ZONE
);

-- 2.4 Responsáveis por aquela tarefa específica do mês
CREATE TABLE IF NOT EXISTS rh_execucao_tarefas_responsaveis (
    execucao_tarefa_id INTEGER NOT NULL REFERENCES rh_execucao_tarefas(id) ON DELETE CASCADE,
    funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
    PRIMARY KEY(execucao_tarefa_id, funcionario_id)
);

-- 2.5 Checklist Instanciado para a Tarefa
CREATE TABLE IF NOT EXISTS rh_execucao_checklists (
    id SERIAL PRIMARY KEY,
    execucao_tarefa_id INTEGER NOT NULL REFERENCES rh_execucao_tarefas(id) ON DELETE CASCADE,
    checklist_id INTEGER NOT NULL REFERENCES rh_tarefas_checklists(id) ON DELETE RESTRICT,
    item_texto VARCHAR(255) NOT NULL,
    is_checked BOOLEAN DEFAULT FALSE,
    checked_em TIMESTAMP WITH TIME ZONE
);


-- ==========================================
-- 3. GATILHOS (TRIGGERS) E FUNÇÕES AUTOMATIZADAS
-- ==========================================

-- Função que atualiza o relógio biológico do processo
CREATE OR REPLACE FUNCTION atualiza_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualiza_processo ON rh_processos;
CREATE TRIGGER trigger_atualiza_processo
BEFORE UPDATE ON rh_processos
FOR EACH ROW EXECUTE FUNCTION atualiza_timestamp();


/*
 FUNÇÃO PRINCIPAL: GERAR A COMPETÊNCIA (VIRADA DE MÊS)
 Esta função puxa todos os templates e vincula na nova competência.
*/
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
    RETURNING id INTO nova_comp_id;

    -- 2. Para cada vinculo Cliente <-> Processo (somente processos ativos)
    FOR v_processo IN 
        SELECT pc.processo_id, pc.cliente_id 
        FROM rh_processos_clientes pc
        JOIN rh_processos p ON p.id = pc.processo_id
        WHERE p.is_active = TRUE
    LOOP
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
            -- Cria a Instância da Tarefa. Se nao tiver dependência, nasce PENDENTE, senao nasce BLOQUEADA
            INSERT INTO rh_execucao_tarefas (execucao_processo_id, tarefa_id, status)
            VALUES (
                v_exec_proc_id, 
                v_tarefa.id, 
                CASE WHEN v_tarefa.dependente_de_id IS NULL THEN 'PENDENTE' ELSE 'BLOQUEADA' END
            )
            RETURNING id INTO v_exec_tarefa_id;

            -- (Aviso Tecnico: O dependente_de_id ESPELHADO na tabela rh_execucao_tarefas 
            --  precisa de um UPDATE posterior pois o ID muda ao ser clonado. 
            --  Mas a lógica de bloqueio no app será olhar o `status` 'BLOQUEADA' e a relação na view).

            -- 3.1 Puxa os Responsáveis e cola
            FOR v_resp IN 
                SELECT funcionario_id FROM rh_tarefas_responsaveis WHERE tarefa_id = v_tarefa.id
            LOOP
                INSERT INTO rh_execucao_tarefas_responsaveis (execucao_tarefa_id, funcionario_id)
                VALUES (v_exec_tarefa_id, v_resp.funcionario_id);
            END LOOP;

            -- 3.2 Puxa os checklits e cola
            FOR v_check IN
                SELECT id, item_texto FROM rh_tarefas_checklists WHERE tarefa_id = v_tarefa.id
            LOOP
                INSERT INTO rh_execucao_checklists (execucao_tarefa_id, checklist_id, item_texto)
                VALUES (v_exec_tarefa_id, v_check.id, v_check.item_texto);
            END LOOP;
            
        END LOOP;
        
        -- Após clonar as tarefas do processo, faz o Link de Dependência Espelhado (update)
        -- Ligando o rh_execucao_tarefas (id) => rh_execucao_tarefas (dependente_de_id) que acabou de criar
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

    END LOOP;

    RETURN nova_comp_id;
END;
$$ LANGUAGE plpgsql;
