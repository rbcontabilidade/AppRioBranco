import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import DataTable from '../../components/ui/DataTable/DataTable';
import Modal from '../../components/ui/Modal/Modal';
import { GlassSelect } from '../../components/ui/GlassSelect/GlassSelect';
import { Calendar, Plus, X, Archive, CheckCircle, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';
import styles from './Competences.module.css';

const Competences = () => {
    const { showAlert, showConfirm } = useDialog();
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    // Form States
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchCompetences();
    }, []);

    const fetchCompetences = async () => {
        setLoading(true);
        try {
            const response = await api.get('/meses');
            setCompetences(response.data || []);
        } catch (error) {
            console.error('Erro ao buscar competências:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCompetence = async (e) => {
        e.preventDefault();

        if (!newMonth || !newYear) return;

        setIsSaving(true);
        try {
            const period = `${newMonth.toString().padStart(2, '0')}/${newYear}`;
            // Chama o novo endpoint que usa a RPC para gerar tudo com recorrência
            await api.post(`/meses/gerar/${newMonth}/${newYear}`);
            await fetchCompetences();
            setIsCompleteModalOpen(false);
            setNewMonth('');
            setNewYear('');
            showAlert({
                title: 'Competência Gerada',
                message: `O período ${period} foi gerado e todos os processos mensais foram clonados.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Erro ao criar competência:', error);
            const detail = error.response?.data?.detail || 'Ela já pode existir ou houve erro no servidor.';
            showAlert({
                title: 'Erro na Operação',
                message: `Não foi possível gerar a nova competência. ${detail}`,
                variant: 'danger'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const isConfirmed = await showConfirm({
            title: newStatus === 'FECHADA' ? 'Encerrar Competência' : 'Arquivar Competência',
            message: `Tem certeza que deseja alterar o status deste período para ${newStatus === 'FECHADA' ? 'Fechado' : 'Arquivado'}?`,
            confirmText: 'Confirmar Alteração',
            variant: newStatus === 'FECHADA' ? 'primary' : 'danger'
        });

        if (!isConfirmed) return;

        try {
            await api.put(`/meses/${id}`, { status: newStatus });
            await fetchCompetences();
            showAlert({
                title: 'Status Atualizado',
                message: `A competência foi ${newStatus === 'FECHADA' ? 'encerrada' : 'arquivada'} com sucesso.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            showAlert({
                title: 'Falha na Atualização',
                message: 'Ocorreu um erro ao tentar alterar o status da competência.',
                variant: 'danger'
            });
        }
    };

    const handleDeleteCompetence = async (id, period, status) => {
        if (status === 'ABERTA') {
            showAlert({
                title: 'Ação Bloqueada',
                message: 'Não é possível excluir a competência que está ABERTA. Encerre-a primeiro se desejar remover o histórico.',
                variant: 'danger'
            });
            return;
        }

        const isConfirmed = await showConfirm({
            title: 'Excluir Histórico',
            message: `Tem certeza que deseja apagar permanentemente a competência ${period} e TODAS as tarefas de clientes vinculadas a ela? Esta ação não pode ser desfeita.`,
            confirmText: 'Excluir Permanentemente',
            variant: 'danger'
        });

        if (!isConfirmed) return;

        try {
            await api.delete(`/meses/${id}`);
            await fetchCompetences();
            showAlert({
                title: 'Competência Excluída',
                message: 'O período e seu histórico foram removidos com sucesso.',
                variant: 'success'
            });
        } catch (error) {
            console.error('Erro ao excluir competência:', error);
            const msg = error.response?.data?.detail || 'Ocorreu um erro ao tentar excluir a competência.';
            showAlert({
                title: 'Falha na Exclusão',
                message: msg,
                variant: 'danger'
            });
        }
    };

    // Formatação de Colunas para Tabela
    const columns = ['Período', 'Status', 'Ações'];

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'Open':
                return <span className={`${styles.badge} ${styles.badgeOpen}`}>Aberto</span>;
            case 'Closed':
                return <span className={`${styles.badge} ${styles.badgeClosed}`}>Fechado</span>;
            case 'Archived':
                return <span className={`${styles.badge} ${styles.badgeArchived}`}>Arquivado</span>;
            default:
                return <span className={`${styles.badge}`}>{status}</span>;
        }
    };

    const dataRows = competences.map(comp => {
        const period = `${String(comp.mes).padStart(2, '0')}/${comp.ano}`;
        return [
            period,
            renderStatusBadge(comp.status === 'ABERTA' ? 'Open' : comp.status === 'FECHADA' ? 'Closed' : comp.status),
            <div className={styles.actionButtons} key={comp.id}>
                {comp.status === 'ABERTA' && (
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleUpdateStatus(comp.id, 'FECHADA')}
                        title="Encerrar Competência"
                    >
                        <CheckCircle size={14} style={{ marginRight: '6px' }} /> Encerrar
                    </Button>
                )}
                {comp.status === 'FECHADA' && (
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleUpdateStatus(comp.id, 'ARQUIVADA')}
                        title="Arquivar Competência"
                    >
                        <Archive size={14} style={{ marginRight: '6px' }} /> Arquivar
                    </Button>
                )}
                {comp.status !== 'ABERTA' && (
                    <Button
                        variant="danger-outline"
                        size="small"
                        onClick={() => handleDeleteCompetence(comp.id, period, comp.status)}
                        title="Excluir Histórico"
                    >
                        <Trash2 size={14} />
                    </Button>
                )}
            </div>
        ];
    });

    return (
        <div className="view-section active">
            <header className="section-header">
                <div className="section-title-group">
                    <h1>Gestão de Competências</h1>
                    <p className="subtitle">Controle a abertura, fechamento e histórico dos períodos de apuração</p>
                </div>
                <div className="header-actions">
                    <Button
                        variant="primary"
                        onClick={() => setIsCompleteModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} /> Forçar Nova Competência
                    </Button>
                </div>
            </header>

            <div className={styles.tableContainer}>
                {loading ? (
                    <div className={styles.loading}>Carregando competências...</div>
                ) : competences.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={dataRows}
                        hoverable={true}
                    />
                ) : (
                    <GlassCard style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        <Calendar size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>Nenhuma competência registrada ainda.</p>
                        <p style={{ fontSize: '0.9rem' }}>Clique em "Forçar Nova Competência" para iniciar o ciclo.</p>
                    </GlassCard>
                )}
            </div>

            <div className={styles.infoNote}>
                <p><strong>Nota:</strong> O sistema cria automaticamente a nova competência no primeiro dia do mês. A opção "Forçar" é recomendada apenas para testes ou antecipação de lançamentos.</p>
            </div>

            {/* Modal para Nova Competência - Usando componente padrão */}
            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title="Abertura de Competência"
                size="sm"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsCompleteModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateCompetence}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Competência'}
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateCompetence} className={styles.formContainer}>
                    <GlassSelect
                        label="Mês"
                        value={newMonth}
                        onChange={(e) => setNewMonth(e.target.value)}
                        options={[
                            { label: 'Selecione...', value: '' },
                            ...[...Array(12)].map((_, i) => ({
                                label: (i + 1).toString().padStart(2, '0'),
                                value: (i + 1).toString()
                            }))
                        ]}
                        required
                    />
                    <GlassSelect
                        label="Ano"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        options={[
                            { label: 'Selecione...', value: '' },
                            ...[...Array(10)].map((_, i) => {
                                const year = 2026 + i;
                                return { label: year.toString(), value: year.toString() };
                            })
                        ]}
                        required
                    />
                </form>
            </Modal>
        </div>
    );
};

export default Competences;
