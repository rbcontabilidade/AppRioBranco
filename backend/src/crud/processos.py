from src.core.database import get_supabase
from fastapi import HTTPException

# ==========================================
# 1. PROCESSOS (TEMPLATES)
# ==========================================

async def get_processos(ativo_apenas: bool = False):
    supabase = get_supabase()
    query = supabase.table("rh_processos").select("*")
    if ativo_apenas:
        query = query.eq("is_active", True)
    
    response = query.order("nome").execute()
    return response.data

async def get_processo_by_id(processo_id: int):
    supabase = get_supabase()
    response = supabase.table("rh_processos").select("*").eq("id", processo_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    return response.data[0]

async def create_processo(dados: dict):
    supabase = get_supabase()
    response = supabase.table("rh_processos").insert(dados).execute()
    return response.data[0]

async def update_processo(processo_id: int, dados: dict):
    supabase = get_supabase()
    response = supabase.table("rh_processos").update(dados).eq("id", processo_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    return response.data[0]

# ==========================================
# 2. TAREFAS
# ==========================================

async def get_tarefas_by_processo(processo_id: int):
    supabase = get_supabase()
    # Puxar tarefas, responsaveis e checklists
    response = supabase.table("rh_tarefas").select("*, rh_tarefas_responsaveis(funcionario_id), rh_tarefas_checklists(id, item_texto, criado_em)").eq("processo_id", processo_id).order("ordem").execute()
    
    tarefasFormatadas = []
    for t in response.data:
        t_dict = dict(t)
        # Formatar responsaveis para lista flat de IDs
        resp_list = t_dict.pop("rh_tarefas_responsaveis", [])
        t_dict["responsaveis"] = [r["funcionario_id"] for r in resp_list]
        
        # Checklists
        t_dict["checklists"] = t_dict.pop("rh_tarefas_checklists", [])
        tarefasFormatadas.append(t_dict)
        
    return tarefasFormatadas

async def create_tarefa(processo_id: int, dados: dict, responsaveis_ids: list, checklists: list):
    supabase = get_supabase()
    dados["processo_id"] = processo_id
    
    # Inserir a tarefa principal
    resp_tarefa = supabase.table("rh_tarefas").insert(dados).execute()
    tarefa_nova = resp_tarefa.data[0]
    tarefa_id = tarefa_nova["id"]
    
    # Inserir responsaveis
    if responsaveis_ids:
        resp_data = [{"tarefa_id": tarefa_id, "funcionario_id": f_id} for f_id in responsaveis_ids]
        supabase.table("rh_tarefas_responsaveis").insert(resp_data).execute()
        
    # Inserir checklists
    if checklists:
        check_data = [{"tarefa_id": tarefa_id, "item_texto": c["item_texto"]} for c in checklists]
        supabase.table("rh_tarefas_checklists").insert(check_data).execute()
        
    return tarefa_nova

async def delete_tarefa(tarefa_id: int):
    supabase = get_supabase()
    supabase.table("rh_tarefas").delete().eq("id", tarefa_id).execute()
    return {"message": "Tarefa removida"}

# ==========================================
# 3. VINCULO CLIENTE <-> PROCESSO
# ==========================================

async def get_processos_by_cliente(cliente_id: int):
    supabase = get_supabase()
    response = supabase.table("rh_processos_clientes").select("processo_id, rh_processos(*)").eq("cliente_id", cliente_id).execute()
    return [r["rh_processos"] for r in response.data]

async def toggle_cliente_processo(cliente_id: int, processo_id: int, vincular: bool):
    supabase = get_supabase()
    if vincular:
        try:
            supabase.table("rh_processos_clientes").insert({"cliente_id": cliente_id, "processo_id": processo_id}).execute()
        except:
            pass # Ja existe = ignora
    else:
        supabase.table("rh_processos_clientes").delete().eq("cliente_id", cliente_id).eq("processo_id", processo_id).execute()
    return {"message": "Vinculo atualizado"}
