from src.core.database import supabase_admin

def check_schema():
    try:
        # Pega uma linha pra ver as colunas
        res = supabase_admin.table("rh_execucao_tarefas").select("*").limit(1).execute()
        if res.data:
            print("Colunas:", list(res.data[0].keys()))
        else:
            print("Nenhum dado encontrado.")
    except Exception as e:
        print("Erro:", e)

if __name__ == "__main__":
    check_schema()
