-- 1. Criar a Tabela de Setores
CREATE TABLE IF NOT EXISTS public.setores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Inserir alguns setores padrões (apenas se a tabela estiver vazia)
INSERT INTO public.setores (id, nome)
VALUES 
    (1, 'Fiscal'),
    (2, 'Contábil'),
    (3, 'Departamento Pessoal'),
    (4, 'Administrativo'),
    (5, 'RH'),
    (6, 'Legalização'),
    (10, 'Marketing'),
    (11, 'Atendimento')
ON CONFLICT (id) DO NOTHING;

-- 3. Alterar a tabela de funcionários para incluir a Chave Estrangeira(Foreign Key) de setor_id
-- NOTA: Como você já possui uma tabela 'funcionarios', adicionaremos a coluna opcional no início.
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS setor_id INTEGER REFERENCES public.setores(id) ON DELETE SET NULL;
