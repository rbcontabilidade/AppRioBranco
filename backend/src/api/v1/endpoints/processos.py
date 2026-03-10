from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from src.core.database import supabase, supabase_admin
import logging
from src.api.v1.endpoints.auth import get_current_user_from_cookie

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/processos", tags=["Processos e Tarefas"])

# Schemas Pydantic
class ChecklistSchema(BaseModel):
    id: Optional[int] = None
    text: str

class RotinaSchema(BaseModel):
    id: Optional[int] = None
    nome: str
    descricao: Optional[str] = None
    ordem: int
    dias_prazo: int
    dependente_de_id: Optional[int] = None
    responsible_users: List[int] = []
    checklist: List[ChecklistSchema] = []

class ProcessoCompletoSchema(BaseModel):
    nome: str
    descricao: Optional[str] = None
    frequencia: str = "Mensal"
    mes_referencia: Optional[int] = None
    steps: List[RotinaSchema]

# Endpoints
@router.post("")
async def criar_processo(payload: ProcessoCompletoSchema):
    logger.info(f"Recebendo payload para novo processo: {payload.dict()}")
    try:
        # 1. Cria Processo Pai
        res_p = supabase_admin.table("rh_processos").insert({
            "nome": payload.nome,
            "descricao": payload.descricao,
            "frequencia": payload.frequencia,
            "mes_referencia": payload.mes_referencia,
            "is_active": True
        }).execute()
        
        if not res_p.data:
             logger.error(f"Erro ao inserir rh_processos: {getattr(res_p, 'error', 'Erro desconhecido')}")
             raise HTTPException(status_code=400, detail="Erro ao criar processo no banco")
            
        processo_id = res_p.data[0]['id']
        
        # 2. Cria as Tarefas (Rotinas)
        await _save_steps(processo_id, payload.steps)
        
        return {"message": "Processo criado com sucesso", "id": processo_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erro ao criar processo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}")
