import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

res_func = supabase.table("funcionarios").select("id, nome").execute()
for f in res_func.data:
    user_id = f['id']
    res_vinc = supabase.table("rh_execucao_tarefas_responsaveis").select("execucao_tarefa_id").eq("funcionario_id", user_id).execute()
    print(f"Funcionario: {f['nome']} (ID: {user_id}) - Tarefas vinculadas: {len(res_vinc.data or [])}")
