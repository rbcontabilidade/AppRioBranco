-- Script de Criação das Novas Tabelas p/ Migração do Sistema FrontEnd REACT
-- Execute este arquivo no SQL Editor do seu Supabase Dashboard

-- 1. Tabela de Gestão de Competências Mes/Ano
CREATE TABLE IF NOT EXISTS competences (
  id SERIAL PRIMARY KEY,
  period VARCHAR(7) NOT NULL UNIQUE, -- Exemplo: "02/2026"
  status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'Closed', 'Archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Permissões e Perfis (Substituindo a antiga 'cargos')
CREATE TABLE IF NOT EXISTS cargos_permissoes (
  id SERIAL PRIMARY KEY,
  nome_cargo VARCHAR(100) NOT NULL,
  telas_permitidas JSONB DEFAULT '[]', -- Adicionado campo de telas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ... (demais tabelas)

-- Mockups Opcionais Iniciais (Apenas se o banco estiver vazio nessas tabelas)
INSERT INTO cargos_permissoes (nome_cargo) VALUES 
('Administrador'),
('Gerente DP'),
('Analista Fiscal')
ON CONFLICT DO NOTHING;
