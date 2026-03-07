
import os
from supabase import create_client

url = "https://khbdbuoryxqiprlkdcpz.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoYmRidW9yeXhxaXBybGtkY3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODU4ODcsImV4cCI6MjA4NzI2MTg4N30.1rr3_-LVO6b2PR96lJl8d7vVfHseWwUeAQDY4tdJR-M"

supabase = create_client(url, key)

print("--- Verificando rh_execucao_tarefas_responsaveis ---")
try:
    res = supabase.table("rh_execucao_tarefas_responsaveis").select("count", count="exact").limit(1).execute()
    print("Sucesso: rh_execucao_tarefas_responsaveis existe.")
    
    # Verificando dados para um usuario (ex: 15 ou 1)
    res_data = supabase.table("rh_execucao_tarefas_responsaveis").select("*").limit(5).execute()
    print("Exemplos de dados:", res_data.data)
except Exception as e:
    print("Erro:", e)

print("\n--- Verificando funcionarios ---")
try:
    res = supabase.table("funcionarios").select("id, nome").limit(5).execute()
    print("IDs de funcionarios:", res.data)
except Exception as e:
    print("Erro:", e)
