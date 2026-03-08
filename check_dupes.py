import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from src.core.database import supabase

def check_duplicates():
    try:
        res = supabase.table("cargos_permissoes").select("nome_cargo").execute()
        if res.data:
            names = [r['nome_cargo'] for r in res.data]
            duplicates = set([x for x in names if names.count(x) > 1])
            if duplicates:
                print(f"DUPLICATES_FOUND: {duplicates}")
            else:
                print("NO_DUPLICATES_FOUND")
        else:
            print("NO_DATA")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_duplicates()
