import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import KpiCard from '../../components/ui/KpiCard/KpiCard';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { FileText, CheckCircle, CheckCircle2, PlayCircle, ChevronRight, Clock, AlertTriangle, Lock, Play, UserCheck, Calendar, ListTodo, FastForward, ChevronDown, ChevronUp, Users, ExternalLink, Search, LayoutGrid, LayoutList, Rows, Columns } from 'lucide-react';
import Modal from '../../components/ui/Modal/Modal';
import { api, processService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AdvancedDashboardView from './AdvancedDashboardView';
import KanbanDashboardView from './KanbanDashboardView';

const Dashboard = () => {
    const { profile, isAdmin } = useAuth(); // Alterado de user para profile e usamos a variável centralizada isAdmin
    const [kpis, setKpis] = useState({
        total: 0,
        concluidos: 0,
        pendentes: 0,
        emAndamento: 0,
        atrasados: 0
    });

    const [tasks, setTasks] = useState([]);
    // const [loading, setLoading] = useState(true); // Removido, agora usando isLoading: loading do react-query
    const [isCompletingId, setIsCompletingId] = useState(null);
    const [error, setError] = useState(null);

    // Estados para o Accordion de Processos e Clientes (Carregando do localStorage se existir)
    const [expandedProcesses, setExpandedProcesses] = useState(() => {
        const saved = localStorage.getItem('expandedProcesses');
        return saved ? JSON.parse(saved) : {};
    });
    const [expandedClients, setExpandedClients] = useState(() => {
        const saved = localStorage.getItem('expandedClients');
        return saved ? JSON.parse(saved) : {};
    });

    // Novos estados para UX e Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS'); // TODOS, PENDENTES, CONCLUIDAS
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('viewMode') || 'normal';
    });

    // Novos estados para Competência e Checklists
    const [competencia, setCompetencia] = useState(null);
    const [isVirandoCompetencia, setIsVirandoCompetencia] = useState(false);

    const [checklistModalOpen, setChecklistModalOpen] = useState(false);
    const [currentTaskForChecklist, setCurrentTaskForChecklist] = useState(null);
    const [checklists, setChecklists] = useState([]);
    const [loadingChecklists, setLoadingChecklists] = useState(false);

    // Novo estado do Modal de Sucesso Customizado
    const [successModalOpen, setSuccessModalOpen] = useState(false);
    const [successModalMessage, setSuccessModalMessage] = useState('');

    // Estado para anotação da tarefa no momento do checklist
    const [anotacaoTarefa, setAnotacaoTarefa] = useState('');

    // Filtros de Dashboard
    const [competencias, setCompetencias] = useState([]);
    const [selectedComp, setSelectedComp] = useState('');
    const [funcionarios, setFuncionarios] = useState([]);
    const [selectedFunc, setSelectedFunc] = useState('');

    useEffect(() => {
        const loadCompetencias = async () => {
            try {
                const res = await api.get('/meses');
                setCompetencias(res.data);
                const active = res.data.find(c => c.status === 'ABERTA' || c.status === 'Open' || c.status === 'Aberto');
                if (active) setSelectedComp(active.id);
            } catch (err) {
                console.error("Erro ao buscar competências:", err);
            }
        };

        const loadFuncionarios = async () => {
            if (isAdmin) {
                try {
                    const res = await api.get('/employees');
                    setFuncionarios(res.data || []);
                } catch (err) {
                    console.error("Erro ao buscar funcionários:", err);
                }
            }
        };

        loadCompetencias();
        loadFuncionarios();
    }, [isAdmin]);

    // Utilizando React Query para cache, paginação virtual e eliminação do OOM na hidratação
    const { data: dashboardData, isLoading: loading, error: queryError, refetch: fetchDashboardData } = useQuery({
        queryKey: ['dashboard', selectedComp, isAdmin ? selectedFunc : profile?.id],
        queryFn: async () => {
            const fetchWithTimeout = (promise, ms = 8000) => {
                let timer = null;
                const timeout = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
                });
                return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
            };

            const tasksPromise = processService.getAllTasks(selectedComp, isAdmin ? selectedFunc : profile?.id);

            const [kpisResponse, tasksResponse, compResponse] = await fetchWithTimeout(
                Promise.all([
                    api.get('/performance/dashboard-kpis', {
                        params: {
                            competencia_id: selectedComp,
                            funcionario_id: isAdmin ? selectedFunc : profile?.id,
                            global_view: isAdmin
                        }
                    }).catch(() => ({ data: {} })),
                    tasksPromise,
                    processService.getCompetenciaAtiva()
                ]), 10000
            );

            let kpisObj = { total: 0, concluidos: 0, pendentes: 0, emAndamento: 0, atrasados: 0 };
            let tasksList = [];
            
            if (tasksResponse.data) {
                tasksList = tasksResponse.data;
                const total = tasksList.length;
                const concluidas = tasksList.filter(t => t.status === 'CONCLUIDA').length;
                const emAndamento = tasksList.filter(t => t.status === 'EM ANDAMENTO').length;
                const pendentes = tasksList.filter(t => t.status === 'PENDENTE').length;

                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);

                const atrasadas = tasksList.filter(t => {
                    if (t.status === 'CONCLUIDA' || !t.due_date) return false;
                    const parts = t.due_date.split('/');
                    let date;
                    if (parts.length === 2) {
                        date = new Date(hoje.getFullYear(), parts[1] - 1, parts[0]);
                    } else if (parts.length === 3) {
                        date = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        return false;
                    }
                    return date < hoje;
                }).length;

                kpisObj = { total, concluidos: concluidas, pendentes, emAndamento, atrasados: atrasadas };
            }

            return {
                tasks: tasksList,
                kpis: kpisObj,
                competencia: compResponse || null,
            };
        },
        enabled: !!selectedComp // O query só dispara se já sabemos a competência
    });

    const errorToDisplay = error || (queryError ? "Falha na conexão ou Timeout. Tente novamente." : null);

    // Mapeamos de volta para manter compatibilidade com o resto do código da view
    useEffect(() => {
        if (dashboardData) {
            setTasks(dashboardData.tasks);
            setKpis(dashboardData.kpis);
            setCompetencia(dashboardData.competencia);
        }
    }, [dashboardData]);

    // Persistindo estados de expansão no localStorage
    useEffect(() => {
        localStorage.setItem('expandedProcesses', JSON.stringify(expandedProcesses));
    }, [expandedProcesses]);

    useEffect(() => {
        localStorage.setItem('expandedClients', JSON.stringify(expandedClients));
    }, [expandedClients]);

    // Persistência do viewMode já é feita no onClick dos botões de modo

    // Metodo de Conclusão da Tarefa
    const handleOpenChecklistModal = async (task) => {
        setCurrentTaskForChecklist(task);
        setAnotacaoTarefa(task.anotacao || ''); // carrega anotação anterior se existir (caso estivesse salvo previamente e pendente)
        setChecklistModalOpen(true);
        setLoadingChecklists(true);
        setChecklists([]);

        try {
            const data = await processService.getTaskChecklists(task.step_id);
            setChecklists(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingChecklists(false);
        }
    };

    const handleToggleChecklist = async (checklistId, currentStatus) => {
        try {
            // Optimistic update
            setChecklists(prev => prev.map(c => c.id === checklistId ? { ...c, is_checked: !currentStatus } : c));
            await processService.toggleChecklist(checklistId, !currentStatus);
        } catch (err) {
            console.error(err);
            // Revert on error
            setChecklists(prev => prev.map(c => c.id === checklistId ? { ...c, is_checked: currentStatus } : c));
            alert("Erro ao marcar checklist");
        }
    };

    // Função para salvar somente a anotação sem mudar o status da tarefa
    const handleSaveAnotacao = async () => {
        const task = currentTaskForChecklist;
        if (!task) return;
        if (!anotacaoTarefa.trim()) return;
        try {
            setIsCompletingId('anotacao');
            await processService.completeTask(task.step_id, task.my_step_order, anotacaoTarefa, task.status);
            await fetchDashboardData();
            setSuccessModalMessage('Anotação salva com sucesso e compartilhada com toda a equipe!');
            setSuccessModalOpen(true);
        } catch (err) {
            console.error(err);
            setSuccessModalMessage('Erro ao salvar anotação. Tente novamente.');
            setSuccessModalOpen(true);
        } finally {
            setIsCompletingId(null);
        }
    };

    const handleCompleteTaskFromModal = async () => {
        const task = currentTaskForChecklist;
        if (!task) return;

        try {
            setIsCompletingId(task.step_id);

            // Determina se a tarefa será CONCLUIDA ou ficará EM ANDAMENTO
            const allChecked = checklists.length === 0 || checklists.every(c => c.is_checked);
            const finalStatus = allChecked ? 'CONCLUIDA' : 'EM ANDAMENTO';

            // Envia step_id como taskId, e a anotação no payload
            await processService.completeTask(task.step_id, task.my_step_order, anotacaoTarefa, finalStatus);

            // Recarrega os dados da tela
            await fetchDashboardData();

            setChecklistModalOpen(false);

            if (finalStatus === 'CONCLUIDA') {
                setSuccessModalMessage(`A etapa "${task.task_name}" do cliente ${task.client_name} foi concluída com sucesso!`);
                setSuccessModalOpen(true);
                // UX: Colapsar cliente automaticamente ao concluir
                const groupKey = `${task.process_name}-${task.client_name}`;
                setExpandedClients(prev => ({ ...prev, [groupKey]: false }));
            } else {
                // Mensagem elegante para "Em Andamento" (sem alert do navegador)
                setChecklistModalOpen(false);
                setSuccessModalMessage('Progresso salvo! A tarefa continua em andamento até o checklist ser finalizado.');
                setSuccessModalOpen(true);
            }

        } catch (err) {
            console.error(err);
            setSuccessModalMessage('Não foi possível salvar o progresso. Tente novamente.');
            setSuccessModalOpen(true);
        } finally {
            setIsCompletingId(null);
        }
    };

    const handleCompleteTask = async (task) => {
        // Redireciona o fluxo antigo para o modal de checklist (se for ativo)
        if (task.status !== 'CONCLUIDA' || isAdmin) {
            handleOpenChecklistModal(task);
        }
    };

    // Ação Principal ao clicar no Botão da Tarefa


    const handleVirarCompetencia = async () => {
        if (!competencia) return;
        const confirm = window.confirm("Deseja fechar a competência atual e gerar as tarefas do próximo mês?");
        if (!confirm) return;

        try {
            setIsVirandoCompetencia(true);

            // Tenta adivinhar proximo mes (1 a 12)
            let proximoMes = competencia.mes + 1;
            let proximoAno = competencia.ano;
            if (proximoMes > 12) {
                proximoMes = 1;
                proximoAno += 1;
            }

            await processService.fecharCompetencia(competencia.id);
            await processService.gerarNovaCompetencia(proximoMes, proximoAno);

            await fetchDashboardData();
            alert("Nova competência gerada com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao virar competência.");
        } finally {
            setIsVirandoCompetencia(false);
        }
    };

    // Função auxiliar para renderizar o Card da Tarefa
    const renderTaskCard = (task) => {
        const { current_step_order, total_steps = 1, execution_id, step_id, process_name, due_date, drive_link } = task;

        // Determinar o status real consumindo do backend
        const isCompleted = task.status === 'CONCLUIDA';
        const isLocked = task.status === 'BLOQUEADA';
        const isInProgress = task.status === 'EM ANDAMENTO';
        const isNotMyTask = task.is_my_task === false;
        const isActive = task.status === 'PENDENTE' || isInProgress;

        const TaskProgressBar = () => (
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '12px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%',
                    width: `${(current_step_order / total_steps) * 100}%`,
                    backgroundColor: isCompleted ? 'var(--success)' : (isLocked ? '#475569' : 'var(--primary-color)'),
                    transition: 'width 0.5s ease'
                }} />
            </div>
        );

        if (viewMode === 'compact') {
            return (
                <div key={step_id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    backgroundColor: isLocked
                        ? 'rgba(30, 41, 70, 0.55)'
                        : isCompleted
                            ? 'rgba(16, 60, 40, 0.55)'
                            : isInProgress
                                ? 'rgba(60, 40, 10, 0.45)'
                                : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px',
                    border: isLocked
                        ? '1px solid rgba(74, 85, 120, 0.4)'
                        : isCompleted
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : isInProgress
                                ? '1px solid rgba(245, 158, 11, 0.3)'
                                : '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s ease',
                    cursor: (isLocked || (isNotMyTask && !isAdmin)) ? 'default' : 'pointer'
                }}
                    onClick={() => !isLocked && (!isNotMyTask || isAdmin) && handleCompleteTask(task)}
                >
                    {/* Ícone de Status colorido */}
                    <div style={{
                        padding: '6px',
                        backgroundColor: isLocked
                            ? 'rgba(124, 141, 181, 0.15)'
                            : isCompleted
                                ? 'rgba(16, 185, 129, 0.15)'
                                : isInProgress
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(59, 130, 246, 0.15)',
                        borderRadius: '50%',
                        display: 'flex',
                        flexShrink: 0
                    }}>
                        {isCompleted
                            ? <CheckCircle2 size={16} color="var(--success)" />
                            : isLocked
                                ? <Lock size={16} color="#7c8db5" />
                                : isInProgress
                                    ? <PlayCircle size={16} color="var(--warning)" />
                                    : <PlayCircle size={16} color="var(--primary-color)" />
                        }
                    </div>

                    {/* Nome da tarefa e cliente */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: isLocked ? '#a0aec0' : isCompleted ? '#86efac' : 'var(--text-main)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {task.task_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                fontSize: '0.72rem',
                                color: isLocked ? '#8a9cc4' : isCompleted ? '#6ee7b7' : '#94a3b8',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {task.client_name}
                            </span>
                            {isNotMyTask && !isAdmin && (
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8', border: '1px solid #334155', padding: '1px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <Users size={10} />
                                    {task.assigned_role || 'Equipe'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Indicadores: Data + Drive + Badge de status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {due_date && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', color: isLocked ? '#7c8db5' : '#64748b', whiteSpace: 'nowrap' }}>
                                <Clock size={12} />
                                {due_date}
                            </div>
                        )}
                        {drive_link && (
                            <a href={drive_link} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                style={{ display: 'flex', color: 'var(--primary-color)' }} title="Abrir Drive">
                                <ExternalLink size={13} />
                            </a>
                        )}
                        <div style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            backgroundColor: isCompleted
                                ? 'rgba(16, 185, 129, 0.2)'
                                : isLocked
                                    ? 'rgba(74, 85, 120, 0.3)'
                                    : isInProgress
                                        ? 'rgba(245, 158, 11, 0.2)'
                                        : 'rgba(59, 130, 246, 0.15)',
                            color: isCompleted
                                ? '#6ee7b7'
                                : isLocked
                                    ? '#7c8db5'
                                    : isInProgress
                                        ? 'var(--warning)'
                                        : 'var(--primary-color)',
                            border: isCompleted
                                ? '1px solid rgba(16,185,129,0.3)'
                                : isLocked
                                    ? '1px solid rgba(74,85,120,0.3)'
                                    : isInProgress
                                        ? '1px solid rgba(245,158,11,0.3)'
                                        : '1px solid rgba(59,130,246,0.2)',
                            whiteSpace: 'nowrap'
                        }}>
                            {isCompleted ? '✓ Concluído' : isLocked ? '🔒 Bloqueado' : isInProgress ? '▶ Andamento' : '● Pendente'}
                        </div>
                    </div>
                </div>
            );
        }


        let statusColor = 'text-blue-600 bg-blue-50';
        let statusIcon = <Clock size={20} color="var(--primary-color, #3b82f6)" />;
        let statusLabel = 'Pendente';
        let cardStyle = { borderLeft: '4px solid var(--primary-color, #3b82f6)' };
        let isButtonDisabled = false;

        if (isLocked) {
            statusIcon = <Lock size={20} color="#7c8db5" />;
            statusLabel = 'Bloqueado';
            cardStyle = {
                borderLeft: '4px solid #4a5578',
                cursor: 'not-allowed',
                background: 'rgba(30, 41, 70, 0.55)',
                backdropFilter: 'blur(8px)'
            };
            isButtonDisabled = true;
        } else if (isCompleted) {
            statusIcon = <CheckCircle2 size={20} color="var(--success)" />;
            statusLabel = 'Concluído';
            statusColor = 'text-emerald-300 bg-emerald-900';
            cardStyle = {
                borderLeft: '4px solid var(--success)',
                background: 'rgba(16, 60, 40, 0.55)',
                backdropFilter: 'blur(8px)'
            };
            isButtonDisabled = !isAdmin; // Admin pode reabrir
        } else if (isInProgress) {
            statusIcon = <PlayCircle size={20} className="text-amber-500" />;
            statusLabel = 'Em Andamento';
            statusColor = 'text-amber-700 bg-amber-50';
            cardStyle = {
                borderLeft: '4px solid var(--warning)',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
            };
        }

        if (isNotMyTask && !isAdmin) {
            isButtonDisabled = true;
            if (!isCompleted && !isLocked) {
                statusLabel = task.assigned_role || 'Equipe';
                statusColor = 'text-slate-500 bg-slate-50';
                statusIcon = <Users size={20} className="text-slate-400" />;
            }
        }

        // Lógica de cálculo de progresso
        const completedSteps = isCompleted ? total_steps : Math.max(0, current_step_order - 1);
        const progressPercent = Math.min(100, Math.round((completedSteps / total_steps) * 100));

        const DetailedProgressBar = () => (
            <div style={{ marginTop: '4px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
                    <span>Progresso do Processo</span>
                    <span>{progressPercent}% ({completedSteps}/{total_steps})</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: isCompleted ? 'var(--success)' : 'var(--primary-color, #3b82f6)',
                        transition: 'width 0.5s ease-in-out',
                        boxShadow: isCompleted ? 'none' : '0 0 8px rgba(59, 130, 246, 0.5)'
                    }}></div>
                </div>
            </div>
        );

        return (
            <GlassCard key={`${execution_id}-${step_id}`} style={{
                ...cardStyle,
                marginBottom: viewMode === 'compact' ? '4px' : '12px',
                padding: viewMode === 'compact' ? '8px 12px' : '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: viewMode === 'compact' ? '4px' : '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: viewMode === 'grid' ? 'column' : 'row',
                    alignItems: viewMode === 'grid' ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: viewMode === 'grid' ? '10px' : '12px',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div style={{
                            padding: '8px',
                            backgroundColor: isLocked ? 'rgba(148, 163, 184, 0.1)' : isCompleted ? 'rgba(16, 185, 129, 0.1)' : (isInProgress ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)'),
                            borderRadius: '50%',
                            display: 'flex',
                            flexShrink: 0
                        }}>
                            {isInProgress ? <Clock size={20} color="var(--warning)" /> : statusIcon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 'bold', color: isLocked ? '#a0aec0' : isCompleted ? '#86efac' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {task.task_name}
                                </span>
                                {due_date && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        color: 'var(--primary-color, #3b82f6)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {due_date}
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: isLocked ? '#8a9cc4' : isCompleted ? '#6ee7b7' : '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-color)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.client_name}</span>
                                {isNotMyTask && !isAdmin && (
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} />
                                        De: {task.assigned_role || 'Equipe'}
                                    </span>
                                )}
                                {drive_link && (
                                    <a href={drive_link} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', color: 'var(--primary-color, #3b82f6)' }} title="Abrir Google Drive">
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                                {viewMode !== 'grid' && <span style={{ color: '#94a3b8' }}>|</span>}
                                {viewMode !== 'grid' && <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{process_name}</span>}
                            </div>
                        </div>
                    </div>

                    <div style={{ width: viewMode === 'grid' ? '100%' : 'auto' }}>
                        <Button
                            variant={isLocked || (isNotMyTask && !isAdmin && !isCompleted) ? "secondary" : "primary"}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task);
                            }}
                            disabled={isButtonDisabled || isCompletingId === step_id}
                            style={{ padding: '8px 16px', width: viewMode === 'grid' ? '100%' : '140px' }}
                        >
                            {isCompletingId === step_id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>...</span>
                                </div>
                            ) : isLocked ? (
                                <>
                                    <Lock size={16} style={{ marginRight: '6px' }} />
                                    Bloqueado
                                </>
                            ) : isNotMyTask && !isAdmin ? (
                                <>
                                    <Users size={16} style={{ marginRight: '6px' }} />
                                    {task.assigned_role || 'Equipe'}
                                </>
                            ) : (
                                <>
                                    {isInProgress ? <PlayCircle size={16} style={{ marginRight: '6px' }} /> : <ChevronRight size={16} style={{ marginRight: '6px' }} />}
                                    {isInProgress ? 'Continuar' : 'Executar'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
                {!isLocked && <DetailedProgressBar />}
                {isLocked && task.previous_routine_name && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Depende de: {task.previous_routine_name}
                    </div>
                )}
            </GlassCard>
        );
    };

    return (
        <div className="view-section active">
            <header className="section-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '0 4px'
            }}>
                <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em' }}>Atividades</h1>

                {competencia && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 16px', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)',
                        color: 'var(--primary-color, #3b82f6)', fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}>
                        <Calendar size={18} />
                        <span>{String(competencia.mes).padStart(2, '0')}/{competencia.ano}</span>
                    </div>
                )}
            </header>


            {/* Tratamento Discreto de Erro (Toast-like local) */}
            {errorToDisplay && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '4px solid var(--danger)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '0 8px 8px 0',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertTriangle color="var(--danger)" size={20} />
                    <span>{errorToDisplay}</span>
                </div>
            )
            }

            {/* Estado de Carregamento Físico */}
            {
                loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
                        <div className="spinner-container">
                            <div className="loading-spinner"></div>
                            <div className="loading-spinner-inner"></div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="kpi-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem'
                        }}>
                            <KpiCard
                                title="Total"
                                value={kpis.total}
                                icon={<FileText size={20} />}
                                status="info"
                            />
                            <KpiCard
                                title="Concluídos"
                                value={kpis.concluidos}
                                icon={<CheckCircle size={20} />}
                                status="success"
                            />
                            <KpiCard
                                title="Em Andamento"
                                value={kpis.emAndamento}
                                icon={<Play size={20} />}
                                status="info"
                            />
                            <KpiCard
                                title="Pendentes"
                                value={kpis.pendentes}
                                icon={<Clock size={20} />}
                                status="warning"
                            />
                            <KpiCard
                                title="Em Atraso"
                                value={kpis.atrasados}
                                icon={<AlertTriangle size={20} />}
                                status="danger"
                            />
                        </div>

                        {/* Barra de Filtros e Busca - Abaixo dos KPIs */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1.5rem',
                            marginBottom: '2rem',
                            padding: '20px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flex: '1', minWidth: '300px' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1', maxWidth: '450px' }}>
                                    <input
                                        type="text"
                                        placeholder="Buscar cliente, processo ou tarefa..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            padding: '12px 16px',
                                            paddingLeft: '44px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            color: 'white',
                                            width: '100%',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onFocus={(e) => e.target.style.border = '1px solid var(--primary-color)'}
                                        onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
                                    />
                                    <Search size={18} color="#64748b" style={{ position: 'absolute', left: '16px' }} />
                                </div>

                                <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '10px' }}>
                                    {['TODOS', 'PENDENTES', 'CONCLUIDAS'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setStatusFilter(s)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                backgroundColor: statusFilter === s ? 'var(--primary-color)' : 'transparent',
                                                color: statusFilter === s ? 'white' : '#64748b',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {s === 'TODOS' ? 'Todos' : (s === 'PENDENTES' ? 'Pendentes' : 'Concluídas')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '2px',
                                    padding: '4px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {[
                                        { id: 'normal', icon: <Rows size={16} />, label: 'Lista' },
                                        { id: 'compact', icon: <LayoutList size={16} />, label: 'Compacto' },
                                        { id: 'grid', icon: <LayoutGrid size={16} />, label: 'Grade' },
                                        { id: 'advanced', icon: <Columns size={16} />, label: 'Avançado' },
                                        { id: 'kanban', icon: <LayoutList size={16} style={{transform: 'rotate(90deg)'}} />, label: 'Kanban' }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => {
                                                setViewMode(mode.id);
                                                localStorage.setItem('viewMode', mode.id);
                                            }}
                                            title={mode.label}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                backgroundColor: viewMode === mode.id ? 'var(--primary-color)' : 'transparent',
                                                color: 'white',
                                                opacity: viewMode === mode.id ? 1 : 0.6,
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {mode.icon}
                                            <span className="hide-mobile">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.1)' }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Competência:</span>
                                    <select
                                        value={selectedComp}
                                        onChange={(e) => setSelectedComp(e.target.value)}
                                        style={{
                                            padding: '10px 14px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            color: 'white',
                                            fontSize: '0.85rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Todas</option>
                                        {competencias.map(c => (
                                            <option key={c.id} value={c.id} style={{ color: 'black' }}>{String(c.mes).padStart(2, '0')}/{c.ano}</option>
                                        ))}
                                    </select>
                                </div>

                                {isAdmin && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Funcionário:</span>
                                        <select
                                            value={selectedFunc}
                                            onChange={(e) => setSelectedFunc(e.target.value)}
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                backgroundColor: 'rgba(0,0,0,0.2)',
                                                color: 'white',
                                                fontSize: '0.85rem',
                                                outline: 'none'
                                            }}
                                        >
                                            <option value="" style={{ color: 'black' }}>Todos</option>
                                            {funcionarios.map(f => (
                                                <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nome}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {isAdmin && (
                                    <Button
                                        variant="primary"
                                        onClick={handleVirarCompetencia}
                                        disabled={isVirandoCompetencia}
                                        style={{ padding: '10px 20px', borderRadius: '12px' }}
                                    >
                                        <FastForward size={16} />
                                        Virar Mês
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {tasks.length > 0 ? (() => {
                                    // APLICAR FILTROS DE BUSCA E STATUS
                                    const filteredTasks = tasks.filter(t => {
                                        const matchesSearch =
                                            t.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            t.process_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            t.task_name?.toLowerCase().includes(searchTerm.toLowerCase());

                                        const matchesStatus =
                                            statusFilter === 'TODOS' ||
                                            (statusFilter === 'PENDENTES' && t.status !== 'CONCLUIDA') ||
                                            (statusFilter === 'CONCLUIDAS' && t.status === 'CONCLUIDA');

                                        return matchesSearch && matchesStatus;
                                    });

                                    if (filteredTasks.length === 0) {
                                        return (
                                            <GlassCard style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                                                Nenhuma tarefa corresponde à busca ou filtro de status.
                                            </GlassCard>
                                        );
                                    }

                                    if (viewMode === 'advanced') {
                                        return <AdvancedDashboardView tasks={filteredTasks} onCompleteTask={handleCompleteTask} isAdmin={isAdmin} />;
                                    }
                                    
                                    if (viewMode === 'kanban') {
                                        return <KanbanDashboardView tasks={filteredTasks} onCompleteTask={handleCompleteTask} isAdmin={isAdmin} />;
                                    }

                                    // 1. Agrupar por NOME DO PROCESSO (Nível 1)
                                    const groupedByProcessName = filteredTasks.reduce((acc, task) => {
                                        const name = task.process_name || 'Sem Processo';
                                        if (!acc[name]) acc[name] = [];
                                        acc[name].push(task);
                                        return acc;
                                    }, {});

                                    return Object.entries(groupedByProcessName).map(([processName, allProcessTasks]) => {
                                        const isProcessExpanded = expandedProcesses[processName] !== false;

                                        // Cálculo de progresso do Processo (Média de todos os clientes/execuções)
                                        const totalTasks = allProcessTasks.length;
                                        const completedTasks = allProcessTasks.filter(t => t.status === 'CONCLUIDA').length;
                                        const processProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                                        return (
                                            <div key={processName} style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: '16px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                overflow: 'hidden',
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                                            }}>
                                                {/* Header do Processo (Nível 1) */}
                                                <div
                                                    onClick={() => setExpandedProcesses(prev => ({ ...prev, [processName]: !isProcessExpanded }))}
                                                    style={{
                                                        padding: '20px',
                                                        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0.2) 100%)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                                        <div style={{
                                                            width: '40px', height: '40px',
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            borderRadius: '10px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <FileText size={22} color="var(--primary-color, #3b82f6)" />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-color)' }}>{processName}</h3>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                                                <div style={{ height: '6px', width: '100px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${processProgress}%`, backgroundColor: 'var(--primary-color, #3b82f6)', transition: 'width 0.5s ease' }} />
                                                                </div>
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '500' }}>{processProgress}% Global</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>{allProcessTasks.length} Etapas</span>
                                                        {isProcessExpanded ? <ChevronUp size={24} color="#64748b" /> : <ChevronDown size={24} color="#64748b" />}
                                                    </div>
                                                </div>

                                                {/* Corpo do Processo (Nível 2: Clientes) */}
                                                {isProcessExpanded && (
                                                    <div style={{
                                                        padding: '20px',
                                                        display: viewMode === 'grid' ? 'grid' : 'flex',
                                                        flexDirection: viewMode === 'grid' ? 'initial' : 'column',
                                                        gridTemplateColumns: viewMode === 'grid' ? 'repeat(3, 1fr)' : 'initial',
                                                        gap: '20px'
                                                    }}>
                                                        {(() => {
                                                            // 2. Agrupar por CLIENTE DENTRO do Processo (Nível 2)
                                                            const groupedByClient = allProcessTasks.reduce((acc, t) => {
                                                                const clientName = t.client_name || 'Sem Cliente';
                                                                if (!acc[clientName]) acc[clientName] = [];
                                                                acc[clientName].push(t);
                                                                return acc;
                                                            }, {});

                                                            return Object.entries(groupedByClient).map(([clientName, clientTasks]) => {
                                                                const groupKey = `${processName}-${clientName}`;
                                                                const isClientExpanded = expandedClients[groupKey] !== false;

                                                                // Cálculo de progresso do Cliente (Execução Sequencial)
                                                                const totalC = clientTasks.length;
                                                                const doneC = clientTasks.filter(t => t.status === 'CONCLUIDA').length;
                                                                const clientProgress = totalC > 0 ? Math.round((doneC / totalC) * 100) : 0;

                                                                return (
                                                                    <div key={groupKey} style={{
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                                        borderRadius: '12px',
                                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                                        overflow: 'hidden',
                                                                        height: viewMode === 'grid' ? '100%' : 'auto',
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                                                                    }}>
                                                                        {/* Header do Cliente (Nível 2) */}
                                                                        <div
                                                                            onClick={() => setExpandedClients(prev => ({ ...prev, [groupKey]: !isClientExpanded }))}
                                                                            style={{
                                                                                padding: '12px 16px',
                                                                                display: 'flex',
                                                                                justifyContent: 'space-between',
                                                                                alignItems: 'center',
                                                                                cursor: 'pointer',
                                                                                borderBottom: isClientExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                                                                backgroundColor: 'rgba(255,255,255,0.02)'
                                                                            }}
                                                                        >
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                                                <Users size={18} color="#94a3b8" />
                                                                                <div style={{ flex: 1 }}>
                                                                                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{clientName}</span>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                                                                                        <div style={{ height: '4px', width: '60px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                                                            <div style={{ height: '100%', width: `${clientProgress}%`, backgroundColor: 'var(--success, #10b981)', transition: 'width 0.5s ease' }} />
                                                                                        </div>
                                                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{clientProgress}% Concluído</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                {isClientExpanded ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                                                                            </div>
                                                                        </div>

                                                                        {/* Corpo das Tarefas (Nível 3: Etapas) */}
                                                                        {isClientExpanded && (
                                                                            <div style={{
                                                                                padding: '12px',
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: '8px',
                                                                                flex: 1
                                                                            }}>
                                                                                {clientTasks.map(task => renderTaskCard(task))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })() : (
                                    <GlassCard style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                                        Nenhuma tarefa encontrada para os filtros selecionados.
                                    </GlassCard>
                                )}
                            </div>
                        </div>
                    </>
                )
            }

            {/* MODAL DE CHECKLIST */}
            <Modal
                isOpen={checklistModalOpen}
                onClose={() => setChecklistModalOpen(false)}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListTodo size={24} color="var(--primary-color, #3b82f6)" />
                        <span>Finalizar: {currentTaskForChecklist?.task_name}</span>
                    </div>
                }
            >
                <div style={{ padding: '1rem' }}>
                    {checklists.length > 0 ? (
                        <>
                            <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                                Por favor, valide os checkpoints abaixo antes de prosseguir com a tarefa.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem' }}>
                                {checklists.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px', backgroundColor: item.is_checked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.03)',
                                        borderRadius: '8px', border: item.is_checked ? '1px solid var(--success)' : '1px solid #e2e8f0',
                                        cursor: (currentTaskForChecklist?.status === 'CONCLUIDA' && !isAdmin) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                        opacity: (currentTaskForChecklist?.status === 'CONCLUIDA' && !isAdmin) ? 0.8 : 1
                                    }} onClick={() => {
                                        if (currentTaskForChecklist?.status !== 'CONCLUIDA' || isAdmin) {
                                            handleToggleChecklist(item.id, item.is_checked);
                                        }
                                    }}>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '4px', border: item.is_checked ? 'none' : '2px solid #cbd5e1',
                                            backgroundColor: item.is_checked ? 'var(--success)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {item.is_checked && <CheckCircle size={16} color="white" />}
                                        </div>
                                        <span style={{
                                            fontWeight: '500',
                                            textDecoration: item.is_checked ? 'line-through' : 'none',
                                            color: item.is_checked ? '#64748b' : 'inherit'
                                        }}>
                                            {item.item_texto}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{
                            padding: '16px',
                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            borderRadius: '8px',
                            border: '1px dashed rgba(59, 130, 246, 0.3)',
                            marginBottom: '1.5rem',
                            textAlign: 'center',
                            color: '#64748b'
                        }}>
                            Nenhum item de checklist obrigatório para esta tarefa.
                        </div>
                    )}

                    {/* Campo de Anotação (Universal para o Processo) */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500', color: 'var(--text-color)' }}>
                            <FileText size={18} color="var(--primary-color)" />
                            Anotações do Processo (Compartilhada):
                        </label>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                            Esta observação é visível e editável por todos os envolvidos neste processo.
                        </p>
                        <textarea
                            value={anotacaoTarefa}
                            onChange={(e) => setAnotacaoTarefa(e.target.value)}
                            disabled={currentTaskForChecklist?.status === 'CONCLUIDA' && !isAdmin}
                            placeholder="Descreva observações importantes sobre esta etapa..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: (currentTaskForChecklist?.status === 'CONCLUIDA' && !isAdmin) ? '#f8fafc' : 'white',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                        <Button variant="secondary" onClick={() => setChecklistModalOpen(false)}>
                            {currentTaskForChecklist?.status === 'CONCLUIDA' && !isAdmin ? 'Fechar' : 'Cancelar'}
                        </Button>

                        {/* Botão de salvar somente a anotação — disponível para qualquer membro do processo */}
                        {anotacaoTarefa && anotacaoTarefa !== (currentTaskForChecklist?.anotacao || '') && (
                            <Button
                                variant="secondary"
                                disabled={isCompletingId}
                                onClick={handleSaveAnotacao}
                                style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                            >
                                {isCompletingId === 'anotacao' ? 'Salvando...' : '💾 Salvar Anotação'}
                            </Button>
                        )}

                        {/* Botão de concluir/alterar status — somente para responsável ou admin */}
                        {(currentTaskForChecklist?.is_my_task !== false || isAdmin) &&
                            (currentTaskForChecklist?.status !== 'CONCLUIDA' || isAdmin) && (
                                <Button
                                    variant="primary"
                                    disabled={!!isCompletingId}
                                    onClick={handleCompleteTaskFromModal}
                                >
                                    {isCompletingId && isCompletingId !== 'anotacao' ? 'Salvando...' : (currentTaskForChecklist?.status === 'CONCLUIDA' ? 'Salvar Alterações' : 'Concluir Tarefa')}
                                </Button>
                            )}
                    </div>
                </div>
            </Modal>

            {/* MODAL DE SUCESSO COBRANDO O ALERT() */}
            <Modal
                isOpen={successModalOpen}
                onClose={() => setSuccessModalOpen(false)}
                title=""
            >
                <div style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        marginBottom: '20px'
                    }}>
                        <CheckCircle size={48} color="var(--success)" />
                    </div>
                    <h2 style={{ color: 'var(--text-color)', marginBottom: '16px', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        Sucesso!
                    </h2>
                    <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '1.1rem', lineHeight: '1.5' }}>
                        {successModalMessage}
                    </p>
                    <Button
                        variant="primary"
                        style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
                        onClick={() => setSuccessModalOpen(false)}
                    >
                        Continuar
                    </Button>
                </div>
            </Modal>
        </div >
    );
};

export default Dashboard;

