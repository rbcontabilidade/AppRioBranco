import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
    CheckCircle, Clock, AlertTriangle, TrendingUp,
    Calendar, Target, Zap, List, ChevronRight,
    Star, Info, Bell, Layout
} from 'lucide-react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import styles from './MyPerformance.module.css';

const MyPerformance = () => {
    const { profile } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPerformance = async () => {
            if (!profile?.id) return;
            try {
                const response = await api.get('/performance/me');
                setStats(response.data);
            } catch (error) {
                console.error('Erro ao buscar desempenho:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPerformance();
    }, [profile]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className="spinner"></div>
                <p>Analisando seus resultados...</p>
            </div>
        );
    }

    if (!stats) return <div className={styles.error}>Ops! Não conseguimos carregar seus dados.</div>;

    const {
        kpis = {},
        produtividade = {},
        eficiencia = {},
        tendencia = [],
        historico = [],
        metas = {},
        insights = [],
        score = {},
        tarefas = [],
        competencia = {},
        funcionario = {}
    } = stats;
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className={styles.performanceContainer}>
            <header className="section-header">
                <div className="section-title-group">
                    <h1>Olá, {funcionario?.nome?.split(' ')[0] || 'Colaborador'}! 👋</h1>
                    <p className="subtitle">Seu painel de performance para a competência de <strong>{competencia?.label || ''}</strong></p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.periodBadge}>
                        <Calendar size={14} />
                        {competencia?.label || ''}
                    </div>
                    <div className={styles.periodBadge}>
                        <Target size={14} />
                        {funcionario?.cargo || ''}
                    </div>
                </div>
            </header>

            {/* ── 1. KPI Cards ────────────────────────────────────────────────── */}
            <div className={styles.kpiGrid}>
                <GlassCard className={styles.kpiCard}>
                    <div className={`${styles.kpiIcon} ${styles.iconGreen}`} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <CheckCircle size={20} color="#10b981" />
                    </div>
                    <span className={styles.kpiLabel}>Concluídas</span>
                    <h2 className={styles.kpiValue}>{kpis.concluidas}</h2>
                    <div className={`${styles.kpiTrend} ${styles.trendUp}`}>
                        +{kpis.taxa_conclusao}% taxa final
                    </div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                        <Clock size={20} color="#3b82f6" />
                    </div>
                    <span className={styles.kpiLabel}>Em Andamento</span>
                    <h2 className={styles.kpiValue}>{kpis.em_andamento}</h2>
                    <div className={styles.kpiTrend}>Ativas no sistema</div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <AlertTriangle size={20} color="#ef4444" />
                    </div>
                    <span className={styles.kpiLabel}>Atrasadas</span>
                    <h2 className={styles.kpiValue}>{kpis.atrasadas_count}</h2>
                    <div className={`${styles.kpiTrend} ${styles.trendDown}`}>
                        {kpis.taxa_atraso}% do total
                    </div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={styles.kpiIcon} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                        <Zap size={20} color="#8b5cf6" />
                    </div>
                    <span className={styles.kpiLabel}>Tempo Médio</span>
                    <h2 className={styles.kpiValue}>{eficiencia.avg_time_hours}h</h2>
                    <div className={styles.kpiTrend}>Por entrega</div>
                </GlassCard>
            </div>

            <div className={styles.mainGrid}>
                {/* ── 2. Tendência de Produtividade ─────────────────────────────── */}
                <GlassCard className={styles.chartCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                            <TrendingUp size={20} color="var(--primary-color)" />
                            <h3>Fluxo de Entregas (Mês)</h3>
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

                {/* ── 3. Score & Performance Center ─────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard className={styles.scoreCard}>
                        <div className={styles.scoreCircle} style={{ borderColor: score?.cor || '#94a3b8' }}>
                            <span className={styles.scoreNumber}>{score?.valor || 0}</span>
                            <Star size={18} fill={score?.cor || '#94a3b8'} color={score?.cor || '#94a3b8'} />
                        </div>
                        <h3 className={styles.scoreLabel}>{score?.classificacao || 'Sem dados'}</h3>
                        <p className={styles.goalCaption}>Score calculado com base em prazos e volume.</p>
                    </GlassCard>

                    <GlassCard style={{ padding: '24px' }}>
                        <div className={styles.goalHeader}>
                            <span>Meta do Mês</span>
                            <span>{metas?.percentual || 0}%</span>
                        </div>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: `${metas?.percentual || 0}%` }}></div>
                        </div>
                        <p className={styles.goalCaption}>{metas?.mensal_atual || 0} de {metas?.mensal_target || 0} entregas concluídas</p>
                    </GlassCard>
                </div>
            </div>

            <div className={styles.secondaryGrid}>
                {/* ── 4. Lista de Tarefas Recentes/Ativas ────────────────────────── */}
                <GlassCard className={styles.chartCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitle}>
                            <List size={20} color="#3b82f6" />
                            <h3>Minhas Demandas</h3>
                        </div>
                    </div>
                    <div className={styles.taskList}>
                        {tarefas.map(t => (
                            <div key={t.id} className={styles.taskItem}>
                                <div className={styles.taskInfo}>
                                    <span className={styles.taskTitle}>{t.titulo}</span>
                                    <span className={styles.taskSub}>{t.processo} • {t.cliente}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className={`${styles.taskBadge}`} style={{
                                        backgroundColor: t.atrasada ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: t.atrasada ? '#ef4444' : '#10b981'
                                    }}>
                                        {t.status}
                                    </span>
                                    <ChevronRight size={16} color="#cbd5e1" />
                                </div>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* ── 5. Histórico & Insights ─────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <Layout size={20} color="#8b5cf6" />
                                <h3>Insights do Sistema</h3>
                            </div>
                        </div>
                        <div className={styles.insightList}>
                            {insights?.map((insight, idx) => (
                                <div key={idx} className={`${styles.insightItem} ${styles[`insight_${insight.tipo}`] || ''}`}>
                                    <Info size={16} className={styles.insightIcon} />
                                    <span>{insight.msg}</span>
                                </div>
                            ))}
                            {(!insights || insights.length === 0) && (
                                <p className={styles.emptyMsg}>Tudo em ordem por aqui.</p>
                            )}
                        </div>
                    </GlassCard>

                    <GlassCard className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardTitle}>
                                <Bell size={20} color="#f59e0b" />
                                <h3>Atividade Recente</h3>
                            </div>
                        </div>
                        <div className={styles.timeline}>
                            {historico?.slice(0, 5).map((h, idx) => (
                                <div key={idx} className={styles.timelineItem}>
                                    <div className={styles.timelineDot} data-tipo={h.tipo}></div>
                                    <div className={styles.timelineContent}>
                                        <div className={styles.timelineDate}>
                                            {h.data ? new Date(h.data).toLocaleDateString('pt-BR') : 'Data n/a'}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>{h.msg || h.descricao}</p>
                                    </div>
                                </div>
                            ))}
                            {(!historico || historico.length === 0) && (
                                <p className={styles.emptyMsg}>Sem atividades recentes.</p>
                            )}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default MyPerformance;
