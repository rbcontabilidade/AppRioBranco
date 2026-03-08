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
        name: 'Dashboard', 
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
        id: 'meu-desempenho', 
        name: 'Meu Desempenho', 
        path: '/performance/me', 
        icon: Target,
        adminOnly: false 
    },
    { 
        id: 'operacional', 
        name: 'Gestão de Processos', 
        path: '/processes', 
        icon: Workflow, 
        adminOnly: true 
    },
    { 
        id: 'competencias', 
        name: 'Gestão de Competências', 
        path: '/admin/competences', 
        icon: Calendar, 
        adminOnly: true 
    },
    { 
        id: 'executive', 
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
