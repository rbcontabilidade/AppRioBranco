from fastapi import APIRouter, Depends
from src.models.setor import SetorCreate, SetorUpdate
from src.crud.setor import SetorCRUD
from src.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter(prefix="/api/setores", tags=["Setores"])
CurrentUser = Depends(get_current_user_from_cookie)

@router.get("")
def get_setores(user=CurrentUser):
    response = SetorCRUD.get_all()
    return response.data

@router.post("")
def create_setor(setor: SetorCreate, user=CurrentUser):
    response = SetorCRUD.create(setor.model_dump())
    return response.data

@router.put("/{setor_id}")
def update_setor(setor_id: int, updates: SetorUpdate, user=CurrentUser):
    response = SetorCRUD.update(setor_id, updates.model_dump(exclude_unset=True))
    return response.data

@router.delete("/{setor_id}")
def delete_setor(setor_id: int, user=CurrentUser):
    response = SetorCRUD.delete(setor_id)
    return response.data
