import os
import sys
from pprint import pprint

# Configurar path para importar módulos do backend
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)

from src.core.database import supabase, supabase_admin

def check_competencias():
    client = supabase_admin if supabase_admin else supabase
    print("Buscando competências...")
    res = client.table("rh_competencias").select("*").execute()
    data = res.data
    
    ativas = [c for c in data if c.get("status") == "ABERTA"]
    
    print(f"Total de competências: {len(data)}")
    print(f"Total de ativas: {len(ativas)}")
    
    print("\nCompetências Ativas:")
    for c in ativas:
        pprint(c)
        
    print("\nTodas as Competências:")
    for c in sorted(data, key=lambda x: str(x.get('ano') or '') + str(x.get('mes') or ''), reverse=True):
        print(f"ID: {c.get('id')} | Mês/Ano: {c.get('mes')}/{c.get('ano')} | Status: {c.get('status')} | Criado em: {c.get('created_at')}")

if __name__ == "__main__":
    check_competencias()
