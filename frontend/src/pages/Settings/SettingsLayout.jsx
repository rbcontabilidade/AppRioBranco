import React from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { User, Users, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Layout principal das Configurações.
 * Exibe uma sidebar de navegação interna com abas,
 * respeitando permissões de acesso (RBAC).
 */
const SettingsLayout = () => {
    const { isAdmin } = useAuth();

    // Definição das abas com controle de visibilidade
    const tabs = [
        {
            to: '/settings/profile',
            label: 'Meu Perfil',
            icon: User,
            adminOnly: false,
        },
        {
            to: '/settings/funcionarios',
            label: 'Funcionários',
            icon: Users,
            adminOnly: true,
        },
        {
            to: '/settings/setores',
            label: 'Setores',
            icon: Users,
            adminOnly: true,
        },
        {
            to: '/settings/sistema',
            label: 'Sistema',
            icon: SettingsIcon,
            adminOnly: true,
        },
    ];

    // Filtra as abas conforme permissão
    const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

    return (
        <div style={{
            display: 'flex',
            gap: '24px',
            height: 'calc(100vh - 100px)',
            animation: 'fadeIn 0.3s ease'
        }}>

            {/* ── Sidebar de Navegação Interna ── */}
            <aside style={{
                width: '240px',
                flexShrink: 0,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '16px',
                padding: '20px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                height: '100%',
            }}>
                {/* Título da seção */}
                <p style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    color: 'var(--text-muted)',
                    padding: '0 8px',
                    marginBottom: '12px',
                }}>
                    Painel de Controle
                </p>

                {/* Links de navegação */}
                {visibleTabs.map(tab => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '11px 14px',
                            borderRadius: '10px',
                            textDecoration: 'none',
                            fontWeight: '500',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease',
                            color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
                            background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                            borderLeft: `3px solid ${isActive ? 'var(--primary-light)' : 'transparent'}`,
                        })}
                    >
                        <tab.icon size={18} />
                        <span>{tab.label}</span>
                    </NavLink>
                ))}
            </aside>

            {/* ── Área de Conteúdo ── */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '4px',
            }}>
                <Outlet />
            </div>
        </div>
    );
};

export default SettingsLayout;
