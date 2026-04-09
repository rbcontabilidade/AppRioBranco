# Auditoria Técnica e Análise do Sistema (AppRioBranco)

Aqui está uma análise profunda, estruturada e técnica do sistema **AppRioBranco**, identificando a fundo as anomalias nas arquiteturas do frontend e backend.

Esta análise examinou diretamente as estruturas vitais do projeto (como `mains.py`, `database.py`, middlewares, rotas na API, configuração Vite, código massivo do frontend Vanilla (`app.js`, `store.js`) e os novos componentes React (`App.jsx`)).

---

## 1. Problemas Críticos (ALTA PRIORIDADE)
> [!CAUTION]
> Existem vulnerabilidades graves que exigem resolução imediata (Hotfix).

*   **Vazamento Crítico de Banco de Dados (Data Breach):** No arquivo `backend/src/main.py`, existe a rota `@app.get("/api/backup/download")`. Essa rota usa o cliente supabase_admin para fazer dump completo de **TODAS** as tabelas do projeto (funcionários, log de clientes, chaves e senhas financeiras no cliente, execuções) em formato JSON. O problema: **ela não exige nenhuma autenticação ou dependência de token na rota**. Literalmente qualquer usuário da internet que acessar essa URL puxará toda a base viva do seu aplicativo instantaneamente.
*   **Vulnerabilidade de Forja de Autoria (Identity Spoofing):** Em `frontend/src/services/store.js`, métodos como o que cadastra logs (`registerLog`) pegam inteiramente dados globais expostos na aba do navegador via manipulação Vanilla JS (`window.LOGGED_USER.nome` e `window.LOGGED_USER.permissao`) e mandam isso no Body da requisição. Qualquer usuário usando "Inspecionar Elemento" pode alterar a variável JavaScript `window.LOGGED_USER.permissao = 'Manager'` e forjar aprovações e logs assinando como a Diretoria. O backend não está extraindo as roles e permissões pelo Token JWT seguro como deveria.

## 2. Código Morto & Redundância
> [!WARNING]
> O código possui anomalias arquiteturais graves e código morto concorrente.

*   **Conflito de Arquiteturas ("Frankenstein" Frontend):** Existe uma anomalia severa no Frontend. Uma arquitetura moderna em React (`index.jsx`, `App.jsx`, roteamento) foi introduzida, porém o código legado roda simultaneamente. O arquivo `index.html` contém um HTML rígido enorme (164 KB) rodando em tela com um script monolítico `js/app.js` de 5.500+ linhas (`Vanilla JS`), que manipula o DOM puramente usando `document.getElementById`. O projeto está duplicado entre o ecossistema React Componentizado e as antigas funções Vanilla. Isso causa redrawing redundante, concorrência pelo DOM e falhas na experiência visual.
*   **Envelopamento Redundante no Axios:** Dentro de `frontend/src/services/api.js`, foi criado um wrapper por cima do Axios usando *If/Else* massivo para traduzir requisições em tempo de execução:
    ```javascript
    if (url === '/clients') return apiInstance.get('/clientes', config);
    // Para profiles retorna perfis, departments retorna setores, etc.
    ```
    Isso é anti-padrão (dead code translation). Componentes devem consumir endpoints puros evitando mapeamentos verbosos nos interceptores estáticos.

## 3. Gargalos de Performance (Bottlenecks)
> [!TIP]
> Algumas decisões arquiteturais bloqueiam a estabilidade de First Contentful Paint.

*   **OOM Causado por Hidratação (`fetchAllData`)**: O projeto usa uma estratégia de hidratação no arquivo `store.js` que efetua requisições sequenciais usando `Promise.all` para baixar e manter a **integralidade** da base de dados no cliente no Boot do App (todos os clientes, rotinas e todas as de milhares de tarefas fechadas). Não há Lazy Loading por servidor, sendo tudo In-Memory. Com o crescimento dos processos nos meses subsequentes, o array pesará incontáveis Megabytes no DOM, causando "vazamento" de memória e lentidão extrema ou queda (OOM) no Chrome.
*   **A "Falsa" Otimização do React.lazy**: O uso de `React.lazy` nas Views e Controllers React no `App.jsx` é anulado pelo gargalo acima, já que a página fica ociosa enquanto bloqueia Thread aguardando toda a carga monstra do Vanilla JS antes de pintar.

## 4. Riscos de Segurança Sistêmicos
*   **Padrão Inseguro de Instância Supabase**: No arquivo `backend/src/core/database.py`, os tokens de carga crítica são instanciados da seguinte forma:
    `service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")`
    Isto é um grande risco de segurança de implantação. Se acidentalmente a chave Service_Key de Prod não for configurada no PaaS, ele recai silenciosamente usando o Token Anônimo do Supabase, o qual pode restringir acessos indevidamente baseados em RLS ou o oposto, mascarando a infraestrutura global.
