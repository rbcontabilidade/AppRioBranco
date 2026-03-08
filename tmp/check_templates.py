import os
import sys
from supabase import create_client
from dotenv import load_dotenv

sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service_key = os.getenv("SUPABASE_SERVICE_KEY") or key

supabase = create_client(url, service_key)

def check_templates():
    print("--- VERIFICAÇÃO DE TEMPLATES ---")
    
    # 1. Processos (Templates)
    res_proc = supabase.table("rh_processos").select("id, nome").execute()
    print(f"\nTemplates de Processos: {len(res_proc.data)}")
    for proc in res_proc.data:
        print(f"  - ID: {proc['id']}, Nome: {proc['nome']}")
    
    # 2. Tarefas (Templates)
    res_tarefas = supabase.table("rh_tarefas").select("count", count="exact").execute()
    print(f"\nTotal de Tarefas nos Templates: {res_tarefas.count}")

    # 3. Clientes
    res_clientes = supabase.table("clientes").select("id, razao_social").eq("ativo", True).execute()
    print(f"\nClientes Ativos: {len(res_clientes.data)}")
    
    # 4. Atribuições de Processo (Quais clientes fazem quais processos)
    # Procurar por tabelas que ligam clientes a processos
    try:
        res_atrib = supabase.table("rh_processos_clientes").select("count", count="exact").execute()
        print(f"Atribuições Cliente-Processo (rh_processos_clientes): {res_atrib.count}")
    except:
        print("Tabela rh_processos_clientes não encontrada.")

    try:
        res_atrib2 = supabase.table("rh_vinculos_processos").select("count", count="exact").execute()
        print(f"Atribuições Cliente-Processo (rh_vinculos_processos): {res_atrib2.count}")
    except:
        print("Tabela rh_vinculos_processos não encontrada.")

if __name__ == "__main__":
    check_templates()
