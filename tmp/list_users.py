
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def get_users():
    url = f"{SUPABASE_URL}/rest/v1/funcionarios?select=nome,permissao,ativo&limit=5"
    res = requests.get(url, headers=headers)
    if res.ok:
        return res.json()
    else:
        print(f"Error {res.status_code}: {res.text}")
        return None

if __name__ == "__main__":
    users = get_users()
    print(f"Users: {users}")
