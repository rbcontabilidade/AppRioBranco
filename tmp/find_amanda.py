import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

def find_employee(name):
    res = supabase.table("funcionarios").select("*").ilike("nome", f"%{name}%").execute()
    if res.data:
        for f in res.data:
            print(f"Encontrado: {f['nome']} (ID: {f['id']})")
    else:
        print(f"Nenhum funcionário encontrado com o nome '{name}'")

if __name__ == "__main__":
    find_employee("Amanda")
    # Listar todos para ter certeza
    print("\nLista completa de funcionários:")
    res_all = supabase.table("funcionarios").select("id, nome").execute()
    for f in res_all.data:
        print(f"ID: {f['id']} | Nome: {f['nome']}")
