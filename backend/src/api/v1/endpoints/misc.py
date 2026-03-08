from fastapi import APIRouter, HTTPException, Depends
from src.models.misc import (
    SectorCreate, LogCreate, RotinaBaseCreate, RotinaBaseUpdate,
    CargoCreate, CargoUpdate, CargoNivelCreate, CargoNivelUpdate,
    GlobalConfigUpdate
)
from src.crud.misc import MiscCRUD
from src.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter(prefix="/api", tags=["Miscelânea"])
CurrentUser = Depends(get_current_user_from_cookie)

# Setores
@router.get("/setores")
def get_setores(user=CurrentUser):
    return MiscCRUD.get_setores().data

@router.post("/setores")
def create_setor(setor: SectorCreate, user=CurrentUser):
    return MiscCRUD.create_setor(setor.model_dump()).data

@router.delete("/setores/{nome}")
def delete_setor(nome: str, user=CurrentUser):
    return MiscCRUD.delete_setor(nome).data

# Rotinas Base
@router.get("/rotinas_base")
def get_rotinas_base(user=CurrentUser):
    return MiscCRUD.get_rotinas_base().data

@router.post("/rotinas_base")
def create_rotina(rotina: RotinaBaseCreate, user=CurrentUser):
    return MiscCRUD.create_rotina(rotina.model_dump()).data

@router.put("/rotinas_base/{rotina_id}")
def update_rotina(rotina_id: int, updates: RotinaBaseUpdate, user=CurrentUser):
    return MiscCRUD.update_rotina(rotina_id, updates.model_dump(exclude_unset=True)).data

@router.delete("/rotinas_base/{rotina_id}")
def delete_rotina(rotina_id: int, user=CurrentUser):
    return MiscCRUD.delete_rotina_with_cascade(rotina_id).data

# Logs
@router.get("/logs")
def get_logs(user=CurrentUser):
    return MiscCRUD.get_logs().data

@router.post("/logs")
def create_log(log: LogCreate, user=CurrentUser):
    return MiscCRUD.create_log(log.model_dump()).data

# Cargos
@router.get("/cargos_permissoes")
def get_cargos(user=CurrentUser):
    res = MiscCRUD.get_cargos()
    return res.data

@router.post("/cargos_permissoes")
def create_cargo(cargo: CargoCreate, user=CurrentUser):
    try:
        res = MiscCRUD.create_cargo(cargo.model_dump())
        if hasattr(res, 'error') and res.error:
            # Erro de duplicidade (PGRST 23505 ou similar)
            if "duplicate key" in str(res.error).lower() or "already exists" in str(res.error).lower():
                raise HTTPException(status_code=400, detail="Já existe um cargo com este nome.")
            raise HTTPException(status_code=500, detail=f"Erro ao criar cargo: {res.error}")
        return res.data
    except Exception as e:
        if "already exists" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Já existe um cargo com este nome.")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/cargos_permissoes/{cargo_id}")
def update_cargo(cargo_id: int, updates: CargoUpdate, user=CurrentUser):
    try:
        res = MiscCRUD.update_cargo(cargo_id, updates.model_dump(exclude_unset=True))
        if hasattr(res, 'error') and res.error:
            if "duplicate key" in str(res.error).lower() or "already exists" in str(res.error).lower():
                raise HTTPException(status_code=400, detail="Já existe um cargo com este nome.")
            raise HTTPException(status_code=500, detail=f"Erro ao atualizar cargo: {res.error}")
        return res.data
    except Exception as e:
        if "already exists" in str(e).lower() or "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Já existe um cargo com este nome.")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cargos_permissoes/{cargo_id}")
def delete_cargo(cargo_id: int, user=CurrentUser):
    try:
        res = MiscCRUD.delete_cargo(cargo_id)
        if hasattr(res, 'error') and res.error:
            if "foreign key constraint" in str(res.error).lower():
                raise HTTPException(status_code=400, detail="Não é possível excluir este cargo porque existem usuários ou níveis vinculados a ele.")
            raise HTTPException(status_code=500, detail=f"Erro ao excluir cargo: {res.error}")
        return res.data
    except Exception as e:
        if "foreign key constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Não é possível excluir este cargo porque existem usuários ou níveis vinculados a ele.")
        raise HTTPException(status_code=500, detail=str(e))

# Níveis de Cargo
@router.get("/cargos_permissoes/{cargo_id}/niveis")
def get_cargo_niveis(cargo_id: int, user=CurrentUser):
    return MiscCRUD.get_cargo_niveis(cargo_id).data

@router.post("/cargos_permissoes/{cargo_id}/niveis")
def create_cargo_nivel(cargo_id: int, nivel: CargoNivelCreate, user=CurrentUser):
    return MiscCRUD.create_cargo_nivel(cargo_id, nivel.model_dump()).data

@router.put("/cargos_permissoes/{cargo_id}/niveis/{nivel_id}")
def update_cargo_nivel(cargo_id: int, nivel_id: int, updates: CargoNivelUpdate, user=CurrentUser):
    return MiscCRUD.update_cargo_nivel(nivel_id, updates.model_dump(exclude_unset=True)).data

@router.delete("/cargos_permissoes/{cargo_id}/niveis/{nivel_id}")
def delete_cargo_nivel(cargo_id: int, nivel_id: int, user=CurrentUser):
    return MiscCRUD.delete_cargo_nivel(nivel_id).data

# Config Global
@router.get("/global_config")
def get_global_config(user=CurrentUser):
    return MiscCRUD.get_global_config().data

@router.put("/global_config/{id}")
def update_global_config(id: int, updates: GlobalConfigUpdate, user=CurrentUser):
    return MiscCRUD.update_global_config(id, updates.model_dump(exclude_unset=True)).data
