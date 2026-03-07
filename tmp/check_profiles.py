
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def check_table(table_name):
    res = requests.get(f"{SUPABASE_URL}/rest/v1/{table_name}?select=count", headers=headers)
    print(f"Tabela {table_name}: {res.status_code}")

if __name__ == "__main__":
    check_table("profiles")
    check_table("funcionarios")
