import os
import sys

# Adiciona o diretório src ao path para importar as configurações e o client do supabase
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

def inspect_table(table_name):
    try:
        # Tenta pegar um registro para ver as chaves
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            print(f"Colunas de {table_name}: {list(res.data[0].keys())}")
            print(f"Exemplo de dado: {res.data[0]}")
        else:
            print(f"Tabela {table_name} está vazia, não foi possível inspecionar colunas via select.")
    except Exception as e:
        print(f"Erro ao inspecionar {table_name}: {e}")

if __name__ == "__main__":
    inspect_table("cargos_permissoes")
    inspect_table("cargo_niveis")
