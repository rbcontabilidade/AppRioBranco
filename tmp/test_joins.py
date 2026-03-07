
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
    try:
        res = requests.post(f"{SUPABASE_URL}/rest/v1/rpc/exec_sql", headers=headers, json={"query": sql})
        if res.ok:
            return res.json()
    except:
        pass
    return None

if __name__ == "__main__":
    # Tentar listar colunas de funcionarios e suas relações via PostgREST (se falhar, o erro dirá o culpado)
    print("--- Tentando ler metadados de 'funcionarios' ---")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=*,cargos(*)", headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Resposta: {res.text}")

    print("\n--- Tentando ler metadados de 'funcionarios' com cargos_permissoes ---")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=*,cargos_permissoes(*)", headers=headers)
    print(f"Status: {res.status_code}")
    # Se isso funcionar, a relação está correta. Se o erro PGRST205 aparecer aqui mesmo sem pedirmos 'cargos',
    # então há algo automático (como um trigger ou view) forçando o join.
