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

def list_tables():
    print("--- LISTA DE TABELAS ---")
    # O cliente python do supabase não tem um método direto para listar tabelas
    # Mas podemos tentar dar um select em pg_catalog se tiver permissão, 
    # ou usar um rpc se existir.
    # Como não sabemos, vamos tentar uma query SQL via rpc se disponível
    # Ou simplesmente assumir que conhecemos as tabelas e verificar sua existência.
    
    tables_to_check = [
        "rh_processos", "rh_tarefas", "rh_competencias", "rh_execucao_processos", 
        "rh_execucao_tarefas", "rh_execucao_tarefas_responsaveis", "clientes",
        "rh_processos_clientes", "rh_vinculos_processos", "rh_categorias",
        "funcionarios", "cargos_permissoes"
    ]
    
    for table in tables_to_check:
        try:
            res = supabase.table(table).select("count", count="exact").limit(1).execute()
            print(f"Tabela {table.ljust(35)}: {res.count if res.count is not None else 'Existente'}")
        except Exception as e:
            print(f"Tabela {table.ljust(35)}: Erro ou Inexistente ({str(e)[:50]}...)")

if __name__ == "__main__":
    list_tables()
