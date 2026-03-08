import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Adicionar o diretório backend ao path para importar as configurações se necessário
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv('backend/.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service_key = os.getenv("SUPABASE_SERVICE_KEY") or key

if not url or not key:
    print("Erro: SUPABASE_URL ou SUPABASE_KEY não encontradas no .env")
    sys.exit(1)

supabase = create_client(url, service_key)

def check_data():
    print("--- DIAGNÓSTICO DE DADOS DE PERFORMANCE ---")
    
    # 1. Verificar Competências Abertas
    res_comp = supabase.table("rh_competencias").select("*").eq("status", "ABERTA").execute()
    print(f"\nCompetências Abertas: {len(res_comp.data)}")
    for comp in res_comp.data:
        print(f"  - ID: {comp['id']}, Mês: {comp['mes']}, Ano: {comp['ano']}, Status: {comp['status']}")
    
    if not res_comp.data:
        print("AVISO: Nenhuma competência aberta encontrada. Isso causará KPIs zerados.")
        # Verificar se existem competências de qualquer status
        res_all_comp = supabase.table("rh_competencias").select("*").limit(5).execute()
        print(f"Últimas 5 competências (qualquer status): {len(res_all_comp.data)}")
        for comp in res_all_comp.data:
            print(f"  - ID: {comp['id']}, Mês: {comp['mes']}, Ano: {comp['ano']}, Status: {comp['status']}")

    # 2. Verificar Funcionários
    res_func = supabase.table("funcionarios").select("id, nome, ativo").eq("ativo", True).execute()
    print(f"\nFuncionários Ativos: {len(res_func.data)}")
    for func in res_func.data[:5]:
        print(f"  - ID: {func['id']}, Nome: {func['nome']}")
    
    # 3. Verificar se há tarefas atribuídas
    res_resp = supabase.table("rh_execucao_tarefas_responsaveis").select("count", count="exact").execute()
    print(f"\nTotal de atribuições (responsaveis): {res_resp.count}")

    # 4. Verificar Execuções de Processo
    res_proc = supabase.table("rh_execucao_processos").select("count", count="exact").execute()
    print(f"Total de execuções de processo: {res_proc.count}")

    # 5. Verificar se há tarefas na competência aberta (se houver)
    if res_comp.data:
        comp_id = res_comp.data[0]['id']
        res_tasks_comp = supabase.table("rh_execucao_processos").select("id").eq("competencia_id", comp_id).execute()
        proc_ids = [p['id'] for p in res_tasks_comp.data]
        print(f"Processos na competência {comp_id}: {len(proc_ids)}")
        
        if proc_ids:
            res_tasks = supabase.table("rh_execucao_tarefas").select("count", count="exact").in_("execucao_processo_id", proc_ids).execute()
            print(f"Total de tarefas na competência {comp_id}: {res_tasks.count}")

if __name__ == "__main__":
    check_data()
