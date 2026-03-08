import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Adiciona o diretório backend ao path para importar as configurações se necessário
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    # Tenta ler do database.py se o .env falhar
    try:
        from src.core.database import supabase
    except ImportError:
        print("Erro ao importar supabase")
        sys.exit(1)
else:
    supabase = create_client(url, key)

def list_all():
    print("--- Funcionários ---")
    res = supabase.table("funcionarios").select("id, nome").execute()
    for f in res.data:
        print(f"ID: {f['id']} | Nome: {f['nome']}")

    print("\n--- Setores ---")
    res_s = supabase.table("setores").select("id, nome").execute()
    for s in res_s.data:
        print(f"ID: {s['id']} | Nome: {s['nome']}")

if __name__ == "__main__":
    list_all()
