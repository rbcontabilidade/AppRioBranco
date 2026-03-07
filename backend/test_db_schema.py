import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega .env do backend
load_dotenv('c:/Users/ribei/OneDrive/Desktop/RB/FiscalApp/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    # Tenta carregar sem path absoluto se falhar
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

try:
    # Tenta selecionar a coluna frequencia para ver se ela existe
    res = supabase.table("rh_processos").select("frequencia").limit(1).execute()
    print("Coluna 'frequencia' ENCONTRADA.")
except Exception as e:
    print(f"Coluna 'frequencia' NAO ENCONTRADA ou Erro: {e}")

try:
    res = supabase.table("rh_tarefas").select("dias_prazo").limit(1).execute()
    print("Coluna 'dias_prazo' ENCONTRADA.")
except Exception as e:
    print(f"Coluna 'dias_prazo' NAO ENCONTRADA ou Erro: {e}")
