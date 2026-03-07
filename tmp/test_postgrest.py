
import requests

SUPABASE_URL = "https://khbdbuoryxqiprlkdcpz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4Nywic3ViIjoic3VwYWJhc2UiLCJhdWQiOiJzdXBhYmFzZSJ9.v_bC-oGIdp2NfXpBw3Osw7j5p9M_R6Y3N7_D6j8n6_8"

def run_query(sql):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    # No RPC access for raw SQL, but we can try to query information_schema or similar if allowed via PostgREST
    # Actually, the best way to investigate DB objects is via the project's own RPCs or just listing views if possible.
    # Let's try to find any view or function mentioning 'cargos' in its definition.
    
    # We can try to use a dummy query that might fail if things are broken,
    # or use the /rest/v1/rpc/exec_sql if it exists (which we created earlier in previous turns?)
    
    # Let's try to query the 'funcionarios' table which we know is related.
    print(f"Checking data from 'funcionarios' to see if a join fails...")
    url = f"{SUPABASE_URL}/rest/v1/funcionarios?select=*,cargos(*)"
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

    print("\nChecking if code queries 'cargos_permissoes' successfully...")
    url = f"{SUPABASE_URL}/rest/v1/cargos_permissoes?select=*"
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    # print(f"Response: {response.text}")

if __name__ == "__main__":
    run_query("")
