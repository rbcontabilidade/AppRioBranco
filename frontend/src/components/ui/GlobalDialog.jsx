import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../../contexts/DialogContext';
import { AlertCircle, HelpCircle, X, CheckCircle } from 'lucide-react';
import { Button } from './Button/Button';

export const GlobalDialog = () => {
    const { dialog, handleClose } = useDialog();
    const [render, setRender] = useState(false);

    useEffect(() => {
        if (dialog.isOpen) {
            setRender(true);
        } else {
            const timer = setTimeout(() => setRender(false), 300); // Aguarda animação de saída
            return () => clearTimeout(timer);
        }
    }, [dialog.isOpen]);

    if (!render) return null;

    const onClose = (value) => {
        handleClose(value);
    };

    return createPortal(
        <div
            className={`modal-overlay ${dialog.isOpen ? 'active' : ''}`}
            onClick={() => dialog.type === 'confirm' ? null : onClose(false)}
            style={{
                zIndex: 20000,
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.3s ease',
                opacity: dialog.isOpen ? 1 : 0
            }}
        >
            <div
                className="glass-modal"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Fundo mais escuro e sólido para contraste
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '20px',
                    padding: '32px',
                    width: '95%',
                    maxWidth: '480px',
                    boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.8)',
                    transform: dialog.isOpen ? 'scale(1)' : 'scale(0.95)',
                    transition: 'transform 0.3s ease',
                    position: 'relative',
                    animation: dialog.isOpen ? 'modalIn 0.3s ease forwards' : 'modalOut 0.3s ease forwards'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                        backgroundColor: dialog.variant === 'danger' ? 'rgba(239, 68, 68, 0.1)' :
                            dialog.variant === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                                'rgba(59, 130, 246, 0.1)',
                        padding: '10px',
                        borderRadius: '12px'
                    }}>
                        {dialog.variant === 'danger' ? (
                            <AlertCircle color="#ef4444" size={24} />
                        ) : dialog.variant === 'success' ? (
                            <CheckCircle color="#10b981" size={24} />
                        ) : dialog.type === 'confirm' ? (
                            <HelpCircle color="#3b82f6" size={24} />
                        ) : (
                            <AlertCircle color="#3b82f6" size={24} />
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: '#fff',
                            marginBottom: '8px',
                            marginTop: '4px'
                        }}>
                            {dialog.title}
                        </h3>
                        <p style={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            lineHeight: '1.5',
                            fontSize: '0.95rem'
                        }}>
                            {dialog.message}
                        </p>
                    </div>

                    <button
                        onClick={() => onClose(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.4)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {dialog.type === 'confirm' && (
                        <Button
                            variant="secondary"
                            onClick={() => onClose(false)}
                            style={{
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#eee'
                            }}
                        >
                            {dialog.cancelText}
                        </Button>
                    )}
                    <Button
                        variant={dialog.variant}
                        onClick={() => onClose(true)}
                        style={{
                            fontWeight: '700',
                            padding: '12px 28px',
                            minWidth: '120px'
                        }}
                    >
                        {dialog.confirmText}
                    </Button>
                </div>
            </div>

            <style>
                {`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes modalOut {
                    from { opacity: 1; transform: scale(1) translateY(0); }
                    to { opacity: 0; transform: scale(0.95) translateY(10px); }
                }
                `}
            </style>
        </div>,
        document.body
    );
};
