import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing DB credentials")
    sys.exit(1)

supabase = create_client(url, key)

# Obter o primeiro vinculo que exista
res_vinc = supabase.table("rh_execucao_tarefas_responsaveis").select("funcionario_id, execucao_tarefa_id").limit(10).execute()
if not res_vinc.data:
    print("Nenhuma tarefa vinculada a ninguem na base.")
    sys.exit(0)

user_id = "123e4567-e89b-12d3-a456-426614174000"
print(f"Testando com user_id: {user_id} (UUID)")

res_vinc_user = supabase.table("rh_execucao_tarefas_responsaveis").select("execucao_tarefa_id").eq("funcionario_id", user_id).execute()
ids_tarefas = [r["execucao_tarefa_id"] for r in (res_vinc_user.data or [])]

print(f"Tarefas vinculadas para {user_id}: {len(ids_tarefas)}")

try:
    res_tarefas = supabase.table("rh_execucao_tarefas").select(
        "id, status, execucao_processo_id, tarefa_id, iniciado_em, concluido_em, "
        "rh_execucao_processos(id, competencia_id, cliente_id, status, "
        "  clientes(razao_social), "
        "  rh_processos(nome), "
        "  rh_competencias(mes, ano)"
        "), "
        "rh_tarefas(titulo, ordem, dias_prazo)"
    ).in_("id", ids_tarefas).execute()
    
    print(f"Tarefas recuperadas do BD: {len(res_tarefas.data) if res_tarefas.data else 0}")
    if res_tarefas.data:
        print("Tudo certo na query!")
    else:
        print("Nenhuma tarefa retornada.")
except Exception as e:
    print(f"Erro ao recuperar tarefas: {e}")
