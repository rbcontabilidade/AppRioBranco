import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

/**
 * Modal Component using React Portals
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls the visibility of the modal
 * @param {Function} props.onClose - Function fired to close the modal
 * @param {string|React.ReactNode} props.title - Modal title (Header)
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactNode} props.footer - Optional footer content (buttons, actions)
 * @param {'sm'|'md'|'lg'|'xl'} props.size - Size variant of the modal
 * @param {boolean} props.closeOnOverlayClick - If clicking the backdrop closes the modal
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    closeOnOverlayClick = true
}) => {
    // Para possibilitar as animações ao abrir/fechar, 
    // precisamos de um delayed render para classes CSS
    const [render, setRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setRender(true);
            document.body.style.overflow = 'hidden'; // impede scroll de fundo
        } else {
            // Pequeno delay para a animação do CSS terminar (300ms)
            const timeout = setTimeout(() => {
                setRender(false);
                document.body.style.overflow = '';
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    if (!render) return null;

    // A cor e tamanho da fonte podem ser configuradas no layout parent de titles
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && closeOnOverlayClick) {
            onClose();
        }
    };

    const sizeClass = size !== 'md' ? styles[size] : '';

    return createPortal(
        <div
            className={`${styles.modalOverlay} ${isOpen ? styles.active : ''}`}
            onClick={handleOverlayClick}
            aria-modal="true"
            role="dialog"
        >
            <div className={`${styles.modalContent} ${sizeClass}`}>
                <div className={styles.modalHeader}>
                    <h2>{title}</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {children}
                </div>

                {footer && (
                    <div className={styles.modalFooter}>
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body // Injeta o modal direto no body por uso do React Portal
    );
};

export default Modal;
