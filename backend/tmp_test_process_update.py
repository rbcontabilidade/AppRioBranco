import asyncio
import logging
from src.core.database import supabase, supabase_admin
from src.api.v1.endpoints.processos import atualizar_processo, ProcessoCompletoSchema, RotinaSchema

logging.basicConfig(level=logging.ERROR)

async def test_update():
    # 1. Ache um processo com clientes
    res_clientes = supabase.table("rh_processos_clientes").select("processo_id").limit(1).execute()
    if not res_clientes.data:
        print("Nenhum processo com clientes encontrado. Criando um vínculo fake...")
        res_proc = supabase.table("rh_processos").select("id").limit(1).execute()
        if not res_proc.data:
            print("Nenhum processo encontrado.")
            return
        p_id = res_proc.data[0]['id']
        res_cli = supabase.table("clientes").select("id").limit(1).execute()
        c_id = res_cli.data[0]['id']
        supabase.table("rh_processos_clientes").insert({"processo_id": p_id, "cliente_id": c_id}).execute()
    else:
        p_id = res_clientes.data[0]['processo_id']
    
    print(f"Testando update no processo ID: {p_id}")
    
    # 2. Obter processo
    res = supabase.table("rh_processos").select("*").eq("id", p_id).single().execute()
    p_data = res.data
    
    res_t = supabase.table("rh_tarefas").select("*, rh_tarefas_responsaveis(funcionario_id), rh_tarefas_checklists(*)").eq("processo_id", p_id).eq("is_active", True).execute()
    
    steps = []
    for t in res_t.data:
        steps.append(RotinaSchema(
            id=t['id'],
            nome=t['titulo'],
            descricao=t['descricao'],
            ordem=t['ordem'],
            dias_prazo=t['dias_prazo'],
            dependente_de_id=t['dependente_de_id'],
            responsible_users=[r['funcionario_id'] for r in t['rh_tarefas_responsaveis']],
            checklist=[{"id": c['id'], "text": c['item_texto']} for c in t['rh_tarefas_checklists']]
        ))
        
    payload = ProcessoCompletoSchema(
        nome=p_data['nome'] + " Editado Test",
        descricao=p_data.get('descricao', ''),
        frequencia=p_data.get('frequencia', 'Mensal'),
        steps=steps
    )
    
    try:
        await atualizar_processo(p_id, payload)
        print("Sucesso!")
    except Exception as e:
        print("Erro interceptado:")
        print(repr(e))

if __name__ == "__main__":
    asyncio.run(test_update())
