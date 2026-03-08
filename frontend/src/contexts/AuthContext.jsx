import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

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
                }
            } catch (err) {
                console.warn("[Auth] Sessão ausente na inicialização:", err?.message || err);
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
                username: credentials.email || credentials.username,
                password: credentials.password
            });

            // O backend /login pode não retornar telas_permitidas na resposta imediata, 
            // mas o /auth/me o faz. Vamos buscar as telas se não vierem no login.
            const { user: authUser } = response.data;
            setUser({ id: authUser.id, email: authUser.nome });
            setProfile(authUser);
            
            // Tenta obter permissões se vierem no login, senão inicializa vazio (initAuth carregará no refresh ou na próxima chamada)
            setPermissions(Array.isArray(authUser.telas_permitidas) ? authUser.telas_permitidas : []);
            
            return { data: authUser, error: null };

        } catch (error) {
            console.error("[Auth] Login error:", error);
            const errorMsg = error.response?.data?.detail || "Incapaz de comunicar ao servidor de Autenticação";
            return { data: null, error: { message: errorMsg } };
        }
    };

    const signOut = async () => {
        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error("Falha ao derrubar sessão no backend: ", err);
        } finally {
            setUser(null);
            setProfile(null);
            setPermissions([]);
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
        isAdmin
    };

    // Renderiza uma tela de carregamento premium enquanto verifica a sessão
    if (loading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                background: 'var(--bg-base)',
                backgroundImage: 'var(--bg-gradient)',
                color: 'var(--text-main)',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '4px solid rgba(99, 102, 241, 0.1)',
                        borderTop: '4px solid var(--primary-light)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <div style={{
                        position: 'absolute',
                        width: '70%',
                        height: '70%',
                        top: '15%',
                        left: '15%',
                        border: '4px solid rgba(99, 102, 241, 0.05)',
                        borderBottom: '4px solid var(--accent)',
                        borderRadius: '50%',
                        animation: 'spin 1.5s linear infinite reverse'
                    }}></div>
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '600', opacity: 0.8 }}>FiscalApp</h2>
                <p style={{ opacity: 0.5, fontSize: '0.9rem', marginTop: '8px' }}>Carregando sessao segura...</p>
                <style>{`
                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

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
