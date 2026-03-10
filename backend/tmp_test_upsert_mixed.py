import asyncio
from src.core.database import supabase, supabase_admin

async def test_upsert():
    # Encontra um item de checklist que já está em uma execução
    res = supabase_admin.table("rh_execucao_checklists").select("checklist_id").limit(1).execute()
    if not res.data:
        print("Sem execucoes de checklist")
        return
        
    c_id = res.data[0]['checklist_id']
    
    # Pega detalhes do checklist original
    res_c = supabase_admin.table("rh_tarefas_checklists").select("*").eq("id", c_id).single().execute()
    c_data = res_c.data
    
    print(f"Tentando UPSERT_MIXED no checklist_id: {c_id}")
    
    items_para_upsert = [
        {
            "id": c_id,
            "tarefa_id": c_data['tarefa_id'],
            "item_texto": c_data['item_texto'] + " misturado"
        },
        {
            "tarefa_id": c_data['tarefa_id'],
            "item_texto": "Nova tarefa teste"
        }
    ]
    
    print("Payload:", items_para_upsert)
    
    try:
        res_up = supabase_admin.table("rh_tarefas_checklists").upsert(items_para_upsert).execute()
        print("Sucesso no upsert!")
    except Exception as e:
        print("Erro no upsert:", e)
        if hasattr(e, 'details'):
            print("Detalhes:", e.details)

if __name__ == "__main__":
    asyncio.run(test_upsert())
