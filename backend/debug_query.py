from src.core.database import supabase_admin as supabase

print("Realizando query na tabela rh_execucao_tarefas...")
res = supabase.table("rh_execucao_tarefas").select(
    "*, rh_execucao_processos(*, clientes(razao_social, drive_link), rh_processos(nome), rh_competencias(mes, ano)), rh_tarefas(titulo, ordem, dias_prazo), rh_execucao_tarefas_responsaveis(funcionario_id)"
).execute()

print(f"Total registros: {len(res.data) if res.data else 0}")
if res.data:
    for t in res.data:
        print("Tarefa ID:", t.get('id'))
        print("rh_execucao_processos:", t.get('rh_execucao_processos'))
        print("rh_tarefas:", t.get('rh_tarefas'))
        print("rh_execucao_tarefas_responsaveis:", t.get('rh_execucao_tarefas_responsaveis'))
        print("-----")
