import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    ChevronRight,
    Palette,
    Key,
    LogOut,
    MoreVertical
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { SYSTEM_SCREENS } from '../../../config/screens';
import styles from './Sidebar.module.css';

const Sidebar = ({ isCollapsed }) => {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const { profile, signOut, isAdmin, permissions } = useAuth();
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

    const handleLogout = async () => {
        await signOut();
        navigate('/login', { replace: true });
    };

    // Filtra as telas que o usuário pode ver
    const allowedScreens = SYSTEM_SCREENS.filter(screen => {
        // Se for admin, vê tudo que não for marcado estritamente como não-admin (opcional)
        // No nosso caso, admin vê tudo.
        if (isAdmin) return true;
        
        // Se a tela for marcada como adminOnly e o usuário não for admin, bloqueia
        if (screen.adminOnly && !isAdmin) return false;

        // Verifica se o ID da tela está na lista de telas permitidas do cargo
        return permissions.includes(screen.id);
    });

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

            {/* Navegação Principal Dinâmica */}
            <nav className={styles.navMenu}>
                {allowedScreens.map(screen => (
                    <NavLink
                        key={screen.id}
                        to={screen.path || '/'}
                        className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                        end={screen.path === '/'}
                    >
                        {React.createElement(screen.icon, { size: 20, className: styles.navIcon })}
                        {!isCollapsed && <span>{screen.name}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Dropdown do Usuario */}
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

                    <button
                        className={styles.uacItem}
                        onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate('/settings/profile');
                        }}
                    >
                        <div className={`${styles.uacItemIcon} ${styles.iconPurple}`}>
                            <Palette size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Meu Perfil</span>
                            <span className={styles.uacItemDesc}>Dados e Avatar</span>
                        </div>
                        <ChevronRight size={14} className={styles.uacItemArrow} />
                    </button>

                    <button
                        className={styles.uacItem}
                        onClick={() => {
                            setIsUserMenuOpen(false);
                            navigate('/settings/profile'); // Ou rota específica de senha se houver
                        }}
                    >
                        <div className={`${styles.uacItemIcon} ${styles.iconOrange}`}>
                            <Key size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Segurança</span>
                            <span className={styles.uacItemDesc}>Alterar Senha</span>
                        </div>
                        <ChevronRight size={14} className={styles.uacItemArrow} />
                    </button>

                    <div className={styles.uacDivider} />

                    <button
                        className={`${styles.uacItem} ${styles.uacItemLogout}`}
                        onClick={handleLogout}
                    >
                        <div className={`${styles.uacItemIcon} ${styles.iconRed}`}>
                            <LogOut size={16} />
                        </div>
                        <div className={styles.uacItemText}>
                            <span className={styles.uacItemLabel}>Sair do Sistema</span>
                            <span className={styles.uacItemDesc}>Encerrar sessao</span>
                        </div>
                    </button>
                </div>
            )}

            {/* Gatilho do Perfil */}
            <div
                className={styles.userProfile}
                onClick={toggleUserMenu}
                title="Configurações da Conta"
            >
                <img
                    src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.nome || 'User')}&background=6366f1&color=fff`}
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