*   **CORS Vercel Excessivo**: O CORS na API backend (`main.py`) libera explicitamente via RegEx qualquer domínio criado na plataforma de infraestrutura `https://.*\.vercel\.app.*`. Um desenvolvedor mal intencionado que crie a própria vercel paralela passaria limpo pelo filtro de CORS Origins.

## 5. Problemas de Banco de Dados e Schema
*   **Armazenamento de JSON como Strings Simples**: A manipulação presente no frontend de strings parseadas (`JSON.parse(c.rotinas_selecionadas)`) implica que dados estruturales de Checklists e arrays de configurações estão no Supabase (Postgres) usando os tipos simples e genéricos (`VARCHAR`/`TEXT`). Utilizar tipos estritos como `jsonb` resolveria os gargalos e permitiria criar GIN indexamentos valiosos no Back, permitindo filtragens e buscas avançadas nativas no núcleo PostgreSQL.
*   **Ignorância no Tráfego com Bypass de Configurações**: Pelo histórico de schema (a query `fix_audit_logs_rls.sql`), sabemos que o RLS está implementado no Supabase. Contudo, devido a vazamentos via Supabase_Admin Key (no `/backup/download`), essas políticas de RLS não servem a seu propósito na API rest.

## 6. Revisão Arquitetural
*   **Coupling / God File (`store.js`)**: O arquivo `.js` no Frontend (Services/Store) tem cerca de 1.800 linhas agindo como mini banco de dados autônomo, processamento RPC manual, cálculo matemático e Listeners amarrados ao DOM. A mistura forte entre código que chama API com código manipulador de HTML desativa qualquer possibilidade razoável de teste unitário. A complexidade do DOM e das chamadas lógicas quebra a reusabilidade do componente.
*   **Ausência do Pydantic nas Interfaces de Resposta**: Em muitas rotas da API em FastAPI, não estão associados estritamente os _Response Models_ (Ex: `app.get() -> dict` retornando JSON livre via dicionário). Definir de volta as `BaseModels` do Pydantic formaliza a documentação via Schema (Swagger UI) e blinda a serialização automática da Base Supabase para a API externa.

## 7. UX/UI - Erros Estruturais de Design Local
*   **Duplo Ciclo de Rendering / CLS**: A UI tenta frequentemente remontar o Side-menu e views fazendo manipulação imperativa manual com `setTimeout()` ou chamando `localstorage.getItem()`. O usuário verá pulos abruptos ("flashes" da tela) conforme os blocos se rearranjam em milissegundos pós load. 
*   **Splashes Bloqueantes**: O `app-splash-screen` que oculta o app inteiro é guiado por um Timeout Hardcoded do Fetch Legacy, gerando dependência falsa num layout com React Router livre que tem sua própria estratégia suspensa de rotas na web moderna.

---

## 8. Action Plan (Plano de Resolução Priorizado)

> [!IMPORTANT]
> Siga este roteiro em ordem para blindar o sistema, começando das falhas abertas publicamente (CRITICAL).

**Passo 1 (Crítico - Faça em Minutos):**
- Adicione as proteções e restrições corretas de dependência na Rota (`/api/backup/download`) pelo backend: injete um Depend do usuário garantindo Role="Admin", ou remova a função se ela foca puramente Debug Experimental temporário.
- Reduza as Origens RegEx permitidas pelo CORS no Uvicorn Backend.

**Passo 2 (Limpeza de Falsas Garantias e Role Based System):**
- Apague as coletas cegas de frontend usando `window.LOGGED_USER` para compor corpo JSON em `fetch` APIs vitais, com destaque ao arquivo `store.js` e auditoria (`registerLog`). Somente extraia e defina do Server Side as identidades pelo Token decodificado JWT enviado nos Headers HTTPs.

**Passo 3 (Limpeza Arquitetural - Destruição do Monólito Vanilla):**
- Decida-se prioritariamente entre o React com Webpack/Vite (`App.jsx` + `pages/`) ou um monolítico HTML clássico (`index.html` + `app.js` de 5.000 linhas).
- Se priorizou o React: remova os componentes estáticos mortos do HTML inicial e apague os event listeners do `app.js` inteiro, migrando-os adequadamente para custom hooks (`useLayout`, Context Providers ou Zustand) isolados na View dos componentes que forem carregados dinamicamente em suas Rotas. 

**Passo 4 (Refatoração de Rede / Fim de OOM):**
- Substitua funções in-memory assíncronas de busca local de Execuções e Históricos (`getExecucoesWithDetails`), utilizando ferramentas modernas e lazy cache com paginação, implementando `React Query` (`@tanstack/react-query`) ou `SWR`. Reduza significamente as queries base da View solicitando ao servidor limitar queries por competência vigente via parâmetro explícito URL (GET `api/execucoes?cmp=YYYY-MM`).
