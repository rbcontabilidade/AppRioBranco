import os
import sys
from fastapi.testclient import TestClient
from dotenv import load_dotenv

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from src.main import app
from src.core.database import supabase_admin
from src.api.v1.endpoints.auth import get_current_user_from_cookie

# Override dependency to simulate logged in user
app.dependency_overrides[get_current_user_from_cookie] = lambda: {"id": 1, "nome": "Test Admin"}

client = TestClient(app)

print("Enviando PUT /api/meses/1 com status=FECHADA")
res = client.put("/api/meses/1", json={"status": "FECHADA"})
print(f"Status: {res.status_code}")
print(f"JSON: {res.json()}")

# Adicionar teste de falha
print("\nTentando gerar Mês 3/2026 com Mês 2/2026 ABERTO (Deve falhar 409)")
# Força a abertura usando client anon de supabase p/ burlar o Endpoint
from src.core.database import supabase
supabase.table("rh_competencias").update({"status": "ABERTA"}).eq("id", 2).execute()

res = client.post("/api/meses/gerar/3/2026")
print(f"Status esperado (409): {res.status_code}")
print(f"JSON: {res.json()}")

# Restaurando mes 2 e apagando 3/2026 (se tiver sido criado)
supabase.table("rh_competencias").update({"status": "FECHADA"}).eq("id", 2).execute()
supabase.table("rh_competencias").delete().eq("status", "ABERTA").eq("mes", 3).execute()
