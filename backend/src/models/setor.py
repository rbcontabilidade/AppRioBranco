from pydantic import BaseModel

class SetorCreate(BaseModel):
    nome: str

class SetorUpdate(BaseModel):
    nome: str | None = None
