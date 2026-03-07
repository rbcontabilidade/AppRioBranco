import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
# Ajuste o caminho se necessário - assumindo que está na raiz do sistema_ok
load_dotenv("c:/Users/ribei/OneDrive/Desktop/RB/FiscalApp/sistema_ok/backend/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

def debug_visibility(funcionario_id):
    print(f"--- Depurando Visibilidade para Funcionário ID: {funcionario_id} ---")
    
    # Passo 1: Vínculos diretos
    res_vinc = supabase.table("rh_execucao_tarefas_responsaveis") \
        .select("execucao_tarefa_id") \
        .eq("funcionario_id", funcionario_id) \
        .execute()
    
    tarefa_ids = [r['execucao_tarefa_id'] for r in (res_vinc.data or [])]
    print(f"Passo 1: Tarefas do funcionário: {len(tarefa_ids)} encontradas")
    
    if not tarefa_ids:
        print("Nenhuma tarefa vinculada.")
        return

    # Passo 2: IDs de Execução
    res_proc_ids = supabase.table("rh_execucao_tarefas") \
        .select("execucao_processo_id") \
        .in_("id", tarefa_ids) \
        .execute()
        
    exec_proc_ids = list(set([r['execucao_processo_id'] for r in (res_proc_ids.data or [])]))
    print(f"Passo 2: Processos participando: {len(exec_proc_ids)} IDs -> {exec_proc_ids}")
    
    if not exec_proc_ids:
        print("Nenhum ID de execução encontrado para estas tarefas.")
        return

    # Passo 3: Todas as etapas (ESPELHANDO BACKEND)
    res = supabase.table("rh_execucao_tarefas").select(
        "*, "
        "rh_execucao_processos(*, clientes(razao_social, drive_link), rh_processos(nome), rh_competencias(mes, ano)), "
        "rh_tarefas(titulo, ordem, dias_prazo), "
        "rh_execucao_tarefas_responsaveis(funcionario_id, funcionarios(nome))"
    ).in_("execucao_processo_id", exec_proc_ids).execute()
    
    print(f"Passo 3: Total de etapas retornadas: {len(res.data or [])}")
    
    data_count = 0
    discarded_count = 0
    for t in (res.data or []):
        exec_p = t.get('rh_execucao_processos', {})
        if not exec_p:
            discarded_count += 1
            continue
        data_count += 1
        
    print(f"  - Mantidas: {data_count}")
    print(f"  - Descartadas (exec_p vazio): {discarded_count}")

    # Agrupar por processo para ver se as etapas de colegas estão vindo
    by_process = {}
    for t in (res.data or []):
        exec_p = t.get('rh_execucao_processos', {})
        if not exec_p: continue
        
        pid = t['execucao_processo_id']
        if pid not in by_process: by_process[pid] = []
        by_process[pid].append(t)
        
    for pid, steps in by_process.items():
        print(f"\n  Processo {pid}: {len(steps)} etapas")
        for s in steps:
            is_mine = s['id'] in tarefa_ids
            m_mark = "[MINHA]" if is_mine else "[COLEGA]"
            t_root = s.get('rh_tarefas', {}) or {}
            print(f"    - {m_mark} ID: {s['id']} | Status: {s['status']} | Título: {t_root.get('titulo')}")

if __name__ == "__main__":
    # Tenta descobrir um ID de funcionário real se possível, ou usa um genérico
    # Vou tentar pegar o primeiro na tabela de funcionários
    funcs = supabase.table("funcionarios").select("id, nome").limit(5).execute()
    if funcs.data:
        for f in funcs.data:
            debug_visibility(f['id'])
    else:
        print("Nenhum funcionário encontrado para teste.")
