import { supabase } from './supabase';

/**
 * AuditService - Utilitário para registro de logs de auditoria no Supabase.
 * Permite rastrear ações do usuário, mudanças em entidades e eventos do sistema.
 */
// Variável para armazenar o usuário atual no escopo do serviço para evitar dependência de hooks
let currentUser = null;

export const auditService = {
  /**
   * Define o usuário atual para os próximos logs.
   * Chamado pelo AuthContext após login ou sincronização.
   */
  setCurrentUser: (userData) => {
    currentUser = userData;
    try {
        if (userData) {
            localStorage.setItem('audit_user_cache', JSON.stringify(userData));
        } else {
            localStorage.removeItem('audit_user_cache');
        }
    } catch (e) {}
  },

  /**
   * Registra um evento de auditoria na tabela public.audit_logs.
   * 
   * @param {Object} params - Dados do evento
   * @param {string} params.action_type - Tipo da ação (ex: 'login', 'create', 'update', 'delete')
   * @param {string} params.module - Módulo do sistema (ex: 'clientes', 'processos', 'auth')
   * @param {string} [params.entity_type] - Tipo da entidade afetada (ex: 'cliente')
   * @param {string|number} [params.entity_id] - ID da entidade afetada
   * @param {string} [params.entity_label] - Nome/Label amigável da entidade
   * @param {string} [params.description] - Descrição amigável da ação
   * @param {Object} [params.old_values] - Estado anterior da entidade (para updates)
   * @param {Object} [params.new_values] - Novo estado da entidade
   * @param {Object} [params.metadata] - Dados adicionais personalizados
   * @param {string} [params.status='success'] - Status da ação ('success', 'failure', 'warning')
   * @param {string} [params.severity='low'] - Severidade ('low', 'medium', 'high', 'critical')
   */
  log: async ({
    action_type,
    module,
    entity_type = null,
    entity_id = null,
    entity_label = null,
    description = null,
    old_values = {},
    new_values = {},
    metadata = {},
    status = 'success',
    severity = 'low'
  }) => {
    try {
      // 0. Recuperar do cache sempre para garantir a versão mais recente e ignorar falhas de sincronia de memória (Vite)
      let activeUser = currentUser;
      try {
          const cached = localStorage.getItem('audit_user_cache');
          if (cached) {
              const parsedCache = JSON.parse(cached);
              activeUser = { ...parsedCache, ...currentUser }; // Mescla
          }
      } catch (e) {}

      // 1. Fallback: Usuário do Supabase Auth (se houver)
      let supabaseUser = null;
      try {
        const { data } = await supabase.auth.getUser();
        supabaseUser = data?.user || null;
      } catch (e) {
        // Silencioso - auth nativa pode não estar configurada
      }

      // 2. Validar user_id: A tabela audit_logs espera UUID, mas funcionarios usa INTEGER.
      //    Só enviamos user_id se for um UUID válido (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).
      //    Caso contrário, enviamos null e preservamos o ID numérico nos metadados.
      const rawUserId = activeUser?.id || supabaseUser?.id || null;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = rawUserId && typeof rawUserId === 'string' && uuidRegex.test(rawUserId);

      let userData = {
        user_id: isValidUUID ? rawUserId : null,
        user_name: activeUser?.nome || 'Sistema/Desconhecido',
        user_email: activeUser?.email || supabaseUser?.email || null,
        user_role: activeUser?.permissao || activeUser?.role || 'N/A'
      };

      // Se não temos activeUser mas temos supabaseUser, tentamos buscar na tabela de funcionarios
      if (!activeUser && supabaseUser) {
        try {
          const { data: funcionario } = await supabase
            .from('funcionarios')
            .select('nome, permissao, cargo_id')
            .eq('nome', supabaseUser.user_metadata?.full_name || supabaseUser.email)
            .single();

          if (funcionario) {
            userData.user_name = funcionario.nome;
            userData.user_role = funcionario.permissao || 'Usuário';
          }
        } catch (e) {}
      }

      // 3. Preparar o payload do log
      const logPayload = {
        ...userData,
        action_type,
        module,
        entity_type,
        entity_id: entity_id != null ? String(entity_id) : null,
        entity_label,
        description,
        old_values,
        new_values,
        metadata: {
          ...metadata,
          // Preservar ID numérico do funcionário nos metadados para rastreabilidade
          funcionario_id: rawUserId && !isValidUUID ? rawUserId : undefined,
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        },
        ip_address: null,
        status,
        severity
      };

      // 4. Inserir no banco de dados
      const { error } = await supabase
        .from('audit_logs')
        .insert([logPayload]);

      if (error) {
        console.error(' [AuditLog] Erro ao inserir log:', error);
      } else {
        console.log(` [AuditLog] Evento registrado: ${action_type} em ${module}`);
      }
    } catch (err) {
      console.error(' [AuditLog] Erro crítico no serviço de auditoria:', err);
    }
  },

  /**
   * Busca logs de auditoria com filtros e paginação.
   */
  getLogs: async (filters = {}, page = 1, pageSize = 20) => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      // Aplicar Filtros
      if (filters.search) {
        query = query.or(`user_name.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,description.ilike.%${filters.search}%,entity_label.ilike.%${filters.search}%`);
      }
      if (filters.module) query = query.eq('module', filters.module);
      if (filters.action_type) query = query.eq('action_type', filters.action_type);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.severity) query = query.eq('severity', filters.severity);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      // Ordenação e Paginação
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      return { data, count };
    } catch (err) {
      console.error(' [AuditLog] Erro ao buscar logs:', err);
      return { data: [], count: 0, error: err.message };
    }
  }
};
