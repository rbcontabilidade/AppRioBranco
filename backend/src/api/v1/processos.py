from fastapi import APIRouter, Depends, HTTPException
from src.crud.processos import (
    get_processos, get_processo_by_id, create_processo, update_processo,
    get_tarefas_by_processo, create_tarefa, delete_tarefa,
    get_processos_by_cliente, toggle_cliente_processo
)
from src.crud.execucoes import (
    gerar_nova_competencia, fechar_competencia, get_minhas_tarefas_execucao,
    update_status_tarefa, toggle_checklist_item, get_dashboard_kpis_execucao,
    get_competencia_ativa, get_checklists_tarefa
)
from src.models.processos_mensais import (
    ProcessoCreate, ProcessoUpdate, ProcessoResponse,
    TarefaCreate, TarefaUpdate, TarefaResponse,
    CheckItemExecucao
)

router = APIRouter(prefix="/processos", tags=["Processos Mensais"])

# ==========================================
# 1. TEMPLATES (PROCESSOS)
# ==========================================

@router.get("/", response_model=list[ProcessoResponse])
async def listar_processos():
    return await get_processos()

@router.get("/{id}", response_model=ProcessoResponse)
async def obter_processo(id: int):
    return await get_processo_by_id(id)

@router.post("/", response_model=ProcessoResponse)
async def criar_processo(processo: ProcessoCreate):
    return await create_processo(processo.dict())

@router.put("/{id}", response_model=ProcessoResponse)
async def atualizar_processo(id: int, processo: ProcessoUpdate):
    return await update_processo(id, processo.dict(exclude_unset=True))

# ==========================================
# 2. TEMPLATES (TAREFAS)
# ==========================================

@router.get("/{id}/tarefas", response_model=list[TarefaResponse])
async def listar_tarefas_do_processo(id: int):
    return await get_tarefas_by_processo(id)

@router.post("/{id}/tarefas", response_model=TarefaResponse)
async def adicionar_tarefa(id: int, tarefa: TarefaCreate):
    checklists_data = [{"item_texto": c.item_texto} for c in tarefa.checklists]
    return await create_tarefa(
        processo_id=id, 
        dados={"titulo": tarefa.titulo, "descricao": tarefa.descricao, "ordem": tarefa.ordem, "dependente_de_id": tarefa.dependente_de_id},
        responsaveis_ids=tarefa.responsaveis_ids,
        checklists=checklists_data
    )

@router.delete("/tarefas/{id}")
async def deletar_tarefa(id: int):
    return await delete_tarefa(id)

# ==========================================
# 3. VINCULO CLIENTES
# ==========================================
@router.get("/clientes/{cliente_id}")
async def buscar_processos_cliente(cliente_id: int):
    return await get_processos_by_cliente(cliente_id)

@router.post("/clientes/{cliente_id}/{processo_id}")
async def vincular_cliente_processo(cliente_id: int, processo_id: int):
    return await toggle_cliente_processo(cliente_id, processo_id, True)

@router.delete("/clientes/{cliente_id}/{processo_id}")
async def desvincular_cliente_processo(cliente_id: int, processo_id: int):
    return await toggle_cliente_processo(cliente_id, processo_id, False)

# ==========================================
# 4. EXECUÇÃO (MENSALIDADE)
# ==========================================

@router.get("/competencia/ativa")
async def rota_obter_competencia_ativa():
    return await get_competencia_ativa()

@router.post("/competencia/gerar/{mes}/{ano}")
async def rota_gerar_competencia(mes: int, ano: int):
    return await gerar_nova_competencia(mes, ano)

@router.post("/competencia/fechar/{id}")
async def rota_fechar_competencia(id: int):
    return await fechar_competencia(id)

@router.get("/dashboard/kpis")
async def rota_dashboard_kpis():
    return await get_dashboard_kpis_execucao()

@router.get("/execucao/me")
async def rota_minhas_tarefas(funcionario_id: int):
    # Nota: Em prod, pegar o funcionario_id pelo Token JWT
    return await get_minhas_tarefas_execucao(funcionario_id)

@router.patch("/execucao/tarefas/{id}/status")
async def rota_atualizar_status_tarefa(id: int, status: str):
    return await update_status_tarefa(id, status)

@router.patch("/execucao/checklists/{id}")
async def rota_marcar_checklist(id: int, check_item: CheckItemExecucao):
    return await toggle_checklist_item(id, check_item.is_checked)

@router.get("/execucao/tarefas/{id}/checklists")
async def rota_listar_checklists_tarefa(id: int):
    return await get_checklists_tarefa(id)
