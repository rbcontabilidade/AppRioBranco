import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    # Pega processos que tenham tarefas ligadas
    res = supabase.table("rh_tarefas").select("*").limit(5).execute()
    if res.data:
        print("Tarefas encontradas:", res.data[0].keys())
        print("Exemplo de tarefa:", res.data[0])
    else:
        print("Nenhuma tarefa encontrada em rh_tarefas.")
        
    res_p = supabase.table("rh_processos").select("*").limit(5).execute()
    print("Processos existentes IDs:", [p['id'] for p in res_p.data])
except Exception as e:
    print("Erro:", e)
