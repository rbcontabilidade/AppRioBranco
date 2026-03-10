import asyncio
import json
import httpx
from src.core.database import supabase

async def test_update_http():
    # Encontra um processo que TEM clientes
    res = supabase.table("rh_processos_clientes").select("processo_id").limit(1).execute()
    if not res.data:
        print("Nenhum processo com clientes.")
        return
    p_id = res.data[0]['processo_id']
    print(f"Processo alvo (com clientes): {p_id}")
    
    # Busca detalhes
    res_p = supabase.table("rh_processos").select("*").eq("id", p_id).single().execute()
    p_data = res_p.data
    
    res_t = supabase.table("rh_tarefas").select("*, rh_tarefas_responsaveis(funcionario_id), rh_tarefas_checklists(*)").eq("processo_id", p_id).eq("is_active", True).execute()
    
    steps = []
    for t in res_t.data:
        steps.append({
            "id": t['id'],
            "nome": t['titulo'],
            "descricao": t['descricao'] or '',
            "ordem": t['ordem'],
            "dias_prazo": t['dias_prazo'] or 0,
            "dependente_de_id": t['dependente_de_id'],
            "responsible_users": [r['funcionario_id'] for r in t['rh_tarefas_responsaveis']],
            "checklist": [{"id": c['id'], "text": c['item_texto']} for c in t['rh_tarefas_checklists']]
        })
        
    payload = {
        "nome": p_data['nome'] + " Editado via HTTP",
        "descricao": p_data.get('descricao') or '',
        "frequencia": p_data.get('frequencia') or 'Mensal',
        "steps": steps
    }
    
    print("Enviando payload:", json.dumps(payload, indent=2))
    
    async with httpx.AsyncClient() as client:
        # A porta do backend do usuario costuma ser 8000
        resp = await client.put(f"http://127.0.0.1:8000/api/processos/{p_id}", json=payload)
        print("Status HTTP:", resp.status_code)
        print("Response:", resp.text)

if __name__ == "__main__":
    asyncio.run(test_update_http())
