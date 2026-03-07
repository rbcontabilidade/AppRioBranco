import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
    CheckCircle, Clock, AlertTriangle, TrendingUp,
    Calendar, Target, Zap, List, ChevronRight,
    Star, Info, Bell, Layout, Download, RefreshCw, 
    ThumbsUp, ShieldCheck, Trophy, Flame, Play, CheckCircle2, RotateCcw
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, PieChart, Pie, Cell as RechartsCell
} from 'recharts';
import styles from './MyPerformance.module.css';

const MyPerformance = () => {
    const { profile } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Todas');
    const [filterPeriodo, setFilterPeriodo] = useState('30_days');

    const fetchPerformance = async () => {
        if (!profile?.id) return;
        setLoading(true);
        try {
            const response = await api.get('/performance/me');
            console.log('Stats carregados da API:', response.data);
            setStats(response.data);
        } catch (error) {
            console.error('Erro ao buscar desempenho:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerformance();
    }, [profile]);

    // Helper para normalizar status
    const normalizeStatus = (status) => {
        if (!status) return '';
        const s = status.toUpperCase();
        if (s === 'CONCLUIDA' || s === 'CONCLUÍDA' || s === 'CONCLUIDO') return 'CONCLUIDO';
        return s;
    };

    // Helper para verificar se a data (DD/MM/YYYY) é hoje
    const isToday = (dataApresentacao) => {
        if (!dataApresentacao) return false;
        const hojeObj = new Date();
        const hojeDD = String(hojeObj.getDate()).padStart(2, '0');
        const hojeMM = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const hojeYYYY = hojeObj.getFullYear();
        const hojeFormatado = `${hojeDD}/${hojeMM}/${hojeYYYY}`;
        return dataApresentacao === hojeFormatado;
    };


    // Destructuring seguro ANTES dos early returns
    const rawTarefas = stats?.tarefas || [];
    const kpis = stats?.kpis || {};
    const eficiencia = stats?.eficiencia || {};
    const tendencia = stats?.tendencia || [];
    const metas = stats?.metas || {};
    const competencia = stats?.competencia || {};
    const funcionario = stats?.funcionario || {};

    // Lógica para inferir gamificação e dados a partir do histórico de tarefas
    const derivedData = useMemo(() => {
        if (!stats?.tarefas) return { attention: [], streak: 0, onTimeCount: 0, badges: [
            { id: 'semana_sem_atraso', name: 'Semana Sem Atrasos', desc: 'Entregou todas as tarefas da semana no prazo', locked: true, icon: <ShieldCheck size={24} /> },
            { id: 'entrega_limpa', name: 'Entrega Limpa', desc: 'Concluiu demandas com alta qualidade', locked: true, icon: <Star size={24} /> },
            { id: 'ritmo_forte', name: 'Ritmo Forte', desc: 'Manteve alta produtividade contínua', locked: true, icon: <Flame size={24} /> }
        ] };
        
        // Pega as tarefas ativas e com risco
        const attention = rawTarefas.filter(t => t.atrasada || normalizeStatus(t.status) === 'VENCE_HOJE' || normalizeStatus(t.status) === 'EM_RISCO').slice(0, 4);
        
        let streak = 0;
        let onTimeCount = 0;
        rawTarefas.forEach(t => {
            if (normalizeStatus(t.status) === 'CONCLUIDO' && !t.atrasada) {
                onTimeCount++;
                streak++;
            } else if (t.atrasada) {
                streak = 0; // quebra o streak
            }
        });

        const badges = [
            { id: 'semana_sem_atraso', name: 'Semana Sem Atrasos', desc: 'Entregou todas as tarefas da semana no prazo', locked: streak < 5, icon: <ShieldCheck size={24} /> },
            { id: 'entrega_limpa', name: 'Entrega Limpa', desc: 'Concluiu demandas com alta qualidade', locked: onTimeCount < 10, icon: <Star size={24} /> },
            { id: 'ritmo_forte', name: 'Ritmo Forte', desc: 'Manteve alta produtividade contínua', locked: onTimeCount < 20, icon: <Flame size={24} /> }
        ];

        return { attention, streak, onTimeCount, badges };
    }, [stats?.tarefas]);
    
    // Computando KPIs extraídos diretamente da resposta bruta da API para precisão matemática, em vez de depender da view `rawTarefas` cortada.
    const computedKPIs = useMemo(() => {
        return { 
            ativas: (kpis.em_andamento || 0) + (kpis.pendentes || 0), 
            vencemHoje: rawTarefas.filter(t => isToday(t.prazo) && normalizeStatus(t.status) !== 'CONCLUIDO' && !t.atrasada).length, 
            atrasadas: kpis.atrasadas_count || 0, 
            concluidas: kpis.concluidas || 0, 
            taxaNoPrazo: kpis.on_time_rate || 100 
        };
    }, [kpis, rawTarefas]);

    // Preparar dados do Gráfico Pie (Distribuição da Carteira)
    const distribuicao = [
        { name: 'Em Andamento', value: Math.max(0, computedKPIs.ativas - computedKPIs.atrasadas - computedKPIs.vencemHoje), color: '#3b82f6' },
        { name: 'Vencem Hoje', value: computedKPIs.vencemHoje, color: '#f59e0b' },
        { name: 'Atrasadas', value: computedKPIs.atrasadas, color: '#ef4444' },
        { name: 'Concluídas', value: computedKPIs.concluidas, color: '#10b981' },
    ].filter(d => d.value > 0);

    // Filtrar tarefas baseadas na Tab Smart
    const filteredTasks = rawTarefas.filter(t => {
        const isVenceHoje = isToday(t.prazo) || normalizeStatus(t.status) === 'VENCE_HOJE';
        if (activeTab === 'Atrasadas') return t.atrasada;
        if (activeTab === 'Vencem Hoje') return isVenceHoje && !t.atrasada && normalizeStatus(t.status) !== 'CONCLUIDO';
        if (activeTab === 'Concluídas') return normalizeStatus(t.status) === 'CONCLUIDO';
        return true;
    });

    // NOW early returns (Sem erro de Hook do React)
    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
                <p>Analisando seus resultados...</p>
            </div>
        );
    }

    if (!stats) return <div className={styles.error}>Ops! Não conseguimos carregar seus dados.</div>;

    return (
        <div className={styles.performanceContainer}>
            {/* CABEÇALHO */}
            <header className="section-header" style={{ marginBottom: '16px' }}>
                <div className="section-title-group">
                    <h1>Meu Desempenho</h1>
                    <p className="subtitle" style={{ marginTop: '8px' }}>Acompanhe suas demandas, sua evolução e seus próximos objetivos.</p>
                </div>
            </header>

            {/* FILTROS E AÇÕES */}
            <div className={styles.filterStrip}>
                <div className={styles.periodBadge}>
                    <Calendar size={14} /> 
                    Competência Ativa: {competencia?.label || '...'}
                </div>
                <div style={{ flex: 1 }}></div>
                <button className={styles.actionButton} onClick={fetchPerformance}>
                    <RefreshCw size={16} /> Atualizar
                </button>
            </div>

            {/* 1. SUMMARY CARDS STRIP */}
            <div className={styles.summaryGrid} style={{ marginTop: '24px' }}>
                <GlassCard className={`${styles.summaryCard} ${styles.blue}`}>
                    <span className={styles.summaryCardLabel}>Ativas</span>
                    <span className={styles.summaryCardValue}>{computedKPIs.ativas}</span>
                    <span className={styles.summaryCardSub}>Na sua carteira</span>
                </GlassCard>
                <GlassCard className={`${styles.summaryCard} ${styles.yellow}`}>
                    <span className={styles.summaryCardLabel}>Vencem Hoje</span>
                    <span className={styles.summaryCardValue}>{computedKPIs.vencemHoje}</span>
                    <span className={styles.summaryCardSub}>Atenção redobrada</span>
                </GlassCard>
                <GlassCard className={`${styles.summaryCard} ${styles.red}`}>
                    <span className={styles.summaryCardLabel}>Atrasadas</span>
                    <span className={styles.summaryCardValue}>{computedKPIs.atrasadas}</span>
                    <span className={styles.summaryCardSub}>Precisam de foco</span>
                </GlassCard>
                <GlassCard className={`${styles.summaryCard} ${styles.green}`}>
                    <span className={styles.summaryCardLabel}>Concluídas</span>
                    <span className={styles.summaryCardValue}>{computedKPIs.concluidas}</span>
                    <span className={styles.summaryCardSub}>No período</span>
                </GlassCard>
                <GlassCard className={`${styles.summaryCard} ${styles.green}`}>
                    <span className={styles.summaryCardLabel}>Taxa no Prazo</span>
                    <span className={styles.summaryCardValue}>{computedKPIs.taxaNoPrazo}%</span>
                    <span className={styles.summaryCardSub}>Entregas on-time</span>
                </GlassCard>
                <GlassCard className={`${styles.summaryCard} ${styles.blue}`}>
                    <span className={styles.summaryCardLabel}>Tempo Médio</span>
                    <span className={styles.summaryCardValue}>{eficiencia.avg_time_hours || 0}h</span>
                    <span className={styles.summaryCardSub}>Por conclusão</span>
                </GlassCard>
            </div>

            {/* 2. PERSONAL EVOLUTION BLOCK */}
            <div className={styles.evolutionTitle}>Sua Evolução</div>
            <p className={styles.evolutionText}>
                Você está indo bem! Sua consistência nas entregas está mantendo a carteira sob controle. 
                Continue focado para manter a régua de prazos alta.
            </p>
            
            <div className={styles.evolutionGrid} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className={styles.miniTrend}>
                        <div className={styles.miniTrendInfo}>
                            <span className={styles.miniTrendLabel}>Produtividade</span>
                            <span className={styles.miniTrendValue}>{kpis.taxa_conclusao || 0}%</span>
                        </div>
                        <div className={`${styles.miniTrendIndicator} ${styles.trendUp}`}>
                            <TrendingUp size={16} /> +5%
                        </div>
                    </div>
                    <div className={styles.miniTrend}>
                        <div className={styles.miniTrendInfo}>
                            <span className={styles.miniTrendLabel}>Pontualidade</span>
                            <span className={styles.miniTrendValue}>{100 - (kpis.taxa_atraso || 0)}%</span>
                        </div>
                        <div className={`${styles.miniTrendIndicator} ${styles.trendUp}`}>
                            <TrendingUp size={16} /> Estável
                        </div>
                    </div>
                </div>
                
                <GlassCard style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Trophy size={24} color="#f59e0b" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Melhor marca pessoal</h3>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        Você completou <strong>{derivedData.onTimeCount}</strong> entregas limpas recentemente, aproximando-se do seu melhor recorde histórico no trimestre.
                    </p>
                </GlassCard>

                <GlassCard style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Target size={24} color="#8b5cf6" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Próximo objetivo</h3>
                    </div>
                    <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${Math.min(derivedData.streak * 20, 100)}%` }}></div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                        Faltam {Math.max(5 - derivedData.streak, 0)} entregas no prazo para o selo "Semana Sem Atrasos".
                    </p>
                </GlassCard>
            </div>

            {/* 3. GAMIFICATION BLOCK */}
            <div className={styles.gamificationGrid}>
                {/* Col 1 */}
                <div className={styles.gamificationCol}>
                    <div className={styles.gamificationColTitle}>
                        <Star size={18} /> Suas Conquistas
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {derivedData.badges.map(b => (
                            <div key={b.id} className={`${styles.badgeItem} ${b.locked ? styles.locked : ''}`}>
                                <div className={styles.badgeIcon}>{b.icon}</div>
                                <div className={styles.badgeInfo}>
                                    <span className={styles.badgeName}>{b.name}</span>
                                    <span className={styles.badgeDesc}>{b.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Col 2 */}
                <div className={styles.gamificationCol}>
                    <div className={styles.gamificationColTitle}>
                        <Target size={18} /> Em Progresso
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className={styles.badgeItem}>
                            <div className={styles.badgeIcon} style={{ background: 'transparent', color: '#3b82f6', border: '2px dashed #e2e8f0' }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div className={styles.badgeInfo}>
                                <span className={styles.badgeName}>Carteira sob Controle</span>
                                <span className={styles.badgeDesc}>Mantenha os atrasos abaixo de 5% por mais 3 dias.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Col 3 */}
                <div className={styles.gamificationCol}>
                    <div className={styles.gamificationColTitle}>
                        <Flame size={18} /> Sequência Atual
                    </div>
                    <GlassCard style={{ padding: '24px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <Flame size={40} fill="#f59e0b" /> {derivedData.streak}
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Demandas entregues no prazo, em sequência!</span>
                    </GlassCard>
                </div>
            </div>

            {/* 4. IMMEDIATE ATTENTION BLOCK */}
            <div className={styles.evolutionTitle}>O que precisa da sua atenção agora</div>
            <p className={styles.evolutionText} style={{ marginBottom: '16px' }}>
                Atuar nestes itens vai melhorar rapidamente o seu resultado no período atual.
            </p>
            <div className={styles.attentionGrid} style={{ marginBottom: '32px' }}>
                {derivedData.attention.length > 0 ? derivedData.attention.map(att => (
                    <div key={att.id} className={`${styles.attentionCard} ${att.atrasada ? '' : styles.warning}`}>
                        <div className={styles.attentionHeader}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={styles.attentionTitle}>{att.titulo}</span>
                                <span className={styles.attentionMeta}>{att.cliente}</span>
                            </div>
                            <span className={`${styles.attentionUrgency} ${att.atrasada ? styles.high : styles.medium}`}>
                                {att.atrasada ? 'Atrasada' : 'Em Risco'}
                            </span>
                        </div>
                        <div className={styles.attentionActions}>
                            <button className={styles.btnActionOutline}><Play size={12} style={{marginRight: '4px'}}/> Iniciar</button>
                            <button className={styles.btnActionOutline}><CheckCircle2 size={12} style={{marginRight: '4px'}}/> Concluir</button>
                        </div>
                    </div>
                )) : (
                    <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#065f46', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ThumbsUp size={20} /> Tudo sob controle. Nenhuma demanda crítica imediata.
                    </div>
                )}
            </div>

            {/* 5. CHARTS AREA */}
            <div className={styles.evolutionGrid} style={{ marginBottom: '32px' }}>
                <GlassCard style={{ padding: '24px', gridColumn: 'span 2' }}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                            <TrendingUp size={20} color="var(--primary-color)" />
                            <h3 style={{ margin: 0 }}>Evolução do Desempenho</h3>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <AreaChart data={tendencia}>
                                <defs>
                                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="concluidas" stroke="var(--primary-color)" strokeWidth={3} fillOpacity={1} fill="url(#colorProd)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>

                <GlassCard style={{ padding: '24px' }}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                            <PieChart size={20} color="#8b5cf6" />
                            <h3 style={{ margin: 0 }}>Distribuição da Carteira</h3>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {distribuicao.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={distribuicao}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distribuicao.map((entry, index) => (
                                            <RechartsCell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sem dados na carteira ativa.</span>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* 6. SMART DEMAND LIST */}
            <div className={styles.evolutionTitle}>Sua Lista de Demandas</div>
            
            <div className={styles.smartTabsContainer}>
                {['Todas', 'Atrasadas', 'Vencem Hoje', 'Concluídas'].map(tab => (
                    <button 
                        key={tab} 
                        className={`${styles.smartTab} ${activeTab === tab ? styles.active : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
                <div className={styles.smartTableWrapper}>
                    <table className={styles.smartTable}>
                        <thead>
                            <tr>
                                <th>Demanda</th>
                                <th>Processo / Cliente</th>
                                <th>Status</th>
                                <th>Ações Rápidas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length > 0 ? filteredTasks.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.titulo}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{t.processo}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.cliente}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.taskBadge}`} style={{
                                            backgroundColor: t.atrasada ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: t.atrasada ? '#ef4444' : '#10b981'
                                        }}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionCell}>
                                            <button className={styles.btnActionOutline} title="Abrir"><Layout size={14} /></button>
                                            <button className={styles.btnActionOutline} title="Atualizar"><RotateCcw size={14} /></button>
                                            <button className={styles.btnActionOutline} title="Concluir" style={{color: '#10b981', borderColor: 'rgba(16,185,129,0.3)'}}><CheckCircle2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                                        Nenhuma demanda encontrada nesta categoria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
};

export default MyPerformance;
