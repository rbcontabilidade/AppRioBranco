import React, { useMemo, useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { 
    AlertTriangle, 
    Clock, 
    Calendar, 
    CheckCircle2, 
    ChevronRight, 
    ExternalLink,
    Building2,
    Briefcase,
    Play,
    ChevronDown,
    ChevronUp,
    FileText,
    ClipboardList
} from 'lucide-react';

const isToday = (dateStr) => {
    if (!dateStr) return false;
    const [day, month, year] = dateStr.split('/').map(Number);
    const today = new Date();
    return (
        day === today.getDate() && 
        month === (today.getMonth() + 1) && 
        (year === today.getFullYear() || year === undefined)
    );
};

// Helper para agrupar array de tarefas por um campo
const groupBy = (array, key) => {
  return array.reduce((acc, obj) => {
    const val = obj[key] || 'Diversos';
    if (!acc[val]) acc[val] = [];
    acc[val].push(obj);
    return acc;
  }, {});
};

const FocusDashboardView = ({ tasks, onCompleteTask, isAdmin }) => {
    const [expandedGroups, setExpandedGroups] = useState(() => {
        const saved = localStorage.getItem('focusViewExpandedGroups');
        return saved ? JSON.parse(saved) : {};
    });

    React.useEffect(() => {
        localStorage.setItem('focusViewExpandedGroups', JSON.stringify(expandedGroups));
    }, [expandedGroups]);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    // Lógica de agrupamento multi-nível: Prioridade -> Processo
    const hierarchy = useMemo(() => {
        const sections = [
            { id: 'atrasadas', title: 'Atrasadas', icon: <AlertTriangle size={20} />, color: '#ef4444' },
            { id: 'hoje', title: 'Para Hoje', icon: <Clock size={20} />, color: '#f59e0b' },
            { id: 'proximas', title: 'Próximas Demandas', icon: <Calendar size={20} />, color: '#3b82f6' },
            { id: 'concluidas', title: 'Concluídas Recentemente', icon: <CheckCircle2 size={20} />, color: '#10b981' }
        ];

        const data = { atrasadas: [], hoje: [], proximas: [], concluidas: [] };

        tasks.forEach(t => {
            if (t.status === 'CONCLUIDA') data.concluidas.push(t);
            else if (t.atrasada) data.atrasadas.push(t);
            else if (isToday(t.due_date)) data.hoje.push(t);
            else data.proximas.push(t);
        });

        return sections.map(section => ({
            ...section,
            processes: groupBy(data[section.id], 'process_name'),
            totalCount: data[section.id].length
        })).filter(s => s.totalCount > 0);
    }, [tasks]);

    const renderTaskCard = (task, color) => (
        <div 
            key={task.id} 
            style={{ 
                padding: '12px 16px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s ease',
                cursor: 'default'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = `${color}40`;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
            }}
        >
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: '600' }}>{task.task_name}</h4>
                    {task.due_date && (
                        <span style={{ fontSize: '0.7rem', color: task.atrasada ? '#ef4444' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {task.due_date}
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={13} /> {task.client_name}
                    </span>
                    {task.drive_link && (
                        <a 
                            href={task.drive_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                        >
                            <ExternalLink size={13} /> Doc
                        </a>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {task.status !== 'CONCLUIDA' ? (
                    <Button 
                        variant="primary" 
                        onClick={() => onCompleteTask(task)} 
                        style={{ padding: '6px 16px', fontSize: '0.75rem', height: '32px', borderRadius: '8px' }}
                    >
                        <Play size={14} fill="currentColor" /> Executar
                    </Button>
                ) : (
                    <CheckCircle2 size={20} color="#10b981" />
                )}
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {hierarchy.length === 0 && (
                <GlassCard style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
                        <CheckCircle2 size={32} color="#10b981" />
                    </div>
                    <h2 style={{ color: 'white', marginBottom: '8px' }}>Nenhuma tarefa pendente</h2>
                    <p>Sua fila está limpa. Aproveite o momento para planejar seu próximo passo!</p>
                </GlassCard>
            )}

            {hierarchy.map(section => (
                <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Header de Seção (Urgência) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: `${section.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.color }}>
                            {section.icon}
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', margin: 0 }}>{section.title}</h2>
                        <div style={{ height: '1px', flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginLeft: '10px' }} />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.3)', padding: '2px 10px', borderRadius: '20px' }}>
                            {section.totalCount}
                        </span>
                    </div>

                    {/* Lista de Processos dentro da Urgência */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {Object.entries(section.processes).map(([processName, processTasks]) => {
                            const groupId = `${section.id}-${processName}`;
                            const isExpanded = expandedGroups[groupId] !== false;

                            return (
                                <GlassCard 
                                    key={processName}
                                    style={{ 
                                        padding: '0', 
                                        overflow: 'hidden', 
                                        border: '1px solid rgba(255,255,255,0.03)',
                                        backgroundColor: 'rgba(255,255,255,0.01)'
                                    }}
                                >
                                    {/* Header do Processo */}
                                    <div 
                                        onClick={() => toggleGroup(groupId)}
                                        style={{ 
                                            padding: '12px 16px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                            borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Briefcase size={16} color={section.color} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#cbd5e1' }}>{processName}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>• {processTasks.length} tarefas</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                                    </div>

                                    {/* Lista de Tarefas do Processo */}
                                    {isExpanded && (
                                        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {processTasks.map(task => renderTaskCard(task, section.color))}
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Dica de Eficiência */}
            <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                borderRadius: '12px', 
                backgroundColor: 'rgba(59, 130, 246, 0.05)', 
                border: '1px dashed rgba(59, 130, 246, 0.2)',
                display: 'flex',
                gap: '12px'
            }}>
                <div style={{ color: '#3b82f6' }}><ClipboardList size={20} /></div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                    <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Dica de Produtividade:</strong>
                    Tente concluir todas as tarefas de um mesmo <span style={{color: '#3b82f6'}}>Processo</span> antes de mudar para o próximo. Isso reduz a carga mental e evita a perda de foco na transição de contextos.
                </div>
            </div>
            
        </div>
    );
};

export default FocusDashboardView;
