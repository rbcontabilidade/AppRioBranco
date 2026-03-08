import React, { useState, useEffect, useMemo } from 'react';
import { 
    Shield, 
    Plus, 
    Search, 
    Filter, 
    ChevronDown, 
    MoreVertical, 
    Trash2, 
    Edit2, 
    CheckCircle2, 
    XCircle,
    Layers,
    Clock,
    UserCheck,
    AlertCircle,
    ChevronUp,
    Info,
    Layout,
    ArrowUp,
    ArrowDown,
    Save,
    X
} from 'lucide-react';
import styles from './RolesSettings.module.css';
import { 
    getCargos, 
    createCargo, 
    updateCargo, 
    deleteCargo,
    getCargoNiveis,
    createCargoNivel,
    updateCargoNivel,
    deleteCargoNivel
} from '../../../services/api';
import { useDialog } from '../../../contexts/DialogContext';
import { SYSTEM_SCREENS } from '../../../config/screens';

const RolesSettings = () => {
    // Estados principais
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedRoleId, setExpandedRoleId] = useState(null);
    const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' ou 'levels'
    
    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' ou 'edit'
    const [editingRole, setEditingRole] = useState(null);
    const [formData, setFormData] = useState({
        nome_cargo: '',
        telas_permitidas: [],
        status: 'ativo'
    });

    // Estados de Níveis
    const [levels, setLevels] = useState({}); // { roleId: [levels] }
    const [loadingLevels, setLoadingLevels] = useState({});
    const [levelModalOpen, setLevelModalOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState(null);
    const [levelFormData, setLevelFormData] = useState({
        nome_nivel: '',
        descricao: '',
        ordem: 1,
        status: 'ativo'
    });

    const { showAlert, showConfirm, showToast } = useDialog();

    // Carregar cargos inicial
    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            console.log('🚀 [RolesSettings] Iniciando fetchRoles...');
            const response = await getCargos();
            console.log('📦 [RolesSettings] Resposta bruta da API:', response);
            
            // Garantir que temos um array
            const rawData = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : []);
            console.log('🔍 [RolesSettings] Dados extraídos para processamento:', rawData);

            if (!Array.isArray(rawData)) {
                throw new Error('A API não retornou um formato de lista válido.');
            }

            // Normalização de dados para compatibilidade total
            const normalizedData = rawData.map(role => {
                // 1. Normalizar Telas (Pode vir como string JSON em registros antigos)
                let normalizedTelas = role.telas_permitidas;
                if (typeof normalizedTelas === 'string') {
                    try {
                        normalizedTelas = JSON.parse(normalizedTelas);
                    } catch (e) {
                        console.warn(`⚠️ [RolesSettings] Erro ao parsear telas do cargo ${role.id}:`, e);
                        normalizedTelas = [];
                    }
                }
                if (!Array.isArray(normalizedTelas)) normalizedTelas = [];

                // 2. Normalizar Status (Pode vir como booleano true/false ou string 'ativo'/'inativo')
                let normalizedStatus = role.status;
                if (typeof normalizedStatus === 'boolean') {
                    normalizedStatus = normalizedStatus ? 'ativo' : 'inativo';
                }
                
                // Fallback para nulos ou indefinidos (compatibilidade legado)
                if (normalizedStatus === null || normalizedStatus === undefined) {
                    normalizedStatus = 'ativo';
                }

                return {
                    ...role,
                    telas_permitidas: normalizedTelas,
                    status: String(normalizedStatus).toLowerCase()
                };
            });

            console.log('✅ [RolesSettings] Dados normalizados com sucesso:', normalizedData);
            setRoles(normalizedData);
            setError(null);
        } catch (err) {
            console.error('❌ [RolesSettings] Erro crítico ao carregar cargos:', err);
            const errorMsg = err.response?.data?.detail || err.message || 'Erro desconhecido';
            setError(`Erro ao carregar cargos: ${errorMsg}`);
            showToast(`Erro na integração de dados: ${errorMsg}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filtragem de cargos
    const filteredRoles = useMemo(() => {
        return roles.filter(role => {
            const roleName = role.nome_cargo || '';
            const matchesSearch = roleName.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Filtro de status robusto
            const matchesStatus = statusFilter === 'all' || role.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }, [roles, searchTerm, statusFilter]);

    // Gerenciamento de Expansão
    const handleToggleExpand = async (roleId) => {
        if (expandedRoleId === roleId) {
            setExpandedRoleId(null);
        } else {
            setExpandedRoleId(roleId);
            if (!levels[roleId]) {
                fetchLevels(roleId);
            }
        }
    };

    // Lógica de Níveis (Hierarquia)
    const fetchLevels = async (roleId) => {
        try {
            setLoadingLevels(prev => ({ ...prev, [roleId]: true }));
            const data = await getCargoNiveis(roleId);
            setLevels(prev => ({ ...prev, [roleId]: data || [] }));
        } catch (err) {
            console.error(`Erro ao carregar níveis para cargo ${roleId}:`, err);
            // Fallback para lista vazia se a tabela não existir ou erro
            setLevels(prev => ({ ...prev, [roleId]: [] }));
        } finally {
            setLoadingLevels(prev => ({ ...prev, [roleId]: false }));
        }
    };

    // Operações de Cargo
    const handleOpenCreateModal = () => {
        setModalMode('create');
        setEditingRole(null);
        setFormData({
            nome_cargo: '',
            telas_permitidas: [],
            status: 'ativo'
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (role, e) => {
        e?.stopPropagation();
        setModalMode('edit');
        setEditingRole(role);
        setFormData({
            nome_cargo: role.nome_cargo || '',
            telas_permitidas: Array.isArray(role.telas_permitidas) ? role.telas_permitidas : [],
            status: role.status || 'ativo'
        });
        setIsModalOpen(true);
    };

    const handleSaveRole = async () => {
        if (!formData.nome_cargo.trim()) {
            showToast('O nome do cargo é obrigatório', 'warning');
            return;
        }

        try {
            setIsSubmitting(true);
            if (modalMode === 'create') {
                await createCargo(formData);
                showToast('Cargo criado com sucesso!', 'success');
            } else {
                await updateCargo(editingRole.id, formData);
                showToast('Cargo atualizado com sucesso!', 'success');
            }
            setIsModalOpen(false);
            fetchRoles();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Erro ao salvar cargo.';
            showToast(msg, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRole = async (role, e) => {
        e?.stopPropagation();
        const confirmed = await showConfirm(
            'Excluir Cargo',
            `Tem certeza que deseja excluir o cargo "${role.nome_cargo}"? Esta ação não pode ser desfeita.`
        );

        if (confirmed) {
            try {
                await deleteCargo(role.id);
                showToast('Cargo excluído com sucesso!', 'success');
                fetchRoles();
            } catch (err) {
                const msg = err.response?.data?.detail || 'Erro ao excluir cargo. Verifique se existem usuários vinculados.';
                showToast(msg, 'error');
            }
        }
    };

    const handleToggleScreen = (screenId) => {
        setFormData(prev => {
            const current = [...prev.telas_permitidas];
            const index = current.indexOf(screenId);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(screenId);
            }
            return { ...prev, telas_permitidas: current };
        });
    };

    // Operações de Nível
    const handleAddLevel = (roleId) => {
        setEditingLevel(null);
        const currentLevels = levels[roleId] || [];
        setLevelFormData({
            nome_nivel: '',
            descricao: '',
            ordem: currentLevels.length + 1,
            status: 'ativo',
            cargo_id: roleId
        });
        setLevelModalOpen(true);
    };

    const handleEditLevel = (level) => {
        setEditingLevel(level);
        setLevelFormData({
            nome_nivel: level.nome_nivel,
            descricao: level.descricao || '',
            ordem: level.ordem,
            status: level.status,
            cargo_id: level.cargo_id
        });
        setLevelModalOpen(true);
    };

    const handleSaveLevel = async () => {
        if (!levelFormData.nome_nivel.trim()) {
            showToast('O nome do nível é obrigatório', 'warning');
            return;
        }

        try {
            if (editingLevel) {
                await updateCargoNivel(editingLevel.id, levelFormData);
                showToast('Nível atualizado!', 'success');
            } else {
                await createCargoNivel(levelFormData);
                showToast('Nível adicionado!', 'success');
            }
            setLevelModalOpen(false);
            fetchLevels(levelFormData.cargo_id);
        } catch (err) {
            showToast('Erro ao salvar nível.', 'error');
        }
    };

    const handleDeleteLevel = async (level) => {
        const confirmed = await showConfirm(
            'Remover Nível',
            `Deseja remover o nível "${level.nome_nivel}"?`
        );
        if (confirmed) {
            try {
                await deleteCargoNivel(level.id);
                showToast('Nível removido!', 'success');
                fetchLevels(level.cargo_id);
            } catch (err) {
                showToast('Erro ao remover nível.', 'error');
            }
        }
    };

    const handleReorderLevel = async (level, direction) => {
        const roleLevels = [...(levels[level.cargo_id] || [])];
        const currentIndex = roleLevels.findIndex(l => l.id === level.id);
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (newIndex < 0 || newIndex >= roleLevels.length) return;

        // Troca simples de ordem local para feedback imediato
        const targetLevel = roleLevels[newIndex];
        const oldOrder = level.ordem;
        const newOrder = targetLevel.ordem;

        try {
            // Atualiza ambos no backend
            await updateCargoNivel(level.id, { ...level, ordem: newOrder });
            await updateCargoNivel(targetLevel.id, { ...targetLevel, ordem: oldOrder });
            fetchLevels(level.cargo_id);
        } catch (err) {
            showToast('Erro ao reordenar.', 'error');
        }
    };

    // Render Helpers
    if (loading && roles.length === 0) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Carregando configurações de acesso...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header Profissional */}
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <span className={styles.breadcrumb}>Configurações / Sistema</span>
                    <h1 className={styles.mainTitle}>
                        <Shield size={32} />
                        Cargos e Permissões
                    </h1>
                    <p className={styles.description}>
                        Gerencie os papéis de acesso do sistema, defina permissões por tela e organize a hierarquia operacional.
                    </p>
                </div>
                <button className="btn-primary" onClick={handleOpenCreateModal}>
                    <Plus size={20} />
                    Novo Cargo
                </button>
            </header>

            {/* Toolbar com Filtros */}
            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome do cargo..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className={styles.filters}>
                    <div className={styles.filterGroup}>
                        <Filter size={16} />
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Todos os Status</option>
                            <option value="ativo">Apenas Ativos</option>
                            <option value="inativo">Apenas Inativos</option>
                        </select>
                    </div>
                </div>

                <div className={styles.stats}>
                    Exibindo <strong>{filteredRoles.length}</strong> cargos
                </div>
            </div>

            {/* Listagem de Cargos */}
            <div className={styles.rolesList}>
                {filteredRoles.length > 0 ? (
                    filteredRoles.map(role => (
                        <div 
                            key={role.id} 
                            className={`${styles.roleCard} ${expandedRoleId === role.id ? styles.roleCardExpanded : ''}`}
                        >
                            <div className={styles.roleHeader} onClick={() => handleToggleExpand(role.id)}>
                                <div className={styles.rolePrimary}>
                                    <div className={styles.roleIcon}>
                                        <Shield size={24} />
                                    </div>
                                    <div className={styles.roleMainInfo}>
                                        <span className={styles.roleLabel}>{role.nome_cargo}</span>
                                        <div className={styles.roleBadges}>
                                            <span className={styles.badge}>
                                                {Array.isArray(role.telas_permitidas) ? role.telas_permitidas.length : 0} módulos
                                            </span>
                                            <span className={`${styles.statusPill} ${role.status === 'ativo' ? styles.active : styles.inactive}`}>
                                                {role.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.roleActions}>
                                    <button 
                                        className={styles.actionBtn} 
                                        onClick={(e) => handleOpenEditModal(role, e)}
                                        title="Editar Cargo"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        className={`${styles.actionBtn} ${styles.danger}`}
                                        onClick={(e) => handleDeleteRole(role, e)}
                                        title="Excluir Cargo"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className={`${styles.chevron} ${expandedRoleId === role.id ? styles.open : ''}`}>
                                        <ChevronDown size={20} />
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Expandido */}
                            <div className={`${styles.collapsedContent} ${expandedRoleId === role.id ? styles.expanded : ''}`}>
                                <div className={styles.tabsBar}>
                                    <button 
                                        className={`${styles.tabItem} ${activeTab === 'permissions' ? styles.tabActive : ''}`}
                                        onClick={() => setActiveTab('permissions')}
                                    >
                                        <Layout size={16} />
                                        Permissões de Acesso
                                    </button>
                                    <button 
                                        className={`${styles.tabItem} ${activeTab === 'levels' ? styles.tabActive : ''}`}
                                        onClick={() => setActiveTab('levels')}
                                    >
                                        <Layers size={16} />
                                        Níveis e Hierarquia
                                    </button>
                                </div>

                                <div className={styles.tabPanel}>
                                    {activeTab === 'permissions' ? (
                                        <div className={styles.permissionsPanel}>
                                            <div className={styles.panelInfo}>
                                                <Info size={16} />
                                                Este cargo possui acesso às seguintes telas e módulos do sistema:
                                            </div>
                                            <div className={styles.screensGrid}>
                                                {SYSTEM_SCREENS.map(screen => {
                                                    const isPermitted = role.telas_permitidas?.includes(screen.id);
                                                    return (
                                                        <div 
                                                            key={screen.id} 
                                                            className={`${styles.permissionCard} ${isPermitted ? styles.permissionCardActive : ''}`}
                                                        >
                                                            <div className={styles.permCheck}>
                                                                {isPermitted ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                            </div>
                                                            <div className={styles.permInfo}>
                                                                <span className={styles.permName}>{screen.label}</span>
                                                                <span className={styles.permStatus}>
                                                                    {isPermitted ? 'Permitido' : 'Bloqueado'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            <div className={styles.metadataSection}>
                                                {role.created_at && (
                                                    <div className={styles.metaBox}>
                                                        <Clock size={14} />
                                                        Criado em: {new Date(role.created_at).toLocaleDateString('pt-BR')}
                                                    </div>
                                                )}
                                                {role.updated_at && (
                                                    <div className={styles.metaBox}>
                                                        <UserCheck size={14} />
                                                        Última atualização: {new Date(role.updated_at).toLocaleDateString('pt-BR')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={styles.levelsSection}>
                                            <div className={styles.levelsHeader}>
                                                <h4 className={styles.sectionTitle}>Níveis deste Cargo</h4>
                                                <button 
                                                    className="btn-secondary btn-sm"
                                                    onClick={() => handleAddLevel(role.id)}
                                                >
                                                    <Plus size={14} />
                                                    Adicionar Nível
                                                </button>
                                            </div>

                                            {loadingLevels[role.id] ? (
                                                <div className={styles.emptyStateMini}>Carregando níveis...</div>
                                            ) : (levels[role.id] || []).length > 0 ? (
                                                <div className={styles.levelsList}>
                                                    {(levels[role.id] || [])
                                                        .sort((a,b) => a.ordem - b.ordem)
                                                        .map((lvl, idx, arr) => (
                                                        <div key={lvl.id} className={styles.levelItem}>
                                                            <div className={styles.levelMain}>
                                                                <div className={styles.reorderBtns}>
                                                                    <button 
                                                                        className={styles.orderBtn}
                                                                        onClick={() => handleReorderLevel(lvl, 'up')}
                                                                        disabled={idx === 0}
                                                                    >
                                                                        <ChevronUp size={14} />
                                                                    </button>
                                                                    <button 
                                                                        className={styles.orderBtn}
                                                                        onClick={() => handleReorderLevel(lvl, 'down')}
                                                                        disabled={idx === arr.length - 1}
                                                                    >
                                                                        <ChevronDown size={14} />
                                                                    </button>
                                                                </div>
                                                                <div className={styles.levelBadge}>{lvl.ordem}</div>
                                                                <div className={styles.levelText}>
                                                                    <span className={styles.levelName}>
                                                                        {lvl.nome_nivel}
                                                                        {lvl.status === 'inativo' && <span className={styles.inactiveTag}>Inativo</span>}
                                                                    </span>
                                                                    <span className={styles.levelDesc}>{lvl.descricao || 'Sem descrição'}</span>
                                                                </div>
                                                            </div>
                                                            <div className={styles.levelActions}>
                                                                <button className={styles.iconBtn} onClick={() => handleEditLevel(lvl)}>
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => handleDeleteLevel(lvl)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className={styles.emptyStateMini}>
                                                    Nenhum nível hierárquico definido para este cargo.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <AlertCircle size={48} />
                        <h4>Nenhum cargo encontrado</h4>
                        <p>Tente ajustar seus filtros de busca ou crie um novo cargo para começar.</p>
                        <button className="btn-secondary" onClick={() => {setSearchTerm(''); setStatusFilter('all');}}>
                            Limpar Filtros
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Cargo (Criar/Editar) */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {modalMode === 'create' ? 'Criar Novo Cargo' : 'Editar Cargo'}
                            </h3>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label>Nome do Cargo</label>
                                <div className={styles.inputWithIcon}>
                                    <Shield size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Analista Fiscal Sênior" 
                                        value={formData.nome_cargo}
                                        onChange={(e) => setFormData({...formData, nome_cargo: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className={styles.switchRow}>
                                <label className={styles.switchLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.status === 'ativo'}
                                        onChange={(e) => setFormData({...formData, status: e.target.checked ? 'ativo' : 'inativo'})}
                                    />
                                    <span className={styles.switchText}>Cargo Ativo (Permite vincular novos usuários)</span>
                                </label>
                            </div>

                            <div className={styles.permissionsSection}>
                                <h4 className={styles.sectionHeading}>
                                    <Layout size={18} />
                                    Permissões de Telas
                                </h4>
                                <div className={styles.permissionsSelectGrid}>
                                    {SYSTEM_SCREENS.map(screen => (
                                        <div 
                                            key={screen.id} 
                                            className={styles.checkItem}
                                            onClick={() => handleToggleScreen(screen.id)}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={formData.telas_permitidas.includes(screen.id)}
                                                readOnly
                                            />
                                            <span className={styles.checkLabel}>{screen.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleSaveRole} disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : modalMode === 'create' ? 'Criar Cargo' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Nível (Criar/Editar) */}
            {levelModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{maxWidth: '500px'}}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {editingLevel ? 'Editar Nível' : 'Novo Nível'}
                            </h3>
                            <button className={styles.closeBtn} onClick={() => setLevelModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label>Nome do Nível</label>
                                <input 
                                    className={styles.styledInput}
                                    type="text" 
                                    placeholder="Ex: Nível 1, Pleno, etc." 
                                    value={levelFormData.nome_nivel}
                                    onChange={(e) => setLevelFormData({...levelFormData, nome_nivel: e.target.value})}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Descrição</label>
                                <textarea 
                                    className={styles.styledTextarea}
                                    placeholder="Descreva as responsabilidades deste nível..."
                                    rows={3}
                                    value={levelFormData.descricao}
                                    onChange={(e) => setLevelFormData({...levelFormData, descricao: e.target.value})}
                                />
                            </div>

                            <div className={styles.switchRow}>
                                <label className={styles.switchLabel}>
                                    <input 
                                        type="checkbox" 
                                        checked={levelFormData.status === 'ativo'}
                                        onChange={(e) => setLevelFormData({...levelFormData, status: e.target.checked ? 'ativo' : 'inativo'})}
                                    />
                                    <span className={styles.switchText}>Nível Ativo</span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setLevelModalOpen(false)}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleSaveLevel}>
                                <Plus size={18} />
                                {editingLevel ? 'Salvar' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RolesSettings;
