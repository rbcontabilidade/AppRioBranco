from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FuncionarioCreate(BaseModel):
    nome: str
    setor_id: int | None = None
    cargo_id: int | None = None
    permissao: str | None = "operacional"
    senha: str
    ativo: bool = True
    last_login: Optional[datetime] = None

class FuncionarioUpdate(BaseModel):
    nome: str | None = None
    setor_id: int | None = None
    cargo_id: int | None = None
    permissao: str | None = None
    senha: str | None = None
    ativo: bool | None = None
    last_login: Optional[datetime] = None
