import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

try:
    # Busca rpc ou tenta inserir e ver o erro pra adivinhar colunas, 
    # ou melhor, tenta selecionar uma coluna comum e ver se retorna erro de coluna inexistente
    # Mas o mais simples é tentar pegar os dados de qualquer registro.
    # Se estiver vazia, vamos tentar inserir um lixo e fazer rollback ou deletar depois.
    
    res = supabase.table("rh_tarefas").insert({"titulo": "DUMMY_COL_CHECK"}).execute()
    if res.data:
        print("Colunas detectadas:", list(res.data[0].keys()))
        # Limpa
        supabase.table("rh_tarefas").delete().eq("titulo", "DUMMY_COL_CHECK").execute()
except Exception as e:
    print("Erro ao inserir:", e)
