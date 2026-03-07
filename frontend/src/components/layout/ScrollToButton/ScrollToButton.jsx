import React, { useState, useEffect, useRef } from 'react';
import { ChevronsDown, ChevronsUp } from 'lucide-react';
import styles from './ScrollToButton.module.css';

/**
 * Botão flutuante que aparece quando a página tem scroll disponível.
 * - Clique desce até o fim da página
 * - Ao atingir o fim, clique sobe até o topo
 * - Fica posicionado no canto inferior direito da área de conteúdo
 */
const ScrollToButton = ({ scrollContainerRef }) => {
    // Estados de visibilidade e posição do scroll
    const [visible, setVisible] = useState(false);
    const [atBottom, setAtBottom] = useState(false);

    useEffect(() => {
        const container = scrollContainerRef?.current;
        if (!container) return;

        // Verifica se há scroll suficiente para exibir o botão
        const checkScroll = () => {
            const hasScroll = container.scrollHeight > container.clientHeight + 20;
            const isAtBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 40;

            setVisible(hasScroll);
            setAtBottom(isAtBottom);
        };

        // Executa na montagem e a cada scroll
        checkScroll();
        container.addEventListener('scroll', checkScroll);

        // Observa mudanças no tamanho do conteúdo (ex: dados carregados dinamicamente)
        const resizeObserver = new ResizeObserver(checkScroll);
        resizeObserver.observe(container);

        return () => {
            container.removeEventListener('scroll', checkScroll);
            resizeObserver.disconnect();
        };
    }, [scrollContainerRef]);

    // Alterna entre rolar para o fim e rolar para o topo
    const handleClick = () => {
        const container = scrollContainerRef?.current;
        if (!container) return;

        if (atBottom) {
            // Volta ao topo com animação suave
            container.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Desce para o fim com animação suave
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    };

    if (!visible) return null;

    return (
        <button
            className={`${styles.scrollBtn} ${atBottom ? styles.atBottom : ''}`}
            onClick={handleClick}
            title={atBottom ? 'Voltar ao topo' : 'Ir ao final da página'}
            aria-label={atBottom ? 'Voltar ao topo' : 'Ir ao final da página'}
        >
            {atBottom ? (
                <ChevronsUp size={20} />
            ) : (
                <ChevronsDown size={20} />
            )}
        </button>
    );
};

export default ScrollToButton;
