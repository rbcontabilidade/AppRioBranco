import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv("backend/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

try:
    supabase = create_client(url, key)
    # Busca a tabela usando o crud base ou direto
    res = supabase.table("cargos_permissoes").select("*").execute()
    print("Quantidade de registros:", len(res.data) if res.data else 0)
    for row in res.data:
        print("-------------")
        for k, v in row.items():
            print(f"{k} [{type(v).__name__}]: {v}")
except Exception as e:
    print("ERRO:", e)
