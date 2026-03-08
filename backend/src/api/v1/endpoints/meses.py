from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from src.models.mes import MesCreate, MesUpdate
from src.crud.mes import MesCRUD
from src.api.v1.endpoints.auth import get_current_user_from_cookie
from src.core.security import verify_password
from src.core.database import supabase, supabase_admin


router = APIRouter(prefix="/api/meses", tags=["Meses"])
CurrentUser = Depends(get_current_user_from_cookie)


# ─────────────────────────────────────────────
# Helpers internos de validação
# ─────────────────────────────────────────────

def _get_competencia_ou_404(mes_id: str) -> dict:
    """Busca a competência pelo ID ou lança 404."""
    res = MesCRUD.get_by_id(mes_id)
    if not res.data:
        raise HTTPException(status_code=404, detail="Competência não encontrada.")
    return res.data


def _existe_competencia_ativa(excluir_id: Optional[str] = None) -> bool:
    """Verifica se já existe uma competência com status ABERTA.
    Opcionalmente ignora um ID específico (útil ao verificar a própria competência)."""
    res = supabase.table("rh_competencias").select("id").eq("status", "ABERTA").execute()
    if not res.data:
        return False
    if excluir_id:
        # Retorna True somente se houver ativa diferente da que está sendo avaliada
        ativos = [str(c["id"]) for c in res.data if str(c["id"]) != str(excluir_id)]
        return len(ativos) > 0
    return len(res.data) > 0


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("")
def get_meses(user=CurrentUser):
    """Lista todas as competências ordenadas por data decrescente."""
    response = MesCRUD.get_all()
    return response.data


@router.post("")
def create_mes(mes: MesCreate, user=CurrentUser):
    """Cria uma nova competência manualmente (uso legacy)."""
    response = MesCRUD.create(mes.model_dump())
    return response.data


@router.put("/{mes_id}")
def update_mes(mes_id: str, updates: MesUpdate, user=CurrentUser):
    """
    Atualiza uma competência.
    Regras:
      - Não é permitido reabrir (ABERTA) uma competência que já foi FECHADA
      - Não é permitido ativar (ABERTA) se já existe outra competência ativa
    """
    # Busca o estado atual
    comp = _get_competencia_ou_404(mes_id)
    status_atual = comp.get("status", "")
    novo_status = updates.status

    # Guardrail 1: Não reabrir competência já fechada
    if novo_status == "ABERTA" and status_atual == "FECHADA":
        raise HTTPException(
            status_code=400,
            detail=(
                "Não é permitido reabrir uma competência que já foi FECHADA. "
                "Por favor, crie uma nova competência para o próximo período."
            )
        )

    # Guardrail 2: Regra de competência única ativa
    if novo_status == "ABERTA" and status_atual != "ABERTA":
        if _existe_competencia_ativa(excluir_id=mes_id):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Já existe uma competência ativa. "
                    "Encerre a competência atual antes de ativar outra."
                )
            )

    response = MesCRUD.update(mes_id, updates.model_dump(exclude_unset=True))
    return response.data


@router.delete("/{mes_id}")
def delete_mes(mes_id: str, user=CurrentUser):
    """
    Exclui uma competência com todas suas dependências via RPC.
    Regras:
      - Competências ABERTAS jamais podem ser excluídas
      - Competências FECHADAS/ARQUIVADAS requerem verificação de senha (feita no frontend antes)
    """
    comp = _get_competencia_ou_404(mes_id)
    status_atual = comp.get("status", "")

    # Guardrail absoluto: nunca deletar competência ativa
    if status_atual == "ABERTA":
        raise HTTPException(
            status_code=403,
            detail="Competências ativas não podem ser excluídas. Encerre-a primeiro se desejar remover o histórico."
        )

    try:
        response = MesCRUD.delete_with_cascade(mes_id)
        if not response.data:
            raise HTTPException(status_code=404, detail="Nenhum registro deletado. Verifique o ID fornecido.")
        return response.data
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"[meses] Erro ao deletar mês {mes_id}: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao tentar excluir a competência.")


@router.post("/gerar/{mes}/{ano}")
def gerar_competencia(mes: int, ano: int, user=CurrentUser):
    """
    Invoca a função RPC que clona os processos para a nova competência
    respeitando as regras de recorrência.
    """
    # Guardrail: Não permitir gerar nova competência se já houver uma ativa!
    if _existe_competencia_ativa():
        raise HTTPException(
            status_code=409,
            detail="Já existe uma competência ativa. Encerre-a antes de gerar uma nova."
        )

    try:
        client = supabase_admin if supabase_admin else supabase
        res = client.rpc("gerador_nova_competencia", {
            "v_mes": mes,
            "v_ano": ano
        }).execute()

        if hasattr(res, 'error') and res.error:
            error_msg = res.error.get('message', str(res.error))
            print(f"[meses] Erro RPC ao gerar competência {mes}/{ano}: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Erro no Banco de Dados: {error_msg}")

        return res.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"[meses] Erro interno ao gerar competência {mes}/{ano}: {e}")
        raise HTTPException(status_code=500, detail=f"Falha técnica: {str(e)}")


@router.get("/ativa/atual")
def get_competencia_ativa_endpoint(user=CurrentUser):
    """Retorna a competência que está com status ABERTA."""
    try:
        res = supabase.table("rh_competencias").select("*").eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
        if res.data:
            return res.data[0]
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fechar/{competencia_id}")
def fechar_competencia_endpoint(competencia_id: int, user=CurrentUser):
    """Fecha a competência especificada — muda status para FECHADA."""
    try:
        res = supabase.table("rh_competencias").update({"status": "FECHADA"}).eq("id", competencia_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Endpoint de segurança: verificação de senha
# Usado pelo modal de confirmação para exclusão de competências fechadas
# ─────────────────────────────────────────────

class VerificarSenhaRequest(BaseModel):
    password: str


@router.post("/verificar-senha")
def verificar_senha(body: VerificarSenhaRequest, user_info: tuple = CurrentUser):
    """
    Valida a senha do usuário atualmente autenticado.
    Retorna sucesso (200) se a senha estiver correta, ou 401 se inválida.
    Usado como step de segurança antes de ações destrutivas em competências fechadas.
    """
    user_id, payload = user_info

    # Busca a senha armazenada do usuário atual
    res = supabase.table("funcionarios").select("id, senha").eq("id", user_id).execute()

    if not res.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    funcionario = res.data[0]
    senha_armazenada = funcionario.get("senha", "")

    if not verify_password(body.password, senha_armazenada):
        raise HTTPException(
            status_code=401,
            detail="Senha inválida. Tente novamente."
        )

    return {"valid": True, "message": "Senha confirmada com sucesso."}
