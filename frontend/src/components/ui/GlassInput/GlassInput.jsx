import React, { forwardRef } from 'react';
import styles from './GlassInput.module.css';

/**
 * Componente GlassInput que aceita ícones opcionais.
 */
export const GlassInput = forwardRef(({
    id,
    label,
    icon,
    rightIcon,
    onRightIconClick,
    className = '',
    wrapperClassName = '',
    type = 'text',
    ...props
}, ref) => {

    const inputClass = `${styles.glassInput} ${icon ? styles.withIcon : ''} ${rightIcon ? styles.withRightIcon : ''} ${className}`.trim();

    return (
        <div className={`${styles.formGroup} ${wrapperClassName}`.trim()}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}

            <div className={styles.inputWrapper}>
                {icon && <i className={`${styles.leftIcon} ${icon}`}></i>}
                <input
                    id={id}
                    ref={ref}
                    type={type}
                    className={inputClass}
                    {...props}
                />
                {rightIcon && (
                    <i
                        className={`${styles.rightIcon} ${rightIcon}`}
                        onClick={onRightIconClick}
                        style={{ cursor: onRightIconClick ? 'pointer' : 'default' }}
                    ></i>
                )}
            </div>
        </div>
    );
});

GlassInput.displayName = 'GlassInput';
