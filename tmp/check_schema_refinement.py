import os
import sys

# Adiciona o diretório src ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

def dump_schema(table_name):
    # Tenta usar a RPC 'exec_sql' se ela existir para inspecionar o schema
    # Caso contrário, vamos tentar deduzir pelas colunas retornadas em um select
    print(f"\n--- Inspecionando {table_name} ---")
    try:
        # Se houver uma RPC genérica no projeto para rodar SQL
        sql = f"""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '{table_name}'
        ORDER BY ordinal_position;
        """
        # Tenta chamar RPC se o usuário tiver configurado (comum em projetos Supabase avançados)
        try:
            res_rpc = supabase.rpc('exec_sql', {'sql_query': sql}).execute()
            if res_rpc.data:
                for col in res_rpc.data:
                    print(f"{col['column_name']} ({col['data_type']}) - Nullable: {col['is_nullable']}")
                return
        except:
            pass

        # Fallback: Select limit 1 e inspeciona chaves
        # Mas as tabelas estão vazias. Vamos tentar pegar chaves estrangeiras se possível.
        # Como o cliente JS/Python não permite SQL, vamos tentar inferir pelo arquivo 08_gestao_processos.sql
        # e outros. No 02_processos_tarefas.sql tinha 'dias_prazo'.
        
        # Vamos tentar um select * e ver se o Supabase retorna metadados (raro no python client)
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            print(f"Colunas presentes: {list(res.data[0].keys())}")
        else:
            print("Tabela vazia. Não foi possível inferir via SELECT.")

    except Exception as e:
        print(f"Erro ao inspecionar: {e}")

def check_setores():
    try:
        res = supabase.table("setores").select("*").execute()
        print("\n--- Setores Disponíveis ---")
        for s in res.data:
            print(f"ID: {s['id']} | Nome: {s['nome']}")
    except Exception as e:
        print(f"Erro ao ler setores: {e}")

if __name__ == "__main__":
    check_setores()
    dump_schema("rh_processos")
    dump_schema("rh_tarefas")
    # Verificando se existe alguma tabela de setores_processos ou similar
    dump_schema("rh_processos_clientes")
