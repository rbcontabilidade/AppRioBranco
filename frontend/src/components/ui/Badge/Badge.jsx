import React from 'react';
import styles from './Badge.module.css';

/**
 * Componente Global de Badge de Status
 * 
 * @param {Object} props
 * @param {'success'|'warning'|'danger'|'info'} props.variant
 */
export const Badge = ({ children, variant, className = '', ...props }) => {
    const finalClass = `${styles.badge} ${styles[variant]} ${className}`.trim();

    return (
        <span className={finalClass} {...props}>
            {children}
        </span>
    );
};
