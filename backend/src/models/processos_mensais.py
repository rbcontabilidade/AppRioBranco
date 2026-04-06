from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# ==========================================
# 1. PROCESSOS (TEMPLATES)
# ==========================================

class ProcessoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    is_active: bool = True

class ProcessoCreate(ProcessoBase):
    pass

class ProcessoUpdate(ProcessoBase):
    pass

class ProcessoResponse(ProcessoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

# ==========================================
# 2. TAREFAS
# ==========================================

class TarefaChecklistBase(BaseModel):
    item_texto: str

class TarefaChecklistCreate(TarefaChecklistBase):
    pass

class TarefaChecklistResponse(TarefaChecklistBase):
    id: int
    criado_em: datetime

class TarefaBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    ordem: int = 0
    dependente_de_id: Optional[int] = None

class TarefaCreate(TarefaBase):
    responsaveis_ids: List[int] = []
    checklists: List[TarefaChecklistCreate] = []

class TarefaUpdate(TarefaBase):
    responsaveis_ids: Optional[List[int]] = None

class TarefaResponse(TarefaBase):
    id: int
    processo_id: int
    criado_em: datetime
    responsaveis: List[int] = [] # IDs dos funcionarios
    checklists: List[TarefaChecklistResponse] = []

# ==========================================
# 3. VINCULO CLIENTE X PROCESSO
# ==========================================

class VinculoClienteProcesso(BaseModel):
    processo_id: int
    cliente_id: int

# ==========================================
# 4. INSTANCIAS (COMPETENCIA)
# ==========================================

class CheckItemExecucao(BaseModel):
    is_checked: bool

class CompetenciaResponse(BaseModel):
    id: int
    mes: int
    ano: int
    status: str
    data_abertura: datetime
    data_fechamento: Optional[datetime] = None

class ExecucaoChecklistResponse(BaseModel):
    id: int
    item_texto: str
    is_checked: bool
    checked_em: Optional[datetime] = None

class ExecucaoTarefaResponse(BaseModel):
    id: int
    tarefa_template_id: int
    titulo: str
    descricao: Optional[str] = None
    status: str # BLOQUEADA, PENDENTE, CONCLUIDA
    dependente_de_id: Optional[int] = None
    iniciado_em: datetime
    concluido_em: Optional[datetime] = None
    responsaveis: List[dict] = [] # { id, nome }
    checklists: List[ExecucaoChecklistResponse] = []

class ExecucaoProcessoResponse(BaseModel):
    id: int
    processo_template_id: int
    nome_processo: str
    cliente_id: int
    nome_cliente: str
    competencia_id: int
    status: str
    iniciado_em: datetime
    concluido_em: Optional[datetime] = None
    tarefas: List[ExecucaoTarefaResponse] = []
