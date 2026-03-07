import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

def run_sql(query):
    # Supabase Python client no tem rpc('run_sql') por padrão a no ser que voce o crie
    # Mas podemos tentar usar uma query que geralmente falha se no houver permissao
    # ou usar o rpc se o usuário criou um helper
    try:
        # Tentando via postgrest direto (não recomendado mas as vezes o unico jeito sem RPC)
        # Na verdade, vamos usar o approach de tentar acessar views conhecidas
        print(f"\nExcutando teste de metadados...")
    except Exception as e:
        print(f"Erro: {e}")

def check_for_cargos_references():
    print("--- Buscando referências a 'cargos' no Banco de Dados ---")
    
    # 1. Verificar Views
    print("\n[1] Verificando se existe alguma View chamada 'cargos'...")
    try:
        res = supabase.table("cargos").select("*").limit(1).execute()
        print("Bizarro: A tabela/view 'cargos' EXISTE!")
    except Exception as e:
        err = str(e)
        if "PGRST205" in err:
            print("Confirmado: 'public.cargos' NAO existe no cache do schema.")
        else:
            print(f"Erro inesperado: {err}")

    # 2. Verificar se 'cargos_permissoes' está ok (já sabemos que sim)
    
    # 3. Tentar descobrir se há Triggers ou Foreign Keys falhando
    print("\n[2] Verificando Foreign Keys de 'funcionarios'...")
    try:
        # O postgrest as vezes revela infos em erros de join
        res = supabase.table("funcionarios").select("*, cargos(*)").limit(1).execute()
    except Exception as e:
        print(f"Join 'funcionarios -> cargos' falhou como esperado: {e}")

    try:
        print("\n[3] Verificando se 'cargos_permissoes' tem joins funcionando...")
        res = supabase.table("funcionarios").select("*, cargos_permissoes(*)").limit(1).execute()
        print("Join 'funcionarios -> cargos_permissoes' FUNCIONA!")
    except Exception as e:
        print(f"ERRO CRITICO: Join 'funcionarios -> cargos_permissoes' FALHOU: {e}")

if __name__ == "__main__":
    check_for_cargos_references()
