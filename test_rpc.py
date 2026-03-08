import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

sql = """
SELECT 1;
"""

def test_rpc():
    try:
        res = supabase.rpc("exec_sql", {"query": sql}).execute()
        print(f"SUCCESS: {res.data}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_rpc()
