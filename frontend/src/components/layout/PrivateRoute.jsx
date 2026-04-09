import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SYSTEM_SCREENS } from '../../config/screens';

const PrivateRoute = ({ children }) => {
    const { user, loading, isAdmin, permissions } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: 'var(--bg-primary, #0f172a)',
                color: 'var(--text-muted, #94a3b8)',
                fontSize: '14px',
                gap: '12px'
            }}>
                <div style={{
                    width: '20px', height: '20px',
                    border: '2px solid var(--accent, #6366f1)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                Carregando Plataforma...
            </div>
        );
    }

    if (!user) {
        // Redireciona para login mas salva a intenção de rota
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Lógica de Permissões de Rota (RBAC/PBAC)
    const currentPath = location.pathname;
    
    // Encontra a configuração da tela atual baseada no path
    const currentScreen = SYSTEM_SCREENS.find(s => 
        s.path === currentPath || 
        (s.path !== '/' && currentPath.startsWith(s.path))
    );

    if (currentScreen) {
        // 1. Se for admin, tem acesso total
        if (isAdmin) return children;

        // 2. Se a tela exigir permissão específica e o usuário não tiver, bloqueia
        // Nota: 'dashboard' agora é injetado pelo backend para todos, mas aqui garantimos redundância
        const isPermitted = permissions.includes(currentScreen.id) || currentScreen.id === 'dashboard';

        if (!isPermitted) {
            console.warn(`[RouteGuard] Acesso negado para rota: ${currentPath}. Permissões atuais:`, permissions);
            
            // Se o usuário está logado mas não tem permissão para a HOME (/), 
            // não podemos redirecionar para /login (causa loop). 
            // Mostramos uma mensagem de erro ou redirecionamos para 'Meu Desempenho' que é neutro.
            if (currentPath === '/' || currentPath === '/dashboard') {
                if (permissions.includes('meu-desempenho')) {
                    return <Navigate to="/performance/me" replace />;
                }
                return (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                        <h1>Acesso Restrito</h1>
                        <p>Seu usuário não possui permissão para acessar o Dashboard Principal.</p>
                        <p>Contate o administrador para liberar seu cargo.</p>
                        <button onClick={() => window.location.href='/login'} style={{ marginTop: '20px' }}>Voltar</button>
                    </div>
                );
            }
            
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default PrivateRoute;
