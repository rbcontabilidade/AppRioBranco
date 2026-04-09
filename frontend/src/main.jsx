import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/variables.css';
import { injectSpeedInsights } from '@vercel/speed-insights';

import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { GlobalDialog } from './components/ui/GlobalDialog';
import { Toast } from './components/ui/Toast';
import App from './App.jsx';

// Initialize Vercel Speed Insights
injectSpeedInsights();

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure QueryClient globalmente para evitar retries infinitos e refetches excessivos na UI
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // Dados permanecem frescos por 5 minutos
        },
    },
});

const container = document.getElementById('react-root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <DialogProvider>
                        <GlobalDialog />
                        <Toast />
                        <App />
                    </DialogProvider>
                </AuthProvider>
            </QueryClientProvider>
        </React.StrictMode>
    );
    console.log("React inicializado com sucesso.");
} else {
    console.error("Elemento #react-root não encontrado.");
}
