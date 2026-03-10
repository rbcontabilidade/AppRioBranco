import asyncio
from src.core.database import supabase_admin

async def test_filter():
    try:
        # Tentar migrar a tabela adicionando is_active
        from sqlalchemy import create_engine, text
        import os
        from dotenv import load_dotenv
        load_dotenv()
        url = os.environ.get("SUPABASE_DB_URL")
        engine = create_engine(url)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE rh_tarefas_checklists ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))
            conn.commit()
            print("Coluna is_active adicionada.")
            
        # Setar is_active=False para um checklist
        res1 = supabase_admin.table("rh_tarefas_checklists").update({"is_active": False}).limit(1).execute()
        
        # Testar select embarcado
        res = supabase_admin.table("rh_tarefas").select("id, rh_tarefas_checklists(*)").eq("rh_tarefas_checklists.is_active", True).limit(5).execute()
        for t in res.data:
            print(f"Tarefa {t['id']}: {len(t['rh_tarefas_checklists'])} checklists")
            
    except Exception as e:
        print("Erro:", e)

if __name__ == "__main__":
    asyncio.run(test_filter())
