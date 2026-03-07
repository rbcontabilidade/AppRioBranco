
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def execute_sql(sql):
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    try:
        res = requests.post(url, headers=headers, json={"query": sql})
        if res.ok:
            print(f"SUCESSO ao executar: {sql[:50]}...")
            return True
        else:
            print(f"ERRO {res.status_code}: {res.text}")
            return False
    except Exception as e:
        print(f"EXCEÇÃO: {e}")
        return False

if __name__ == "__main__":
    print("--- Iniciando Limpeza de Objetos obsoletos ---")
    
    # 1. Dropar Trigger
    execute_sql("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;")
    
    # 2. Dropar Função
    execute_sql("DROP FUNCTION IF EXISTS public.handle_new_user();")
    
    print("--- Limpeza Concluída ---")
