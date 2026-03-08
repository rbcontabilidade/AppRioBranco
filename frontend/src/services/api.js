import axios from 'axios';
import { supabase } from './supabase';

// URL base da API — lê a variável de ambiente injetada pelo Vite no build de produção.
// Em produção (Vercel), configure VITE_API_URL nas Environment Variables do painel da Vercel.
// Em desenvolvimento local, o valor do arquivo .env será utilizado como fallback.
const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
// Normalização: garante que a URL termine em /api (sem barra duplicada)
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`;

console.log(`[API Config] Base URL definida: ${API_BASE_URL}`);

/**
 * Instância Axis Principal
 * Configurada para timeout padrão e formato JSON.
 */
const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// --- REMOVIDO MOCK DE INTERCEPTOR ANTERIOR EM FAVOR DO WRAPPER api ---

/**
 * Interceptor de Requisição (Request Interceptor)
 * Puxa o 'authToken' ou 'token' do localStorage e anexa como Bearer
 * toda vez que uma requisição vai sair para o Backend.
 */

/**
 * Interceptor de Resposta (Response Interceptor)
 * Aqui tratamos retornos globais (ex: 401 Não Autorizado para forçar um logout)
 */
apiInstance.interceptors.response.use(
    (response) => {
        console.log(`✅ [API Response] SUCESSO - URL: ${response.config.url} - Status: ${response.status}`);
        return response; // Se der sucesso, só devolve os dados
    },
    (error) => {
        console.error(`🚨 [API Error] FALHA - URL: ${error.config?.url} - Status: ${error.response?.status}`);
        // Lógica Global de Error: por exemplo, redirecionar pro Login se o token expirar (401)
        if (error.response && error.response.status === 401) {
            console.warn("Sessão expirada ou não autorizada. Redirecionando para login...");
            // Opcional: localStorage.removeItem('token');
            // window.location.href = '/login'; 
        }

        return Promise.reject(error);
    }
);

/*
 * Wrapper de Serviço Limpo
 * Isso facilita mockar ou substituir a biblioteca Axios futuramente, 
 * caso desejarmos mudar por \`fetch\` raiz sem quebrar 100% dos componentes.
 */
export const api = {
    get: async (url, config = {}) => {
        // --- MOCK MANTIDO APENAS PARA DASHBOARDS (Enquanto backend no gera SQL) ---
        // if (url === '/dashboard/kpis' || url.endsWith('/dashboard/kpis')) {
        //     ... mock antigo removido ...
        // }

        // MAPEAR ROTAS DE CLIENTES DA API PYTHON
        if (url === '/clients' || url.endsWith('/clients')) {
            // O Backend antigo usa /api/clientes
            return apiInstance.get('/clientes', config);
        }

        // MAPEAR FUNCIONARIOS (Se no houver endpoint exato, manter original API Python)
        if (url === '/employees' || url.endsWith('/employees')) {
            return apiInstance.get('/funcionarios', config).catch(e => {
                console.warn("Fallback API Mock Funcion\u00e1rios", e);
                return {
                    data: [
                        { id: 1, nome: 'João Gerente', email: 'manager@rb.com', role: 'Gerente', department: 'Fiscal' },
                        { id: 2, nome: 'Analista Fiscal', email: 'analista1@rb.com', role: 'Analista', department: 'Fiscal' }
                    ],
                    status: 200
                };
            });
        }

        // MAPEAR PERFIS (Novo sistema de atribuição inteligente)
        if (url === '/profiles' || url.endsWith('/profiles')) {
            return new Promise((resolve) => setTimeout(() => resolve({
                data: [
                    { id: 1, name: 'João Fiscal', role: 'Fiscal' },
                    { id: 2, name: 'Maria Gerente', role: 'Gerente' },
                    { id: 3, name: 'Lucas DP', role: 'DP' },
                    { id: 4, name: 'Zambski Admin', role: 'Admin' }
                ], status: 200
            }), 300));
        }

        // Mapear Setores da API Real
        if (url === '/departments' || url.endsWith('/departments')) {
            return apiInstance.get('/setores', config).catch(e => ({
                data: { setores: [{ id: 1, nome: 'Fiscal' }, { id: 2, nome: 'Contábil' }, { id: 3, nome: 'DP' }, { id: 4, nome: 'Financeiro' }, { id: 5, nome: 'Legalização' }] },
                status: 200
            }));
        }

        // Mock para listar rotinas base
        // Mock para listar rotinas base
        if (url === '/routines' || url.endsWith('/routines')) {
            return apiInstance.get('/rotinas_base', config).catch(() => ({
                data: {
                    routines: [
                        { id: 10, name: 'Revis\u00e3o Documental', role: 'Assistente Fiscal' },
                        { id: 11, name: 'Apura\u00e7\u00e3o de Impostos', role: 'Analista Fiscal' }
                    ]
                }, status: 200
            }));
        }

        // Remover mocks para conectar ao backend real

        // --- CHAMADA NATIVA PARA TODAS AS OUTRAS ROTAS DO PYTHON (ex: /clientes) ---
        return apiInstance.get(url, config);
    },
    post: async (url, data, config = {}) => {
        // --- AUTH RESOLVIDA PELO BACKEND REAL EM PYTHON ---


        // --- FIM DO MOCK ---

        return apiInstance.post(url, data, config);
    },
    put: async (url, data, config = {}) => {
        // Mock PUT para status da competência
        if (url.match(/\/competences\/\d+\/status/)) {
            return new Promise((resolve) => {
                const id = parseInt(url.split('/')[2]);
                const compIndex = mockCompetences.findIndex(c => c.id === id);
                if (compIndex > -1) {
                    mockCompetences[compIndex].status = data.status || mockCompetences[compIndex].status;
                }
                setTimeout(() => resolve({ status: 200, data: mockCompetences[compIndex] }), 400);
            });
        }
        return apiInstance.put(url, data, config);
    },
    delete: (url, config = {}) => apiInstance.delete(url, config),

    // Exportando a instance nativa se algo pedir manipulações não-superficiais
    instance: apiInstance
};

// --- INÍCIO DO MOCK DE DADOS EM MEMÓRIA ---
let mockCompetences = [
    { id: 1, period: '12/2025', status: 'Archived' },
    { id: 2, period: '01/2026', status: 'Closed' },
    { id: 3, period: '02/2026', status: 'Open' }
];

// 1. Simulação do andamento de clientes nos processos
let mockExecutions = [
    { id: 1, client_id: 101, client_name: 'Tech Solutions LTDA', process_id: 1, current_step_index: 1, status: 'IN_PROGRESS' },
    { id: 2, client_id: 102, client_name: 'Silva & Costa Comércio', process_id: 1, current_step_index: 2, status: 'IN_PROGRESS' },
    { id: 3, client_id: 103, client_name: 'Restaurante Bom Gosto', process_id: 1, current_step_index: 3, status: 'IN_PROGRESS' }
];

const mockProcesses = [
    { id: 1, name: 'Fechamento Jan/26' },
    { id: 2, name: 'Admissão Fev/26' }
];

// 2. Simulação da estrutura de passos do processo
const mockSteps = [
    { id: 1, process_id: 1, routine_id: 10, step_order: 1, dependent_on_step_id: null },
    { id: 2, process_id: 1, routine_id: 11, step_order: 2, dependent_on_step_id: 1 },
    { id: 3, process_id: 1, routine_id: 12, step_order: 3, dependent_on_step_id: 2 }
];

// 3. Simulação das rotinas associadas aos passos
const mockRoutines = [
    { id: 10, name: 'Revisão Documental', assignee_id: 1, role: 'Fiscal' },
    { id: 11, name: 'Apuração de Impostos', assignee_id: 1, role: 'Fiscal' },
    { id: 12, name: 'Envio de Guias', assignee_id: 1, role: 'Financeiro' }
];
// --- FIM DO MOCK DE DADOS EM MEMÓRIA ---

/**
 * Serviço de Processos (Mock para transição de Rotinas -> Processos)
 */
export const processService = {
    /**
     * Busca tarefas pendentes filtrando aquelas que estão bloqueadas (Locked).
     * @param {number|string} userId - ID do usuário atual para filtrar responsabilidades
     * @returns {Promise<Object>}
     */
    getMyPendingTasks: async (userId, competenciaId = null) => {
        try {
            // A API de python agora consome a RPC get_dashboard_tarefas filtrando pela competência aberta e setor
            const params = { funcionario_id: userId };
            if (competenciaId) params.competencia_id = competenciaId;

            const response = await apiInstance.get('/processos/execucao/me', { params });
            return response;
        } catch (error) {
            console.error("Erro ao buscar tarefas pendentes na API:", error);
            // Fallback (seguro para não quebrar a tela)
            return { data: [] };
        }
    },

    getAllTasks: async (competenciaId = null, funcionarioId = null) => {
        try {
            const params = {};
            if (competenciaId) params.competencia_id = competenciaId;
            if (funcionarioId) params.funcionario_id = funcionarioId;

            const response = await apiInstance.get('/processos/execucao/todos', { params });
            return response;
        } catch (error) {
            console.error("Erro ao buscar todas as tarefas na API:", error);
            return { data: [] };
        }
    },

    /**
     * Completa uma tarefa/passo, destravando o próximo.
     * @param {number} taskId - O ID da tarefa em execução (rh_execucao_tarefas.id)
     * @param {number} currentStepOrder - O número do passo atual (para validação)
     * @param {string} anotacao - Observações ou apontamentos sobre a tarefa
     * @returns {Promise<Object>}
     */
    completeTask: async (taskId, currentStepOrder, anotacao = '', status = 'CONCLUIDA') => {
        try {
            const response = await apiInstance.patch(`/processos/execucao/tarefas/${taskId}/status`, {
                status: status,
                anotacao: anotacao
            });
            return response;
        } catch (error) {
            console.error("Erro ao concluir tarefa na API:", error);
            throw error;
        }
    },

    getCompetenciaAtiva: async () => {
        try {
            const res = await apiInstance.get('/meses/ativa/atual');
            return res.data;
        } catch (error) {
            console.error("Erro ao puxar competencia", error);
            return null;
        }
    },

    gerarNovaCompetencia: async (mes, ano) => {
        return await apiInstance.post(`/meses/gerar/${mes}/${ano}`);
    },

    fecharCompetencia: async (competenciaId) => {
        return await apiInstance.post(`/meses/fechar/${competenciaId}`);
    },

    getTaskChecklists: async (taskId) => {
        try {
            const res = await apiInstance.get(`/processos/execucao/tarefas/${taskId}/checklists`);
            return res.data;
        } catch (error) {
            console.error("Erro ao buscar checklists", error);
            return [];
        }
    },

    toggleChecklist: async (checklistId, isChecked) => {
        return await apiInstance.patch(`/processos/execucao/checklists/${checklistId}`, {
            is_checked: isChecked
        });
    }
};

// --- SERVIÇOS DE CARGOS E PERMISSÕES ---
export const getCargos = async () => {
    const response = await apiInstance.get('/cargos_permissoes');
    return response.data;
};

export const createCargo = async (data) => {
    return apiInstance.post('/cargos_permissoes', data);
};

export const updateCargo = async (id, data) => {
    return apiInstance.put(`/cargos_permissoes/${id}`, data);
};

export const deleteCargo = async (id) => {
    return apiInstance.delete(`/cargos_permissoes/${id}`);
};

// --- SERVIÇOS DE NÍVEIS (HIERARQUIA) ---
export const getCargoNiveis = async (cargoId) => {
    const response = await apiInstance.get(`/cargos_permissoes/${cargoId}/niveis`);
    return response.data;
};

export const createCargoNivel = async (data) => {
    return apiInstance.post('/cargo_niveis', data);
};

export const updateCargoNivel = async (id, data) => {
    return apiInstance.put(`/cargo_niveis/${id}`, data);
};

export const deleteCargoNivel = async (id) => {
    return apiInstance.delete(`/cargo_niveis/${id}`);
};

export default api;
