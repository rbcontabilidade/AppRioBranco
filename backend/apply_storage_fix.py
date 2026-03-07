import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('c:/Users/ribei/OneDrive/Desktop/RB/FiscalApp/backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(url, key)

sql = """
-- 1. Cria o bucket se não existir e garante que é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpa todas as políticas antigas
DROP POLICY IF EXISTS "Avatars Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Upload Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Delete Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Public Insert" ON storage.objects;

-- 3. Leitura Pública
CREATE POLICY "Avatars Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Upload para Público (necessário porque o app usa auth customizada)
CREATE POLICY "Avatars Public Insert" ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- 5. Atualização Pública
CREATE POLICY "Avatars Update Policy" ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'avatars');

-- 6. Deleção Pública
CREATE POLICY "Avatars Delete Policy" ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'avatars');
"""

try:
    res = supabase.rpc("exec_sql", {"query": sql}).execute()
    print("Políticas atualizadas via exec_sql RPC com sucesso!")
except Exception as e:
    print(f"Erro ao executar via RPC: {e}")
