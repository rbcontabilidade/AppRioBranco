import asyncio
from src.core.database import supabase, supabase_admin
from src.api.v1.endpoints.processos import lancar_processo_cliente

async def test_launch_and_update():
    # Encontra um processo que TEM clientes
    res = supabase.table("rh_processos_clientes").select("processo_id, cliente_id").limit(1).execute()
    if not res.data:
        print("Nenhum processo com clientes.")
        return
    p_id = res.data[0]['processo_id']
    c_id = res.data[0]['cliente_id']
    
    print(f"Lançando execução para P_ID: {p_id}, C_ID: {c_id}")
    try:
        await lancar_processo_cliente(c_id, p_id)
        print("Lançado!")
    except Exception as e:
        print("Erro ao lançar:", e)

    # Agora tenta atualizar
    import tmp_test_asgi
    await tmp_test_asgi.test_update_asgi()

if __name__ == "__main__":
    asyncio.run(test_launch_and_update())
