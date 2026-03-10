import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/variables.css';

import { AuthProvider } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { GlobalDialog } from './components/ui/GlobalDialog';
import { Toast } from './components/ui/Toast';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';

const container = document.getElementById('react-root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <DialogProvider>
                    <GlobalDialog />
                    <Toast />
                    <App />
                    <SpeedInsights />
                </DialogProvider>
            </AuthProvider>
        </React.StrictMode>
    );
    console.log("React inicializado com sucesso.");
} else {
    console.error("Elemento #react-root não encontrado.");
}
