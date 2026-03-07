-- Script 02_processos_tarefas.sql
-- Novo esquema para o fluxo de Processos e Tarefas individuais (Migração do antigo `meses`)

-- 1. Definição do Processo Pai (Ex: "Fechamento Contábil Mensal")
CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  frequencia VARCHAR(50) DEFAULT 'Mensal', -- Mensal, Anual, Sob Demanda
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Rotinas (Templates de tarefas) que pertencem a um Processo Pai
CREATE TABLE IF NOT EXISTS processo_rotinas (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0, -- Para ordenar as rotinas na tela
  dias_prazo INTEGER DEFAULT 5, -- SLA de entrega após a criação da competência
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Vínculo: Quais Clientes devem cumprir aquele Processo?
CREATE TABLE IF NOT EXISTS clientes_processos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(cliente_id, processo_id)
);

-- 4. Instâncias Finais (A Tarefa Real): Geradas quando uma Competência abre para um Cliente específico
-- Esta tabela substitui a forma antiga como a tabela `meses` funcionava na competência.
-- Aparecerá no Dashboard do Funcionário responsável pelo cliente.
CREATE TABLE IF NOT EXISTS tarefas_instanciadas (
  id SERIAL PRIMARY KEY,
  rotina_id INTEGER REFERENCES processo_rotinas(id) ON DELETE RESTRICT,
  cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
  competence_id INTEGER REFERENCES competences(id) ON DELETE CASCADE,
  funcionario_responsavel_id INTEGER REFERENCES funcionarios(id), -- Pego do cadastro do cliente ou atribuído manualmente
  status VARCHAR(20) DEFAULT 'Pendente', -- Pendente, Em Andamento, Concluído, Atrasado
  data_vencimento DATE, 
  data_conclusao TIMESTAMP WITH TIME ZONE,
  comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Função de Banco de Dados ou Gatilho (Opcional, mas recomendado para automatizar)
-- Quando uma competência (ex: 03/2026) é criada/aberta, o ideal seria que um backend
-- ou o trigger rodasse sobre a tabela `clientes_processos` copiando as `processo_rotinas`
-- para a tabela `tarefas_instanciadas` atrelando à `competence_id`.
