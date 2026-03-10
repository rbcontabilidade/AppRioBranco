import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def run_ddl():
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        print("SUPABASE_DB_URL not found")
        return
        
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Add is_active column
        cur.execute("ALTER TABLE rh_tarefas_checklists ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;")
        print("Adicionada coluna is_active em rh_tarefas_checklists.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    run_ddl()
