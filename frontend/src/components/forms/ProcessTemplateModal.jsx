import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal/Modal';
import { Button } from '../ui/Button/Button';
import { GlassInput } from '../ui/GlassInput/GlassInput';
import { GlassSelect } from '../ui/GlassSelect/GlassSelect';
import {
    Plus,
    Trash2,
    ChevronRight,
    CheckCircle,
    Layout,
    Clock,
    Settings,
    ListTodo,
    X,
    GripVertical,
    Users
} from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';
import UserMultiSelect from '../ui/UserMultiSelect/UserMultiSelect';

export const ProcessTemplateModal = ({ isOpen, onClose, onSave, initialData }) => {
    const { showAlert } = useDialog();
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [frequency, setFrequency] = useState('Mensal');
    const [steps, setSteps] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [availableDepartments, setAvailableDepartments] = useState([]);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    // Buscar usuários (Profiles) e Setores disponíveis
    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [profilesRes, deptsRes] = await Promise.all([
                    api.get('/funcionarios'),
                    api.get('/setores').catch(() => ({ data: [] }))
                ]);

                const rawUsers = profilesRes.data?.funcionarios || (Array.isArray(profilesRes.data) ? profilesRes.data : []);
                setAvailableUsers(rawUsers.map(u => ({
                    id: u.id,
                    name: u.nome || u.name || 'Sem Nome',
                    role: u.cargo || u.role || 'Sem Cargo'
                })));

                const rawDepts = deptsRes.data?.setores || deptsRes.data?.departments || (Array.isArray(deptsRes.data) ? deptsRes.data : []);
                setAvailableDepartments(rawDepts);
            } catch (err) {
                console.error("Erro ao carregar dependências do modal:", err);
            }
        };
        fetchDependencies();
    }, []);

    // Carregar dados iniciais (Edição) ou resetar (Novo)
    useEffect(() => {
        const fetchDetails = async () => {
            if (initialData && initialData.id && (!initialData.steps || initialData.steps.length === 0)) {
                try {
                    // Busca os detalhes completos incluindo tasks, responsaveis e checklists
                    const response = await api.get(`/processos/${initialData.id}`);
                    const data = response.data;
                    setTemplateName(data.nome || '');
                    setTemplateDescription(data.descricao || '');
                    setFrequency(data.frequencia || 'Mensal');
                    setSteps(data.steps || []);
                    setActiveStepIndex(0); // Reseta o scroll para o índice 0 após recarregar tudo
                } catch (err) {
                    console.error("Erro ao buscar detalhes do processo para edição:", err);
                }
            } else if (initialData) {
                setTemplateName(initialData.nome || '');
                setTemplateDescription(initialData.descricao || '');
                setFrequency(initialData.frequencia || 'Mensal');
                setSteps(initialData.steps || []);
                setActiveStepIndex(0);
            } else {
                // Estado inicial para novo template
                setTemplateName('');
                setTemplateDescription('');
                setFrequency('Mensal');
                setSteps([{
                    id: Date.now(),
                    nome: 'Nova Etapa',
                    descricao: '',
                    role: 'Fiscal',
                    dias_prazo: 5,
                    dependente_de_id: null,
                    responsible_users: [],
                    checklist: []
                }]);
                setActiveStepIndex(0);
            }
        };

        if (isOpen) {
            fetchDetails();
        }
    }, [initialData, isOpen]);

    const handleAddStep = () => {
        const newStep = {
            id: Date.now(),
            nome: `Etapa ${steps.length + 1}`,
            descricao: '',
            role: 'Fiscal',
            dias_prazo: 5,
            dependente_de_id: null,
            responsible_users: [],
            checklist: []
        };
        setSteps([...steps, newStep]);
        setActiveStepIndex(steps.length);
    };

    const handleRemoveStep = (index, e) => {
        e.stopPropagation();
        const newSteps = steps.filter((_, i) => i !== index);
        setSteps(newSteps);
        if (activeStepIndex >= newSteps.length) {
            setActiveStepIndex(Math.max(0, newSteps.length - 1));
        }
    };

    const updateStep = (index, field, value) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const toggleUserAssignment = (stepIndex, selectedIds) => {
        const newSteps = [...steps];
        newSteps[stepIndex].responsible_users = selectedIds;

        // Lógica de Atribuição Inteligente: Sugerir setor baseado nos usuários
        if (selectedIds.length > 0) {
            const selectedRoles = availableUsers
                .filter(u => selectedIds.includes(u.id))
                .map(u => u.role);

            // Pega o cargo mais frequente (ou o primeiro)
            if (selectedRoles.length > 0) {
                const mostFrequentRole = selectedRoles.sort((a, b) =>
                    selectedRoles.filter(v => v === a).length - selectedRoles.filter(v => v === b).length
                ).pop();

                if (mostFrequentRole) {
                    newSteps[stepIndex].role = mostFrequentRole;
                }
            }
        }

        setSteps(newSteps);
    };

    const handleAddChecklistItem = (stepIndex) => {
        const newSteps = [...steps];
        const newItem = { id: Date.now(), text: '', required: true };
        newSteps[stepIndex].checklist = [...(newSteps[stepIndex].checklist || []), newItem];
        setSteps(newSteps);
    };

    const handleUpdateChecklistItem = (stepIndex, itemIndex, text) => {
        const newSteps = [...steps];
        newSteps[stepIndex].checklist[itemIndex].text = text;
        setSteps(newSteps);
    };

    const handleRemoveChecklistItem = (stepIndex, itemIndex) => {
        const newSteps = [...steps];
        newSteps[stepIndex].checklist = newSteps[stepIndex].checklist.filter((_, i) => i !== itemIndex);
        setSteps(newSteps);
    };

    const handleSave = async () => {
        if (!templateName) {
            showAlert({ title: 'Atenção', message: 'Defina um nome para o template.', variant: 'danger' });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                nome: templateName,
                descricao: templateDescription,
                frequencia: frequency,
                steps: steps.map((s, idx) => {
                    // Se o ID for uma string ou um timestamp muito grande (Date.now), 
                    // enviamos como null para o backend tratar como INSERT, caso contrário mantemos (UPDATE)
                    const isRealId = typeof s.id === 'number' && s.id < 1000000000;

                    return {
                        id: isRealId ? s.id : null,
                        nome: s.nome,
                        descricao: s.descricao || '',
                        ordem: idx + 1,
                        dias_prazo: typeof s.dias_prazo === 'number' ? s.dias_prazo : parseInt(s.dias_prazo) || 0,
                        dependente_de_id: s.dependente_de_id && s.dependente_de_id < 1000000000 ? s.dependente_de_id : null,
                        responsible_users: s.responsible_users || [],
                        checklist: (s.checklist || []).map(c => ({
                            id: (typeof c.id === 'number' && c.id < 1000000000) ? c.id : null,
                            text: c.text
                        }))
                    };
                })
            };

            if (initialData?.id) {
                await api.put(`/processos/${initialData.id}`, payload);
            } else {
                await api.post('/processos', payload);
            }

            if (onSave) onSave(payload);
            onClose();
            showAlert({ title: 'Sucesso', message: 'Template de processo salvo com sucesso!', variant: 'success' });
        } catch (err) {
            console.error("Erro completo ao salvar o template:", err);
            const errorMsg = err.response?.data?.detail 
                || err.response?.data?.message 
                || err.message 
                || 'Falha ao salvar o template.';
                
            showAlert({ 
                title: 'Erro ao Salvar', 
                message: errorMsg, 
                variant: 'danger' 
            });
        } finally {
            setIsSaving(false);
        }
    };

    const activeStep = steps[activeStepIndex];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar Template de Processo" : "Criar Novo Template de Processo"}
            size="xl"
            footer={
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', width: '100%' }}>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Template'}
                    </Button>
                </div>
            }
        >
            <div style={{
                display: 'flex',
                height: '70vh',
                minHeight: '600px',
                gap: '2px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Coluna Esquerda: Timeline / Lista de Passos */}
                <div style={{
                    width: '300px',
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRight: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <GlassInput
                            label="Nome do Template"
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="Ex: Fechamento Fiscal Mensal"
                        />
                        <div style={{ marginTop: '15px' }}>
                            <GlassSelect
                                label="Frequência do Processo"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                options={[
                                    { value: 'Mensal', label: 'Mensal' },
                                    { value: 'Anual', label: 'Anual' },
                                    { value: 'Avulso', label: 'Avulso / Demanda' }
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
                            Fluxo do Processo
                        </div>

                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                onClick={() => setActiveStepIndex(index)}
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: activeStepIndex === index ? 'var(--primary-dark)' : 'transparent',
                                    border: activeStepIndex === index ? '1px solid var(--primary-light)' : '1px solid transparent',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: activeStepIndex === index ? '#fff' : 'rgba(255,255,255,0.1)',
                                    color: activeStepIndex === index ? 'var(--primary-dark)' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold'
                                }}>
                                    {index + 1}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: activeStepIndex === index ? 'bold' : 'normal', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {step.nome}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: activeStepIndex === index ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>
                                        Setor: {step.role}
                                    </div>
                                </div>
                                {steps.length > 1 && (
                                    <button
                                        onClick={(e) => handleRemoveStep(index, e)}
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px' }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={handleAddStep}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px dashed rgba(255,255,255,0.2)',
                                borderRadius: '8px',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                marginTop: '10px',
                                fontSize: '0.9rem'
                            }}
                        >
                            <Plus size={16} /> Adicionar Etapa
                        </button>
                    </div>
                </div>

                {/* Coluna Direita: Detalhes do Passo */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '30px', overflowY: 'auto' }}>
                    {activeStep ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: 'var(--primary-light)' }}>
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Configuração da Etapa {activeStepIndex + 1}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ajuste os detalhes técnicos e obrigações desta etapa.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <GlassInput
                                    label="Nome da Rotina / Etapa"
                                    value={activeStep.nome}
                                    onChange={(e) => updateStep(activeStepIndex, 'nome', e.target.value)}
                                    placeholder="Ex: Conferência de Notas"
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <GlassSelect
                                        label="Setor Responsável"
                                        value={activeStep.role}
                                        onChange={(e) => updateStep(activeStepIndex, 'role', e.target.value)}
                                        options={[
                                            { value: '', label: 'Sem setor definido' },
                                            ...availableDepartments.map(d => ({ value: d.nome || d, label: d.nome || d }))
                                        ]}
                                    />
                                    {frequency === 'Anual' ? (
                                        <GlassInput
                                            label="Dia e Mês (Ex: 31/12)"
                                            type="text"
                                            value={
                                                activeStep.dias_prazo && activeStep.dias_prazo.toString().length >= 3
                                                    ? `${String(activeStep.dias_prazo).slice(-2).padStart(2, '0')}/${String(Math.floor(activeStep.dias_prazo / 100)).padStart(2, '0')}`
                                                    : activeStep.dias_prazo ? activeStep.dias_prazo : ''
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '');
                                                if (val.length <= 4) {
                                                    let formatted = val;
                                                    // Guarda DD e MM
                                                    if (val.length >= 3) {
                                                        const dd = val.slice(0, 2);
                                                        const mm = val.slice(2, 4);
                                                        // Converte pra inteiro MMDD pra salvar no banco sem quebrar a tipagem
                                                        const numVal = parseInt(`${mm}${dd}`, 10);
                                                        updateStep(activeStepIndex, 'dias_prazo', numVal);
                                                        return;
                                                    }
                                                    // Deixa o user digitar apenas
                                                    updateStep(activeStepIndex, 'dias_prazo', val); // intermediario string
                                                }
                                            }}
                                            placeholder="DD/MM"
                                        />
                                    ) : (
                                        <GlassInput
                                            label={frequency === 'Mensal' ? "Dia Fixo do Mês" : "Prazo (Dias Corridos)"}
                                            type="number"
                                            value={activeStep.dias_prazo}
                                            onChange={(e) => updateStep(activeStepIndex, 'dias_prazo', parseInt(e.target.value) || 0)}
                                            placeholder={frequency === 'Mensal' ? "Ex: 15" : "Ex: 5"}
                                        />
                                    )}
                                    <GlassSelect
                                        label="Depende de:"
                                        value={activeStep.dependente_de_id || ''}
                                        onChange={(e) => updateStep(activeStepIndex, 'dependente_de_id', e.target.value ? parseInt(e.target.value) : null)}
                                        options={[
                                            { value: '', label: 'Nenhuma (Início imediato)' },
                                            ...steps
                                                .filter((_, idx) => idx < activeStepIndex) // Só pode depender de etapas ANTERIORES
                                                .map((s, idx) => ({ value: s.id, label: `${idx + 1}. ${s.nome}` }))
                                        ]}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Descrição da Rotina</label>
                                <textarea
                                    value={activeStep.descricao || ''}
                                    onChange={(e) => updateStep(activeStepIndex, 'descricao', e.target.value)}
                                    placeholder="Descreva o que deve ser feito nesta etapa..."
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Seção de Atribuição de Usuários Específicos */}
                            <div style={{
                                marginTop: '10px',
                                padding: '24px',
                                background: 'rgba(99, 102, 241, 0.03)',
                                borderRadius: '16px',
                                border: '1px solid rgba(99, 102, 241, 0.1)'
                            }}>
                                <UserMultiSelect
                                    label="Quem executará esta rotina? (Atribuição Inteligente)"
                                    availableUsers={availableUsers}
                                    selectedUserIds={activeStep.responsible_users || []}
                                    onChange={(selectedIds) => toggleUserAssignment(activeStepIndex, selectedIds)}
                                    helperText="O sistema identificará automaticamente o departamento (Fiscal, Contábil, etc) baseados nos usuários selecionados."
                                />
                            </div>

                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ListTodo size={18} color="var(--primary-light)" />
                                        Checklist de Obrigações
                                    </h4>
                                    <Button variant="secondary" size="small" onClick={() => handleAddChecklistItem(activeStepIndex)}>
                                        <Plus size={14} /> Adicionar Item
                                    </Button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {(activeStep.checklist || []).length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            Nenhum item no checklist. Adicione tarefas específicas para esta etapa.
                                        </div>
                                    ) : (
                                        activeStep.checklist.map((item, idx) => (
                                            <div key={item.id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <div style={{ cursor: 'grab', color: 'rgba(255,255,255,0.2)' }}>
                                                    <GripVertical size={16} />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={item.text}
                                                    onChange={(e) => handleUpdateChecklistItem(activeStepIndex, idx, e.target.value)}
                                                    placeholder="Descreva a tarefa..."
                                                    style={{
                                                        flex: 1,
                                                        background: 'rgba(255,255,255,0.05)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '6px',
                                                        padding: '10px',
                                                        color: '#fff',
                                                        fontSize: '0.9rem',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleRemoveChecklistItem(activeStepIndex, idx)}
                                                    style={{ background: 'none', border: 'none', color: 'rgba(239, 68, 68, 0.5)', cursor: 'pointer', padding: '8px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Selecione ou adicione uma etapa para começar.
                        </div>
                    )}
                </div>
            </div>


        </Modal >
    );
};

export default ProcessTemplateModal;
