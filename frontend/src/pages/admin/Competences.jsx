import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import { GlassSelect } from '../../components/ui/GlassSelect/GlassSelect';
import { GlassInput } from '../../components/ui/GlassInput/GlassInput';
import {
    Calendar, Plus, CheckCircle, Archive, Trash2,
    AlertTriangle, Lock, Activity, Clock, XCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';
import styles from './Competences.module.css';

// ─────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────

/** Formata "mes/ano" a partir de um objeto de competência */
const formatarPeriodo = (comp) =>
    `${String(comp.mes).padStart(2, '0')}/${comp.ano}`;

/** Retorna nome de mês em português */
const nomeMes = (num) => {
    const nomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril',
        'Maio', 'Junho', 'Julho', 'Agosto',
        'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return nomes[parseInt(num, 10) - 1] || num;
};

// ─────────────────────────────────────────────
// Configuração de status
// ─────────────────────────────────────────────

const STATUS_CONFIG = {
    ABERTA: {
        label: 'Ativa',
        badgeClass: 'badgeActive',
        icon: <Activity size={12} />,
    },
    FECHADA: {
        label: 'Fechada',
        badgeClass: 'badgeClosed',
        icon: <CheckCircle size={12} />,
    },
    ARQUIVADA: {
        label: 'Arquivada',
        badgeClass: 'badgeArchived',
        icon: <Archive size={12} />,
    },
};

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────

const Competences = () => {
    const { showAlert, showConfirm } = useDialog();

    // ── State: Lista e Loading ──
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── State: Modal de criação de nova competência ──
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newMonth, setNewMonth] = useState('');
    const [newYear, setNewYear] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // ── State: Modal de confirmação de senha para exclusão ──
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        competencia: null,     // objeto completo da competência
        password: '',
        isVerifying: false,
        passwordError: ''
    });

    const passwordInputRef = useRef(null);

    // ─────────────────────────────────────────────
    // Busca de dados
    // ─────────────────────────────────────────────

    useEffect(() => {
        fetchCompetences();
    }, []);

    const fetchCompetences = async () => {
        setLoading(true);
        try {
            const response = await api.get('/meses');
            setCompetences(response.data || []);
        } catch (error) {
            console.error('[Competences] Erro ao buscar competências:', error);
            showAlert({
                title: 'Erro ao Carregar',
                message: 'Não foi possível carregar as competências. Tente novamente.',
                variant: 'danger'
            });
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────
    // Criação de nova competência
    // ─────────────────────────────────────────────

    const handleCreateCompetence = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (!newMonth || !newYear) return;

        setIsSaving(true);
        try {
            const periodo = `${newMonth.toString().padStart(2, '0')}/${newYear}`;
            await api.post(`/meses/gerar/${newMonth}/${newYear}`);
            await fetchCompetences();
            setIsCreateModalOpen(false);
            setNewMonth('');
            setNewYear('');
            showAlert({
                title: 'Competência Gerada',
                message: `O período ${periodo} foi gerado e todos os processos mensais foram clonados.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('[Competences] Erro ao gerar competência:', error);
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

    // ─────────────────────────────────────────────
    // Atualização de status (Encerrar / Arquivar)
    // ─────────────────────────────────────────────

    const handleUpdateStatus = async (id, novoStatus, periodo) => {
        const acaoLabel = novoStatus === 'FECHADA' ? 'Encerrar' : 'Arquivar';
        const acaoPast = novoStatus === 'FECHADA' ? 'encerrada' : 'arquivada';

        const confirmado = await showConfirm({
            title: `${acaoLabel} Competência`,
            message: `Tem certeza que deseja ${acaoLabel.toLowerCase()} a competência ${periodo}? Esta ação alterará o status do período.`,
            confirmText: `Confirmar — ${acaoLabel}`,
            variant: novoStatus === 'FECHADA' ? 'primary' : 'danger'
        });

        if (!confirmado) return;

        try {
            await api.put(`/meses/${id}`, { status: novoStatus });
            await fetchCompetences();
            showAlert({
                title: 'Status Atualizado',
                message: `A competência ${periodo} foi ${acaoPast} com sucesso.`,
                variant: 'success'
            });
        } catch (error) {
            console.error('[Competences] Erro ao atualizar status:', error);
            const detail = error.response?.data?.detail || 'Ocorreu um erro ao tentar alterar o status.';
            showAlert({
                title: 'Falha na Atualização',
                message: detail,
                variant: 'danger'
            });
        }
    };

    // ─────────────────────────────────────────────
    // Fluxo de exclusão — abre modal de senha
    // ─────────────────────────────────────────────

    const handleDeleteClick = (comp) => {
        const periodo = formatarPeriodo(comp);

        // Guardrail frontend: competência ativa nunca pode ser deletada
        if (comp.status === 'ABERTA') {
            showAlert({
                title: 'Ação Bloqueada',
                message: 'Competências ativas não podem ser excluídas. Encerre a competência atual antes de tentar removê-la.',
                variant: 'danger'
            });
            return;
        }

        // Abre o modal de confirmação de senha para fechadas/arquivadas
        setDeleteModal({
            isOpen: true,
            competencia: { ...comp, periodo },
            password: '',
            isVerifying: false,
            passwordError: ''
        });

        // Foca no input de senha após animação do modal
        setTimeout(() => passwordInputRef.current?.focus(), 350);
    };

    const handleCloseDeleteModal = () => {
        if (deleteModal.isVerifying) return; // impede fechar durante verificação
        setDeleteModal({
            isOpen: false,
            competencia: null,
            password: '',
            isVerifying: false,
            passwordError: ''
        });
    };

    const handlePasswordChange = (e) => {
        setDeleteModal(prev => ({
            ...prev,
            password: e.target.value,
            passwordError: '' // limpa erro ao digitar
        }));
    };

    /**
     * Confirma a exclusão:
     * 1. Verifica senha no backend
     * 2. Se válida, executa o delete com cascade
     */
    const handleConfirmDelete = async () => {
        const { competencia, password } = deleteModal;

        if (!password) return;

        setDeleteModal(prev => ({ ...prev, isVerifying: true, passwordError: '' }));

        try {
            // Passo 1: Verificar senha do usuário logado
            await api.post('/meses/verificar-senha', { password });

            // Passo 2: Deletar a competência (backend ainda valida status)
            await api.delete(`/meses/${competencia.id}`);
            await fetchCompetences();

            setDeleteModal({
                isOpen: false,
                competencia: null,
                password: '',
                isVerifying: false,
                passwordError: ''
            });

            showAlert({
                title: 'Competência Excluída',
                message: `O período ${competencia.periodo} e seu histórico foram removidos com sucesso.`,
                variant: 'success'
            });

        } catch (error) {
            console.error('[Competences] Erro na exclusão:', error);
            const status = error.response?.status;
            const detail = error.response?.data?.detail;

            if (status === 401) {
                // Senha inválida — mantém modal aberto com mensagem
                setDeleteModal(prev => ({
                    ...prev,
                    isVerifying: false,
                    password: '',
                    passwordError: detail || 'Senha inválida. Tente novamente.'
                }));
                setTimeout(() => passwordInputRef.current?.focus(), 100);
            } else if (status === 403) {
                // Tentou deletar ativa pelo backend — bloqueio duplo
                setDeleteModal(prev => ({ ...prev, isVerifying: false }));
                showAlert({
                    title: 'Exclusão Bloqueada',
                    message: detail || 'Competências ativas não podem ser excluídas.',
                    variant: 'danger'
                });
                handleCloseDeleteModal();
            } else {
                setDeleteModal(prev => ({
                    ...prev,
                    isVerifying: false,
                    passwordError: detail || 'Erro ao excluir a competência. Tente novamente.'
                }));
            }
        }
    };

    // ─────────────────────────────────────────────
    // Computed: competência ativa atual
    // ─────────────────────────────────────────────

    const competenciaAtiva = competences.find(c => c.status === 'ABERTA');

    // ─────────────────────────────────────────────
    // Render de Badge de Status
    // ─────────────────────────────────────────────

    const renderBadge = (status) => {
        const conf = STATUS_CONFIG[status] || { label: status, badgeClass: 'badge', icon: null };
        return (
            <span className={`${styles.badge} ${styles[conf.badgeClass] || ''}`}>
                {conf.icon}
                {conf.label}
            </span>
        );
    };

    // ─────────────────────────────────────────────
    // Render de Card de Competência
    // ─────────────────────────────────────────────

    const renderCompCard = (comp) => {
        const periodo = formatarPeriodo(comp);
        const isAtiva = comp.status === 'ABERTA';
        const isFechada = comp.status === 'FECHADA';
        const isArquivada = comp.status === 'ARQUIVADA';

        return (
            <div
                key={comp.id}
                className={`${styles.compCard} ${isAtiva ? styles.compCardActive : ''}`}
            >
                {/* Cabeçalho do card */}
                <div className={styles.cardHeader}>
                    <div>
                        <div className={styles.cardPeriod}>
                            {nomeMes(comp.mes)} {comp.ano}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {periodo}
                        </div>
                    </div>
                    {renderBadge(comp.status)}
                </div>

                {/* Metadados */}
                <div className={styles.cardMeta}>
                    {isAtiva && (
                        <div className={styles.cardMetaRow}>
                            <Activity size={14} />
                            <span>Período em andamento — competência atual do sistema</span>
                        </div>
                    )}
                    {isFechada && (
                        <div className={styles.cardMetaRow}>
                            <CheckCircle size={14} />
                            <span>Período encerrado — histórico preservado para auditoria</span>
                        </div>
                    )}
                    {isArquivada && (
                        <div className={styles.cardMetaRow}>
                            <Archive size={14} />
                            <span>Período arquivado — dados mantidos para consulta histórica</span>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className={styles.cardActions}>
                    {/* Encerrar — disponível apenas para ativas */}
                    {isAtiva && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleUpdateStatus(comp.id, 'FECHADA', periodo)}
                            title="Encerrar esta competência"
                        >
                            <CheckCircle size={14} style={{ marginRight: '5px' }} />
                            Encerrar
                        </Button>
                    )}

                    {/* Arquivar — disponível para fechadas */}
                    {isFechada && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleUpdateStatus(comp.id, 'ARQUIVADA', periodo)}
                            title="Arquivar esta competência"
                        >
                            <Archive size={14} style={{ marginRight: '5px' }} />
                            Arquivar
                        </Button>
                    )}

                    {/* DELETE: oculto para ativas, disponível com proteção para demais */}
                    {isAtiva ? (
                        /* Botão desabilitado com tooltip explicativo para ativas */
                        <div className={styles.disabledActionWrapper}>
                            <Button
                                variant="danger-outline"
                                size="small"
                                disabled
                                style={{ opacity: 0.4, cursor: 'not-allowed' }}
                                title="Competências ativas não podem ser excluídas"
                            >
                                <Lock size={14} style={{ marginRight: '5px' }} />
                                Protegida
                            </Button>
                            <span className={styles.blockedTooltip}>
                                Competências ativas não podem ser excluídas
                            </span>
                        </div>
                    ) : (
                        /* Botão de exclusão com modal de senha para fechadas/arquivadas */
                        <Button
                            variant="danger-outline"
                            size="small"
                            onClick={() => handleDeleteClick(comp)}
                            title="Excluir histórico (requer confirmação de senha)"
                        >
                            <Trash2 size={14} style={{ marginRight: '5px' }} />
                            Excluir
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    // ─────────────────────────────────────────────
    // Render Principal
    // ─────────────────────────────────────────────

    return (
        <div className="view-section active">

            {/* Cabeçalho da página */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.headerTitle}>Gestão de Competências</h1>
                    <p className={styles.headerSubtitle}>
                        Controle a abertura, fechamento e histórico dos períodos de apuração do sistema.
                        Somente uma competência pode estar ativa por vez.
                    </p>
                </div>
                <div className={styles.headerRight}>
                    <Button
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Plus size={18} />
                        Nova Competência
                    </Button>
                </div>
            </div>

            {/* Banner de competência ativa (quando existe) */}
            {!loading && competenciaAtiva && (
                <div className={styles.activeBanner}>
                    <div className={styles.activeBannerIcon}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.activeBannerContent}>
                        <div className={styles.activeBannerLabel}>Competência Ativa Atual</div>
                        <div className={styles.activeBannerPeriod}>
                            {nomeMes(competenciaAtiva.mes)} / {competenciaAtiva.ano} — {formatarPeriodo(competenciaAtiva)}
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo principal */}
            {loading ? (
                <div className={styles.loading}>
                    <Clock size={20} />
                    <span>Carregando competências...</span>
                </div>
            ) : competences.length === 0 ? (
                <div className={styles.emptyState}>
                    <Calendar size={52} className={styles.emptyStateIcon} />
                    <p className={styles.emptyStateTitle}>Nenhuma competência cadastrada</p>
                    <p className={styles.emptyStateSubtitle}>
                        Clique em "Nova Competência" para iniciar o ciclo de apuração.
                    </p>
                </div>
            ) : (
                <div className={styles.cardsGrid}>
                    {competences.map(renderCompCard)}
                </div>
            )}

            {/* Nota informativa */}
            <div className={styles.infoNote}>
                <p>
                    <strong>Regras do Sistema:</strong> Apenas <strong>uma</strong> competência pode estar ativa por vez.
                    Competências ativas <strong>não podem ser excluídas</strong>.
                    A exclusão de competências fechadas ou arquivadas requer <strong>confirmação de senha</strong> por segurança.
                </p>
            </div>

            {/* ── Modal: Criar Nova Competência ── */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => { setIsCreateModalOpen(false); setNewMonth(''); setNewYear(''); }}
                title="Abertura de Nova Competência"
                size="sm"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => { setIsCreateModalOpen(false); setNewMonth(''); setNewYear(''); }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateCompetence}
                            disabled={isSaving || !newMonth || !newYear}
                        >
                            {isSaving ? 'Gerando...' : 'Gerar Competência'}
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
                            { label: 'Selecione o mês...', value: '' },
                            ...['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                            ].map((nome, i) => ({
                                label: `${String(i + 1).padStart(2, '0')} — ${nome}`,
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
                            { label: 'Selecione o ano...', value: '' },
                            ...[...Array(6)].map((_, i) => {
                                const year = 2025 + i;
                                return { label: year.toString(), value: year.toString() };
                            })
                        ]}
                        required
                    />
                </form>
            </Modal>

            {/* ── Modal: Confirmação de Senha para Exclusão ── */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={handleCloseDeleteModal}
                title="Confirmar Exclusão de Competência"
                size="sm"
                closeOnOverlayClick={false}
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={handleCloseDeleteModal}
                            disabled={deleteModal.isVerifying}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                            disabled={!deleteModal.password || deleteModal.isVerifying}
                        >
                            {deleteModal.isVerifying ? 'Verificando...' : 'Confirmar Exclusão'}
                        </Button>
                    </>
                }
            >
                <div className={styles.deleteModalContent}>
                    {/* Aviso de ação irreversível */}
                    <div className={styles.deleteWarningBanner}>
                        <AlertTriangle size={20} className={styles.deleteWarningIcon} />
                        <div className={styles.deleteWarningText}>
                            <strong>Ação irreversível e sensível</strong>
                            Esta exclusão removerá permanentemente a competência e todos os dados históricos vinculados a ela.
                            Isso pode impactar auditorias futuras.
                        </div>
                    </div>

                    {/* Nome da competência que será excluída */}
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>
                            COMPETÊNCIA A SER EXCLUÍDA
                        </div>
                        <div className={styles.deleteCompName}>
                            {deleteModal.competencia?.periodo} — {
                                deleteModal.competencia
                                    ? nomeMes(deleteModal.competencia.mes)
                                    : ''
                            } {deleteModal.competencia?.ano}
                        </div>
                    </div>

                    {/* Campo de senha */}
                    <div>
                        <GlassInput
                            ref={passwordInputRef}
                            label="Confirme sua senha para prosseguir"
                            type="password"
                            value={deleteModal.password}
                            onChange={handlePasswordChange}
                            placeholder="Digite sua senha de acesso"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && deleteModal.password) {
                                    handleConfirmDelete();
                                }
                            }}
                        />
                        {/* Mensagem de erro inline */}
                        {deleteModal.passwordError && (
                            <div className={styles.passwordErrorMsg}>
                                <XCircle size={14} />
                                {deleteModal.passwordError}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Competences;
