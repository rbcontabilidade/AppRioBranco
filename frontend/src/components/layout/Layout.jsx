import React, { useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar/Sidebar';
import Topbar from './Topbar/Topbar';
import ScrollToButton from './ScrollToButton/ScrollToButton';

/**
 * Layout principal da aplicação.
 * - Sidebar fixo na tela (não rola com o conteúdo)
 * - Conteúdo principal com marginLeft para compensar o sidebar
 * - Botão flutuante de scroll que aparece quando há conteúdo longo
 */
const Layout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    // Ref para o container de conteúdo rolável, passado ao ScrollToButton
    const contentRef = useRef(null);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    // Largura do sidebar de acordo com o estado (expandido ou colapsado)
    const sidebarWidth = isSidebarCollapsed
        ? 'var(--sidebar-collapsed-width, 80px)'
        : 'var(--sidebar-width, 260px)';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'var(--bg-base)', color: 'var(--text-main)' }}>
            {/* Sidebar fixo — não participa do fluxo do documento */}
            <Sidebar isCollapsed={isSidebarCollapsed} />

            {/* marginLeft compensa o espaço do sidebar fixo */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                marginLeft: sidebarWidth,
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowX: 'hidden',
            }}>
                <Topbar onToggleSidebar={toggleSidebar} />

                {/* Área de Conteúdo Principal — a referência de scroll é aqui */}
                <div
                    ref={contentRef}
                    style={{
                        padding: '2rem',
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    <Outlet />
                </div>
            </main>

            {/* Botão flutuante de scroll — monitora o container de conteúdo */}
            <ScrollToButton scrollContainerRef={contentRef} />
        </div>
    );
};

export default Layout;
