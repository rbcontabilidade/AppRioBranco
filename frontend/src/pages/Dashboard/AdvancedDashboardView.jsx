import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { FileText, Users, Clock, PlayCircle, Lock, ExternalLink, CheckCircle2 } from 'lucide-react';

const AdvancedDashboardView = ({ tasks, onCompleteTask, isAdmin }) => {
    // 1. Agrupar tarefas por processo
    const processesData = useMemo(() => {
        const groups = {};
        tasks.forEach(t => {
            const pName = t.process_name || 'Sem Processo';
            if (!groups[pName]) {
                groups[pName] = {
                    name: pName,
                    tasks: [],
                    totalClients: new Set(),
                };
            }
            groups[pName].tasks.push(t);
            if (t.client_name) groups[pName].totalClients.add(t.client_name);
        });

        return Object.values(groups).map(p => {
            const completed = p.tasks.filter(t => t.status === 'CONCLUIDA').length;
            const progress = p.tasks.length > 0 ? Math.round((completed / p.tasks.length) * 100) : 0;
            return {
                ...p,
                clientCount: p.totalClients.size,
                progress,
                completedTasks: completed,
                totalTasks: p.tasks.length
            };
        }).sort((a, b) => b.progress - a.progress);
    }, [tasks]);

    const [selectedProcessName, setSelectedProcessName] = useState(processesData[0]?.name || null);
    
    // Preserva a seleção de processo após refetch: só reseta se o processo anterior não existe mais
    React.useEffect(() => {
        if (processesData.length > 0) {
            const aindaExiste = processesData.some(p => p.name === selectedProcessName);
            if (!aindaExiste) {
                // Fallback seguro: usa o primeiro processo disponível
                setSelectedProcessName(processesData[0].name);
            }
            // Se ainda existe, mantém a seleção atual — não faz nada
        }
    }, [processesData]);

    const activeProcess = processesData.find(p => p.name === selectedProcessName);

    // 2. Agrupar tarefas do processo selecionado por cliente
    const clientsData = useMemo(() => {
        if (!activeProcess) return [];
        const cGroups = {};
        activeProcess.tasks.forEach(t => {
            const cName = t.client_name || 'Sem Cliente';
            if (!cGroups[cName]) {
                cGroups[cName] = {
                    name: cName,
                    tasks: []
                };
            }
            cGroups[cName].tasks.push(t);
        });

        return Object.values(cGroups).map(c => {
            const completed = c.tasks.filter(t => t.status === 'CONCLUIDA').length;
            const progress = c.tasks.length > 0 ? Math.round((completed / c.tasks.length) * 100) : 0;
            const currentTask = c.tasks.find(t => t.status !== 'CONCLUIDA') || c.tasks[c.tasks.length - 1];
            
            return {
                ...c,
                progress,
                currentTask,
                completedTasks: completed,
                totalTasks: c.tasks.length
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [activeProcess]);

    const [selectedClientName, setSelectedClientName] = useState(null);

    // Preserva o cliente selecionado após refetch: só reseta se o cliente anterior não existe mais
    React.useEffect(() => {
        if (clientsData.length > 0) {
            const aindaExiste = clientsData.some(c => c.name === selectedClientName);
            if (!aindaExiste) {
                // Fallback seguro: usa o primeiro cliente do processo
                setSelectedClientName(clientsData[0]?.name ?? null);
            }
            // Se ainda existe, mantém o cliente selecionado — não faz nada
        } else {
            // Processo não tem clientes — limpa a seleção
            setSelectedClientName(null);
        }
    }, [clientsData]);

    const activeClient = clientsData.find(c => c.name === selectedClientName);

    const getStatusInfo = (task) => {
        if (!task) return { icon: <Clock size={16} />, color: '#64748b', bg: 'rgba(0,0,0,0.1)', border: 'transparent', label: 'N/A' };
        if (task.status === 'CONCLUIDA') return { icon: <CheckCircle2 size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', label: 'Concluído' };
        if (task.status === 'BLOQUEADA') return { icon: <Lock size={16} />, color: '#7c8db5', bg: 'rgba(124,141,181,0.1)', border: 'rgba(124,141,181,0.2)', label: 'Bloqueado' };
        if (task.status === 'EM ANDAMENTO') return { icon: <PlayCircle size={16} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', label: 'Andamento' };
        return { icon: <Clock size={16} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'Pendente' };
    };

    if (processesData.length === 0) {
        return (
            <GlassCard style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Nenhum processo encontrado para os filtros atuais.
            </GlassCard>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '20px', minHeight: '600px', alignItems: 'stretch' }}>
            {/* PAINEL ESQUERDO: EXPLORADOR DE PROCESSOS */}
            <GlassCard style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="var(--primary-color)" />
                        Processos
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        {processesData.length} processos ativos
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }} className="custom-scrollbar">
                    {processesData.map(p => {
                        const isSelected = selectedProcessName === p.name;
                        return (
                            <div 
                                key={p.name}
                                onClick={() => setSelectedProcessName(p.name)}
                                style={{
                                    padding: '12px',
                                    borderRadius: '10px',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: isSelected ? '700' : '600', color: isSelected ? 'white' : 'var(--text-color)', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                        {p.name}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} /> {p.clientCount} Clientes
                                    </span>
                                    <span>{p.progress}%</span>
                                </div>
                                <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${p.progress}%`, backgroundColor: p.progress === 100 ? 'var(--success)' : 'var(--primary-color)', transition: 'width 0.5s ease' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlassCard>

            {/* PAINEL CENTRAL E DIREITO (FLEX CONTAINER) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
                
                {/* TOPO: RESUMO DO PROCESSO */}
                {activeProcess && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Progresso do Processo</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{activeProcess.progress}%</div>
                            <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                                <div style={{ height: '100%', width: `${activeProcess.progress}%`, backgroundColor: 'var(--primary-color)' }} />
                            </div>
                        </GlassCard>
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Total de Clientes</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{activeProcess.clientCount}</div>
                        </GlassCard>
                        <GlassCard style={{ padding: '16px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Tarefas Concluídas</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{activeProcess.completedTasks} <span style={{fontSize: '0.9rem', color: '#64748b'}}>/ {activeProcess.totalTasks}</span></div>
                        </GlassCard>
                    </div>
                )}

                {/* PAINEL INFERIOR DUPLO (CLIENTES + DETALHES DO CLIENTE) */}
                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                    
                    {/* LISTA DE CLIENTES DO PROCESSO */}
                    <GlassCard style={{ flex: 2, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Clientes em Execução</h3>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }} className="custom-scrollbar">
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 16px', fontWeight: '600' }}>Cliente</th>
                                        <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status Atual</th>
                                        <th style={{ padding: '12px 16px', fontWeight: '600' }}>Progresso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientsData.map(c => {
                                        const isSelected = selectedClientName === c.name;
                                        const statusObj = getStatusInfo(c.currentTask);
                                        return (
                                            <tr 
                                                key={c.name}
                                                onClick={() => setSelectedClientName(c.name)}
                                                style={{ 
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)')}
                                                onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                            >
                                                <td style={{ padding: '16px', fontWeight: isSelected ? '600' : '500', color: isSelected ? 'white' : 'var(--text-color)', fontSize: '0.9rem' }}>
                                                    {c.name}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: statusObj.color, backgroundColor: statusObj.bg, border: `1px solid ${statusObj.border}` }}>
                                                        {statusObj.icon}
                                                        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {c.currentTask?.task_name || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${c.progress}%`, backgroundColor: c.progress === 100 ? 'var(--success)' : 'var(--primary-color)' }} />
                                                        </div>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: '35px' }}>{c.progress}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>

                    {/* PAINEL DIREITO: DETALHES DO CLIENTE SELECIONADO / ATIVIDADES */}
                    <GlassCard style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minWidth: '320px' }}>
                        {activeClient ? (
                            <>
                                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0.2) 100%)' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Detalhes do Cliente</div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white', fontWeight: '700', wordBreak: 'break-word' }}>{activeClient.name}</h3>
                                    
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Concluídas</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success)' }}>{activeClient.completedTasks}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Pendentes/Total</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{activeClient.totalTasks - activeClient.completedTasks} <span style={{fontSize: '0.8rem', color: '#64748b'}}>/ {activeClient.totalTasks}</span></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }} className="custom-scrollbar">
                                    <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#94a3b8' }}>Linha do Tempo (Etapas)</h4>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
                                        {/* Linha conectora */}
                                        <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', backgroundColor: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
                                        
                                        {activeClient.tasks.slice().sort((a,b) => a.current_step_order - b.current_step_order).map((task, index) => {
                                            const statusObj = getStatusInfo(task);
                                            const isCompleted = task.status === 'CONCLUIDA';
                                            const isLocked = task.status === 'BLOQUEADA';
                                            const isNotMyTask = task.is_my_task === false;
                                            
                                            // Determina se eu posso fazer a tarefa
                                            let isButtonDisabled = false;
                                            if (isLocked) isButtonDisabled = true;
                                            if (isCompleted && !isAdmin) isButtonDisabled = true;
                                            if (isNotMyTask && !isAdmin) isButtonDisabled = true;
                                            
                                            return (
                                                <div key={task.step_id || index} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}>
                                                    <div style={{ 
                                                        width: '32px', height: '32px', borderRadius: '50%', 
                                                        backgroundColor: isCompleted ? 'rgba(16,185,129,0.2)' : 'rgba(30,41,59,1)',
                                                        border: `2px solid ${isCompleted ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                        color: isCompleted ? '#10b981' : '#64748b'
                                                    }}>
                                                        {isCompleted ? <CheckCircle2 size={16} /> : <span style={{fontSize: '0.8rem', fontWeight: 'bold'}}>{task.current_step_order}</span>}
                                                    </div>
                                                    
                                                    <div style={{ 
                                                        flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', 
                                                        borderRadius: '10px', padding: '12px',
                                                        opacity: isLocked ? 0.6 : 1
                                                    }}>
                                                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: isCompleted ? '#86efac' : 'white', marginBottom: '4px' }}>
                                                            {task.task_name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: statusObj.bg, color: statusObj.color, border: `1px solid ${statusObj.border}` }}>
                                                                {statusObj.label}
                                                            </span>
                                                            {task.due_date && (
                                                                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Clock size={10} /> {task.due_date}
                                                                </span>
                                                            )}
                                                            {isNotMyTask && !isAdmin && (
                                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Users size={10} /> {task.assigned_role || 'Equipe'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {(!isLocked && (!isNotMyTask || isAdmin)) && (
                                                            <Button 
                                                                variant={isCompleted ? 'secondary' : 'primary'}
                                                                style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%' }}
                                                                onClick={() => onCompleteTask(task)}
                                                                disabled={isButtonDisabled}
                                                            >
                                                                {isCompleted ? 'Reabrir' : 'Executar'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '20px', textAlign: 'center' }}>
                                Selecione um cliente para ver os detalhes
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};

export default AdvancedDashboardView;
