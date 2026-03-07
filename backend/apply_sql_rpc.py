import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('c:/Users/ribei/OneDrive/Desktop/RB/FiscalApp/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

sql = """
ALTER TABLE rh_processos ADD COLUMN IF NOT EXISTS frequencia VARCHAR(50) DEFAULT 'Mensal';
ALTER TABLE rh_tarefas ADD COLUMN IF NOT EXISTS dias_prazo INTEGER DEFAULT 0;
"""

try:
    # Muitos templates do Supabase incluem essa função exec_sql para desenvolvimento
    res = supabase.rpc("exec_sql", {"query": sql}).execute()
    print("SQL executado com sucesso via RPC exec_sql.")
except Exception as e:
    print(f"Erro ao executar via RPC: {e}")
