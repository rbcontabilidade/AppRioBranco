-- [DESATIVADO] Trigger para Automação de Perfis de Usuários
-- Este trigger foi desativado pois a tabela 'profiles' foi removida e o sistema
-- agora utiliza a tabela 'funcionarios' com IDs inteiros gerenciados pelo backend.
-- Manter este trigger ativo causaria erros em novos cadastros.

/*
-- 1. Função que processa o gatilho
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- A tabela profiles não existe mais.
  -- Se precisar de sincronização com funcionarios, adicione uma coluna 'user_id' (uuid) em funcionarios.
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Gatilho (Trigger) propriamente dito
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
*/

-- COMENTÁRIO TÉCNICO:
-- Ao criar um usuário via código ou no painel do Supabase, você pode passar metadados:
-- Exemplo via JS: supabase.auth.signUp({ email, password, options: { data: { full_name: 'João Silva', role: 'Gerente' } } })
-- O Trigger acima pegará esses dados e salvará na tabela 'profiles' para nós.
