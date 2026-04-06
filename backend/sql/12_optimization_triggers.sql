-- =========================================================================
-- OTIMIZAÇÃO #9 — LÓGICA DE CHECKLIST/PROGRESSO EM STORED PROCEDURES
-- Elimina round-trips Python <-> banco para recalcular progresso
-- =========================================================================

-- -------------------------------------------------------------------------
-- PASSO 1: Adicionar coluna 'progresso' em rh_execucao_processos
-- Armazena o percentual de conclusão (0-100) calculado automaticamente
-- -------------------------------------------------------------------------

ALTER TABLE rh_execucao_processos
    ADD COLUMN IF NOT EXISTS progresso INTEGER DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100);

COMMENT ON COLUMN rh_execucao_processos.progresso
    IS 'Percentual de tarefas concluídas (0-100). Recalculado automaticamente pelos triggers.';


-- -------------------------------------------------------------------------
-- PASSO 2: Função principal de recálculo de progresso
-- Chamada pelos dois triggers abaixo. Recalcula e persiste o progresso
-- do processo pai com base nas tarefas CONCLUIDAS / total de tarefas.
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_recalcular_progresso_processo(p_execucao_processo_id INTEGER)
RETURNS void AS $$
DECLARE
    v_total     INTEGER;
    v_concluidas INTEGER;
    v_progresso  INTEGER;
BEGIN
    -- Conta total de tarefas e quantas foram concluídas
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'CONCLUIDA')
    INTO v_total, v_concluidas
    FROM rh_execucao_tarefas
    WHERE execucao_processo_id = p_execucao_processo_id;

    -- Evita divisão por zero (processo sem tarefas = 0%)
    IF v_total = 0 THEN
        v_progresso := 0;
    ELSE
        v_progresso := ROUND((v_concluidas::NUMERIC / v_total) * 100);
    END IF;

    -- Atualiza o progresso e, se 100%, marca o processo como CONCLUIDO
    UPDATE rh_execucao_processos
    SET
        progresso    = v_progresso,
        status       = CASE WHEN v_progresso = 100 THEN 'CONCLUIDO' ELSE status END,
        concluido_em = CASE WHEN v_progresso = 100 AND concluido_em IS NULL
                            THEN timezone('utc'::text, now())
                            ELSE concluido_em END
    WHERE id = p_execucao_processo_id;
END;
$$ LANGUAGE plpgsql;


-- -------------------------------------------------------------------------
-- PASSO 3: Trigger em rh_execucao_tarefas
-- Dispara quando o status de uma tarefa muda → recalcula progresso do pai
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_fn_atualiza_progresso_por_tarefa()
RETURNS TRIGGER AS $$
BEGIN
    -- Só age quando o status realmente mudou para evitar recálculos desnecessários
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM fn_recalcular_progresso_processo(NEW.execucao_processo_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger anterior caso exista (idempotente para re-execução)
DROP TRIGGER IF EXISTS trg_progresso_por_tarefa ON rh_execucao_tarefas;

CREATE TRIGGER trg_progresso_por_tarefa
AFTER UPDATE ON rh_execucao_tarefas
FOR EACH ROW
EXECUTE FUNCTION trg_fn_atualiza_progresso_por_tarefa();


-- -------------------------------------------------------------------------
-- PASSO 4: Trigger em rh_execucao_checklists
-- Dispara quando um item de checklist é marcado/desmarcado.
-- Propaga o evento para o processo pai via rh_execucao_tarefas.
--
-- NOTA: A coluna progresso é baseada em TAREFAS (não itens de checklist),
-- pois uma tarefa com checklist só é "CONCLUIDA" quando o status é
-- alterado pela API. Este trigger serve como hook futuro para lógica
-- de auto-completar tarefas quando todos os itens do checklist forem
-- marcados (comentado abaixo para ativação opcional).
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_fn_atualiza_progresso_por_checklist()
RETURNS TRIGGER AS $$
DECLARE
    v_execucao_processo_id INTEGER;
    v_total_itens   INTEGER;
    v_itens_marcados INTEGER;
    v_todos_marcados BOOLEAN;
BEGIN
    -- Só age quando o estado de marcação mudou
    IF OLD.is_checked IS DISTINCT FROM NEW.is_checked THEN

        -- Verifica se TODOS os itens do checklist desta tarefa estão marcados
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE is_checked = TRUE)
        INTO v_total_itens, v_itens_marcados
        FROM rh_execucao_checklists
        WHERE execucao_tarefa_id = NEW.execucao_tarefa_id;

        v_todos_marcados := (v_total_itens > 0 AND v_itens_marcados = v_total_itens);

        -- Auto-completa a tarefa se todos os itens do checklist foram marcados
        IF v_todos_marcados THEN
            UPDATE rh_execucao_tarefas
            SET
                status       = 'CONCLUIDA',
                concluido_em = timezone('utc'::text, now())
            WHERE id = NEW.execucao_tarefa_id
              AND status <> 'CONCLUIDA'; -- Só atualiza se ainda não estava concluída
        END IF;

        -- Obtém o ID do processo pai para recalcular o progresso
        SELECT execucao_processo_id
        INTO v_execucao_processo_id
        FROM rh_execucao_tarefas
        WHERE id = NEW.execucao_tarefa_id;

        -- Recalcula o progresso do processo pai
        IF v_execucao_processo_id IS NOT NULL THEN
            PERFORM fn_recalcular_progresso_processo(v_execucao_processo_id);
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger anterior caso exista (idempotente)
DROP TRIGGER IF EXISTS trg_progresso_por_checklist ON rh_execucao_checklists;

CREATE TRIGGER trg_progresso_por_checklist
AFTER UPDATE ON rh_execucao_checklists
FOR EACH ROW
EXECUTE FUNCTION trg_fn_atualiza_progresso_por_checklist();


-- -------------------------------------------------------------------------
-- PASSO 5: Backfill — calcula o progresso dos processos já existentes
-- Garante que dados históricos fiquem sincronizados com a nova coluna
-- -------------------------------------------------------------------------

DO $$
DECLARE
    v_id INTEGER;
BEGIN
    FOR v_id IN SELECT id FROM rh_execucao_processos
    LOOP
        PERFORM fn_recalcular_progresso_processo(v_id);
    END LOOP;
END;
$$;


-- -------------------------------------------------------------------------
-- PASSO 6: Verificação — confirma que tudo foi criado corretamente
-- -------------------------------------------------------------------------

-- Coluna 'progresso' criada?
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'rh_execucao_processos'
  AND column_name = 'progresso';

-- Triggers criados?
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_name IN ('trg_progresso_por_tarefa', 'trg_progresso_por_checklist')
ORDER BY trigger_name;

-- Estado atual dos processos após backfill
SELECT
    id,
    processo_id,
    cliente_id,
    status,
    progresso
FROM rh_execucao_processos
ORDER BY id DESC
LIMIT 20;
