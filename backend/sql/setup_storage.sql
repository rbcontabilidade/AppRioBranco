-- 1. Cria o bucket se não existir e o torna público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpa políticas antigas sobre o storage de objetos
DROP POLICY IF EXISTS "Avatars Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Upload Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Delete Policy" ON storage.objects;

-- 3. Política de Leitura Pública
CREATE POLICY "Avatars Public Access" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Política para Upload de Avatares (apenas autenticados)
CREATE POLICY "Avatars Upload Policy" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 5. Política para Atualização (apenas autenticados)
CREATE POLICY "Avatars Update Policy" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 6. Política para Deleção (apenas autenticados)
CREATE POLICY "Avatars Delete Policy" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
