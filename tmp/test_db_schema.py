
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
    print("--- Verificando se existe RPC para SQL ---")
    # Tenta listar funções RPC disponíveis (auto-descoberta via OpenAPI)
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/", headers=headers)
        if res.ok:
            print("OpenAPI Spec encontrada.")
            if "/rpc/exec_sql" in res.text:
                print("RPC exec_sql ENCONTRADA!")
            else:
                print("RPC exec_sql não encontrada na spec principal.")
        else:
            print(f"Falha ao carregar spec: {res.status_code}")
    except Exception as e:
        print(f"Erro: {e}")

def check_tables():
    print("\n--- Verificando Tabelas ---")
    tables = ["funcionarios", "cargos", "cargos_permissoes", "profiles"]
    for table in tables:
        try:
            res = requests.get(f"{SUPABASE_URL}/rest/v1/{table}?select=count", headers=headers)
            if res.ok:
                print(f"Tabela '{table}': EXISTE (Status {res.status_code})")
            else:
                print(f"Tabela '{table}': NAO ENCONTRADA ou Erro (Status {res.status_code})")
                if res.status_code == 404:
                    print(f"  Detalhe: {res.json()}")
        except Exception as e:
            print(f"Erro ao consultar {table}: {e}")

def check_rls_indirectly():
    print("\n--- Testando RLS Indiretamente ---")
    # Se tentarmos um select em funcionarios e der erro de 'cargos', é RLS
    try:
        res = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=*", headers=headers)
        if not res.ok:
            print(f"Erro ao ler 'funcionarios': {res.status_code}")
            print(f"Resposta: {res.text}")
        else:
            print(f"Leitura de 'funcionarios' OK (RLS pode não estar bloqueando ou permitindo anon)")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    check_tables()
    check_rpc()
    check_rls_indirectly()
