import os
import sys
from datetime import datetime
from dotenv import load_dotenv

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
load_dotenv()

from src.core.database import supabase_admin, supabase

client = supabase_admin if supabase_admin else supabase

# Buscar as competências ABERTAS e ordená-as por ano e mês
resp_ativas = client.table("rh_competencias").select("*").eq("status", "ABERTA").order("ano", desc=True).order("mes", desc=True).execute()

ativas = resp_ativas.data
print(f"Total de competências ativas encontradas: {len(ativas)}")

if len(ativas) <= 1:
    print("Estado normal. Nenhuma correção necessária.")
else:
    # A primeira da lista ordenada é a mais recente
    mais_recente = ativas[0]
    print(f"Mantendo como ativa a mais recente: ID {mais_recente['id']} ({mais_recente['mes']}/{mais_recente['ano']})")

    # Todas as outras devem ser fechadas
    para_fechar = ativas[1:]
    for comp in para_fechar:
        now_str = datetime.utcnow().isoformat()
        print(f"Fechando competência inválida: ID {comp['id']} ({comp['mes']}/{comp['ano']})")
        res = client.table("rh_competencias").update({
            "status": "FECHADA",
            "data_fechamento": now_str
        }).eq("id", comp["id"]).execute()
        if not hasattr(res, 'error') or not res.error:
            print(f"  -> Fechada com sucesso.")
        else:
            print(f"  -> Falha ao fechar: {res.error}")

print("Correção concluída.")
