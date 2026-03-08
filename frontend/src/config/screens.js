import {
    LayoutDashboard,
    Users,
    Target,
    Workflow,
    Calendar,
    Activity,
    Settings
} from 'lucide-react';

export const SYSTEM_SCREENS = [
    { 
        id: 'dashboard', 
        name: 'Manager Dashboard', 
        path: '/', 
        icon: LayoutDashboard,
        adminOnly: false 
    },
    { 
        id: 'clientes', 
        name: 'Gestão de Clientes', 
        path: '/clients', 
        icon: Users,
        adminOnly: false 
    },
    { 
        id: 'performance/me', 
        name: 'Meu Desempenho', 
        path: '/performance/me', 
        icon: Target,
        adminOnly: false 
    },
    { 
        id: 'processes', 
        name: 'Gestão de Processos', 
        path: '/processes', 
        icon: Workflow, 
        adminOnly: true 
    },
    { 
        id: 'admin/competences', 
        name: 'Gestão de Competências', 
        path: '/admin/competences', 
        icon: Calendar, 
        adminOnly: true 
    },
    { 
        id: 'admin/executive', 
        name: 'Painel Executivo', 
        path: '/admin/executive', 
        icon: Activity, 
        adminOnly: true 
    },
    { 
        id: 'settings', 
        name: 'Configurações', 
        path: '/settings', 
        icon: Settings,
        adminOnly: false 
    }
];
