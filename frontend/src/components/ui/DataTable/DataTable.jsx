import React from 'react';
import styles from './DataTable.module.css';
import { GlassCard } from '../GlassCard/GlassCard';

/**
 * DataTable Component
 * @param {Object} props
 * @param {Array<string|React.ReactNode>} props.columns - Array of column headers
 * @param {Array<Array<string|React.ReactNode>>} props.data - Array of rows, each row is an array of cell values
 * @param {boolean} props.hoverable - Whether rows should have hover effects
 * @param {boolean} props.selectable - Whether rows will show pointer cursor
 * @param {Function} props.onRowClick - Callback when a row is clicked
 * @param {string} props.className - Additional classes for the wrapper
 */
const DataTable = ({
    columns = [],
    data = [],
    hoverable = true,
    selectable = false,
    onRowClick,
    className = ''
}) => {
    return (
        <GlassCard className={`${styles.fullTableContainer} ${className}`}>
            <div className={styles.tableResponsive}>
                <table className={`${styles.dataTable} ${selectable ? styles.selectableRows : ''}`}>
                    <thead>
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
                            >
                                {row.map((cell, cellIndex) => (
                                    <td key={cellIndex}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length || 1} style={{ textAlign: 'center', py: '2rem' }}>
                                    Nenhum dado encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </GlassCard>
    );
};

export default DataTable;
