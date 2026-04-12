import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { auditService } from '../services/auditService';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [permissions, setPermissions] = useState([]); // Array de IDs de telas permitidas
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        // 1. Timeout de Segurança: previne a tela infinita
        const timeoutId = setTimeout(() => {
            if (mounted && loading) {
                console.warn("[Auth] Timeout de 5s alcançado. Forçando encerramento do carregamento.");
                setLoading(false);
            }
        }, 5000);

        async function initAuth() {
            try {
                // Tenta validar a sessão conectando-se à API e validando cookies seguros
                const response = await api.get('/auth/me');

                if (mounted && response.data) {
                    const userData = response.data;
                    setUser({ id: userData.id, email: userData.nome }); // Mantendo map para compatibilidade retroativa
                    setProfile(userData);
                    setPermissions(Array.isArray(userData.telas_permitidas) ? userData.telas_permitidas : []);
                    
                    // Sincroniza o usuário com o serviço de auditoria
                    auditService.setCurrentUser(userData);
                }
            } catch (err) {
                console.warn("[Auth] Sessão ausente ou erro na rede:", err?.message || err);
                if (err.response) {
                    console.error("[Auth] Status do servidor:", err.response.status, err.response.data);
                }
                if (mounted) {
                    setUser(null);
                    setProfile(null);
                    setPermissions([]);
                }
            } finally {
                // Encerra loading local
                if (mounted) {
                    setLoading(false);
                    clearTimeout(timeoutId);
                    console.log("[Auth] Inicialização concluída. User:", user ? "Logado" : "Deslogado");
                }
            }
        }

        initAuth();

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, []);

    const signIn = async (credentials) => {
        try {
            // Envia username (mapeado de credentials.email) e password pro Backend FastAPI
            const response = await api.post('/auth/login', {
                username: (credentials.email || credentials.username || '').trim(),
                password: credentials.password
            });

            // IMPORTANTE: O login inicial às vezes não traz as permissões completas (RBAC).
            // Para evitar o loop de redirecionamento, buscamos os detalhes do perfil
            // IMEDIATAMENTE antes de setar o usuário no estado global.
            const responseMe = await api.get('/auth/me');
            const userData = responseMe.data;

            if (userData) {
                setUser({ id: userData.id, email: userData.nome });
                setProfile(userData);
                setPermissions(Array.isArray(userData.telas_permitidas) ? userData.telas_permitidas : []);
                
                // Sincroniza o usuário com o serviço de auditoria
                auditService.setCurrentUser(userData);
                
                // Registro de Auditoria: Login com Sucesso
                await auditService.log({
                    action_type: 'login',
                    module: 'auth',
                    description: `Usuário '${userData.nome}' acessou a plataforma.`,
                    status: 'success',
                    severity: 'low'
                });

                return { data: userData, error: null };
            }

            return { data: null, error: { message: "Falha ao sincronizar perfil após login" } };

        } catch (error) {
            console.error("[Auth] Login error:", error);
            const errorMsg = error.response?.data?.detail || "Incapaz de comunicar ao servidor de Autenticação";
            
            // Registro de Auditoria: Falha de Login
            await auditService.log({
                action_type: 'login',
                module: 'auth',
                description: `Falha na tentativa de login para o usuário '${(credentials.email || credentials.username || '')}'. Erro: ${errorMsg}`,
                status: 'failure',
                severity: 'medium'
            });

            return { data: null, error: { message: errorMsg } };
        }
    };

    const signOut = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error("Falha ao derrubar sessão no backend: ", err);
        } finally {
            // Registro de Auditoria: Logout
            if (profile) {
                await auditService.log({
                    action_type: 'logout',
                    module: 'auth',
                    user_id: user?.id,
                    description: `Usuário '${profile.nome}' encerrou a sessão.`,
                    status: 'success',
                    severity: 'low'
                });
            }

            setUser(null);
            setProfile(null);
            setPermissions([]);
        }
    };

    /**
     * Sincroniza o perfil local com o backend sem precisar deslogar.
     * Útil após alterar nome ou foto no "Meu Perfil".
     */
    const refreshProfile = async () => {
        try {
            const response = await api.get('/auth/me');
            if (response.data) {
                const userData = response.data;
                setUser({ id: userData.id, email: userData.nome });
                setProfile(userData);
                setPermissions(Array.isArray(userData.telas_permitidas) ? userData.telas_permitidas : []);
                auditService.setCurrentUser(userData);
            }
        } catch (err) {
            console.error("[Auth] Erto ao sincronizar perfil:", err);
        }
    };

    // Atualizado com base nas colunas da tabela funcionarios + is_admin do backend endpoint de login
    const isAdmin = profile?.permissao?.toLowerCase() === 'gerente' ||
        profile?.is_admin === true ||
        profile?.role === 'admin' ||
        profile?.nome?.toLowerCase() === 'manager';

    const contextValue = {
        user,
        profile,
        permissions, // Exportando as permissões
        loading,
        signIn,
        signOut,
        refreshProfile,
        isAdmin
    };

    // O block de renderização de Splash screen foi inteiramente removido do AuthContext
    // para evitar quebras do React Router e falhas visuais. O controle "loading" 
    // agora é devidamente tratado nos componentes (ex: PrivateRoute) ou transições locais.

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}

export default AuthContext;
