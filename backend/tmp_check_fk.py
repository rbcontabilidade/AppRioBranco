import asyncio
from src.core.database import supabase

async def run():
    res = supabase.table("rh_execucao_checklists").select("*").limit(1).execute()
    print("rh_execucao_checklists colunas:", list(res.data[0].keys()) if res.data else "Vazia")
    
    res2 = supabase.table("rh_execucao_tarefas_responsaveis").select("*").limit(1).execute()
    print("rh_execucao_tarefas_responsaveis colunas:", list(res2.data[0].keys()) if res2.data else "Vazia")

if __name__ == "__main__":
    asyncio.run(run())
