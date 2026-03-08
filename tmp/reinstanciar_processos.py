import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Adiciona o diretório backend ao path para importar as configurações
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

url = os.getenv("SUPABASE_URL")
# IMPORTANTE: Use a SERVICE_ROLE_KEY aqui
service_key = os.getenv("SUPABASE_SERVICE_KEY")

if not service_key:
    print("ERRO: SUPABASE_SERVICE_KEY não encontrada no .env")
    print("Por favor, preencha a chave no arquivo backend/.env antes de rodar este script.")
    sys.exit(1)

supabase_admin = create_client(url, service_key)

def lancar_manual(client_id, template_id):
    print(f"--- Lançando Processo {template_id} para Cliente {client_id} ---")
    
    # 1. Vincular
    try:
        supabase_admin.table("rh_processos_clientes").upsert({
            "processo_id": template_id,
            "cliente_id": client_id
        }).execute()
        print("Vínculo permanente criado/confirmado.")
    except Exception as e:
        print(f"Erro ao vincular: {e}")
        return

    # 2. Buscar Competência Aberta
    res_comp = supabase_admin.table("rh_competencias").select("id").eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
    if not res_comp.data:
        print("Sem competência aberta. Abortando lançamento de execução.")
        return
    
    comp_id = res_comp.data[0]['id']
    print(f"Competência ativa: ID {comp_id}")

    # 3. Criar Execução
    try:
        res_new_exec = supabase_admin.table("rh_execucao_processos").insert({
            "processo_id": template_id,
            "cliente_id": client_id,
            "competencia_id": comp_id,
            "status": "PENDENTE"
        }).execute()
        
        if not res_new_exec.data:
            print("Falha ao criar execução (possivelmente já existe).")
            return
            
        exec_proc_id = res_new_exec.data[0]['id']
        print(f"Execução de Processo criada: ID {exec_proc_id}")

        # 4. Clonar Tarefas
        res_tarefas = supabase_admin.table("rh_tarefas").select("*").eq("processo_id", template_id).order("ordem").execute()
        id_map = {}

        for t in res_tarefas.data:
            res_t_exec = supabase_admin.table("rh_execucao_tarefas").insert({
                "execucao_processo_id": exec_proc_id,
                "tarefa_id": t['id'],
                "status": "PENDENTE" if not t['dependente_de_id'] else "BLOQUEADA"
            }).execute()

            if res_t_exec.data:
                t_exec_id = res_t_exec.data[0]['id']
                id_map[t['id']] = t_exec_id
                
                # Responsáveis
                res_resp = supabase_admin.table("rh_tarefas_responsaveis").select("funcionario_id").eq("tarefa_id", t['id']).execute()
                if res_resp.data:
                    resp_payload = [{"execucao_tarefa_id": t_exec_id, "funcionario_id": r['funcionario_id']} for r in res_resp.data]
                    supabase_admin.table("rh_execucao_tarefas_responsaveis").insert(resp_payload).execute()
                
                print(f"  - Tarefa '{t['titulo']}' instanciada.")

        print("--- FINALIZADO COM SUCESSO ---")
    except Exception as e:
        print(f"Erro durante o lançamento: {e}")

if __name__ == "__main__":
    # Para testar, você pode passar IDs aqui ou deixar o usuário rodar com argumentos
    # Exemplo de uso: python reinstanciar_processos.py <client_id> <template_id>
    if len(sys.argv) < 3:
        print("Uso: python reinstanciar_processos.py <client_id> <template_id>")
        # Vamos tentar rodar para um cliente e processo padrão se existir
        # mas melhor deixar para o usuário.
    else:
        lancar_manual(int(sys.argv[1]), int(sys.argv[2]))
