import React from 'react';
import styles from './KpiCard.module.css';
import { GlassCard } from '../GlassCard/GlassCard';

/**
 * KpiCard Component
 * @param {Object} props
 * @param {string} props.title - The title of the KPI (e.g., 'Total Processos')
 * @param {string|number} props.value - The value of the KPI
 * @param {React.ReactNode} props.icon - The Lucide icon component or element
 * @param {'success'|'warning'|'danger'|'info'|'default'} props.status - The status color variant
 * @param {string} props.className - Additional classes
 */
const KpiCard = ({ title, value, icon, status = 'default', className = '' }) => {
    // Map status to CSS Module class
    const statusClass = status !== 'default' ? styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`] : '';

    return (
        <GlassCard className={`${styles.kpiCard} ${statusClass} ${className}`}>
            <div className={styles.kpiIcon}>
                {icon}
            </div>
            <div className={styles.kpiData}>
                <h3>{title}</h3>
                <div className={styles.kpiValue}>{value}</div>
            </div>
        </GlassCard>
    );
};

export default KpiCard;
