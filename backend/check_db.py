
import os
from supabase import create_client

url = "https://khbdbuoryxqiprlkdcpz.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

supabase = create_client(url, key)

# Tentar buscar nomes de tabelas via RPC se existir, ou apenas listar algo conhecido
try:
    # Vamos tentar inferir via erro ou buscar colunas de rh_tarefas
    res = supabase.table("rh_tarefas").select("*").limit(1).execute()
    print("Colunas em rh_tarefas:", res.data[0].keys() if res.data else "Sem dados")
except Exception as e:
    print("Erro ao acessar rh_tarefas:", e)

try:
    # Listar tabelas comuns
    tabelas = ["rh_categorias", "categorias", "rh_tarefa_categorias", "tarefa_categorias"]
    for t in tabelas:
        try:
            res = supabase.table(t).select("count", count="exact").limit(1).execute()
            print(f"Tabela {t} existe.")
        except:
            print(f"Tabela {t} NÃO existe.")
except Exception as e:
    print("Erro ao verificar tabelas:", e)
