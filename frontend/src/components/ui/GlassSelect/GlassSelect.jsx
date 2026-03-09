import React, { forwardRef } from 'react';
import styles from './GlassSelect.module.css';

/**
 * Componente UI de GlassSelect
 */
export const GlassSelect = forwardRef(({
    id,
    label,
    options = [],
    className = '',
    wrapperClassName = '',
    ...props
}, ref) => {

    const selectClass = `${styles.glassSelect} ${className}`.trim();

    return (
        <div className={`${styles.formGroup} ${wrapperClassName}`.trim()}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}

            <select
                id={id}
                ref={ref}
                className={selectClass}
                {...props}
            >
                {options.map((opt, i) => (
                    <option key={i} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
                {children}
            </select>
        </div>
    );
});

GlassSelect.displayName = 'GlassSelect';
