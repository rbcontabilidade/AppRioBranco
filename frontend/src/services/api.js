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
 * Instância Axios Principal
 * Configurada para timeout padrão e formato JSON.
 */
const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // Aumentado para 60s para suportar clonagem de processos pesados
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

/**
 * Interceptor de Resposta (Response Interceptor)
 * Aqui tratamos retornos globais (ex: 401 Não Autorizado para forçar um logout)
 */
apiInstance.interceptors.response.use(
    (response) => {
        console.log(`[API Response] SUCESSO - URL: ${response.config.url} - Status: ${response.status}`);
        return response;
    },
    (error) => {
        console.error(`[API Error] FALHA - URL: ${error.config?.url} - Status: ${error.response?.status}`);
        // Lógica Global de Error: redirecionar pro Login se o token expirar (401)
        if (error.response && error.response.status === 401) {
            console.warn('Sessão expirada ou não autorizada. Redirecionando para login...');
            // Opcional: localStorage.removeItem('token');
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/*
 * Instância da API Limpa (Substitui o wrapper legado)
 */
export const api = apiInstance;

/**
 * Serviço de Processos
 * Todas as chamadas vão direto ao backend Python — sem mocks ou fallbacks falsos.
 */
export const processService = {
    /**
     * Busca tarefas pendentes do usuário logado.
     * @param {number|string} userId - ID do funcionário para filtrar responsabilidades
     * @param {number|null} competenciaId - ID da competência (opcional)
     * @returns {Promise<Object>}
     */
    getMyPendingTasks: async (userId, competenciaId = null) => {
        try {
            const params = { funcionario_id: userId };
            if (competenciaId) params.competencia_id = competenciaId;

            const response = await apiInstance.get('/processos/execucao/me', { params });
            return response;
        } catch (error) {
            console.error('Erro ao buscar tarefas pendentes na API:', error);
            // Retorna lista vazia para não quebrar a tela, mas sem substituir por dados falsos
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
            console.error('Erro ao buscar todas as tarefas na API:', error);
            return { data: [] };
        }
    },

    /**
     * Completa uma tarefa/passo, destravando o próximo.
     * @param {number} taskId - ID da tarefa em execução (rh_execucao_tarefas.id)
     * @param {number} currentStepOrder - Número do passo atual (para validação)
     * @param {string} anotacao - Observações ou apontamentos sobre a tarefa
     * @param {string} status - Status final da tarefa
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
            console.error('Erro ao concluir tarefa na API:', error);
            throw error;
        }
    },

    getCompetenciaAtiva: async () => {
        try {
            const res = await apiInstance.get('/meses/ativa/atual');
            return res.data;
        } catch (error) {
            console.error('Erro ao puxar competência ativa:', error);
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
            console.error('Erro ao buscar checklists:', error);
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
