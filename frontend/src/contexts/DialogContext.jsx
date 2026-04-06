import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        variant: 'primary', // 'primary' | 'danger'
        type: 'alert', // 'alert' | 'confirm'
        resolve: null
    });

    const [toast, setToast] = useState({
        isOpen: false,
        message: '',
        variant: 'success' // 'success' | 'error' | 'warning' | 'info'
    });

    const showAlert = useCallback((options) => {
        const { title, message, confirmText = 'Entendido', variant = 'primary' } =
            typeof options === 'string' ? { title: 'Alerta', message: options } : options;

        setDialog({
            isOpen: true,
            title,
            message,
            confirmText,
            variant,
            type: 'alert',
            resolve: null
        });
    }, []);

    const showConfirm = useCallback((options) => {
        const {
            title,
            message,
            confirmText = 'Confirmar',
            cancelText = 'Cancelar',
            variant = 'primary'
        } = typeof options === 'string' ? { title: 'Confirmação', message: options } : options;

        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                variant,
                type: 'confirm',
                resolve
            });
        });
    }, []);

    const showToast = useCallback((message, variant = 'success', duration = 3000) => {
        setToast({ isOpen: true, message, variant });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isOpen: false }));
        }, duration);
    }, []);

    const handleClose = useCallback((value) => {
        if (dialog.resolve) {
            dialog.resolve(value);
        }
        setDialog(prev => ({ ...prev, isOpen: false, resolve: null }));
    }, [dialog]);

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showToast, dialog, toast, handleClose }}>
            {children}
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};
