import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

# Tenta inserir um registro com dados mínimos para ver o que o banco reclama
try:
    print("Testando inserção mínima em rh_processos...")
    # Tenta um update com quase nada
    res = supabase.table("rh_processos").update({"nome": "Teste Update"}).eq("id", -1).execute()
    print("Update dummy ok (status 200 até se id não existe)")
    
    # Tenta ver os detalhes da tabela via query direta se possível (Postgres info_schema)
    # Como não temos acesso direto ao SQL via MCP funcional, vamos tentar deduzir pelos logs se houver erro
except Exception as e:
    print("Erro no teste:", e)
