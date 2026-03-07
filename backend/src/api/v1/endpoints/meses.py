from fastapi import APIRouter, HTTPException, Depends
from src.models.mes import MesCreate, MesUpdate
from src.crud.mes import MesCRUD
from src.api.v1.endpoints.auth import get_current_user_from_cookie

router = APIRouter(prefix="/api/meses", tags=["Meses"])
CurrentUser = Depends(get_current_user_from_cookie)

@router.get("")
def get_meses(user=CurrentUser):
    response = MesCRUD.get_all()
    return response.data

@router.post("")
def create_mes(mes: MesCreate, user=CurrentUser):
    response = MesCRUD.create(mes.model_dump())
    return response.data

@router.put("/{mes_id}")
def update_mes(mes_id: str, updates: MesUpdate, user=CurrentUser):
    # Bug #2 Guardrail: Impedir reabertura de competência fechada
    if updates.status == 'ABERTA':
        current_res = MesCRUD.get_by_id(mes_id)
        if current_res.data and current_res.data.get("status") == "FECHADA":
            raise HTTPException(
                status_code=400, 
                detail="Não é permitido reabrir uma competência que já foi FECHADA. Por favor, crie uma nova competência ou contate o administrador."
            )
            
    response = MesCRUD.update(mes_id, updates.model_dump(exclude_unset=True))
    return response.data

@router.delete("/{mes_id}")
def delete_mes(mes_id: str, user=CurrentUser):
    try:
        response = MesCRUD.delete_with_cascade(mes_id)
        if not response.data:
            raise HTTPException(status_code=404, detail="Nenhum registro deletado.")
        return response.data
    except ValueError as ve:
        # Erro de regra de negócio (ex: excluir aberta)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Erro ao deletar mês {mes_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao tentar excluir a competência.")

@router.post("/gerar/{mes}/{ano}")
def gerar_competencia(mes: int, ano: int, user=CurrentUser):
    """
    Invoca a função RPC que clona os processos para a nova competência
    respeitando as regras de recorrência.
    """
    try:
        from src.core.database import supabase_admin
        # Invoca a função RPC gerador_nova_competencia definida no Postgres
        res = supabase_admin.rpc("gerador_nova_competencia", {
            "v_mes": mes,
            "v_ano": ano
        }).execute()
        
        if hasattr(res, 'error') and res.error:
            error_msg = res.error.get('message', str(res.error))
            print(f"Erro RPC ao gerar competência {mes}/{ano}: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Erro no Banco de Dados: {error_msg}")
            
        return res.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro interno ao gerar competência {mes}/{ano}: {e}")
        raise HTTPException(status_code=500, detail=f"Falha técnica: {str(e)}")

@router.get("/ativa/atual")
def get_competencia_ativa_endpoint(user=CurrentUser):
    """Retorna a competência que está com status ABERTA"""
    try:
        from src.core.database import supabase_admin
        res = supabase_admin.table("rh_competencias").select("*").eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
        if res.data:
            return res.data[0]
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fechar/{competencia_id}")
def fechar_competencia_endpoint(competencia_id: int, user=CurrentUser):
    """Fecha a competência especificada"""
    try:
        from src.core.database import supabase_admin
        res = supabase_admin.table("rh_competencias").update({"status": "FECHADA"}).eq("id", competencia_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
