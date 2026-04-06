import React from 'react';
import { useDialog } from '../../contexts/DialogContext';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export const Toast = () => {
    const { toast } = useDialog();

    if (!toast || !toast.isOpen) return null;

    const getIcon = () => {
        switch (toast.variant) {
            case 'success': return <CheckCircle size={18} color="#10b981" />;
            case 'error': return <AlertCircle size={18} color="#ef4444" />;
            case 'warning': return <AlertTriangle size={18} color="#f59e0b" />;
            case 'info': return <Info size={18} color="#3b82f6" />;
            default: return null;
        }
    };

    const getBgColor = () => {
        switch (toast.variant) {
            case 'success': return 'rgba(16, 185, 129, 0.1)';
            case 'error': return 'rgba(239, 68, 68, 0.1)';
            case 'warning': return 'rgba(245, 158, 11, 0.1)';
            case 'info': return 'rgba(59, 130, 246, 0.1)';
            default: return 'rgba(255, 255, 255, 0.1)';
        }
    };

    const getBorderColor = () => {
        switch (toast.variant) {
            case 'success': return 'rgba(16, 185, 129, 0.2)';
            case 'error': return 'rgba(239, 68, 68, 0.2)';
            case 'warning': return 'rgba(245, 158, 11, 0.2)';
            case 'info': return 'rgba(59, 130, 246, 0.2)';
            default: return 'rgba(255, 255, 255, 0.2)';
        }
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 30000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${getBorderColor()}`,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            animation: 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500'
        }}>
            <div style={{ 
                backgroundColor: getBgColor(),
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {getIcon()}
            </div>
            <span>{toast.message}</span>

            <style>
                {`
                    @keyframes toastIn {
                        from { transform: translateY(100%) scale(0.9); opacity: 0; }
                        to { transform: translateY(0) scale(1); opacity: 1; }
                    }
                `}
            </style>
        </div>
    );
};
