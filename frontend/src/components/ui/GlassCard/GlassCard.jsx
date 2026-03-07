import React from 'react';
import styles from './GlassCard.module.css';

/**
 * Componente GlassCard e GlassPanel
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Conteúdo do card
 * @param {string} props.className - Classes CSS adicionais
 * @param {boolean} props.panel - Se verdadeiro, renderiza como um 'glass-panel' ao invés de 'glass-card'
 */
export const GlassCard = ({ children, className = '', panel = false, ...props }) => {
    const baseClass = panel ? styles.glassPanel : styles.glassCard;
    const finalClass = `${baseClass} ${className}`.trim();

    return (
        <div className={finalClass} {...props}>
            {children}
        </div>
    );
};
