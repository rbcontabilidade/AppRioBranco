import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { 
    FileText, 
    Users, 
    Clock, 
    PlayCircle, 
    Lock, 
    CheckCircle2, 
    AlertTriangle,
    X,
    ChevronRight,
    Search
} from 'lucide-react';

const KanbanDashboardView = ({ tasks, onCompleteTask, isAdmin }) => {
    const [selectedProcessName, setSelectedProcessName] = useState(null);
    const [searchClient, setSearchClient] = useState('');

    // Agrupamento e classificação dos Processos
    const processesData = useMemo(() => {
        const groups = {};
        tasks.forEach(t => {
            const pName = t.process_name || 'Diversos';
            if (!groups[pName]) {
                groups[pName] = {
                    name: pName,
                    tasks: [],
                    totalClients: new Set(),
                    clientsMap: {}
                };
            }
            groups[pName].tasks.push(t);
            
            const cName = t.client_name || 'Sem Cliente';
            groups[pName].totalClients.add(cName);

            // Agrupa tarefas por cliente dentro do processo
            if (!groups[pName].clientsMap[cName]) {
                groups[pName].clientsMap[cName] = { name: cName, tasks: [] };
            }
            groups[pName].clientsMap[cName].tasks.push(t);
        });

        return Object.values(groups).map(p => {
            const totalTasks = p.tasks.length;
            const completedTasks = p.tasks.filter(t => t.status === 'CONCLUIDA').length;
            const blockedTasks = p.tasks.filter(t => t.status === 'BLOQUEADA').length;
            const inProgressTasks = p.tasks.filter(t => t.status === 'EM ANDAMENTO').length;
            const pendingTasks = p.tasks.filter(t => t.status === 'PENDENTE').length;

            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            // Definição do Estágio (Coluna do Kanban)
            let stage = 'PENDENTE'; // Default
            if (blockedTasks > 0) {
                stage = 'BLOQUEADO';
            } else if (completedTasks === totalTasks && totalTasks > 0) {
                stage = 'CONCLUIDO';
            } else if (inProgressTasks > 0 || completedTasks > 0) {
                stage = 'EM ANDAMENTO';
            }

            // Agrupar status atuais dos clientes do processo
            const clientStatuses = { concluido: 0, andamento: 0, bloqueado: 0, pendente: 0 };
            const clientsArray = Object.values(p.clientsMap).map(c => {
                const cCompleted = c.tasks.filter(t => t.status === 'CONCLUIDA').length;
                const cBlocked = c.tasks.filter(t => t.status === 'BLOQUEADA').length;
                const cTotal = c.tasks.length;
                
                let cStatus = 'pendente';
                if (cBlocked > 0) cStatus = 'bloqueado';
                else if (cCompleted === cTotal && cTotal > 0) cStatus = 'concluido';
                else if (cCompleted > 0 || c.tasks.some(t => t.status === 'EM ANDAMENTO')) cStatus = 'andamento';
                
                clientStatuses[cStatus]++;
                
                return {
                    ...c,
                    progress: cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0,
                    status: cStatus,
                    completedTasks: cCompleted,
                    totalTasks: cTotal,
                    currentTask: c.tasks.find(t => t.status !== 'CONCLUIDA') || c.tasks[c.tasks.length - 1]
                };
            }).sort((a,b) => a.name.localeCompare(b.name));

            return {
                ...p,
                clientCount: p.totalClients.size,
                progress,
                completedTasks,
                totalTasks,
                blockedTasks,
                stage,
                clientStatuses,
                clientsArray
            };
        });
    }, [tasks]);

    const activeProcess = processesData.find(p => p.name === selectedProcessName);

    // KANBAN COLUMNS SETUP
    const columns = [
        { id: 'PENDENTE', title: 'Pendente / Novo', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
        { id: 'EM ANDAMENTO', title: 'Em Andamento', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        { id: 'BLOQUEADO', title: 'Bloqueado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        { id: 'CONCLUIDO', title: 'Concluído', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
    ];

    const getStatusInfo = (taskstatus) => {
        if (!taskstatus) return { icon: <Clock size={14} />, color: '#64748b', bg: 'rgba(0,0,0,0.1)' };
        if (taskstatus === 'CONCLUIDA') return { icon: <CheckCircle2 size={14} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
        if (taskstatus === 'BLOQUEADA') return { icon: <Lock size={14} />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
        if (taskstatus === 'EM ANDAMENTO') return { icon: <PlayCircle size={14} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
        return { icon: <Clock size={14} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
    };

    return (
        <div style={{ position: 'relative', minHeight: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* KPI STRIP SUPERIOR */}
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }} className="custom-scrollbar">
                <GlassCard style={{ padding: '16px', minWidth: '150px', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Total de Processos</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{processesData.length}</div>
                </GlassCard>
                <GlassCard style={{ padding: '16px', minWidth: '150px', flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Total de Clientes</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{processesData.reduce((acc, p) => acc + p.clientCount, 0)}</div>
                </GlassCard>
                <GlassCard style={{ padding: '16px', minWidth: '150px', flex: 1, borderLeft: '3px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '8px' }}>Em Andamento</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{processesData.filter(p => p.stage === 'EM ANDAMENTO').length}</div>
                </GlassCard>
                <GlassCard style={{ padding: '16px', minWidth: '150px', flex: 1, borderLeft: '3px solid #ef4444' }}>
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>Bloqueados</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{processesData.filter(p => p.stage === 'BLOQUEADO').length}</div>
                </GlassCard>
            </div>

            {/* KANBAN BOARD PRINCIPAL */}
            <div style={{ 
                display: 'flex', 
                gap: '20px', 
                flex: 1, 
                overflowX: 'auto',
                paddingBottom: '20px',
                alignItems: 'flex-start'
            }} className="custom-scrollbar">
                
                {columns.map(col => {
                    const colProcesses = processesData.filter(p => p.stage === col.id);
                    const totalClientsInCol = colProcesses.reduce((acc, p) => acc + p.clientCount, 0);

                    return (
                        <div key={col.id} style={{
                            width: '320px',
                            minWidth: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            backgroundColor: 'rgba(0,0,0,0.15)',
                            borderRadius: '12px',
                            padding: '12px',
                            maxHeight: '100%',
                            height: 'max-content'
                        }}>
                            {/* COLUMN HEADER */}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                backgroundColor: col.bg,
                                borderRadius: '8px',
                                border: `1px solid ${col.color}30`
                            }}>
                                <div style={{ fontWeight: '600', color: col.color, fontSize: '0.9rem' }}>
                                    {col.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '12px' }}>
                                    {colProcesses.length}
                                </div>
                            </div>
                            
                            <div style={{ fontSize: '0.75rem', color: '#64748b', padding: '0 8px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{totalClientsInCol} clientes</span>
                            </div>

                            {/* COLUMN CARDS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                                {colProcesses.map(process => (
                                    <GlassCard 
                                        key={process.name}
                                        style={{ 
                                            padding: '16px', 
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        onClick={() => setSelectedProcessName(process.name)}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', color: 'white', wordBreak: 'break-word', paddingRight: '8px' }}>
                                                {process.name}
                                            </h4>
                                            {process.blockedTasks > 0 && (
                                                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={14} /> {process.clientCount} Clientes
                                            </span>
                                            <span style={{ fontWeight: '600', color: 'white' }}>{process.progress}%</span>
                                        </div>

                                        {/* Progress Bar */}
                                        <div style={{ height: '6px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                                            <div style={{ height: '100%', width: `${process.progress}%`, backgroundColor: process.progress === 100 ? '#10b981' : '#3b82f6', transition: 'width 0.3s ease' }} />
                                        </div>

                                        {/* Client Status Chips Grouped */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {process.clientStatuses.andamento > 0 && (
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                                                    {process.clientStatuses.andamento} andamento
                                                </span>
                                            )}
                                            {process.clientStatuses.bloqueado > 0 && (
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                                    {process.clientStatuses.bloqueado} bloqueado
                                                </span>
                                            )}
                                            {process.clientStatuses.pendente > 0 && (
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                                                    {process.clientStatuses.pendente} pendentes
                                                </span>
                                            )}
                                            {process.clientStatuses.concluido > 0 && (
                                                <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    {process.clientStatuses.concluido} concluídos
                                                </span>
                                            )}
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    );
                })}

            </div>

            {/* PROCESS DETAIL DRAWER (SLIDE-OVER) */}
            {activeProcess && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '60%',
                    minWidth: '400px',
                    maxWidth: '800px',
                    backgroundColor: '#0f172a',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 100,
                    animation: 'slideInRight 0.3s ease forwards',
                }}>
                    <style>
                        {`
                            @keyframes slideInRight {
                                from { transform: translateX(100%); }
                                to { transform: translateX(0); }
                            }
                        `}
                    </style>
                    
                    {/* DRAWER HEADER */}
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.05) 0%, transparent 100%)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={14} /> Detalhes do Processo
                                </div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'white', fontWeight: '700' }}>{activeProcess.name}</h2>
                            </div>
                            <button 
                                onClick={() => setSelectedProcessName(null)}
                                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Progresso</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{activeProcess.progress}%</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Total Clientes</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{activeProcess.clientCount}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Concluídas</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{activeProcess.completedTasks} <span style={{fontSize:'0.8rem', color:'#64748b'}}>/ {activeProcess.totalTasks}</span></div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Bloqueios</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: activeProcess.blockedTasks > 0 ? '#ef4444' : '#64748b' }}>{activeProcess.blockedTasks}</div>
                            </div>
                        </div>
                    </div>

                    {/* DRAWER CONTENT (TAB: CLIENTS LIST) */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={18} /> Administração de Clientes
                            </h3>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar cliente..." 
                                    value={searchClient}
                                    onChange={(e) => setSearchClient(e.target.value)}
                                    style={{
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '6px',
                                        padding: '6px 12px 6px 32px',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        width: '200px'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#0f172a', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Cliente</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Tarefa Atual</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '600' }}>Progresso</th>
                                        <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProcess.clientsArray
                                        .filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
                                        .map(c => {
                                        const cTask = c.currentTask;
                                        const taskInfo = getStatusInfo(cTask?.status);
                                        
                                        return (
                                        <tr key={c.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={{ padding: '16px 24px', fontWeight: '500', color: 'white', fontSize: '0.85rem' }}>
                                                {c.name}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                {cTask ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {cTask.task_name}
                                                        </span>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600', color: taskInfo.color, backgroundColor: taskInfo.bg, width: 'max-content' }}>
                                                            {taskInfo.icon} {cTask.status}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>N/A</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', width: '60px' }}>
                                                        <div style={{ height: '100%', width: `${c.progress}%`, backgroundColor: c.progress === 100 ? '#10b981' : '#3b82f6' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '30px' }}>{c.progress}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                                {cTask && cTask.status !== 'CONCLUIDA' && cTask.status !== 'BLOQUEADA' && (cTask.is_my_task || isAdmin) ? (
                                                    <Button 
                                                        variant="primary" 
                                                        style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onCompleteTask(cTask);
                                                        }}
                                                    >
                                                        Executar
                                                    </Button>
                                                ) : (
                                                    <Button variant="secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', opacity: 0.5, pointerEvents: 'none' }}>
                                                        {cTask?.status === 'CONCLUIDA' ? 'Concluído' : cTask?.status === 'BLOQUEADA' ? 'Bloqueado' : 'Aguardando'}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                            {activeProcess.clientsArray.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                                    Nenhum cliente nesse processo.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* OVERLAY PARA FECHAR O O DRAWER SE CLICAR FORA */}
            {activeProcess && (
                <div 
                    onClick={() => setSelectedProcessName(null)}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90 }} 
                />
            )}
            
        </div>
    );
};

export default KanbanDashboardView;
