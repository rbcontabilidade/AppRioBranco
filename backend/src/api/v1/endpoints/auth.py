from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

# Importar cliente Supabase desacoplado
from src.core.database import supabase
from src.core.security import verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["AutenticaÃ§Ã£o"])

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    nome: str
    permissao: str
    cargo_id: Optional[int]
    ativo: bool
    email: Optional[str]

def get_current_user_from_cookie(request: Request):
    # Tenta obter o token do cabeçalho Authorization primeiro (padrão Bearer Token)
    auth_header = request.headers.get("Authorization")
    token = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
    else:
        # Fallback para o cookie legado
        token = request.cookies.get("access_token")
        if token and token.startswith("Bearer "):
            token = token[7:]
        elif token:
            # Token bruto no cookie
            token = token

    if not token:
        print("[Auth] Nenhum token encontrado na requisicao.")
        raise HTTPException(status_code=401, detail="Nao autenticado")
        
    try:
        # Tenta validar primeiro como um token do Supabase (Mais provável vindo do frontend novo)
        from src.core.security import validate_supabase_token
        print(f"[Auth] Validando token (prefixo): {token[:15]}...")
        
        payload = validate_supabase_token(token)
        
        if not payload:
            print("[Auth] Token Supabase nao validado, tentando local/legado...")
            # Fallback para o token local/antigo
            payload = decode_access_token(token)

        # Mapeamento do user_id: 
        # No Supabase o 'sub' é um UUID. No local é o ID numérico.
        # Se for um UUID (Supabase), precisamos buscar o id numérico correspondente 
        # ou garantir que as queries funcionem com o UUID.
        # Por enquanto retornamos o payload completo para os endpoints decidirem.
        user_id = payload.get("sub")
        print(f"[Auth] Usuario identificado: {user_id}")
        
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
            
        return user_id, payload
    except Exception as e:
        print(f"[Auth] Erro critico na validacao: {str(e)}")
        raise HTTPException(status_code=401, detail="Nao autenticado ou token expirado")

