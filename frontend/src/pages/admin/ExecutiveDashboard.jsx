import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
    Activity, AlertTriangle, AlertOctagon, BarChart2, CheckCircle2,
    Clock, Users, Zap, TrendingUp, TrendingDown, Shield,
    ChevronRight, RefreshCw, Calendar, Target, Layers,
    ArrowUp, ArrowDown, Minus, Loader
} from 'lucide-react';
import styles from './ExecutiveDashboard.module.css';
import Modal from '../../components/ui/Modal/Modal';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Funções auxiliares ───────────────────────────────────────────────────────

const prioridadeCor = {
    CRITICA: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#fca5a5', label: 'Crítica' },
    ALTA: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fcd34d', label: 'Alta' },
    MEDIA: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', text: '#93c5fd', label: 'Média' },
    BAIXA: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#6ee7b7', label: 'Baixa' },
};

const nivelCorCarga = {
    critico: '#ef4444',
    alto: '#f59e0b',
    normal: '#10b981',
    ocioso: '#475569',
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

// Card de KPI principal
const KpiCard = ({ titulo, valor, sub, icon: Icon, cor, variacao, onClick }) => (
    <div className={`${styles.kpiCard} ${onClick ? styles.interactive : ''}`} style={{ '--kpi-cor': cor }} onClick={onClick}>
        <div className={styles.kpiTop}>
            <div className={styles.kpiIconWrap} style={{ backgroundColor: `${cor}20`, border: `1px solid ${cor}40` }}>
                <Icon size={20} color={cor} />
            </div>
            {variacao !== undefined && (
                <span className={styles.kpiVariacao} style={{ color: variacao >= 0 ? '#10b981' : '#ef4444' }}>
                    {variacao >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {Math.abs(variacao)}%
                </span>
            )}
        </div>
        <div className={styles.kpiValor}>{valor ?? '—'}</div>
        <div className={styles.kpiTitulo}>{titulo}</div>
        {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
);

// Badge de alerta
const AlertaBadge = ({ prioridade }) => {
    const cfg = prioridadeCor[prioridade] || prioridadeCor.BAIXA;
    return (
        <span className={styles.alertaBadge} style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}40` }}>
            {cfg.label}
        </span>
    );
};

// Loader skeleton
const SkeletonCard = () => (
    <div className={styles.skeleton}><div className={styles.skeletonShimmer} /></div>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

const ExecutiveDashboard = () => {
    const { isAdmin } = useAuth();
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState(null);
    const [competencias, setCompetencias] = useState([]);
    const [compSelecionada, setCompSelecionada] = useState('');
    const [funcionarios, setFuncionarios] = useState([]);
    const [funcSelecionado, setFuncSelecionado] = useState('');
    const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
    const [activeModal, setActiveModal] = useState(null);

    // Buscar lista de competências e funcionários para os filtros
    useEffect(() => {
        const fetchFiltros = async () => {
            try {
                const [resComp, resFunc] = await Promise.all([
                    api.get('/meses'),
                    api.get('/funcionarios'),
                ]);
                const lista = resComp.data || [];
                setCompetencias(lista);
                // Selecionar a competência aberta por padrão
                const ativa = lista.find(c => c.status === 'ABERTA');
                if (ativa) setCompSelecionada(String(ativa.id));

                // Somente funcionários ativos
                const funcs = (resFunc.data || []).filter(f => f.ativo !== false);
                setFuncionarios(funcs);
            } catch (e) {
                console.error('Erro ao buscar filtros:', e);
            }
        };
        fetchFiltros();
    }, []);

    // Buscar dados do painel executivo
    const fetchDados = useCallback(async () => {
        try {
            setLoading(true);
            setErro(null);
            const params = {};
            if (compSelecionada) params.competencia_id = compSelecionada;
            if (funcSelecionado) params.funcionario_id = funcSelecionado;
            const res = await api.get('/performance/executive-dashboard', { params });
            setDados(res.data);
            setUltimaAtualizacao(new Date());
        } catch (e) {
            console.error('Erro ao carregar painel executivo:', e);
            setErro('Não foi possível carregar os dados do painel. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    }, [compSelecionada, funcSelecionado]);

    useEffect(() => {
        if (compSelecionada !== undefined) {
            fetchDados();
        }
    }, [fetchDados]);

    // ── Proteção de acesso ────────────────────────────────────────────────────
    if (!isAdmin) {
        return (
            <div className={styles.acessoNegado}>
                <Shield size={48} color="#ef4444" />
                <h2>Acesso Restrito</h2>
                <p>Este painel é exclusivo para administradores.</p>
            </div>
        );
    }

    const kpi = dados?.kpis_globais ?? {};
    const pipeline = dados?.pipeline ?? [];
    const gargalos = dados?.gargalos ?? { processos_atrasados: [], processos_parados: [] };
    const equipe = dados?.equipe ?? [];
    const carga = dados?.distribuicao_carga ?? [];
    const prazos = dados?.monitoramento_prazos ?? { vencidas: [], hoje: [], esta_semana: [], totais: {} };
    const produtividade = dados?.produtividade ?? {};
    const alertas = dados?.alertas ?? [];

    const totalPipeline = pipeline.reduce((acc, p) => acc + (p.count || 0), 0) || 1;

    return (
        <div className="view-section active">

            {/* ── Cabeçalho ─────────────────────────────────────────────── */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.titulo}>Painel Executivo</h1>
                    <p className={styles.subtitulo}>
                        Visibilidade estratégica em tempo real do sistema
                        {dados?.competencia_label && <span className={styles.compBadge}>{dados.competencia_label}</span>}
                    </p>
                </div>
                <div className={styles.headerActions}>
                    {/* Seletor de Competência */}
                    <select
                        className={styles.compSelect}
                        value={compSelecionada}
                        onChange={e => setCompSelecionada(e.target.value)}
                    >
                        <option value="">Todas as competências</option>
                        {competencias.map(c => (
                            <option key={c.id} value={String(c.id)}>
                                {String(c.mes).padStart(2, '0')}/{c.ano} — {c.status}
                            </option>
                        ))}
                    </select>
                    {/* Seletor de Funcionário */}
                    <select
                        className={styles.compSelect}
                        value={funcSelecionado}
                        onChange={e => setFuncSelecionado(e.target.value)}
                    >
                        <option value="">Todos os funcionários</option>
                        {funcionarios.map(f => (
                            <option key={f.id} value={String(f.id)}>
                                {f.nome}
                            </option>
                        ))}
                    </select>
                    <button className={styles.btnRefresh} onClick={fetchDados} title="Atualizar dados">
                        <RefreshCw size={16} className={loading ? styles.girando : ''} />
                    </button>
                </div>
            </header>

            {ultimaAtualizacao && (
                <p className={styles.ultimaAtualizacao}>
                    Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                </p>
            )}

            {/* ── Mensagem de erro ──────────────────────────────────────── */}
            {erro && (
                <div className={styles.erroBox}>
                    <AlertTriangle size={20} />
                    <span>{erro}</span>
                    <button onClick={fetchDados}>Tentar novamente</button>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════
                SEÇÃO 1: KPIs Globais
            ════════════════════════════════════════════════════════════ */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}><BarChart2 size={18} /> Visão Geral do Sistema</h2>
                {loading ? (
                    <div className={styles.kpiGrid}>
                        {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <div className={styles.kpiGrid}>
                        <KpiCard titulo="Total de Processos" valor={kpi.total_processos} icon={Layers} cor="#3b82f6" />
                        <KpiCard titulo="Processos Concluídos" valor={kpi.processos_concluidos} icon={CheckCircle2} cor="#10b981" />
                        <KpiCard titulo="Em Andamento" valor={kpi.processos_em_andamento} icon={Activity} cor="#8b5cf6" />
                        <KpiCard titulo="Processos em Risco" valor={kpi.processos_em_risco} icon={AlertOctagon} cor="#ef4444" onClick={() => setActiveModal('PROCESSOS_RISCO')} />
                        <KpiCard titulo="Total de Tarefas" valor={kpi.total_tarefas} icon={Target} cor="#6366f1" />
                        <KpiCard titulo="Tarefas Concluídas" valor={kpi.tarefas_concluidas} icon={CheckCircle2} cor="#10b981" />
                        <KpiCard titulo="Tarefas Atrasadas" valor={kpi.tarefas_atrasadas} icon={Clock} cor="#f59e0b" onClick={() => setActiveModal('TAREFAS_ATRASADAS')} />
                        <KpiCard
                            titulo="Taxa de Pontualidade"
                            valor={`${kpi.taxa_pontualidade ?? 0}%`}
                            icon={TrendingUp}
                            cor={kpi.taxa_pontualidade >= 80 ? '#10b981' : kpi.taxa_pontualidade >= 60 ? '#f59e0b' : '#ef4444'}
                            sub={kpi.taxa_pontualidade >= 80 ? 'Excelente' : kpi.taxa_pontualidade >= 60 ? 'Regular' : 'Atenção necessária'}
                        />
                    </div>
                )}
            </section>

            {/* ════════════════════════════════════════════════════════════
                SEGUNDA LINHA: Pipeline + Produtividade
            ════════════════════════════════════════════════════════════ */}
            <div className={styles.duasColunas}>

                {/* SEÇÃO 2: Pipeline de Processos */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}><Activity size={18} /> Pipeline de Processos</h2>
                    {loading ? <SkeletonCard /> : (
                        <div className={styles.pipelineList}>
                            {pipeline.map((etapa) => (
                                <div key={etapa.status} className={styles.pipelineItem}>
                                    <div className={styles.pipelineInfo}>
                                        <span className={styles.pipelineLabel}>{etapa.label}</span>
                                        <span className={styles.pipelineCount} style={{ color: etapa.color }}>{etapa.count}</span>
                                    </div>
                                    <div className={styles.pipelineBar}>
                                        <div
                                            className={styles.pipelineFill}
                                            style={{
                                                width: `${Math.round((etapa.count / totalPipeline) * 100)}%`,
                                                backgroundColor: etapa.color,
                                            }}
                                        />
                                    </div>
                                    <span className={styles.pipelinePercent}>
                                        {Math.round((etapa.count / totalPipeline) * 100)}%
                                    </span>
                                </div>
                            ))}
                            {pipeline.every(p => p.count === 0) && (
                                <p className={styles.empty}>Nenhum processo encontrado nesta competência.</p>
                            )}
                        </div>
                    )}
                </section>

                {/* SEÇÃO 7: Produtividade */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}><Zap size={18} /> Produtividade</h2>
                    {loading ? <SkeletonCard /> : (
                        <>
                            <div className={styles.prodGrid}>
                                <div className={styles.prodItem} style={{ '--prod-cor': '#3b82f6' }}>
                                    <span className={styles.prodValor}>{produtividade.concluidas_hoje ?? 0}</span>
                                    <span className={styles.prodLabel}>Concluídas Hoje</span>
                                </div>
                                <div className={styles.prodItem} style={{ '--prod-cor': '#8b5cf6' }}>
                                    <span className={styles.prodValor}>{produtividade.concluidas_semana ?? 0}</span>
                                    <span className={styles.prodLabel}>Esta Semana</span>
                                </div>
                                <div className={styles.prodItem} style={{ '--prod-cor': '#10b981' }}>
                                    <span className={styles.prodValor}>{produtividade.concluidas_mes ?? 0}</span>
                                    <span className={styles.prodLabel}>Este Mês</span>
                                </div>
                                <div className={styles.prodItem} style={{ '--prod-cor': '#f59e0b' }}>
                                    <span className={styles.prodValor}>{produtividade.total_concluidas ?? 0}</span>
                                    <span className={styles.prodLabel}>Total Concluídas</span>
                                </div>
                            </div>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Hoje', valor: produtividade.concluidas_hoje ?? 0, color: '#3b82f6' },
                                        { name: 'Semana', valor: produtividade.concluidas_semana ?? 0, color: '#8b5cf6' },
                                        { name: 'Mês', valor: produtividade.concluidas_mes ?? 0, color: '#10b981' },
                                        { name: 'Total', valor: produtividade.total_concluidas ?? 0, color: '#f59e0b' }
                                    ]}>
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                                            {
                                                [
                                                    { name: 'Hoje', valor: produtividade.concluidas_hoje ?? 0, color: '#3b82f6' },
                                                    { name: 'Semana', valor: produtividade.concluidas_semana ?? 0, color: '#8b5cf6' },
                                                    { name: 'Mês', valor: produtividade.concluidas_mes ?? 0, color: '#10b981' },
                                                    { name: 'Total', valor: produtividade.total_concluidas ?? 0, color: '#f59e0b' }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))
                                            }
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {/* Monitor de Prazos dentro do card */}
                    <div className={styles.prazosResumoDivider} />
                    <h3 className={styles.subSectionTitle}><Calendar size={15} /> Monitor de Prazos</h3>
                    {loading ? <SkeletonCard /> : (
                        <div className={styles.prazosResumo}>
                            <div className={styles.prazoBloco} style={{ '--p-cor': '#ef4444' }}>
                                <span className={styles.prazoNum}>{prazos.totais?.vencidas ?? 0}</span>
                                <span className={styles.prazoLabel}>Vencidas</span>
                            </div>
                            <div className={styles.prazoBloco} style={{ '--p-cor': '#f59e0b' }}>
                                <span className={styles.prazoNum}>{prazos.totais?.hoje ?? 0}</span>
                                <span className={styles.prazoLabel}>Vencem Hoje</span>
                            </div>
                            <div className={styles.prazoBloco} style={{ '--p-cor': '#3b82f6' }}>
                                <span className={styles.prazoNum}>{prazos.totais?.esta_semana ?? 0}</span>
                                <span className={styles.prazoLabel}>Esta Semana</span>
                            </div>
                        </div>
                    )}

                    {/* Lista de tarefas vencendo hoje */}
                    {!loading && prazos.hoje?.length > 0 && (
                        <>
                            <p className={styles.prazosHojeLabel}>Vencem hoje:</p>
                            <div className={styles.prazosHojeLista}>
                                {prazos.hoje.slice(0, 4).map(t => (
                                    <div key={t.tarefa_id} className={styles.prazosHojeItem}>
                                        <span className={styles.prazosHojeTitulo}>{t.titulo}</span>
                                        <span className={styles.prazosHojeCliente}>{t.cliente}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* ════════════════════════════════════════════════════════════
                TERCEIRA LINHA: Gargalos + Alertas
            ════════════════════════════════════════════════════════════ */}
            <div className={styles.duasColunas}>

                {/* SEÇÃO 3: Gargalos */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}><TrendingDown size={18} /> Gargalos Operacionais</h2>

                    {/* Processos com mais tarefas atrasadas */}
                    <h3 className={styles.subSectionTitle}>Top processos com tarefas atrasadas</h3>
                    {loading ? <SkeletonCard /> : gargalos.processos_atrasados?.length > 0 ? (
                        <div className={styles.tabelaWrap}>
                            <table className={styles.tabela}>
                                <thead>
                                    <tr>
                                        <th>Processo</th>
                                        <th>Cliente</th>
                                        <th className={styles.center}>Tarefas Atrasadas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gargalos.processos_atrasados.map((g, i) => (
                                        <tr key={g.processo_id} className={i === 0 ? styles.rowDestaque : ''}>
                                            <td>{g.processo_nome}</td>
                                            <td className={styles.tdSecundario}>{g.cliente_nome}</td>
                                            <td className={styles.center}>
                                                <span className={styles.badgeAtraso}>{g.tarefas_atrasadas}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className={styles.empty}>Nenhum processo com tarefas atrasadas!</p>
                    )}

                    {/* Processos parados */}
                    {gargalos.processos_parados?.length > 0 && !loading && (
                        <>
                            <h3 className={styles.subSectionTitle} style={{ marginTop: '20px' }}>Processos sem atualização</h3>
                            <div className={styles.tabelaWrap}>
                                <table className={styles.tabela}>
                                    <thead>
                                        <tr>
                                            <th>Processo</th>
                                            <th>Cliente</th>
                                            <th className={styles.center}>Dias Parado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gargalos.processos_parados.slice(0, 5).map((p) => (
                                            <tr key={p.processo_id}>
                                                <td>{p.processo_nome}</td>
                                                <td className={styles.tdSecundario}>{p.cliente_nome}</td>
                                                <td className={styles.center}>
                                                    <span className={styles.badgeDias} style={{
                                                        backgroundColor: p.dias_parado >= 14 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                                                        color: p.dias_parado >= 14 ? '#fca5a5' : '#fcd34d',
                                                    }}>
                                                        {p.dias_parado}d
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>

                {/* SEÇÃO 4: Alertas do Sistema */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}>
                        <AlertOctagon size={18} />
                        Alertas do Sistema
                        {alertas.length > 0 && (
                            <span className={styles.alertaContador}>{alertas.length}</span>
                        )}
                    </h2>
                    {loading ? (
                        [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
                    ) : alertas.length === 0 ? (
                        <div className={styles.semAlertas}>
                            <CheckCircle2 size={32} color="#10b981" />
                            <p>Sistema saudável! Nenhum alerta no momento.</p>
                        </div>
                    ) : (
                        <div className={styles.alertaLista}>
                            {alertas.map((alerta, i) => {
                                const cfg = prioridadeCor[alerta.prioridade] || prioridadeCor.BAIXA;
                                return (
                                    <div
                                        key={i}
                                        className={styles.alertaItem}
                                        style={{ backgroundColor: cfg.bg, borderLeft: `3px solid ${cfg.border}` }}
                                    >
                                        <div className={styles.alertaItemTop}>
                                            <span className={styles.alertaTitulo}>{alerta.titulo}</span>
                                            <AlertaBadge prioridade={alerta.prioridade} />
                                        </div>
                                        <span className={styles.alertaDesc}>{alerta.descricao}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ════════════════════════════════════════════════════════════
                QUARTA LINHA: Equipe + Carga
            ════════════════════════════════════════════════════════════ */}
            <div className={styles.duasColunas}>

                {/* SEÇÃO 4: Desempenho da Equipe */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}><Users size={18} /> Desempenho da Equipe</h2>
                    {loading ? (
                        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                    ) : equipe.length === 0 ? (
                        <p className={styles.empty}>Nenhum dado de equipe disponível.</p>
                    ) : (
                        <div className={styles.rankingLista}>
                            {equipe.map((func, i) => (
                                <div key={func.funcionario_id} className={styles.rankingItem}>
                                    <div className={styles.rankingPos} style={{
                                        color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7c2f' : '#4b5563'
                                    }}>
                                        #{i + 1}
                                    </div>
                                    <div className={styles.rankingInfo}>
                                        <div className={styles.rankingNome}>{func.nome}</div>
                                        <div className={styles.rankingStats}>
                                            <span style={{ color: '#10b981' }}>{func.concluidas} concluidas</span>
                                            <span style={{ color: '#f59e0b' }}>{func.pendentes + func.em_andamento} pendentes</span>
                                            {func.atrasadas > 0 && <span style={{ color: '#ef4444' }}>{func.atrasadas} atrasadas</span>}
                                        </div>
                                    </div>
                                    <div className={styles.rankingScoreWrap}>
                                        <div
                                            className={styles.rankingScoreBarra}
                                            style={{
                                                width: `${func.taxa_pontualidade}%`,
                                                backgroundColor: func.score?.cor || '#6366f1'
                                            }}
                                        />
                                        <span className={styles.rankingScoreValor} style={{ color: func.score?.cor }}>
                                            {func.score?.valor ?? 0}pts
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* SEÇÃO 5: Distribuição de Carga */}
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle}><Target size={18} /> Distribuição de Carga</h2>
                    <p className={styles.cargaLegenda}>
                        <span style={{ color: '#10b981' }}>● Normal</span>
                        <span style={{ color: '#f59e0b' }}>● Alto</span>
                        <span style={{ color: '#ef4444' }}>● Crítico</span>
                        <span style={{ color: '#475569' }}>● Ocioso</span>
                    </p>
                    {loading ? (
                        [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
                    ) : carga.length === 0 ? (
                        <p className={styles.empty}>Nenhum funcionário encontrado.</p>
                    ) : (
                        <div className={styles.cargaLista}>
                            {carga.map((f) => {
                                const cor = nivelCorCarga[f.nivel] || '#475569';
                                return (
                                    <div key={f.funcionario_id} className={styles.cargaItem}>
                                        <div className={styles.cargaNome}>{f.nome}</div>
                                        <div className={styles.cargaBarraWrap}>
                                            <div
                                                className={styles.cargaBarra}
                                                style={{
                                                    width: `${Math.min(f.percentual, 100)}%`,
                                                    backgroundColor: cor,
                                                }}
                                            />
                                        </div>
                                        <span className={styles.cargaNum} style={{ color: cor }}>
                                            {f.tarefas_ativas}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ════════════════════════════════════════════════════════════
                QUINTA LINHA: Tarefas Vencidas
            ════════════════════════════════════════════════════════════ */}
            {!loading && prazos.vencidas?.length > 0 && (
                <section className={`${styles.section} ${styles.cardGlass}`}>
                    <h2 className={styles.sectionTitle} style={{ color: '#fca5a5' }}>
                        <AlertTriangle size={18} color="#ef4444" />
                        Tarefas com Prazo Vencido ({prazos.totais?.vencidas ?? 0})
                    </h2>
                    <div className={styles.tabelaWrap}>
                        <table className={styles.tabela}>
                            <thead>
                                <tr>
                                    <th>Tarefa</th>
                                    <th>Processo</th>
                                    <th>Cliente</th>
                                    <th>Prazo</th>
                                    <th>Responsáveis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prazos.vencidas.slice(0, 15).map((t) => (
                                    <tr key={t.tarefa_id} className={styles.rowVencida}>
                                        <td>{t.titulo}</td>
                                        <td className={styles.tdSecundario}>{t.processo}</td>
                                        <td className={styles.tdSecundario}>{t.cliente}</td>
                                        <td><span className={styles.badgeVencido}>{t.prazo}</span></td>
                                        <td className={styles.tdSecundario}>{t.responsaveis?.join(', ') || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* Modal de Detalhamento dos Indicadores */}
            <Modal 
                isOpen={!!activeModal} 
                onClose={() => setActiveModal(null)} 
                title={activeModal === 'PROCESSOS_RISCO' ? 'Detalhamento de Processos em Risco' : 'Detalhamento de Tarefas Atrasadas'}
                size="lg"
            >
                <div className={styles.modalListContainer}>
                    {activeModal === 'PROCESSOS_RISCO' && (gargalos.processos_atrasados?.length || gargalos.processos_parados?.length) ? (
                        <>
                            {gargalos.processos_atrasados?.map(g => (
                                <div key={`atraso-${g.processo_id}`} className={styles.modalListItem}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 600, color: '#f1f5f9'}}>{g.processo_nome}</div>
                                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>{g.cliente_nome}</div>
                                    </div>
                                    <div className={styles.badgeAtraso} style={{whiteSpace: 'nowrap'}}>{g.tarefas_atrasadas} tarefas atrasadas</div>
                                </div>
                            ))}
                            {gargalos.processos_parados?.map(p => (
                                <div key={`parado-${p.processo_id}`} className={styles.modalListItem}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 600, color: '#f1f5f9'}}>{p.processo_nome}</div>
                                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>{p.cliente_nome}</div>
                                    </div>
                                    <div className={styles.badgeDias} style={{
                                        backgroundColor: p.dias_parado >= 14 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                                        color: p.dias_parado >= 14 ? '#fca5a5' : '#fcd34d'
                                    }}>
                                        Parado há {p.dias_parado} dias
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : activeModal === 'TAREFAS_ATRASADAS' && prazos.vencidas?.length ? (
                        prazos.vencidas.map(t => (
                            <div key={t.tarefa_id} className={styles.modalListItem}>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 600, color: '#fca5a5'}}>{t.titulo}</div>
                                    <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>{t.processo} • {t.cliente}</div>
                                    <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '4px'}}>
                                        Resp: {t.responsaveis?.join(', ') || 'Equipe'}
                                    </div>
                                </div>
                                <div className={styles.badgeVencido} style={{alignSelf: 'flex-start'}}>{t.prazo}</div>
                            </div>
                        ))
                    ) : (
                        <div className={styles.empty}>Nenhum dado selecionado ou detalhe disponível para a competência.</div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ExecutiveDashboard;
