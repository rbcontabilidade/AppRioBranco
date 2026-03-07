
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def query_rpc(sql):
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    res = requests.post(url, headers=headers, json={"query": sql})
    if res.ok:
        return res.json()
    else:
        print(f"Error {res.status_code}: {res.text}")
        return None

if __name__ == "__main__":
    # 1. Buscar Views que referenciam 'cargos'
    print("--- Buscando Views com 'cargos' ---")
    sql_views = "SELECT table_name FROM information_schema.views WHERE view_definition ILIKE '%cargos%';"
    views = query_rpc(sql_views)
    print(f"Views: {views}")

    # 2. Buscar Triggers ou Funções com 'cargos'
    print("\n--- Buscando Funções com 'cargos' ---")
    sql_funcs = "SELECT routine_name FROM information_schema.routines WHERE routine_definition ILIKE '%cargos%';"
    funcs = query_rpc(sql_funcs)
    print(f"Funções: {funcs}")

    # 3. Forçar recarregamento do cache (NOT_RECOMMENDED via RPC mas tentando se possível)
    # Na verdade, PostgREST recarrega quando recebe um NOTIFY pgrst.
    print("\n--- Tentando NOTIFY pgrst (Reload cache) ---")
    sql_notify = "NOTIFY pgrst, 'reload schema';"
    query_rpc(sql_notify)
