import os
import requests
from dotenv import load_dotenv
import bcrypt
import hashlib

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

def _pre_hash(password: str) -> bytes:
    return hashlib.sha256(password.encode('utf-8')).digest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if bcrypt.checkpw(_pre_hash(plain_password), hashed_password.encode('utf-8')):
            return True
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return plain_password == hashed_password

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

print(f"Buscando 'Manager' em {SUPABASE_URL}...")
r = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=nome,senha,ativo&nome=eq.Manager", headers=headers)

if r.status_code == 200:
    data = r.json()
    if data:
        user = data[0]
        print(f"Usuário encontrado: {user['nome']}")
        print(f"Status Ativo: {user.get('ativo')}")
        h = user['senha']
        res = verify_password('123', h)
        print(f"Senha '123' confere? {res}")
        if not res:
            print(f"Hash no banco: {h}")
    else:
        print("Usuário 'Manager' não encontrado na tabela 'funcionarios'.")
        # Listar alguns usuários para ver quem existe
        r2 = requests.get(f"{SUPABASE_URL}/rest/v1/funcionarios?select=nome&limit=5", headers=headers)
        if r2.status_code == 200:
            print("Alguns usuários existentes:", r2.json())
else:
    print(f"Erro na requisição: {r.status_code} - {r.text}")
