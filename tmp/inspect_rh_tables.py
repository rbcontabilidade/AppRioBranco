import os
import sys

# Adiciona o diretório src ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

def inspect_table(table_name):
    try:
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            print(f"Colunas de {table_name}: {list(res.data[0].keys())}")
            print(f"Exemplo de dado: {res.data[0]}")
        else:
            # Se a tabela estiver vazia, tenta pegar a estrutura via query SQL se possível (mas via script python é limitado)
            # Vamos tentar inferir que se não tem dados, pelo menos o schema postado no SQL é o que vale.
            print(f"Tabela {table_name} está vazia.")
    except Exception as e:
        print(f"Erro ao inspecionar {table_name}: {e}")

if __name__ == "__main__":
    tables = ["rh_processos", "rh_tarefas", "rh_tarefas_checklists", "rh_tarefas_responsaveis"]
    for table in tables:
        inspect_table(table)
