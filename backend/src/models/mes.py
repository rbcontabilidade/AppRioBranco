from pydantic import BaseModel
from typing import Optional

# Modelo para criação de competência (mês)
class MesCreate(BaseModel):
    id: str
    mes: str
    ativo: bool = False
    percent_concluido: int = 0
    atrasados: int = 0
    concluidos: int = 0
    total_execucoes: int = 0
    vencendo: int = 0

# Modelo para atualização de competência — inclui campo 'status' que era ausente (bug silencioso)
class MesUpdate(BaseModel):
    status: Optional[str] = None       # ABERTA | FECHADA | ARQUIVADA
    ativo: Optional[bool] = None
    percent_concluido: Optional[int] = None
    atrasados: Optional[int] = None
    concluidos: Optional[int] = None
    total_execucoes: Optional[int] = None
    vencendo: Optional[int] = None
