import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
service_key = os.environ.get("SUPABASE_SERVICE_KEY")

print(f"URL: {url}")
print(f"Key (Anon): {key[:10]}...")
print(f"Service Key: {service_key[:10] if service_key else 'MISSING'}...")

try:
    supabase: Client = create_client(url, key)
    # Test read profiles
    result = supabase.table("profiles").select("*").limit(1).execute()
    print("Conexão com Anon Key: OK")
    print(f"Dados Profiles: {result.data}")
    
    # Test read funcionarios
    result_func = supabase.table("funcionarios").select("*").limit(1).execute()
    print(f"Dados Funcionarios: {result_func.data}")
    
    # Test read clientes
    result_cli = supabase.table("clientes").select("*").limit(1).execute()
    print(f"Dados Clientes: {result_cli.data}")
except Exception as e:
    print(f"Falha com Anon Key: {str(e)}")

if service_key:
    try:
        supabase_admin: Client = create_client(url, service_key)
        result = supabase_admin.table("profiles").select("*").limit(1).execute()
        print("Conexão com Service Key: OK")
        print(f"Dados Profiles (Admin): {result.data}")
    except Exception as e:
        print(f"Falha com Service Key: {str(e)}")
else:
    print("Pulei teste de Service Key (Vazio)")
