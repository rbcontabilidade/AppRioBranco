import React from 'react';
import styles from './Button.module.css';

/**
 * Componente Global de Botão
 * 
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'} [props.variant='primary']
 * @param {'normal'|'small'} [props.size='normal']
 */
export const Button = ({
    children,
    className = '',
    variant = 'primary',
    size = 'normal',
    type = 'button',
    ...props
}) => {
    const classNames = [
        styles.btn,
        styles[variant],
        size === 'small' ? styles.small : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button type={type} className={classNames} {...props}>
            {children}
        </button>
    );
};
