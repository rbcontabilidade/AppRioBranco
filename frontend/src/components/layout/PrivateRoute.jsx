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
                minHeight: '100vh',
                background: '#0f172a'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '2px solid #6366f1',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
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

        // 2. Se a tela for restrita a admin e o usuário não for, bloqueia
        // 3. Se a tela exigir permissão específica e o usuário não tiver, bloqueia
        const isRestricted = (currentScreen.adminOnly && !isAdmin) || 
                            (currentScreen.id && !permissions.includes(currentScreen.id));

        if (isRestricted) {
            console.warn(`[RouteGuard] Acesso negado para rota: ${currentPath}`);
            
            // Se já estamos no dashboard ou na raiz e fomos negados (bug de permissão grave), 
            // redirecionamos para login para limpar a sessão em vez de causar loop.
            if (currentPath === '/' || currentPath === '/dashboard') {
                return <Navigate to="/login" replace />;
            }
            
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default PrivateRoute;
