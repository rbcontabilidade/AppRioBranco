import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Componente Wrapper para Rotas Privadas.
 * Verifica se o usuário tem token/sessão para acessar o children (via Outlet),
 * ou o redireciona automaticamente para a raiz de /login se não estiver logado.
 */
const PrivateRoute = () => {
    const { user, loading } = useAuth();
    const isAuthenticated = !!user;

    // Uma tela de loading simples se o Contexto ainda estiver montando do LocalStorage
    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner-container">
                    <div className="loading-spinner"></div>
                    <div className="loading-spinner-inner"></div>
                </div>
            </div>
        );
    }

    // Se estiver autenticado, renderiza a Rota real passada (Layout, Dashboard, etc)
    // Se não, volta pro Login
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