async def atualizar_processo(id: int, payload: ProcessoCompletoSchema):
    logger.info(f"Iniciando atualização do processo {id}. Payload: {payload.dict()}")
    try:
        # 1. Atualiza Processo Pai
        update_data = {
            "nome": payload.nome,
            "descricao": payload.descricao,
            "frequencia": payload.frequencia
        }
        # Apenas atualiza mes_referencia se ele vier preenchido
        if payload.mes_referencia:
            update_data["mes_referencia"] = payload.mes_referencia
            
        res_p = supabase_admin.table("rh_processos").update(update_data).eq("id", id).execute()
        if not res_p.data:
             logger.error(f"Erro ao atualizar rh_processos: {getattr(res_p, 'error', 'Processo não encontrado')}")
             raise HTTPException(status_code=404, detail="Processo não encontrado para atualizar")
        
        # 2. Desativa todas as tarefas atuais deste processo (Soft Delete) que não vieram no payload
        # No lugar de desativar TUDO, vamos desativar apenas as que NÃO estão no payload e que são deste processo
        ids_enviados = []
        for s in payload.steps:
            curr_id = s.id
            if curr_id is not None and isinstance(curr_id, int) and curr_id < 1000000000:
                ids_enviados.append(int(curr_id))
        
        query_deactivate = supabase_admin.table("rh_tarefas").update({"is_active": False}).eq("processo_id", id)
        if ids_enviados:
            query_deactivate = query_deactivate.not_.in_("id", ids_enviados)
        
        query_deactivate.execute()
        
        # 3. Recria ou Reativa as Tarefas
        await _save_steps(id, payload.steps)
        
        return {"message": "Processo atualizado com sucesso"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erro ao atualizar processo {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no servidor: {str(e)}")

@router.delete("/{id}")
async def excluir_processo(id: int):
    try:
        # 1. Busca todas as Tarefas Base do processo
        res_tarefas = supabase.table("rh_tarefas").select("id").eq("processo_id", id).execute()
        tarefas_base_ids = [t['id'] for t in (res_tarefas.data or [])]
        
        # 2. Busca todos os Processos de Execução vinculados
        res_execs = supabase.table("rh_execucao_processos").select("id").eq("processo_id", id).execute()
        exec_proc_ids = [e['id'] for e in (res_execs.data or [])]
        
        # 3. Se houver Execuções, encontra as Tarefas de Execução correspondentes para limpar as pontas (Responsáveis e Checklists Executados)
        if exec_proc_ids:
            res_exec_tarefas = supabase.table("rh_execucao_tarefas").select("id").in_("execucao_processo_id", exec_proc_ids).execute()
            exec_tarefa_ids = [et['id'] for et in (res_exec_tarefas.data or [])]
            
            if exec_tarefa_ids:
                supabase.table("rh_execucao_tarefas_responsaveis").delete().in_("execucao_tarefa_id", exec_tarefa_ids).execute()
                supabase.table("rh_execucao_checklists").delete().in_("execucao_tarefa_id", exec_tarefa_ids).execute()
                
            supabase.table("rh_execucao_tarefas").delete().in_("execucao_processo_id", exec_proc_ids).execute()
            supabase.table("rh_execucao_processos").delete().eq("processo_id", id).execute()
            
        # 4. Limpar Tarefas Base e Relações (Checklists Template, Responsáveis Template)
        if tarefas_base_ids:
            supabase.table("rh_tarefas_responsaveis").delete().in_("tarefa_id", tarefas_base_ids).execute()
            supabase.table("rh_tarefas_checklists").delete().in_("tarefa_id", tarefas_base_ids).execute()
            
            # Precisamos limpar dependências nulas para não dar block no CASCADE caso a ordem importe
            supabase.table("rh_tarefas").update({"dependente_de_id": None}).eq("processo_id", id).execute()
            supabase.table("rh_tarefas").delete().eq("processo_id", id).execute()
            
        # 5. Limpar vínculos de clientes com este processo
        supabase.table("rh_processos_clientes").delete().eq("processo_id", id).execute()
        
        # 6. Deletar o Processo Principal Pai
        res_del = supabase.table("rh_processos").delete().eq("id", id).execute()
        
        if not res_del.data:
            raise HTTPException(status_code=404, detail="Processo não encontrado ou já deletado.")
            
        return {"message": "Processo e todas as suas dependências foram excluídos com sucesso."}
        
    except Exception as e:
        logger.error(f"Erro ao excluir processo {id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
async def listar_processos():
    try:
        # Puxa processos, suas tarefas (com setores e responsáveis) e também os vínculos de clientes
        res = supabase.table("rh_processos").select(
            "*, "
            "rh_tarefas(id, is_active, role, rh_tarefas_responsaveis(funcionarios(nome))), "
            "rh_processos_clientes(processo_id)"
        ).execute()
        
        data = res.data or []
        for p in data:
            tarefas = p.get('rh_tarefas', [])
            tarefas_ativas = [t for t in tarefas if t.get('is_active') is not False]
            
            p['qtd_rotinas'] = len(tarefas_ativas)
            p['qtd_clientes'] = len(p.get('rh_processos_clientes', []))
            p['frequencia'] = p.get('frequencia', 'Mensal')
            
            # Coleta setores únicos
            setores = set()
            for t in tarefas_ativas:
                if t.get('role'):
                    setores.add(t['role'])
            p['setores'] = sorted(list(setores))
            
            # Coleta nomes de funcionários responsáveis únicos
            responsaveis = set()
            for t in tarefas_ativas:
                for r in t.get('rh_tarefas_responsaveis', []):
                    func = r.get('funcionarios', {})
                    if func and func.get('nome'):
                        responsaveis.add(func['nome'])
            p['responsaveis'] = sorted(list(responsaveis))
            
            # Removemos a lista crua de tarefas para o frontend
            if 'rh_tarefas' in p:
                del p['rh_tarefas']
            if 'rh_processos_clientes' in p:
                del p['rh_processos_clientes']
                
        return data
    except Exception as e:
        logger.error(f"Erro ao listar: {e}")
        return []

@router.get("/{id}")
async def obter_processo(id: int):
    try:
        # Puxa processo
        res_p = supabase.table("rh_processos").select("*").eq("id", id).single().execute()
        processo = res_p.data
        
        # Puxa tarefas com filhos (apenas as ativas)
        res_t = supabase.table("rh_tarefas").select("*, rh_tarefas_responsaveis(funcionario_id), rh_tarefas_checklists(*)").eq("processo_id", id).eq("is_active", True).order("ordem").execute()
        
        steps = []
        for t in res_t.data:
            steps.append({
                "id": t['id'],
                "nome": t['titulo'],
                "descricao": t['descricao'],
                "ordem": t['ordem'],
                "dias_prazo": t['dias_prazo'],
                "dependente_de_id": t['dependente_de_id'],
                "responsible_users": [r['funcionario_id'] for r in t['rh_tarefas_responsaveis']],
                "checklist": [{"id": c['id'], "text": c['item_texto']} for c in t['rh_tarefas_checklists']]
            })
            
        processo['steps'] = steps
        return processo
    except Exception as e:
        logger.error(f"Erro ao obter processo: {e}")
        raise HTTPException(status_code=404, detail="Processo não encontrado")

async def _save_steps(processo_id: int, steps: List[RotinaSchema]):
    id_map = {}          # Chave: ID temporário do frontend -> ID real no banco
    id_map_by_ordem = {} # Chave: número de ordem -> ID real no banco
    
    for s in steps:
        curr_step_id = s.id
        # Verifica se é um ID real do banco (Inteiros pequenos) ou gerado pelo frontend (Date.now())
        is_real_id = curr_step_id is not None and isinstance(curr_step_id, int) and curr_step_id < 1000000000
        
        payload = {
            "processo_id": processo_id,
            "titulo": s.nome,
            "descricao": s.descricao or "",
            "ordem": s.ordem,
            "dias_prazo": s.dias_prazo or 0,
            "is_active": True,
            # Limpa dependência para ser resolvida corretamente no segundo passo
            "dependente_de_id": None
        }
        
        t_id = None
        
        try:
            if is_real_id:
                payload["id"] = s.id
                res_t = supabase_admin.table("rh_tarefas").upsert(payload).execute()
                if res_t.data:
                    t_id = res_t.data[0]['id']
                    
                    # 1. Responsáveis: Sincronização Inteligente
                    # Busca os atuais no banco
                    res_resp_db = supabase_admin.table("rh_tarefas_responsaveis").select("funcionario_id").eq("tarefa_id", t_id).execute()
                    db_resp_ids = [r['funcionario_id'] for r in (res_resp_db.data or [])]
                    
                    frontend_resp_ids = s.responsible_users or []
                    
                    # Adicionar os novos
                    new_resps = [uid for uid in frontend_resp_ids if uid not in db_resp_ids]
                    if new_resps:
                        supabase_admin.table("rh_tarefas_responsaveis").insert([
                            {"tarefa_id": t_id, "funcionario_id": uid} for uid in new_resps
                        ]).execute()
                        
                    # Remover os que saíram (com segurança)
                    remove_resps = [uid for uid in db_resp_ids if uid not in frontend_resp_ids]
                    if remove_resps:
                        supabase_admin.table("rh_tarefas_responsaveis").delete() \
                            .eq("tarefa_id", t_id) \
                            .in_("funcionario_id", remove_resps) \
                            .execute()

                    # 2. Checklist: Sincronização Inteligente (Evita Restricted Delete Error e Spurious FK)
                    if s.checklist:
                        itens_ids_enviados = []
                        itens_novos = []
                        
                        for c in s.checklist:
                            curr_c_id = c.id
                            c_id_real = None
                            if curr_c_id is not None and isinstance(curr_c_id, int) and curr_c_id < 1000000000:
                                c_id_real = int(curr_c_id)
                            
                            if c_id_real:
                                # Update explícito de texto sem tocar na Primary Key ou Foreign Key (Evita Erro FK PostgREST)
                                try:
                                    supabase_admin.table("rh_tarefas_checklists").update({
                                        "item_texto": c.text
                                    }).eq("id", c_id_real).execute()
                                    itens_ids_enviados.append(c_id_real)
                                except Exception as e:
                                    pass # Se der warning de update, silencia para não travar o loop
                            else:
                                # Novo item coletado para Insert
                                itens_novos.append({
                                    "tarefa_id": t_id,
                                    "item_texto": c.text
                                })
                        
                        if itens_novos:
                            try:
                                supabase_admin.table("rh_tarefas_checklists").insert(itens_novos).execute()
                            except:
                                pass
                            
                        # Limpeza de itens órfãos (removidos no frontend)
                        res_chk_db = supabase_admin.table("rh_tarefas_checklists").select("id").eq("tarefa_id", t_id).execute()
                        db_chk_ids = [r['id'] for r in (res_chk_db.data or [])]
                        
                        ids_para_remover = [id for id in db_chk_ids if id not in itens_ids_enviados]
                        
                        for rid in ids_para_remover:
                            try:
                                # Tenta deletar. Se falhar por FK (em uso por execuções), falha silenciosamente
                                supabase_admin.table("rh_tarefas_checklists").delete().eq("id", rid).execute()
                            except Exception:
                                pass # Remover o logger.warning para evitar qualquer stringification estranha
            else:
                # É uma tarefa nova (ID temporário vindo do frontend ou None)
                res_t = supabase_admin.table("rh_tarefas").insert(payload).execute()
                if res_t.data:
                    t_id = res_t.data[0]['id']
                    
                    # Novos responsáveis
                    if s.responsible_users:
                        resp_payload = [{"tarefa_id": t_id, "funcionario_id": uid} for uid in s.responsible_users]
                        supabase_admin.table("rh_tarefas_responsaveis").insert(resp_payload).execute()
                        
                    # Novos checklists
                    if s.checklist:
                        check_payload = [{"tarefa_id": t_id, "item_texto": c.text} for c in s.checklist]
                        supabase_admin.table("rh_tarefas_checklists").insert(check_payload).execute()
            
            if t_id:
                id_map[s.id] = t_id
                id_map_by_ordem[s.ordem] = t_id
        except Exception as step_error:
            error_msg = str(step_error)
            # Tentar extrair a mensagem limpa se for um erro do supabase (PGRST ou similar)
            if hasattr(step_error, 'details') and step_error.details:
                error_msg = f"{step_error.message} - {step_error.details}"
            elif isinstance(step_error, dict) and 'message' in step_error:
                error_msg = step_error['message']
                
            logger.error(f"Erro ao salvar step {s.nome} no processo {processo_id}: {error_msg}")
            
            # Subir o erro como HTTPException para que o frontend (axios) capture a estrutura
            raise HTTPException(status_code=400, detail=f"Erro ao salvar a rotina '{s.nome}': {error_msg}")

    # Segundo Passo: Resolver Dependências Hierárquicas
    # Prioridade 1: dependência explícita do frontend.
    # Prioridade 2: dependência sequencial automática (tarefa N depende da N-1).
    steps_sorted = sorted(steps, key=lambda s: s.ordem)
    for s in steps_sorted:
        current_task_db_id = id_map.get(s.id)
        if not current_task_db_id:
            continue

        dep_task_db_id = None

        if s.dependente_de_id and s.dependente_de_id in id_map:
            # Dependência explícita enviada pelo frontend
            dep_task_db_id = id_map[s.dependente_de_id]
        elif s.ordem > 1:
            # Dependência sequencial automática: esta tarefa depende da anterior
            dep_task_db_id = id_map_by_ordem.get(s.ordem - 1)

        if dep_task_db_id:
            supabase_admin.table("rh_tarefas").update({"dependente_de_id": dep_task_db_id}).eq("id", current_task_db_id).execute()

@router.post("/clientes/{client_id}/{template_id}")
async def lancar_processo_cliente(client_id: int, template_id: int):
    """
    Lança um processo para um cliente específico.
    1. Vincula o cliente ao processo (rh_processos_clientes)
    2. Se houver competência aberta, cria a execução imediata e clona tarefas.
    """
    try:
        # 1. Vincula o cliente ao processo se não existir (upsert)
        supabase_admin.table("rh_processos_clientes").upsert({
            "processo_id": template_id,
            "cliente_id": client_id
        }).execute()

        # 2. Busca competência ativa
        res_comp = supabase.table("rh_competencias").select("id").eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
        
        if not res_comp.data:
            return {"message": "Cliente vinculado para futuras competências, mas não há competência aberta para lançamento imediato."}

        comp_id = res_comp.data[0]['id']

        # 3. Verifica se já existe execução para evitar duplicidade na mesma competência
        res_exec = supabase_admin.table("rh_execucao_processos").select("id").eq("processo_id", template_id).eq("cliente_id", client_id).eq("competencia_id", comp_id).execute()
        
        if res_exec.data:
            return {"message": "Processo já está em execução para este cliente nesta competência."}

        # 4. Criar Execução do Processo
        res_new_exec = supabase_admin.table("rh_execucao_processos").insert({
            "processo_id": template_id,
            "cliente_id": client_id,
            "competencia_id": comp_id,
            "status": "PENDENTE"
        }).execute()

        if not res_new_exec.data:
            raise HTTPException(status_code=400, detail="Falha ao criar execução")

        exec_proc_id = res_new_exec.data[0]['id']

        # 5. Clonar Tarefas do Template para a Execução
        res_tarefas = supabase.table("rh_tarefas").select("*").eq("processo_id", template_id).order("ordem").execute()
        
        id_map = {} # mat_id -> exec_id

        for t in res_tarefas.data:
            # Cria a tarefa de execução
            res_t_exec = supabase_admin.table("rh_execucao_tarefas").insert({
                "execucao_processo_id": exec_proc_id,
                "tarefa_id": t['id'],
                "status": "PENDENTE" if not t['dependente_de_id'] else "BLOQUEADA"
            }).execute()

            if res_t_exec.data:
                t_exec_id = res_t_exec.data[0]['id']
                id_map[t['id']] = t_exec_id

                # Responsáveis
                res_resp = supabase.table("rh_tarefas_responsaveis").select("funcionario_id").eq("tarefa_id", t['id']).execute()
                if res_resp.data:
                    resp_payload = [{"execucao_tarefa_id": t_exec_id, "funcionario_id": r['funcionario_id']} for r in res_resp.data]
                    supabase_admin.table("rh_execucao_tarefas_responsaveis").insert(resp_payload).execute()

                # Checklists
                res_check = supabase.table("rh_tarefas_checklists").select("*").eq("tarefa_id", t['id']).execute()
                if res_check.data:
                    check_payload = [{"execucao_tarefa_id": t_exec_id, "checklist_id": c['id'], "item_texto": c['item_texto']} for c in res_check.data]
                    supabase_admin.table("rh_execucao_checklists").insert(check_payload).execute()

        # 6. Atualizar Dependências Espelhadas na Execução
        for t in res_tarefas.data:
            if t['dependente_de_id'] and t['dependente_de_id'] in id_map:
                exec_id = id_map[t['id']]
                dep_exec_id = id_map[t['dependente_de_id']]
                supabase_admin.table("rh_execucao_tarefas").update({"dependente_de_id": dep_exec_id}).eq("id", exec_id).execute()

        return {"message": "Processo lançado com sucesso", "execution_id": exec_proc_id}

    except Exception as e:
        logger.error(f"Erro ao lançar processo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/clientes/{client_id}")
async def listar_processos_cliente(client_id: int):
    """Retorna os IDs dos processos vinculados ao cliente"""
    try:
        res = supabase.table("rh_processos_clientes").select("processo_id").eq("cliente_id", client_id).execute()
        # Retorna uma lista de objetos com o id do processo (template_id)
        # O frontend espera [{id: ...}, {id: ...}] ou parecido? 
        # No frontend: setClientProcesses((resVinculo.data || []).map(p => p.id));
        # Então devemos retornar [{'id': id}, ...]
        return [{"id": r['processo_id']} for r in res.data]
    except Exception as e:
        logger.error(f"Erro ao listar processos do cliente: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/clientes/{client_id}/{template_id}")
async def desvincular_processo_cliente(client_id: int, template_id: int):
    """
    Remove o vínculo entre cliente e processo e limpa execuções pendentes na competência aberta.
    """
    try:
        logger.info(f"Iniciando desvínculo: Cliente {client_id}, Processo {template_id}")
        
        # 1. Busca competências ativas (suporta variações de status)
        active_statuses = ["ABERTA", "Open", "Aberto", "ativa", "ATIVA"]
        res_comp = supabase.table("rh_competencias").select("id, status").in_("status", active_statuses).execute()
        
        comp_ids = [c['id'] for c in (res_comp.data or [])]
        logger.info(f"Competências ativas encontradas para limpeza: {comp_ids}")

        if comp_ids:
            # 2. Busca TODAS as execuções vinculadas para este cliente/processo nessas competências
            res_execs = supabase.table("rh_execucao_processos") \
                .select("id") \
                .eq("processo_id", template_id) \
                .eq("cliente_id", client_id) \
                .in_("competencia_id", comp_ids) \
                .execute()
            
            executions = res_execs.data or []
            logger.info(f"Execuções encontradas para remover: {[e['id'] for e in executions]}")
            
            for exec_rec in executions:
                exec_id = exec_rec['id']
                
                # 3. Busca tarefas desta execução
                res_et = supabase.table("rh_execucao_tarefas").select("id").eq("execucao_processo_id", exec_id).execute()
                et_ids = [r['id'] for r in (res_et.data or [])]
                
                if et_ids:
                    logger.info(f"Limpando {len(et_ids)} tarefas da execução {exec_id}")
                    # 4. Limpa responsáveis e checklists das tarefas
                    supabase.table("rh_execucao_tarefas_responsaveis").delete().in_("execucao_tarefa_id", et_ids).execute()
                    supabase.table("rh_execucao_checklists").delete().in_("execucao_tarefa_id", et_ids).execute()
                    # 5. Limpa as tarefas de execução
                    supabase.table("rh_execucao_tarefas").delete().eq("execucao_processo_id", exec_id).execute()
                
                # 6. Deleta a execução do processo
                res_del_exec = supabase.table("rh_execucao_processos").delete().eq("id", exec_id).execute()
                if res_del_exec.data:
                    logger.info(f"Execução {exec_id} removida com sucesso.")
                else:
                    logger.warning(f"Falha ao remover execução {exec_id} ou já não existia.")

        # 7. Por fim, remove o vínculo permanente (template-cliente)
        res_link = supabase_admin.table("rh_processos_clientes").delete().eq("cliente_id", client_id).eq("processo_id", template_id).execute()
        
        if res_link.data:
            logger.info(f"Vínculo permanente removido: Cliente {client_id}, Processo {template_id}")
        
        return {"message": "Vínculo e execuções ativas removidos com sucesso"}
    except Exception as e:
        logger.error(f"Erro ao desvincular processo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}/clientes-atribuidos")
async def listar_clientes_atribuidos(id: int):
    """Retorna os IDs dos clientes que já estão vinculados a este processo (template)."""
    try:
        res = supabase.table("rh_processos_clientes").select("cliente_id").eq("processo_id", id).execute()
        return [r['cliente_id'] for r in (res.data or [])]
    except Exception as e:
        logger.error(f"Erro ao listar clientes atribuídos ao processo {id}: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar clientes vinculados.")

# --- Dashboard Execução ---

@router.get("/execucao/me")
async def listar_tarefas_me(funcionario_id: int, competencia_id: Optional[int] = None):
    """
    Lista tarefas de processos onde o funcionário é responsável por pelo menos uma etapa.
    Garante visibilidade compartilhada (todos membros veem o progresso total do processo).
    """
    try:
        # 1. Busca os IDs das tarefas em que o funcionário é responsável
        res_vinc = supabase.table("rh_execucao_tarefas_responsaveis") \
            .select("execucao_tarefa_id") \
            .eq("funcionario_id", funcionario_id) \
            .execute()
        
        tarefa_ids = [r['execucao_tarefa_id'] for r in (res_vinc.data or [])]
        if not tarefa_ids:
            return []

        # 2. Busca os IDs das EXECUÇÕES de processo vinculadas a essas tarefas
        res_proc_ids = supabase.table("rh_execucao_tarefas") \
            .select("execucao_processo_id") \
            .in_("id", tarefa_ids) \
            .execute()
            
        exec_proc_ids = list(set([r['execucao_processo_id'] for r in (res_proc_ids.data or [])]))
        
        if not exec_proc_ids:
            return []

        # 3. Busca TODAS as etapas de todos os processos que o funcionário "participa"
        query = supabase.table("rh_execucao_tarefas").select(
            "*, "
            "rh_execucao_processos(*, clientes(razao_social, drive_link), rh_processos(nome), rh_competencias(mes, ano)), "
            "rh_tarefas(titulo, ordem, dias_prazo), "
            "rh_execucao_tarefas_responsaveis(funcionario_id, funcionarios(nome))"
        ).in_("execucao_processo_id", exec_proc_ids)
        
        res = query.execute()
        
        # Pré-carregar contagens de passos para evitar queries N+1
        counts_map = {}
        res_all_steps = supabase.table("rh_execucao_tarefas").select("id, execucao_processo_id, status").in_("execucao_processo_id", exec_proc_ids).execute()
        for step in (res_all_steps.data or []):
            pid = step['execucao_processo_id']
            if pid not in counts_map:
                counts_map[pid] = {'total': 0, 'completed': 0}
            counts_map[pid]['total'] += 1
            if step['status'] == 'CONCLUIDA':
                counts_map[pid]['completed'] += 1

        data = []
        for t in (res.data or []):
            exec_p = t.get('rh_execucao_processos', {})
            if not exec_p: continue
            
            # Filtro manual de competência (se passado)
            if competencia_id and exec_p.get('competencia_id') != competencia_id:
                continue

            cliente = exec_p.get('clientes', {})
            proc_root = exec_p.get('rh_processos', {})
            comp = exec_p.get('rh_competencias', {})
            tarefa_root = t.get('rh_tarefas', {})
            
            # Cálculo de Data de Entrega
            due_date = f"{tarefa_root.get('dias_prazo', 0)}/{str(comp.get('mes', 1)).zfill(2)}" if comp else None

            # Busca progresso atual do processo
            pid = t['execucao_processo_id']
            total_steps = counts_map.get(pid, {}).get('total', 1)
            completed_steps = counts_map.get(pid, {}).get('completed', 0)
            
            # Processa responsáveis e verifica se é minha tarefa
            resps_data = t.get('rh_execucao_tarefas_responsaveis') or []
            is_my_task = any(str(r['funcionario_id']) == str(funcionario_id) for r in resps_data)
            
            # Nome do responsável (o primeiro da lista para exibição simplificada)
            responsible_name = "Equipe"
            if resps_data:
                func_data = resps_data[0].get('funcionarios', {})
                if func_data:
                    responsible_name = func_data.get('nome', "Equipe")

            data.append({
                "execution_id": t['execucao_processo_id'],
                "step_id": t['id'],
                "task_name": tarefa_root.get('titulo'),
                "client_name": cliente.get('razao_social'),
                "drive_link": cliente.get('drive_link'),
                "process_name": proc_root.get('nome'),
                "my_step_order": tarefa_root.get('ordem'),
                "current_step_order": completed_steps + 1, 
                "total_steps": total_steps,
                "assigned_role": responsible_name, 
                "is_my_task": is_my_task,
                "status": t['status'],
                "due_date": due_date,
                "anotacao": t.get('anotacao')
            })
            
        data.sort(key=lambda x: (1 if x['status'] == 'CONCLUIDA' else 0, x['my_step_order']))
        return data
    except Exception as e:
        logger.error(f"Erro ao listar tarefas dashboard me: {e}")
        return []

@router.get("/execucao/todos")
async def listar_tarefas_admin(competencia_id: Optional[int] = None, funcionario_id: Optional[int] = None, only_mine: bool = False):
    """Lista todas as tarefas para visão administrativa com indicadores otimizados e ordenação dinâmica"""
    try:
        # Busca tarefas com detalhes e contagem de progresso via join com a view
        query = supabase.table("rh_execucao_tarefas").select(
            "*, "
            "rh_execucao_processos(*, "
                "clientes(razao_social, drive_link), "
                "rh_processos(nome), "
                "rh_competencias(mes, ano)"
            "), "
            "rh_tarefas(titulo, ordem, dias_prazo), "
            "rh_execucao_tarefas_responsaveis(funcionario_id, funcionarios(nome))"
        )
        
        res = query.execute()
        
        all_tasks = res.data or []
        
        # OBTEM PROGRESSOS IN-MEMORY (Calcula direto das tarefas listadas)
        progresso_map = {}
        for t in all_tasks:
            pid = t.get('execucao_processo_id')
            if not pid: continue
            
            if pid not in progresso_map:
                progresso_map[pid] = {'total_steps': 0, 'completed_steps': 0}
                
            progresso_map[pid]['total_steps'] += 1
            if t.get('status') == 'CONCLUIDA':
                progresso_map[pid]['completed_steps'] += 1
        
        # Lógica de Visibilidade por Processo para Funcionários
        valid_process_ids = set()
        if funcionario_id:
            # 1. Identificar processos onde o funcionário participa
            for t in all_tasks:
                resps = t.get('rh_execucao_tarefas_responsaveis') or []
                if any(str(r['funcionario_id']) == str(funcionario_id) for r in resps):
                    valid_process_ids.add(t['execucao_processo_id'])

        data = []
        for t in all_tasks:
            exec_p = t.get('rh_execucao_processos', {})
            if not exec_p: continue
            
            # Filtro de competência
            if competencia_id and exec_p.get('competencia_id') != competencia_id:
                continue
                
            # Identificação de "Minha Tarefa"
            resps_data = t.get('rh_execucao_tarefas_responsaveis') or []
            is_my_task = any(str(r['funcionario_id']) == str(funcionario_id) for r in resps_data) if funcionario_id else False
            
            # REGRA DE VISIBILIDADE:
            # Se only_mine for True, mostra apenas as dele.
            # Se for funcionário (não admin), mostra apenas os processos em que ele participa.
            if only_mine:
                if not is_my_task: continue
            elif funcionario_id: # Se for dashboard de funcionário
                if t['execucao_processo_id'] not in valid_process_ids:
                    continue

            cliente = exec_p.get('clientes', {})
            proc_root = exec_p.get('rh_processos', {})
            comp = exec_p.get('rh_competencias', {})
            tarefa_root = t.get('rh_tarefas', {})
            
            # Pegando o progresso do dicionário que montamos
            progresso = progresso_map.get(t['execucao_processo_id'], {})
            
            due_date = f"{tarefa_root.get('dias_prazo', 0)}/{str(comp.get('mes', 1)).zfill(2)}" if comp else None

            # Valores de progresso vindos da View separada
            total_steps = progresso.get('total_steps', 1)
            completed_steps = progresso.get('completed_steps', 0)

            # Nome do responsável
            responsible_name = "Equipe"
            if resps_data:
                func_data = resps_data[0].get('funcionarios', {})
                if func_data:
                    responsible_name = func_data.get('nome', "Equipe")

            data.append({
                "execution_id": t['execucao_processo_id'],
                "step_id": t['id'],
                "task_name": tarefa_root.get('titulo'),
                "client_name": cliente.get('razao_social'),
                "drive_link": cliente.get('drive_link'),
                "process_name": proc_root.get('nome'),
                "my_step_order": tarefa_root.get('ordem'),
                "current_step_order": completed_steps + 1,
                "total_steps": total_steps,
                "assigned_role": responsible_name,
                "is_my_task": is_my_task,
                "status": t['status'],
                "due_date": due_date,
                "anotacao": t.get('anotacao')
            })
            
        # Ordenação Dinâmica: Pendentes primeiro, Concluídas por último
        data.sort(key=lambda x: (1 if x['status'] == 'CONCLUIDA' else 0, x['execution_id'], x['my_step_order']))
        
        return data
    except Exception as e:
        logger.error(f"Erro ao listar todas tarefas admin: {e}")
        return []

class AtualizarStatusPayload(BaseModel):
    status: str
    anotacao: Optional[str] = None

@router.patch("/execucao/tarefas/{task_id}/status")
async def atualizar_status_tarefa_execucao(task_id: int, payload: AtualizarStatusPayload, user_info: tuple = Depends(get_current_user_from_cookie)):
    """Atualiza o status (CONCLUIDA, PENDENTE, etc.) de uma tarefa em execução e desbloqueia dependentes."""
    try:
        user_id, user_data = user_info
        
        # Busca os dados atuais da tarefa antes de atualizar (garante execucao_processo_id)
        res_atual = supabase.table("rh_execucao_tarefas").select("execucao_processo_id, tarefa_id, status").eq("id", task_id).execute()
        if not res_atual.data:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
            
        exec_proc_id = res_atual.data[0]['execucao_processo_id']
        t_id = res_atual.data[0]['tarefa_id']

        # Verifica Permissão: se o usuário logado é um dos responsáveis
        res_resp = supabase.table("rh_execucao_tarefas_responsaveis").select("funcionario_id").eq("execucao_tarefa_id", task_id).execute()
        responsaveis = [str(r['funcionario_id']) for r in (res_resp.data or [])]
        
        user_id_str = str(user_id)
        user_role = user_data.get("role", "").lower() if isinstance(user_data, dict) else ""
        if user_id_str not in responsaveis and user_role not in ["admin", "gerente"]:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não está designado para esta tarefa.")

        # Monta o payload de atualização
        update_data = {"status": payload.status}
        if payload.anotacao is not None:
            update_data["anotacao"] = payload.anotacao
            
        logger.info(f"Atualizando tarefa {task_id}: status={payload.status}, anotacao={'SIM' if payload.anotacao else 'NÃO'}")
        res = supabase.table("rh_execucao_tarefas").update(update_data).eq("id", task_id).execute()
        
        # Sincronização Universal de Anotações: propaga para todas as tarefas do mesmo processo de execução
        if payload.anotacao is not None and exec_proc_id:
            logger.info(f"Propagando anotação para todas as tarefas do processo {exec_proc_id}")
            supabase.table("rh_execucao_tarefas").update({"anotacao": payload.anotacao}).eq("execucao_processo_id", exec_proc_id).execute()
        
        # Desbloqueia as próximas tarefas se a atual for concluída
        if payload.status == 'CONCLUIDA':
            # Busca tarefas base que dependem desta concluída
            dep_tarefas = supabase.table("rh_tarefas").select("id").eq("dependente_de_id", t_id).execute()
            dep_ids = [d['id'] for d in (dep_tarefas.data or [])]
            
            if dep_ids:
                # Atualiza as execuções filhas para PENDENTE (desbloqueia)
                supabase.table("rh_execucao_tarefas").update({"status": "PENDENTE"}).eq("execucao_processo_id", exec_proc_id).in_("tarefa_id", dep_ids).execute()

        return {"message": f"Status atualizado para {payload.status}", "data": res.data}
    except Exception as e:
        logger.error(f"Erro ao atualizar status da tarefa {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao concluir tarefa.")


@router.get("/execucao/tarefas/{task_id}/checklists")
async def listar_checklists_execucao(task_id: int):
    try:
        res = supabase.table("rh_execucao_checklists").select("*").eq("execucao_tarefa_id", task_id).execute()
        return res.data or []
    except Exception as e:
        return []

@router.patch("/execucao/checklists/{checklist_id}")
async def toggle_checklist_execucao(checklist_id: int, payload: dict, user_info: tuple = Depends(get_current_user_from_cookie)):
    try:
        user_id, user_data = user_info

        # Verifica a qual tarefa este checklist pertence
        res_chk = supabase.table("rh_execucao_checklists").select("execucao_tarefa_id").eq("id", checklist_id).execute()
        if not res_chk.data:
            raise HTTPException(status_code=404, detail="Checklist não encontrado")
            
        task_id = res_chk.data[0]['execucao_tarefa_id']
        
        # Verifica Permissão
        res_resp = supabase.table("rh_execucao_tarefas_responsaveis").select("funcionario_id").eq("execucao_tarefa_id", task_id).execute()
        responsaveis = [str(r['funcionario_id']) for r in (res_resp.data or [])]
        
        user_id_str = str(user_id)
        user_role = user_data.get("role", "").lower() if isinstance(user_data, dict) else ""
        if user_id_str not in responsaveis and user_role not in ["admin", "gerente"]:
            raise HTTPException(status_code=403, detail="Permissão negada. Você não está designado para editar esta tarefa.")

        res = supabase.table("rh_execucao_checklists").update({"is_checked": payload.get('is_checked')}).eq("id", checklist_id).execute()
        
        if res.data:
            exec_task_id = res.data[0]['execucao_tarefa_id']
            # Race Condition Fix: usa condição atômica para só avançar para EM ANDAMENTO
            # se o status atual for PENDENTE. Isso impede sobrescrever CONCLUIDA com EM ANDAMENTO
            # caso o usuário clique num item do checklist após concluir a tarefa.
            supabase.table("rh_execucao_tarefas") \
                .update({"status": "EM ANDAMENTO"}) \
                .eq("id", exec_task_id) \
                .eq("status", "PENDENTE") \
                .execute()

        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
