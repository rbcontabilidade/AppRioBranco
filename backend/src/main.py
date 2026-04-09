import os
import sys

# Hack para o Vercel Serverless
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

from src.core.database import supabase, supabase_admin, supabase_error, url
from src.api.v1.endpoints import auth, clientes, funcionarios, setores, meses, execucoes, misc, processos, performance
from src.api.v1.endpoints.auth import get_current_user_from_cookie

app = FastAPI(title="FiscalApp API")

# Middlewares
# Definindo as origens explicitas para ambiente de producao
frontend_prod_url = os.getenv("FRONTEND_URL", "https://app-rio-branco.vercel.app") 

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5500",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        frontend_prod_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MIDDLEWARE DE LOG DE ERROS ---
@app.middleware("http")
async def log_supabase_errors(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        import traceback
        print(f"\n[ERRO GLOBAL] Falha na rota: {request.url.path}")
        print(f"Detalhes: {str(e)}")
        # Se for um erro do cliente Supabase, ele costuma ter atributos de erro específicos
        if hasattr(e, 'message'):
            print(f"Mensagem Supabase: {e.message}")
        if hasattr(e, 'code'):
            print(f"Código Erro: {e.code}")
        
        # traceback.print_exc()
        raise e

# --- ROTAS E ENDPOINTS MODULARES ---
app.include_router(auth.router)
app.include_router(clientes.router)
app.include_router(funcionarios.router)
app.include_router(setores.router)
# app.include_router(cargos.router) # Removido por colisão com misc.router
app.include_router(meses.router)
app.include_router(execucoes.router)
app.include_router(processos.router)
app.include_router(performance.router)

app.include_router(misc.router)

# --- ENDPOINTS DE DIAGNÓSTICO E SISTEMA ---

@app.get("/")
def healthcheck():
    """Healthcheck exigido pelo Hugging Face para confirmar que o container iniciou."""
    return {"status": "ok", "message": "FiscalApp API Online"}

@app.get("/api/status")
def read_root():
    if supabase is None:
        return {"status": f"FiscalApp API rodando, mas Supabase falhou ao iniciar! Erro: {supabase_error}"}
    return {"status": "FiscalApp API Online e conectada ao Supabase!"}

@app.get("/api/debug")
def debug_info():
    """Endpoint de diagnóstico para verificar se as credenciais do Supabase estão corretas"""
    service_key_set = bool(os.getenv("SUPABASE_SERVICE_KEY"))
    return {
        "supabase_ok": supabase is not None,
        "supabase_admin_ok": supabase_admin is not None,
        "service_key_configurada": service_key_set,
        "supabase_error": supabase_error,
        "url_status": bool(url),
    }

@app.get("/api/backup/download")
def download_backup(user_info: tuple = Depends(get_current_user_from_cookie)):
    """Exporta todas as tabelas do banco de dados Supabase em formato JSON. Restrito a Admins."""
    user_id, payload = user_info
    role = payload.get("role", "")
    
    if role.lower() not in ["admin", "gerente"]:
        raise HTTPException(status_code=403, detail="Acesso negado. O download do banco de dados é restrito a administradores.")

    from datetime import datetime, timezone
    client = supabase_admin if supabase_admin else supabase
    if not client:
        raise HTTPException(status_code=503, detail="Supabase não inicializado.")

    tabelas = [
        "clientes", "funcionarios", "rotinas_base", "execucoes", "meses", 
        "setores", "logs", "global_config", "cargos_permissoes",
    ]

    dados = {}
    erros = []
    total_registros = 0

    for tabela in tabelas:
        try:
            res = client.table(tabela).select("*").execute()
            dados[tabela] = res.data or []
            total_registros += len(dados[tabela])
        except Exception as e:
            erros.append({"tabela": tabela, "erro": str(e)})
            dados[tabela] = []

    return {
        "metadata": {
            "versao": "1.1",
            "sistema": "FiscalApp",
            "gerado_em": datetime.now(timezone.utc).isoformat(),
            "total_registros": total_registros,
            "tabelas_exportadas": len(tabelas),
            "erros": erros
        },
        "tabelas": dados
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
