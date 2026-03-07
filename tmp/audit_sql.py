
import requests
import json

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def run_sql(sql):
    print(f"\n--- Executando SQL ---\n{sql}")
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/rpc/exec_sql", headers=headers, json={"query": sql})
        if res.ok:
            data = res.json()
            print(json.dumps(data, indent=2))
            return data
        else:
            print(f"Erro {res.status_code}: {res.text}")
    except Exception as e:
        print(f"Erro: {e}")
    return None

if __name__ == "__main__":
    # 1. Buscar em Políticas RLS
    print("\n[Audit] Buscando em Políticas RLS...")
    run_sql("SELECT tablename, policyname, definition FROM pg_policies WHERE definition ILIKE '%cargos%'")

    # 2. Buscar em Triggers / Funções
    print("\n[Audit] Buscando em Definições de Funções (Procedures)...")
    run_sql("SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_definition ILIKE '%cargos%' AND routine_schema = 'public'")

    # 3. Listar Triggers ativos
    print("\n[Audit] Listando Triggers...")
    run_sql("SELECT tgname, tgenabled, relname FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid WHERE tgname NOT LIKE 'pg_%' AND tgname NOT LIKE 'tr_id_search%'")
