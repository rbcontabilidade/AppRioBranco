
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def check_cols():
    # Pegar um registro de funcionarios para ver as colunas
    res = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?limit=1", headers=headers)
    if res.ok and res.json():
        print(f"Colunas de funcionarios: {list(res.json()[0].keys())}")
    else:
        print(f"Erro ao ler funcionarios ou tabela vazia: {res.status_code} {res.text}")

if __name__ == "__main__":
    check_cols()
