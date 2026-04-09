# Checklist Master: Auditoria Técnica (AppRioBranco)

Abaixo está o tracking geral de todas as anomalias extraídas do `analise_tecnica.md`, estruturadas de ponta a ponta.

## 1. Problemas Críticos (Prioridade Máxima)
- `[ ]` **Backend Breach:** Proteger a rota `/api/backup/download` com autenticação JWT/Admin.
- `[ ]` **CORS Excessivo:** Restringir domínios Vercel permitidos no `main.py` (Backend).
- `[x]` **Vazamento de Role (Client):** Removidas as instâncias cegas no HTML/Vanilla js do `window.LOGGED_USER` que podiam forjar autorizações.
- `[ ]` **Blindagem de Modelos (Backend):** Adicionar tipagem estrita com Pydantic em retornos de APIs sensíveis e validar roles no recebimento em vez de confiar no envio do front.

## 2. Refatoração Arquitetural e Código Morto (Frontend)
- `[x]` **Fim do Monolítico Vanilla:** Arquivos gigantescos (`app.js`, `store.js`) e HTML rígido (~3000 linhas) foram totalmente deletados. Somente React gerencia o DOM agora.
- `[ ]` **Wrappers Redundantes na API:** Limpar a classe `frontend/src/services/api.js` que engolfa o Axios com dezenas de `If/Else` mapeando caminhos falsos estaticamente (`if (url === '/clients') ...`).

## 3. Gargalos de Performance e Estabilidade
- `[x]` **Fim da Hidratação OOM (Dashboard):** Implementado `@tanstack/react-query` para paginação em cache no Frontend e bloqueio de fetch descontrolado no Backend via filtros `.in_()` do Supabase.
- `[ ]` **Reaplicar Cache (React Query):** Estender a arquitetura de cache do Dashboard para as listagens densas restantes: Tela de Clientes, Funcionários e Setores.

## 4. UX / UI e Estabilidade Visual
- `[ ]` **Remover Duplos Cycles / Flashes (CLS):** Investigar e remover as quebras de renderização (Flashes) ocorrendo no `App.jsx` ou SideMenu por leituras rudes de `localStorage` antes da pintura da tela.
- `[ ]` **Adequação do Splash Screen:** Remover lógicas legadas bloqueantes de loading splash e amarrar isso exclusivamente à suspensão autônoma do React Router (`Suspense`).

## 5. Banco de Dados / Supabase
- `[ ]` **JSONB Casting:** Alterar colunas nativas que guardam Checklists em Strings `VARCHAR` engessadas para tipos PostgreSQL puros `jsonb`.
- `[ ]` **Blindagem Ambiental:** Garantir que o `SUPABASE_SERVICE_KEY` jamais falhe para o key anônimo via python `os.getenv`.
