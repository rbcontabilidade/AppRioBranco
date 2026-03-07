
import requests
import json

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_rpc():
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    sql = "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
    try:
        res = requests.post(url, headers=headers, json={"query": sql})
        if res.ok:
            print("RPC 'exec_sql' exists and works!")
            print("Tables found:", res.json())
            return True
        else:
            print(f"RPC 'exec_sql' failed or does not exist. Status: {res.status_code}")
            return False
    except Exception as e:
        print(f"Error checking RPC: {e}")
        return False

def audit_cargos():
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    queries = {
        "Views referencing cargos": "SELECT table_name FROM information_schema.views WHERE view_definition ILIKE '%cargos%';",
        "Functions referencing cargos": "SELECT routine_name FROM information_schema.routines WHERE routine_definition ILIKE '%cargos%';",
        "Triggers referencing cargos": "SELECT tgname FROM pg_trigger WHERE pg_get_triggerdef(oid) ILIKE '%cargos%';",
        "Foreign Keys referencing cargos": "SELECT conname FROM pg_constraint WHERE confrelid = 'public.cargos'::regclass::oid;"
    }
    
    for label, sql in queries.items():
        print(f"--- {label} ---")
        try:
            res = requests.post(url, headers=headers, json={"query": sql})
            if res.ok:
                print(res.json())
            else:
                print(f"Error: {res.text}")
        except Exception as e:
            print(f"Skip {label}: {e}")

if __name__ == "__main__":
    if check_rpc():
        audit_cargos()
    else:
        # Fallback: tentar listar tabelas via REST API normal
        print("Attempting to list tables via REST API...")
        res = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=*", headers=headers)
        if res.ok:
            print("Successfully connected to funcionarios.")
            # Tentando ver se cargos ainda 'funciona' como relação
            res_join = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=*,cargos(*)", headers=headers)
            if res_join.status_code == 400:
                print("Join with 'cargos' FAILED as expected (PGRST205).")
                print("Error detail:", res_join.text)
            else:
                print("Join with 'cargos' worked? That's strange if it's supposed to be missing.")
        else:
            print(f"Failed to connect to REST API: {res.status_code}")
