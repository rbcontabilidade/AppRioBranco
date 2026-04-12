import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { 
    FileText, 
    Users, 
    Clock, 
    PlayCircle, 
    Lock, 
    ExternalLink, 
    CheckCircle2, 
    AlertTriangle,
    Search,
    ChevronRight,
    Filter
} from 'lucide-react';

const toId = (name) => name ? name.toString().replace(/[\s\W]+/g, '_') : '';

const MatrixDashboardView = ({ tasks, onCompleteTask, isAdmin }) => {
    // 1. Agrupar tarefas por processo (mesma lógica do Advanced)
    const processesData = useMemo(() => {
        const groups = {};
        tasks.forEach(t => {
            const pName = t.process_name || 'Sem Processo';
            if (!groups[pName]) {
                groups[pName] = { 
                    name: pName, 
                    tasks: [], 
                    clientCount: 0,
                    clients: new Set() 
                };
            }
            groups[pName].tasks.push(t);
            if (t.client_name) groups[pName].clients.add(t.client_name);
        });

        return Object.values(groups).map(p => ({
            ...p,
            clientCount: p.clients.size,
            progress: p.tasks.length > 0 ? Math.round((p.tasks.filter(t => t.status === 'CONCLUIDA').length / p.tasks.length) * 100) : 0
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [tasks]);

    const [selectedProcessName, setSelectedProcessName] = useState(() => {
        return localStorage.getItem('matrixViewProcess') || (processesData[0]?.name || null);
    });

    const [searchClient, setSearchClient] = useState('');

    useEffect(() => {
        if (selectedProcessName) {
            localStorage.setItem('matrixViewProcess', selectedProcessName);
        }
    }, [selectedProcessName]);

    const activeProcess = processesData.find(p => p.name === selectedProcessName);

    // 2. Montar a Matriz para o processo selecionado
    // Precisamos de: 
    // - Lista de todas as etapas únicas desse processo (colunas)
    // - Lista de clientes desse processo (linhas)
    const matrixData = useMemo(() => {
        if (!activeProcess) return { columns: [], rows: [] };

        // Colunas: Etapas únicas ordenadas por my_step_order
        const stepMap = {};
        activeProcess.tasks.forEach(t => {
            if (!stepMap[t.task_name]) {
                stepMap[t.task_name] = {
                    name: t.task_name,
                    order: t.my_step_order || 999
                };
            }
        });
        const columns = Object.values(stepMap).sort((a, b) => a.order - b.order);

        // Linhas: Clientes e suas respectivas tarefas mapeadas pelas colunas
        const clientGroups = {};
        activeProcess.tasks.forEach(t => {
            const cName = t.client_name || 'Sem Cliente';
            if (!clientGroups[cName]) {
                clientGroups[cName] = {
                    name: cName,
                    tasks: {},
                    drive_link: t.drive_link
                };
            }
            clientGroups[cName].tasks[t.task_name] = t;
        });

        const rows = Object.values(clientGroups)
            .filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { columns, rows };
    }, [activeProcess, searchClient]);

    const getStatusStyle = (task) => {
        if (!task) return { color: '#1e293b', border: 'rgba(255,255,255,0.05)', bg: 'transparent', icon: null };
        if (task.status === 'CONCLUIDA') return { color: '#10b981', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14} /> };
        if (task.status === 'BLOQUEADA') return { color: '#7c8db5', border: 'rgba(124,141,181,0.2)', bg: 'rgba(30,41,59,0.5)', icon: <Lock size={14} /> };
        if (task.status === 'EM ANDAMENTO') return { color: '#f59e0b', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.1)', icon: <PlayCircle size={14} /> };
        return { color: '#3b82f6', border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.05)', icon: <Clock size={14} /> };
    };

    if (processesData.length === 0) {
        return (
            <GlassCard style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Nenhum processo encontrado.
            </GlassCard>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '600px' }}>
            
            {/* BARRA DE SELEÇÃO DE PROCESSO E BUSCA */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700' }}>Selecionar Processo</div>
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
                        {processesData.map(p => (
                            <button
                                key={p.name}
                                onClick={() => setSelectedProcessName(p.name)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: selectedProcessName === p.name ? 'var(--primary-color)' : 'rgba(255,255,255,0.03)',
                                    color: 'white',
                                    border: selectedProcessName === p.name ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                {p.name} ({p.clientCount})
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ width: '250px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '700' }}>Filtrar Clientes</div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
                        <input 
                            type="text"
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            placeholder="Buscar cliente..."
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                borderRadius: '10px',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* AREA DA MATRIZ */}
            <GlassCard style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeProcess ? (
                    <div style={{ flex: 1, overflow: 'auto', position: 'relative' }} className="custom-scrollbar">
                        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
                            <thead>
                                <tr>
                                    {/* Canto superior esquerdo fixo */}
                                    <th style={{ 
                                        position: 'sticky', top: 0, left: 0, zIndex: 10,
                                        padding: '16px 20px', textAlign: 'left',
                                        backgroundColor: '#1a1f37', borderBottom: '2px solid rgba(255,255,255,0.1)',
                                        borderRight: '2px solid rgba(255,255,255,0.1)',
                                        minWidth: '240px', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase'
                                    }}>
                                        Clientes ({matrixData.rows.length})
                                    </th>
                                    
                                    {/* Cabeçalhos das etapas fixos no topo */}
                                    {matrixData.columns.map(col => (
                                        <th key={col.name} style={{ 
                                            position: 'sticky', top: 0, zIndex: 5,
                                            padding: '16px', textAlign: 'center',
                                            backgroundColor: '#1a1f37', borderBottom: '2px solid rgba(255,255,255,0.1)',
                                            minWidth: '160px', color: 'white', fontSize: '0.8rem', fontWeight: '700'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Etapa {col.order}</span>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={col.name}>
                                                    {col.name}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.rows.map((row, rowIndex) => (
                                    <tr key={row.name}>
                                        {/* Coluna de cliente fixa na esquerda */}
                                        <td style={{ 
                                            position: 'sticky', left: 0, zIndex: 5,
                                            padding: '12px 20px', 
                                            backgroundColor: rowIndex % 2 === 0 ? '#10152b' : '#141a33',
                                            borderRight: '2px solid rgba(255,255,255,0.1)',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            color: 'white', fontWeight: '600', fontSize: '0.85rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={row.name}>
                                                    {row.name}
                                                </span>
                                                {row.drive_link && (
                                                    <a href={row.drive_link} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981' }}>
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>

                                        {/* Células da matriz */}
                                        {matrixData.columns.map(col => {
                                            const task = row.tasks[col.name];
                                            const style = getStatusStyle(task);
                                            
                                            return (
                                                <td key={col.name} style={{ 
                                                    padding: '8px', 
                                                    textAlign: 'center',
                                                    backgroundColor: rowIndex % 2 === 0 ? '#10152b' : '#141a33',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    {task ? (
                                                        <button
                                                            onClick={() => (task.status !== 'BLOQUEADA' || isAdmin) && onCompleteTask(task)}
                                                            disabled={task.status === 'BLOQUEADA' && !isAdmin}
                                                            style={{
                                                                width: '100%',
                                                                height: '46px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '4px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${style.border}`,
                                                                backgroundColor: style.bg,
                                                                color: style.color,
                                                                cursor: (task.status === 'BLOQUEADA' && !isAdmin) ? 'not-allowed' : 'pointer',
                                                                transition: 'transform 0.1s ease',
                                                                opacity: (task.is_my_task === false && !isAdmin) ? 0.5 : 1
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (task.status !== 'BLOQUEADA' || isAdmin) e.currentTarget.style.transform = 'scale(1.03)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                            }}
                                                        >
                                                            {style.icon}
                                                            <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase' }}>
                                                                {task.status === 'CONCLUIDA' ? 'OK' : 
                                                                 task.status === 'BLOQUEADA' ? 'BLOCK' : 
                                                                 task.status === 'EM ANDAMENTO' ? 'WORK' : 'GO'}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <div style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b', gap: '12px' }}>
                        <Filter size={48} opacity={0.2} />
                        <span>Selecione um processo para visualizar a matriz de execução</span>
                    </div>
                )}
            </GlassCard>

            {/* LEGENDA */}
            <div style={{ display: 'flex', gap: '20px', padding: '10px 0', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.5)' }} /> Pendente
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.5)' }} /> Em Andamento
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(124,141,181,0.1)', border: '1px solid rgba(124,141,181,0.5)' }} /> Bloqueada
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.5)' }} /> Concluída
                </div>
            </div>
        </div>
    );
};

export default MatrixDashboardView;
