
from src.core.database import supabase_admin
import json

def test_query():
    try:
        # Teste 1: Buscar competência
        res_comp = supabase_admin.table("rh_competencias").select("id, mes, ano, status").eq("status", "ABERTA").order("id", desc=True).limit(1).execute()
        print("Competência:", res_comp.data)
        
        if not res_comp.data:
            print("Nenhuma competência aberta encontrada.")
            return
            
        comp_id = res_comp.data[0]['id']
        
        # Teste 2: Buscar processos
        res_proc = supabase_admin.table("rh_execucao_processos").select(
            "id, status, competencia_id, cliente_id, processo_id, "
            "clientes(razao_social), rh_processos(nome)"
        ).eq("competencia_id", comp_id).execute()
        print(f"Processos encontrados: {len(res_proc.data or [])}")
        
        # Teste 3: Buscar tarefas
        proc_ids = [p["id"] for p in (res_proc.data or [])]
        if proc_ids:
            res_tarefas = supabase_admin.table("rh_execucao_tarefas").select(
                "id, status, execucao_processo_id, tarefa_id, "
                "rh_tarefas(titulo, ordem, dias_prazo), "
                "rh_execucao_tarefas_responsaveis(funcionario_id, "
                "  funcionarios(nome))"
            ).in_("execucao_processo_id", proc_ids).execute()
            print(f"Tarefas encontradas: {len(res_tarefas.data or [])}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERRO NO TESTE: {e}")

if __name__ == "__main__":
    test_query()
