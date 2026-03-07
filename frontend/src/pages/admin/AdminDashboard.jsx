import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import {
    TrendingUp,
    Users,
    Clock,
    Zap,
    Activity,
    DollarSign
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { api } from '../../services/api';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [competencias, setCompetencias] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [selectedComp, setSelectedComp] = useState('');
    const [selectedFunc, setSelectedFunc] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [compRes, funcRes] = await Promise.all([
                    api.get('/meses'),
                    api.get('/funcionarios')
                ]);
                setCompetencias(compRes.data);
                setFuncionarios(funcRes.data);

                // Set active competence if available
                const active = compRes.data.find(c => c.status === 'Open' || c.status === 'Aberto');
                if (active) setSelectedComp(active.id);
            } catch (error) {
                console.error('Erro ao carregar filtros:', error);
            }
        };
        loadInitialData();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const params = {};
            if (selectedComp) params.competencia_id = selectedComp;
            if (selectedFunc) params.funcionario_id = selectedFunc;

            const response = await api.get('/performance/admin-stats', { params });
            setStats(response.data);
        } catch (error) {
            console.error('Erro ao buscar estatísticas do admin:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedComp, selectedFunc]);

    if (loading) {
        return <div className={styles.loading}>Carregando indicadores mestres...</div>;
    }

    const kpis = stats?.kpis || {};
    const chartData = stats?.chart_data || [];
    const logs = stats?.recent_logs || [];

    return (
        <div className="view-section active">
            <header className="section-header">
                <div className="section-title-group">
                    <h1>Dashboard Administrativo</h1>
                    <p className="subtitle">Visão executiva de faturamento, eficiência e saúde do escritório</p>
                </div>

                <div className={styles.filterGroup} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <div className={styles.filterItem}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Competência</label>
                        <select
                            value={selectedComp}
                            onChange={(e) => setSelectedComp(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                        >
                            <option value="">Todas as Competências</option>
                            {competencias.map(c => (
                                <option key={c.id} value={c.id}>{String(c.mes).padStart(2, '0')}/{c.ano}</option>
                            ))}
                        </select>
                    </div>
                    <div className={styles.filterItem}>
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Funcionário</label>
                        <select
                            value={selectedFunc}
                            onChange={(e) => setSelectedFunc(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}
                        >
                            <option value="">Todos os Funcionários</option>
                            {funcionarios.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Top Row: KPI Cards */}
            <div className={styles.kpiGrid}>
                <GlassCard className={styles.kpiCard}>
                    <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
                        <DollarSign size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Faturamento Total</span>
                        <h2 className={styles.kpiValue}>{kpis.total_revenue}</h2>
                        <span className={styles.kpiTrend}>+12.5% em relação ao mês anterior</span>
                    </div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
                        <Users size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Clientes Ativos</span>
                        <h2 className={styles.kpiValue}>{kpis.active_clients}</h2>
                        <span className={styles.kpiTrend}>5 novos registros esta semana</span>
                    </div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={`${styles.iconWrapper} ${styles.iconOrange}`}>
                        <Clock size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Processos Pendentes</span>
                        <h2 className={styles.kpiValue}>{kpis.pending_processes}</h2>
                        <span className={styles.kpiTrend}>3 urgências detectadas</span>
                    </div>
                </GlassCard>

                <GlassCard className={styles.kpiCard}>
                    <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
                        <Zap size={24} />
                    </div>
                    <div className={styles.kpiContent}>
                        <span className={styles.kpiLabel}>Eficiência da Equipe</span>
                        <h2 className={styles.kpiValue}>{kpis.team_efficiency}%</h2>
                        <div className={styles.miniBar}>
                            <div className={styles.miniBarFill} style={{ width: `${kpis.team_efficiency}%` }} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Middle Row: Analytics Chart */}
            <div className={styles.chartSection}>
                <GlassCard className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <div className={styles.chartTitleGroup}>
                            <TrendingUp size={20} className={styles.chartIcon} />
                            <h3>Processos Concluídos por Mês</h3>
                        </div>
                        <select className={styles.chartSelect}>
                            <option>Últimos 6 meses</option>
                            <option>Ano atual</option>
                        </select>
                    </div>
                    <div className={styles.chartContainer}>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="completed"
                                    stroke="var(--primary-color)"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorComp)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </GlassCard>
            </div>

            {/* Bottom Row: Logs Table */}
            <div className={styles.logsSection}>
                <GlassCard className={styles.logsCard}>
                    <div className={styles.logsHeader}>
                        <Activity size={20} className={styles.logsIcon} />
                        <h3>Atividades Recentes do Sistema</h3>
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.logsTable}>
                            <thead>
                                <tr>
                                    <th>Usuário</th>
                                    <th>Ação Executada</th>
                                    <th>Horário</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td>
                                            <div className={styles.userCell}>
                                                <div className={styles.avatarMini}>{log.user[0]}</div>
                                                <span>{log.user}</span>
                                            </div>
                                        </td>
                                        <td className={styles.actionCell}>{log.action}</td>
                                        <td className={styles.timeCell}>{log.time}</td>
                                        <td>
                                            <span className={styles.badgeSuccess}>Sucesso</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default AdminDashboard;
