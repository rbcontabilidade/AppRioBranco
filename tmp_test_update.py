import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)

from src.core.database import supabase, supabase_admin
from src.crud.mes import MesCRUD

print("Buscando erro de UPDATE usando supabase normal...")
try:
    res = supabase.table("rh_competencias").update({"status": "FECHADA"}).eq("id", 1).execute()
    print("Normal update res:", res)
except Exception as e:
    print("Erro no update normal:", e)

print("\n---")
print("Tentando UPDATE usando supabase_admin...")
try:
    res = supabase_admin.table("rh_competencias").update({"status": "FECHADA"}).eq("id", 1).execute()
    print("Admin update res:", res)
except Exception as e:
    print("Erro no update admin:", e)
