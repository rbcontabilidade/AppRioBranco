import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { api } from '../../services/api';
import { Plus } from 'lucide-react';
import { useDialog } from '../../contexts/DialogContext';

export const ProcessBuilder = () => {
    const { showAlert } = useDialog();
    const [processName, setProcessName] = useState('');
    const [processDescription, setProcessDescription] = useState('');
    const [frequency, setFrequency] = useState('Mensal');
    const [mesReferencia, setMesReferencia] = useState(1);
    const [availableRoutines, setAvailableRoutines] = useState([]);
    const [loadingRoutines, setLoadingRoutines] = useState(true);

    // Lista de passos do processo (Process Timeline)
    const [processSteps, setProcessSteps] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchRoutines = async () => {
            try {
                // Tenta buscar rotinas vindas da tabela do Supabase
                const res = await api.get('/rotinas_base');
                setAvailableRoutines(res.data?.rotinas || res.data || []);
            } catch (err) {
                console.error("Erro ao carregar rotinas disponíveis:", err);
                // Fallback Mock se a rota falhar
                setAvailableRoutines([
                    { id: 10, nome: 'Revisão Documental' },
                    { id: 11, nome: 'Apuração de Impostos' },
                    { id: 12, nome: 'Envio de Guias' },
                    { id: 13, nome: 'Fechamento Contábil' },
                    { id: 14, nome: 'Auditoria Externa' }
                ]);
            } finally {
                setLoadingRoutines(false);
            }
        };
        fetchRoutines();
    }, []);

    // Função para adicionar uma rotina ao processo
    const handleAddRoutineToProcess = (routine) => {
        const newStep = {
            id: Date.now(), // ID temporário
            nome: routine.nome,
            descricao: routine.descricao || `Etapa vinculada a rotina base ${routine.nome}`,
            dias_prazo: 5, // SLA padrão
            ordem: processSteps.length + 1
        };

        setProcessSteps([...processSteps, newStep]);
    };

    // Função para remover um passo
    const handleRemoveStep = (indexToRemove) => {
        const updatedSteps = processSteps.filter((_, index) => index !== indexToRemove);

        // Reordenar
        const reorderedSteps = updatedSteps.map((step, index) => ({
            ...step,
            ordem: index + 1
        }));

        setProcessSteps(reorderedSteps);
    };

    // Mover passo para cima
    const moveStepUp = (index) => {
        if (index === 0) return;

        const newSteps = [...processSteps];
        const temp = newSteps[index];
        newSteps[index] = newSteps[index - 1];
        newSteps[index - 1] = temp;

        // Atualiza as dependências e ordem após a troca
        recalculateOrder(newSteps);
    };

    // Mover passo para baixo
    const moveStepDown = (index) => {
        if (index === processSteps.length - 1) return;

        const newSteps = [...processSteps];
        const temp = newSteps[index];
        newSteps[index] = newSteps[index + 1];
        newSteps[index + 1] = temp;

        // Atualiza as dependências e ordem após a troca
        recalculateOrder(newSteps);
    };

    // Atualiza ordem com base na posição na array
    const recalculateOrder = (steps) => {
        const reordered = steps.map((step, index) => ({
            ...step,
            ordem: index + 1
        }));
        setProcessSteps(reordered);
    };

    // Salvar o Processo
    const handleSaveProcess = async () => {
        if (!processName) {
            showAlert({
                title: 'Campo Obrigatório',
                message: 'Por favor, defina um nome para o processo antes de salvar.',
                variant: 'danger'
            });
            return;
        }

        if (processSteps.length === 0) {
            showAlert({
                title: 'Processo Vazio',
                message: 'Adicione pelo menos um passo ou rotina ao processo antes de salvar.',
                variant: 'danger'
            });
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                nome: processName,
                descricao: processDescription,
                frequencia: frequency,
                mes_referencia: frequency === 'Anual' ? mesReferencia : null,
                steps: processSteps.map(s => ({
                    nome: s.nome,
                    descricao: s.descricao,
                    dias_prazo: s.dias_prazo,
                    ordem: s.ordem
                }))
            };
            const response = await api.post('/processos', payload);
            await showAlert({
                title: 'Processo Salvo',
                message: 'O novo processo e suas rotinas foram salvos com sucesso na base de dados.',
                variant: 'success'
            });

            // Limpa o formulário
            setProcessName('');
            setProcessDescription('');
            setProcessSteps([]);
            setFrequency('Mensal');
        } catch (error) {
            console.error('Falha ao salvar o novo processo:', error);
            showAlert({
                title: 'Erro ao Salvar',
                message: 'Ocorreu um erro ao comunicar com o servidor. Verifique sua conexão e tente novamente.',
                variant: 'danger'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header do Builder */}
            <GlassCard>
                <h2 style={{ marginBottom: '16px', fontSize: '1.5rem', fontWeight: 'bold' }}>Construtor de Processos (Admin)</h2>
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Nome do Processo:</label>
                        <input
                            type="text"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            value={processName}
                            onChange={(e) => setProcessName(e.target.value)}
                            placeholder="Ex: Integração de Novo Cliente Fiscal"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Frequência do Processo:</label>
                        <select
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                        >
                            <option value="Mensal">Mensal</option>
                            <option value="Anual">Anual</option>
                            <option value="Avulso">Sob Demanda / Avulso</option>
                        </select>
                    </div>

                    {frequency === 'Anual' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Mês de Referência (Anual):</label>
                            <select
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                                value={mesReferencia}
                                onChange={(e) => setMesReferencia(parseInt(e.target.value))}
                            >
                                <option value={1}>Janeiro</option>
                                <option value={2}>Fevereiro</option>
                                <option value={3}>Março</option>
                                <option value={4}>Abril</option>
                                <option value={5}>Maio</option>
                                <option value={6}>Junho</option>
                                <option value={7}>Julho</option>
                                <option value={8}>Agosto</option>
                                <option value={9}>Setembro</option>
                                <option value={10}>Outubro</option>
                                <option value={11}>Novembro</option>
                                <option value={12}>Dezembro</option>
                            </select>
                        </div>
                    )}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Descrição (Opcional):</label>
                        <input
                            type="text"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
                            value={processDescription}
                            onChange={(e) => setProcessDescription(e.target.value)}
                            placeholder="Descreva o objetivo deste processo..."
                        />
                    </div>
                </div>
            </GlassCard>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>

                {/* Coluna Esquerda: Rotinas Disponíveis */}
                <div style={{ flex: '1 1 300px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Rotinas Disponíveis</h3>
                    <GlassCard style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                        {loadingRoutines ? (
                            <div style={{ textAlign: 'center', color: '#666' }}>Buscando rotinas no banco de dados...</div>
                        ) : availableRoutines.length > 0 ? (
                            availableRoutines.map(routine => (
                                <div key={routine.id} style={{
                                    padding: '16px',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(255,255,255,0.3)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{routine.nome}</div>
                                    </div>
                                    <Button size="small" onClick={() => handleAddRoutineToProcess(routine)}>
                                        <Plus size={14} style={{ marginRight: '4px' }} /> Add
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: '#666' }}>Nenhuma rotina base encontrada na base de dados.</div>
                        )}
                    </GlassCard>
                </div>

                {/* Coluna Direita: Linha do Tempo (Timeline) do Processo */}
                <div style={{ flex: '1 1 500px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '1.25rem' }}>Linha do Tempo (Pipeline)</h3>

                    {processSteps.length === 0 ? (
                        <GlassCard style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            Nenhum passo adicionado. Adicione rotinas da lista à esquerda para montar o processo.
                        </GlassCard>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {processSteps.map((step, index) => (
                                <GlassCard key={step.id} style={{ display: 'flex', position: 'relative', overflow: 'hidden' }}>

                                    {/* Indicador Numérico de Ordem */}
                                    <div style={{
                                        width: '40px',
                                        backgroundColor: 'var(--primary-color, #3b82f6)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem',
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0
                                    }}>
                                        {step.step_order}
                                    </div>

                                    {/* Conteúdo do Passo */}
                                    <div style={{ marginLeft: '40px', padding: '16px', flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{step.nome}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '4px' }}>
                                                SLA para entrega (em dias):
                                                <input
                                                    type="number"
                                                    value={step.dias_prazo}
                                                    onChange={(e) => {
                                                        const newVal = parseInt(e.target.value) || 0;
                                                        const newSteps = [...processSteps];
                                                        newSteps[index].dias_prazo = newVal;
                                                        setProcessSteps(newSteps);
                                                    }}
                                                    style={{ width: '60px', marginLeft: '6px', padding: '2px', border: '1px solid #ccc', borderRadius: '4px' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Ações: Reordenar e Remover */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button
                                                size="small"
                                                variant="secondary"
                                                onClick={() => moveStepUp(index)}
                                                disabled={index === 0}
                                                style={{ padding: '4px 8px', opacity: index === 0 ? 0.5 : 1 }}
                                                title="Mover para cima"
                                            >
                                                ↑
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="secondary"
                                                onClick={() => moveStepDown(index)}
                                                disabled={index === processSteps.length - 1}
                                                style={{ padding: '4px 8px', opacity: index === processSteps.length - 1 ? 0.5 : 1 }}
                                                title="Mover para baixo"
                                            >
                                                ↓
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="danger"
                                                onClick={() => handleRemoveStep(index)}
                                                style={{ padding: '4px 8px', marginLeft: '8px' }}
                                                title="Remover Passo"
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={handleSaveProcess} size="normal" style={{ padding: '12px 32px', fontSize: '1.1rem' }} disabled={isSaving}>
                            {isSaving ? 'Salvando...' : 'Salvar Processo (Templates de Rotina)'}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProcessBuilder;
