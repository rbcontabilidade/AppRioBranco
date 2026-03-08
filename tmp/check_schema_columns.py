import os
import sys

# Adiciona o diretório src ao path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

def get_columns(table_name):
    query = f"""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = '{table_name}'
    AND table_schema = 'public'
    ORDER BY ordinal_position;
    """
    try:
        # Nota: O cliente supabase-python não permite rodar SQL arbitrário diretamente
        # a menos que usemos uma RPC. Vamos ver se existe a RPC 'exec_sql'.
        # Se não, vamos tentar selecionar 1 linha e ver o erro ou as chaves se houver dados.
        # Como a tabela está vazia, vamos tentar a técnica do insert com colunas conhecidas e ver o que falha.
        
        # Mas espera, eu posso tentar usar a tabela 'clientes' que deve ter dados.
        # Ou melhor, vamos ler o arquivo de 'check_cols.py' e ver se ele falha com a lista de colunas.
        
        # Outra tentativa: usar o comando 'psql' se estiver disponível no ambiente,
        # mas aqui não temos acesso direto ao postgres.
        
        # Vamos tentar um select * na tabela vazia e ver se o .data vem com as colunas (geralmente vazio []).
        res = supabase.table(table_name).select("*").limit(0).execute()
        print(f"Resultado select * na {table_name}: {res.data}")
        
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    get_columns("rh_tarefas")
    get_columns("rh_processos")
