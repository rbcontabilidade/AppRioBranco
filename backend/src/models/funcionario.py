from pydantic import BaseModel

class FuncionarioCreate(BaseModel):
    nome: str
    setor_id: int | None = None
    cargo_id: int | None = None
    permissao: str | None = "operacional"
    senha: str
    ativo: bool = True

class FuncionarioUpdate(BaseModel):
    nome: str | None = None
    setor_id: int | None = None
    cargo_id: int | None = None
    permissao: str | None = None
    senha: str | None = None
    ativo: bool | None = None
