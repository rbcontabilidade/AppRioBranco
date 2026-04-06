import os
from supabase import create_client
from dotenv import load_dotenv

# Carregar variáveis de ambiente do .env
load_dotenv()

# Supabase Credentials Loader
url: str = os.getenv("SUPABASE_URL", "")
key: str = os.getenv("SUPABASE_KEY", "")
# Importante: O Backend deve usar a SERVICE_ROLE_KEY para ignorar RLS e funcionar como Admin
service_key: str = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY", "")

supabase = None
supabase_admin = None
supabase_error = None

print(f"Tentando conectar ao Supabase em: {url}")

try:
    if not url or not key:
        raise ValueError("SUPABASE_URL ou SUPABASE_KEY não configuradas no .env")
        
    supabase = create_client(url, key)
    supabase_admin = create_client(url, service_key)
    print("Conexão com Supabase estabelecida com sucesso.")
except Exception as e:
    import traceback
    supabase_error = str(e)
    print(f"Erro ao conectar ao Supabase: {supabase_error}")
    # traceback.print_exc()

def get_supabase():
    """Retorna o cliente Supabase Admin para operações de backend."""
    return supabase_admin
