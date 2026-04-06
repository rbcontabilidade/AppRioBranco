import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import styles from './Topbar.module.css';

const Topbar = ({ onToggleSidebar }) => {
    const [currentDate, setCurrentDate] = useState('--/--/----');

    useEffect(() => {
        const updateDate = () => {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateString = new Date().toLocaleDateString('pt-BR', options);
            // Capitalizar primeira letra
            setCurrentDate(dateString.charAt(0).toUpperCase() + dateString.slice(1));
        };

        updateDate();
        // Atualiza a cada minuto para não pesar e manter preciso em viradas
        const interval = setInterval(updateDate, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <header className={`${styles.topbar} glass-bar`}>
            <div className={styles.topbarLeft}>
                {/* Usamos btn-toggle-sidebar internamente e disparamos a prop callback */}
                <button
                    className={styles.actionBtn}
                    onClick={onToggleSidebar}
                    title="Recolher/Expandir Menu Lateral"
                >
                    <Menu size={20} />
                </button>
                <div className={styles.spacer}></div>
            </div>

            <div className={styles.topbarActions}>
                <div className={styles.dateDisplay}>
                    {currentDate}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
