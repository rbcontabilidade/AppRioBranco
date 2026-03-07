---
title: AppRioBranco API
emoji: 🚀
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# FiscalApp - Sistema de Gestão Fiscal

Este repositório contém o sistema **FiscalApp**, composto por um backend em Python (FastAPI) e um frontend em React (Vite).

## Status de Deploy: Correção do Erro de Login (PGRST205)

Realizamos uma reestruturação completa para organizar o código na raiz e eliminar referências à tabela obsoleta `cargos`.

### Estrutura do Projeto
- `/backend`: API FastAPI (Python 3.10+).
- `/frontend`: Interface do Usuário (React + Vite).

---

## 🚀 Ação Necessária no Supabase

Para que o login volte a funcionar sem interrupções, é necessário remover gatilhos antigos que tentam acessar tabelas inexistentes. Execute o comando abaixo no **SQL Editor** do Supabase:

```sql
-- 1. Remover o gatilho que tenta criar perfis em tabelas inexistentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remover a função de manipulação de novos usuários (obsoleta)
DROP FUNCTION IF EXISTS public.handle_new_user();
```

---

## 🛠️ Instruções de Deploy

### Vercel (Frontend)
1. Conecte o repositório à Vercel.
2. Defina o **Root Directory** como `frontend`.
3. Certifique-se de que as variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_API_URL` estão configuradas.
4. Execute um **Redeploy with clean cache** se o erro persistir.

### Hugging Face (Backend)
1. Conecte o repositório ao seu Space.
2. Defina o diretório de execução para a raiz (ou `backend`).
3. O arquivo `main.py` está configurado para o ambiente de produção.

---

## 📝 Documentação Adicional
Para detalhes técnicos detalhados da migração de tabelas, consulte o histórico de commits.
