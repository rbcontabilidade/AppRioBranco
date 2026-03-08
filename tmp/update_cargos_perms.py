import os
import json
from supabase import create_client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('backend/.env')
url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SERVICE_KEY')

if not url or not service_key:
    print("Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não encontrados no .env")
    exit(1)

supabase = create_client(url, service_key)

def update_cargos():
    print("--- Atualizando permissões dos cargos ---")
    res = supabase.table('cargos_permissoes').select('id, nome_cargo, telas_permitidas').execute()
    
    for cargo in res.data:
        cargo_id = cargo['id']
        nome = cargo['nome_cargo']
        telas = cargo['telas_permitidas']
        
        # Converter string JSON se necessário
        is_string = isinstance(telas, str)
        if is_string:
            try:
                telas = json.loads(telas)
            except:
                telas = []
        
        if not isinstance(telas, list):
            telas = []
            
        modified = False
        for base in ["dashboard", "settings"]:
            if base not in telas:
                telas.append(base)
                modified = True
        
        if modified:
            val_to_save = json.dumps(telas) if is_string else telas
            supabase.table('cargos_permissoes').update({'telas_permitidas': val_to_save}).eq('id', cargo_id).execute()
            print(f"Cargo '{nome}' (ID {cargo_id}) atualizado: {telas}")
        else:
            print(f"Cargo '{nome}' (ID {cargo_id}) já possui permissões base.")

if __name__ == "__main__":
    update_cargos()
    print("--- Finalizado ---")
