# AppRioBranco

Sistema web de gestão operacional, acompanhamento de processos e monitoramento de desempenho, com **backend em FastAPI**, **frontend em React + Vite** e integração com **Supabase**.

O projeto foi estruturado para apoiar a operação interna com foco em produtividade, organização de demandas, acompanhamento de indicadores por usuário e gestão de processos empresariais.

---

## Visão geral

O AppRioBranco é dividido em duas camadas principais:

- **Backend (`/backend`)**: API desenvolvida em Python com FastAPI
- **Frontend (`/frontend`)**: interface web desenvolvida com React e Vite

A aplicação utiliza o **Supabase** como base de dados e suporte aos serviços de persistência.

---

## Estrutura do projeto

```text
AppRioBranco/
├── backend/     # API FastAPI
├── frontend/    # Aplicação React + Vite
└── README.md
Stack principal
Backend

Python 3.10+

FastAPI

Uvicorn

Supabase SDK

Frontend

React

Vite

JavaScript / JSX

Axios

Infraestrutura

Supabase

Vercel (frontend)

Ambiente Python compatível para deploy do backend

Requisitos

Antes de rodar o projeto, tenha instalado:

Python 3.10 ou superior

Node.js 18 ou superior

npm

Projeto Supabase configurado

Configuração do ambiente
Backend

Instale as dependências:

cd backend
pip install -r requirements.txt

Crie um arquivo .env dentro da pasta backend com as variáveis do ambiente:

SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_KEY=
JWT_SECRET_KEY=
ENVIRONMENT=development

Nunca publique segredos reais no repositório.

Frontend

Instale as dependências:

cd frontend
npm install

Crie um arquivo .env dentro da pasta frontend:

VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
Execução local
Iniciar backend
cd backend
uvicorn src.main:app --reload
Iniciar frontend
cd frontend
npm run dev

O frontend será executado localmente via Vite e consumirá a API configurada em VITE_API_URL.

Deploy
Frontend

O frontend pode ser publicado na Vercel usando a pasta frontend como diretório raiz.

Variáveis esperadas no ambiente:

VITE_API_URL

VITE_SUPABASE_URL

VITE_SUPABASE_ANON_KEY

Backend

O backend deve ser publicado em ambiente compatível com FastAPI/Uvicorn.

Variáveis esperadas:

SUPABASE_URL

SUPABASE_KEY

SUPABASE_SERVICE_KEY

JWT_SECRET_KEY

Autenticação e permissões

A aplicação possui fluxo de autenticação integrado ao backend e ao banco de dados.

Para ambientes de produção, recomenda-se:

utilizar segredos distintos por ambiente

revisar periodicamente permissões e acessos

validar integrações de autenticação antes de cada deploy

manter consistência entre backend, frontend e estrutura do banco

Banco de dados

O sistema depende de tabelas e relacionamentos já existentes no Supabase.

Sempre que houver alterações em:

tabelas

colunas

funções

triggers

policies

relacionamentos

é importante validar o impacto nos fluxos críticos, principalmente:

login

carregamento de usuário autenticado

permissões

processos

indicadores de desempenho

Boas práticas recomendadas

Para manter o projeto mais estável e sustentável:

separar código de produção e código de apoio/debug

evitar mocks em produção

versionar mudanças de banco

manter contratos de API estáveis

revisar autenticação e tratamento de erros antes de alterações sensíveis

testar rotas e telas críticas antes de publicar

Troubleshooting
Login não funciona

Verifique:

variáveis de ambiente do backend

conectividade com Supabase

estrutura das tabelas envolvidas no login

possíveis funções, triggers ou policies que interfiram no fluxo

Dados não aparecem no frontend

Verifique:

VITE_API_URL

resposta das rotas da API

permissões de acesso

erros no console do navegador

erros no log do backend

Tela em branco após deploy

Verifique:

build do frontend

variáveis de ambiente da Vercel

disponibilidade do backend

erros de importação

respostas 401, 403, 404 ou 500 no navegador

Roadmap técnico sugerido

Melhorias recomendadas para evolução do projeto:

fortalecer autenticação e gestão de sessão

formalizar migrações de banco

melhorar observabilidade e logs

ampliar cobertura de testes

reforçar contratos entre frontend e backend

revisar governança de permissões e acessos

Contribuição

Fluxo sugerido para contribuição:

criar uma branch a partir da principal

implementar a alteração com escopo claro

validar backend, frontend e integração

documentar mudanças relevantes

abrir um pull request com contexto técnico objetivo

Exemplo:

MIT
Contato interno

Kiko_brito

