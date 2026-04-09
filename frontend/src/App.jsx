import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/layout/PrivateRoute';
// Login permanece com import estático — é a primeira tela, não pode ser lazy
import Login from './pages/Login/Login';

// ============================================================
// LAZY LOADING: Cada página é um chunk separado.
// O browser só baixa o chunk quando o usuário acessa a rota.
// ============================================================

// Telas principais
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const Clients = lazy(() => import('./pages/Clients/Clients'));

// Painel Admin — baixado apenas por gerentes/admins
const ProcessManagement = lazy(() => import('./pages/admin/ProcessManagement'));
const ProcessBuilder = lazy(() => import('./pages/admin/ProcessBuilder'));
const ProcessAssignment = lazy(() => import('./pages/admin/ProcessAssignment'));
const Competences = lazy(() => import('./pages/admin/Competences'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ExecutiveDashboard = lazy(() => import('./pages/admin/ExecutiveDashboard'));

// Performance — baixado apenas quando o usuário acessa a área
const MyPerformance = lazy(() => import('./pages/performance/MyPerformance'));

// Módulo de Configurações — baixado apenas quando o usuário acessa /settings
const SettingsLayout = lazy(() => import('./pages/Settings/SettingsLayout'));
const MyProfile = lazy(() => import('./pages/Settings/MyProfile'));
const EmployeesSettings = lazy(() => import('./pages/Settings/components/EmployeesSettings').then(m => ({ default: m.EmployeesSettings })));
const SectorsSettings = lazy(() => import('./pages/Settings/components/SectorsSettings').then(m => ({ default: m.SectorsSettings })));
const SistemaSettings = lazy(() => import('./pages/Settings/SistemaSettings'));

// Fallback de carregamento exibido enquanto o chunk da página é baixado
const PageLoader = () => (
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
        Carregando...
    </div>
);

const App = () => {
    return (
        <BrowserRouter>
            <SpeedInsights />
            {/* Suspense captura as promises dos lazy imports e exibe PageLoader */}
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Rotas Públicas */}
                    <Route path="/login" element={<Login />} />

                    {/* Rotas Privadas (Protegidas) */}
                    <Route
                        path="/"
                        element={
                            <PrivateRoute>
                                <Layout />
                            </PrivateRoute>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="clients" element={<Clients />} />
                        <Route path="performance/me" element={<MyPerformance />} />

                        {/* Módulo de Configurações com layout aninhado */}
                        <Route path="settings" element={<SettingsLayout />}>
                            <Route index element={<Navigate to="/settings/profile" replace />} />
                            <Route path="profile" element={<MyProfile />} />
                            <Route path="funcionarios" element={<EmployeesSettings />} />
                            <Route path="setores" element={<SectorsSettings />} />
                            <Route path="sistema" element={<SistemaSettings />} />
                        </Route>

                        {/* Páginas do Painel Admin */}
                        <Route path="processes" element={<ProcessManagement />} />
                        <Route path="admin/process-builder" element={<ProcessBuilder />} />
                        <Route path="admin/process-assignment" element={<ProcessAssignment />} />
                        <Route path="admin/competences" element={<Competences />} />
                        <Route path="admin/dashboard" element={<AdminDashboard />} />
                        <Route path="admin/executive" element={<ExecutiveDashboard />} />
                    </Route>

                    {/* Catch-all: Redireciona qualquer rota inexistente para a Dashboard */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default App;

