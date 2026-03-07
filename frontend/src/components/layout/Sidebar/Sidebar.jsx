import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    ChevronRight,
    Palette,
    Key,
    Menu,
    MoreVertical,
    Workflow,
    Activity,
    Target,
    Calendar
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../services/supabase';
import styles from './Sidebar.module.css';

const Sidebar = ({ isCollapsed }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { profile, signOut, isAdmin } = useAuth();
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

    // Fecha o menu ao clicar fora dele
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Faz logout do AuthContext e redireciona para /login
    const handleLogout = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} glass-panel`}>
            {/* Logo */}
            <div className={styles.logo}>
                <LayoutDashboard className={styles.logoIcon} />
                {!isCollapsed && (
                    <div className={styles.logoTextWrapper}>
                        <span>RB|App</span>
                    </div>
                )}
            </div>

            {/* Navegação Principal */}
            <nav className={styles.navMenu}>
                <NavLink
                    to="/"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                    end
                >
                    <LayoutDashboard size={20} className={styles.navIcon} />
                    {!isCollapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink
                    to="/clients"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <Users size={20} className={styles.navIcon} />
                    {!isCollapsed && <span>Clientes</span>}
                </NavLink>

                <NavLink
                    to="/performance/me"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <Target size={20} className={styles.navIcon} />
                    {!isCollapsed && <span>Meu Desempenho</span>}
                </NavLink>

                {/* Exclusivas para Admin/Gerente (RBAC) */}
                {isAdmin && (
                    <>
                        <NavLink
                            to="/processes"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Workflow size={20} className={styles.navIcon} />
                            {!isCollapsed && <span>Gestão de Processos</span>}
                        </NavLink>

                        <NavLink
                            to="/admin/competences"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Calendar size={20} className={styles.navIcon} />
                            {!isCollapsed && <span>Gestão de Competências</span>}
                        </NavLink>

                        <NavLink
                            to="/admin/executive"
                            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <Activity size={20} className={styles.navIcon} />
                            {!isCollapsed && <span>Painel Executivo</span>}
                        </NavLink>
                    </>
                )}

                <NavLink
                    to="/settings"
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                    <Settings size={20} className={styles.navIcon} />
                    {!isCollapsed && <span>Configurações</span>}
                </NavLink>
            </nav>

            {/* Dropdown do Usuario (Overlay absoluto) */}
            {isUserMenuOpen && (
                <div className={styles.userDropdown} ref={menuRef}>
                    <div className={styles.uacHeader}>
                        <div className={styles.uacAvatarPlaceholder}>{profile?.nome?.[0] || 'M'}</div>
                        <div className={styles.uacHeaderInfo}>
                            <span className={styles.uacName}>{profile?.nome || 'User'}</span>
                            <span className={styles.uacRole}>{profile?.permissao || 'Colaborador'}</span>
                        </div>
                    </div>

                    <div className={styles.uacDivider} />
                    <div className={styles.uacSectionLabel}>Configuracoes</div>

                    <button className={styles.uacItem}>
                        <div className={`${styles.uacItemIcon} ${styles.iconPurple}`}>
                            <Palette size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Personalizacao</span>
                            <span className={styles.uacItemDesc}>Tema, cores e menu</span>
                        </div>
                        <ChevronRight size={14} className={styles.uacItemArrow} />
                    </button>

                    <button className={styles.uacItem}>
                        <div className={`${styles.uacItemIcon} ${styles.iconOrange}`}>
                            <Key size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Alterar Senha</span>
                            <span className={styles.uacItemDesc}>Seguranca da conta</span>
                        </div>
                        <ChevronRight size={14} className={styles.uacItemArrow} />
                    </button>

                    <div className={styles.uacDivider} />

                    {/* Botao de Logout conectado ao handleLogout */}
                    <button
                        className={`${styles.uacItem} ${styles.uacItemLogout}`}
                        onClick={handleLogout}
                    >
                        <div className={`${styles.uacItemIcon} ${styles.iconRed}`}>
                            <LogOut size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Sair do Sistema</span>
                            <span className={styles.uacItemDesc}>Encerrar sessao atual</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Gatilho (Trigger) do Perfil do Usuário */}
            <div
                className={styles.userProfile}
                onClick={toggleUserMenu}
                title="Configurações da Conta"
            >
                <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nome || 'User')}&background=6366f1&color=fff`}
                    alt="Avatar"
                    className={styles.avatar}
                />
                {!isCollapsed && (
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{profile?.nome || 'User'}</span>
                        <span className={styles.userRole}>{profile?.permissao || 'Colaborador'}</span>
                    </div>
                )}
                {!isCollapsed && (
                    <MoreVertical size={16} className={styles.userMenuIcon} />
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
