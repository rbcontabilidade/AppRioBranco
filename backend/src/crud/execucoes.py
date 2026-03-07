from src.core.database import get_supabase
from fastapi import HTTPException
from datetime import datetime

# ==========================================
# 4. INSTANCIAS DE EXECUÇÃO (O MÊS CORRENTE)
# ==========================================

async def gerar_nova_competencia(mes: int, ano: int):
    supabase = get_supabase()
    # Chama a RPC craida no Supabase que faz todo o trabalho de clonar e vincular as tarefas
    try:
        response = supabase.rpc("gerador_nova_competencia", {"v_mes": mes, "v_ano": ano}).execute()
        nova_comp_id = response.data
        return {"message": "Competência gerada com sucesso", "competencia_id": nova_comp_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def fechar_competencia(competencia_id: int):
    supabase = get_supabase()
    supabase.table("rh_competencias").update({"status": "FECHADA", "data_fechamento": datetime.now().isoformat()}).eq("id", competencia_id).execute()
    return {"message": "Competência Fechada"}

async def get_competencia_ativa():
    supabase = get_supabase()
    comp_aberta = supabase.table("rh_competencias").select("*").eq("status", "ABERTA").execute()
    if comp_aberta.data:
        return comp_aberta.data[0]
    return None

async def get_minhas_tarefas_execucao(funcionario_id: int):
    """
    Retorna a lista de Processos Ativos -> Tarefas do Funcionario
    Filtrado somente pelo Mês que está ABERTO
    """
    supabase = get_supabase()
    # Em vez de fazer lógicas complexas aqui, chamaremos a SQL RPC
    # que já faz todos os JOINS e verificações de acesso.
    try:
        response = supabase.rpc("get_dashboard_tarefas", {"p_funcionario_id": funcionario_id}).execute()
        return response.data or []
    except Exception as e:
        print("Erro ao buscar tarefas dashboard:", e)
        return []

async def get_dashboard_kpis_execucao():
    """Busca o consolidado de KPIs da competência atual ABERTA"""
    supabase = get_supabase()
    try:
        response = supabase.rpc("get_dashboard_kpis").execute()
        if response.data:
            return response.data[0] # Retorna o dict da primeira (e uúnica) linha
        return {"total": 0, "concluidos": 0, "pendentes": 0, "atrasados": 0}
    except Exception as e:
        print("Erro ao buscar KPIs dashboard:", e)
        return {"total": 0, "concluidos": 0, "pendentes": 0, "atrasados": 0}
    
async def update_status_tarefa(execucao_tarefa_id: int, status: str):
    supabase = get_supabase()
    
    dados = {"status": status}
    if status == 'CONCLUIDA':
        dados["concluido_em"] = datetime.now().isoformat()
        
    response = supabase.table("rh_execucao_tarefas").update(dados).eq("id", execucao_tarefa_id).execute()
    return response.data

async def toggle_checklist_item(execucao_checklist_id: int, is_checked: bool):
    supabase = get_supabase()
    dados = {"is_checked": is_checked}
    if is_checked:
        dados["checked_em"] = datetime.now().isoformat()
        
    response = supabase.table("rh_execucao_checklists").update(dados).eq("id", execucao_checklist_id).execute()
    return response.data

async def get_checklists_tarefa(execucao_tarefa_id: int):
    supabase = get_supabase()
    response = supabase.table("rh_execucao_checklists").select("*").eq("execucao_tarefa_id", execucao_tarefa_id).execute()
    return response.data or []
