from src.core.database import supabase
import json

def check_niveis():
    try:
        print("Checking cargos_niveis table...")
        res = supabase.table("cargos_niveis").select("*").limit(1).execute()
        print("Table exists and responded.")
        print(f"Sample data: {json.dumps(res.data, indent=2)}")
    except Exception as e:
        print(f"Error or table missing: {e}")

if __name__ == "__main__":
    check_niveis()