@router.post("/login")
async def login(response: Response, form_data: LoginRequest):
    """
    Fluxo de Login alterado para a tabela 'funcionarios'.
    1. Busca pelo nome do funcionário.
    2. Valida a senha usando bcrypt (ou plain text do banco via fallback).
    3. Trata privilégios considerando a coluna 'permissao'.
    """
    try:
        if supabase is None:
            raise HTTPException(status_code=500, detail="SUPABASE_OFFLINE")

        # 1. Buscar usuário na tabela 'funcionarios' usando 'nome'
        user_res = supabase.table("funcionarios").select("*").eq("nome", form_data.username).execute()
        
        if not user_res.data:
            raise HTTPException(status_code=400, detail="Usuário ou senha incorretos")
            
        user = user_res.data[0]
        
        if not user.get("ativo"):
            raise HTTPException(status_code=403, detail="Usuário desativado. Contate o administrador.")
        
        # 2. Verificar senha via módulo de segurança local (suporta bcrypt e plain text fallback)
        if not verify_password(form_data.password, user.get("senha")):
            raise HTTPException(status_code=400, detail="Usuário ou senha incorretos")

        # 3. Lógica RBAC: Identifica nível
        user_role = user.get("permissao", "Operacional")
        is_admin = user_role.lower() in ["admin", "gerente", "supervisor"] or user.get("nome", "").lower() == "manager"
        
        
        # 4. Gerar Token Baseado no ID numérico / String Curto
        token_data = {
            "sub": str(user["id"]),
            "nome": user.get("nome"),
            "role": "admin" if is_admin else user_role,
            "original_role": user_role
        }
        
        access_token = create_access_token(data=token_data)
        
        # Define o cookie seguro (HttpOnly por padrão no seu middleware se aplicável, mas aqui faremos explícito)
        response.set_cookie(
            key="access_token", 
            value=f"Bearer {access_token}", 
            httponly=False, # Definido como False para compatibilidade com o fetch simples se necessário
            max_age=1440 * 60, # 24 horas em segundos
            samesite="lax",
            secure=False # Em localhost (HTTP) deve ser False
        )
        
        return {
             "message": "Login efetuado com sucesso",
             "access_token": access_token,
             "token_type": "bearer",
             "user": {
                 "id": user["id"],
                 "nome": user.get("nome"),
                 "role": "admin" if is_admin else user_role,
                 "is_admin": is_admin
             }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(response: Response):
    """Remove o cookie de acesso."""
    response.delete_cookie("access_token")
    return {"message": "Deslogado com sucesso"}

@router.get("/me")
async def get_me(user_info: tuple = Depends(get_current_user_from_cookie)):
    """Verifica se o token ainda Ã© vÃ¡lido ou recarrega informaÃ§Ãµes essenciais da sessÃ£o"""
    user_id, payload = user_info
    
    # Busca dados atualizados do funcionário
    user_res = supabase.table("funcionarios").select("id, nome, ativo, cargo_id, permissao, avatar_url").eq("id", user_id).execute()
    
    if not user_res.data:
        raise HTTPException(status_code=404, detail="UsuÃ¡rio nÃ£o encontrado")
        
    user = user_res.data[0]
    
    telas = ["operacional", "meu-desempenho"]
    
    if str(user.get("cargo_id")) != "None" and user.get("cargo_id"):
         cargos_res = supabase.table("cargos_permissoes").select("telas_permitidas").eq("id", user["cargo_id"]).execute()
         if cargos_res.data:
              tt = cargos_res.data[0].get("telas_permitidas", [])
              if isinstance(tt, str):
                  import json
                  try: tt = json.loads(tt) 
                  except: tt = []
              telas = tt
    
    # Garantir telas mínimas para evitar loop de redirecionamento no frontend
    for t_base in ["dashboard", "settings"]:
        if t_base not in telas:
            telas.append(t_base)
    
    user_role = user.get("permissao", "Operacional")
    is_gerente = user_role.lower() in ["gerente", "supervisor"]
    is_admin = user_role.lower() == "admin" or user.get("nome", "").lower() == "manager"
    
    if is_gerente or is_admin:
        todas = ['dashboard', 'operacional', 'clientes', 'equipe', 'rotinas', 'marketing', 'settings', 'competencias', 'meu-desempenho']
        for t in todas:
            if t not in telas: telas.append(t)
            
    return {
        "id": user["id"],
        "nome": user["nome"],
        "permissao": user_role,
        "telas_permitidas": telas,
        "role": user_role,
        "avatar_url": user.get("avatar_url")
    }

@router.post("/debug-login")
async def debug_login(form_data: dict, request: Request):
    """Ponta provisÃ³ria para provar falha no Fetch do Frontend ou na Leitura Pydantic"""
    return {
        "is_pydantic_ok": True,
        "is_db_ok": supabase is not None,
        "payload_received": form_data,
        "headers": dict(request.headers),
        "cookies": request.cookies
    }

@router.put('/profile')
async def update_profile(request: Request, body: dict, user_info: tuple = Depends(get_current_user_from_cookie)):
    """Rota para o usuário logado atualizar nome e avatar_url no próprio cadastro de funcionário."""
    user_id, payload = user_info
    
    nome = body.get('nome')
    avatar_url = body.get('avatar_url')
    
    update_data = {}
    if nome is not None:
        update_data['nome'] = nome
    # Atualmente a tabela funcionarios não tem avatar_url, devemos garantir que possamos salvar lá ou ignorar se não existir
    # Pelo requirement anterior, vamos focar em nome e caso haja avatar_url no futuro.
    if avatar_url is not None:
         # Vamos tentar atualizar, se a coluna não existir, o Supabase retornará erro
         # No futuro deve-se adicionar a coluna avatar_url na tabela funcionarios
         update_data['avatar_url'] = avatar_url
         
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado enviado para atualização.")
        
    try:
        update_res = supabase.table('funcionarios').update(update_data).eq('id', user_id).execute()
        return {'message': 'Perfil atualizado com sucesso.', 'data': update_res.data}
    except Exception as e:
        print(f"Erro ao atualizar perfil: {e}")
        # Ignora erro de coluna inexistente para avatar_url por enquanto
        if "avatar_url" in str(e):
             del update_data['avatar_url']
             if update_data:
                 update_res = supabase.table('funcionarios').update(update_data).eq('id', user_id).execute()
                 return {'message': 'Perfil atualizado com sucesso (Avatar ignorado pois coluna não existe).', 'data': update_res.data}
             else:
                 return {'message': 'Nada a atualizar.'}
        raise HTTPException(status_code=500, detail="Erro interno ao atualizar perfil.")


@router.post('/change-password')
async def change_password(request: Request, body: dict, user_info: tuple = Depends(get_current_user_from_cookie)):
    """Rota para o usuário logado alterar sua própria senha."""
    user_id, payload = user_info
    
    current_password = body.get('current_password')
    new_password = body.get('new_password')
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail='Senha atual e nova senha são obrigatórios.')
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail='A nova senha deve ter no mínimo 6 caracteres.')
    
    user_res = supabase.table('funcionarios').select('senha, nome').eq('id', user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail='Usuário não encontrado.')
    
    user = user_res.data[0]
    
    if not verify_password(current_password, user.get('senha', '')):
         raise HTTPException(status_code=400, detail='Senha atual incorreta.')
    
    from src.core.security import get_password_hash
    hashed_new_password = get_password_hash(new_password)
    
    update_res = supabase.table('funcionarios').update({'senha': hashed_new_password}).eq('id', user_id).execute()
    

    return {'message': 'Senha alterada com sucesso.'}

