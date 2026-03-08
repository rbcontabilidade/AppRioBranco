import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import { Button } from '../../../components/ui/Button/Button';
import api from '../../../services/api';
import { 
    Shield, Plus, Edit2, Trash2, ChevronDown, ChevronUp, 
    Search, Layers, CheckSquare, X, ArrowUp, ArrowDown
} from 'lucide-react';
import { useDialog } from '../../../contexts/DialogContext';
import styles from './RolesSettings.module.css';

const AVAILABLE_SCREENS = [
    { id: 'dashboard', name: 'Dashboard' },
    { id: 'import', name: 'Importação' },
    { id: 'audit', name: 'Auditoria' },
    { id: 'clients', name: 'Clientes' },
    { id: 'tasks', name: 'Tarefas' },
    { id: 'settings', name: 'Configurações' },
    { id: 'reports', name: 'Relatórios' },
    { id: 'rh', name: 'Recursos Humanos' }
];

export const RolesSettings = () => {
    const [roles, setRoles] = useState([]);
    const [levels, setLevels] = useState({});
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [expandedRole, setExpandedRole] = useState(null);
    const [activeTab, setActiveTab] = useState('permissions');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const { showAlert, showConfirm } = useDialog();

    // Modals state
    const [roleModal, setRoleModal] = useState({ isOpen: false, data: null });
    const [levelModal, setLevelModal] = useState({ isOpen: false, roleId: null, data: null });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            setPageError(null);
            const response = await api.get('/cargos');
            
            // Garantir que trabalhamos com um Array
            let rawData = Array.isArray(response.data) ? response.data : 
                          (response.data?.data ? response.data.data : []);

            const rolesData = rawData.map(r => {
                let parsedTelas = [];
                // Sanitização segura de telas_permitidas legadas e atuais
                if (r?.telas_permitidas) {
                    if (Array.isArray(r.telas_permitidas)) {
                        parsedTelas = r.telas_permitidas;
                    } else if (typeof r.telas_permitidas === 'string') {
                        try {
                            parsedTelas = JSON.parse(r.telas_permitidas);
                            if (!Array.isArray(parsedTelas)) parsedTelas = [r.telas_permitidas];
                        } catch (e) {
                             parsedTelas = [r.telas_permitidas]; // Formato raw/desconhecido stringificado
                        }
                    }
                }

                return { 
                    ...r, 
                    nome_cargo: r?.nome_cargo || 'Cargo Sem Nome',
                    telas_permitidas: parsedTelas,
                    status: (r?.status !== false && r?.status !== 'false' && r?.status !== 0) // Consider active unless explicitly inactive
                };
            }).filter(Boolean);
            setRoles(rolesData);
        } catch (error) {
            console.error('Error fetching roles from backend:', error);
            setPageError('Não foi possível carregar as informações de cargos e níveis do sistema. Por favor, tente recarregar a página.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLevels = async (roleId) => {
        try {
            const response = await api.get(`/cargos/${roleId}/niveis`);
            setLevels(prev => ({ ...prev, [roleId]: Array.isArray(response.data) ? response.data : [] }));
        } catch (error) {
            console.error(`Error fetching levels for role ${roleId}:`, error);
            showAlert('Falha na Comunicação', 'Não foi possível carregar os níveis deste cargo e eles não serão renderizados temporariamente.', 'error');
        }
    };

    const handleExpandRole = (roleId) => {
        if (expandedRole === roleId) {
            setExpandedRole(null);
        } else {
            setExpandedRole(roleId);
            setActiveTab('permissions');
            if (!levels[roleId]) {
                fetchLevels(roleId);
            }
        }
    };

    // --- Role Actions ---
    const handleSaveRole = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const permissions = AVAILABLE_SCREENS.filter(s => formData.get(`perm_${s.id}`) === 'on').map(s => s.id);
        
        const payload = {
            nome_cargo: formData.get('nome_cargo'),
            status: formData.get('status') === 'on',
            telas_permitidas: permissions
        };

        try {
            if (roleModal.data?.id) {
                await api.put(`/cargos/${roleModal.data.id}`, payload);
                showAlert('Sucesso', 'Cargo atualizado com sucesso.', 'success');
            } else {
                await api.post('/cargos', payload);
                showAlert('Sucesso', 'Cargo criado com sucesso.', 'success');
            }
            setRoleModal({ isOpen: false, data: null });
            fetchRoles();
        } catch (error) {
            console.error('Error saving role:', error);
            showAlert('Erro', 'Falha ao salvar cargo.', 'error');
        }
    };

    const handleDeleteRole = async (roleId, e) => {
        e.stopPropagation();
        
        const hasLevels = levels[roleId] && levels[roleId].length > 0;
        
        showConfirm(
            'Excluir Cargo',
            hasLevels 
                ? 'Este cargo possui níveis cadastrados. Excluir o cargo também excluirá ou restringirá os níveis (dependendo das regras). Deseja realmente prosseguir?' 
                : 'Tem certeza que deseja excluir este cargo? Esta ação é irreversível.',
            async () => {
                try {
                    await api.delete(`/cargos/${roleId}`);
                    showAlert('Sucesso', 'Cargo excluído com sucesso.', 'success');
                    fetchRoles();
                    if (expandedRole === roleId) setExpandedRole(null);
                } catch (error) {
                    console.error('Error deleting role:', error);
                    showAlert('Erro', 'Não foi possível excluir o cargo. Verifique dependências.', 'error');
                }
            }
        );
    };

    // --- Level Actions ---
    const handleSaveLevel = async (e) => {
        e.preventDefault();
        const roleId = levelModal.roleId;
        const formData = new FormData(e.target);
        
        const payload = {
            nome_nivel: formData.get('nome_nivel'),
            descricao: formData.get('descricao') || '',
            ordem: parseInt(formData.get('ordem') || '0', 10),
            status: formData.get('status') === 'on'
        };

        try {
            if (levelModal.data?.id) {
                await api.put(`/cargos/${roleId}/niveis/${levelModal.data.id}`, payload);
                showAlert('Sucesso', 'Nível atualizado.', 'success');
            } else {
                await api.post(`/cargos/${roleId}/niveis`, payload);
                showAlert('Sucesso', 'Nível adicionado.', 'success');
            }
            setLevelModal({ isOpen: false, roleId: null, data: null });
            fetchLevels(roleId);
        } catch (error) {
            console.error('Error saving level:', error);
            showAlert('Erro', 'Falha ao salvar nível. Verifique a ordem/nome repetido.', 'error');
        }
    };

    const handleDeleteLevel = (roleId, levelId) => {
        showConfirm(
            'Excluir Nível',
            'Confirma a exclusão deste nível hierárquico?',
            async () => {
                try {
                    await api.delete(`/cargos/${roleId}/niveis/${levelId}`);
                    showAlert('Sucesso', 'Nível excluído.', 'success');
                    fetchLevels(roleId);
                } catch (error) {
                    console.error('Error', error);
                    showAlert('Erro', 'Falha ao excluir nível.', 'error');
                }
            }
        );
    };

    const reorderLevel = async (roleId, level, direction) => {
        const roleLevels = [...(levels[roleId] || [])].sort((a,b) => a.ordem - b.ordem);
        const index = roleLevels.findIndex(l => l.id === level.id);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === roleLevels.length - 1)) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const targetLevel = roleLevels[targetIndex];

        // Swap order in UI optimistically
        const newOrder = targetLevel.ordem;
        const oldOrder = level.ordem;
        
        try {
            // Need to update both to swap orders to prevent unique constraint if active.
            // Safe approach: set to negative temp, update target, update source
            await api.put(`/cargos/${roleId}/niveis/${level.id}`, { ordem: -999 });
            await api.put(`/cargos/${roleId}/niveis/${targetLevel.id}`, { ordem: oldOrder });
            await api.put(`/cargos/${roleId}/niveis/${level.id}`, { ordem: newOrder });
            fetchLevels(roleId);
        } catch (error) {
            console.error('Swap error', error);
            showAlert('Erro', 'Falha ao reordenar', 'error');
            fetchLevels(roleId); // revert optimistic
        }
    };

    // --- Renders ---
    const filteredRoles = roles.filter(role => {
        const roleName = (role.nome_cargo || '').toLowerCase();
        const search = (searchQuery || '').toLowerCase();
        const matchesSearch = roleName.includes(search);
        const matchesStatus = statusFilter === 'ALL' || 
                             (statusFilter === 'ACTIVE' && role.status) || 
                             (statusFilter === 'INACTIVE' && !role.status);
        return matchesSearch && matchesStatus;
    });

    const renderPermissionsPanel = (role) => (
        <div className={styles.permissionsGrid}>
            {AVAILABLE_SCREENS.map(screen => {
                const isAllowed = role.telas_permitidas?.includes(screen.id);
                return (
                    <div key={screen.id} className={`${styles.permissionCard} ${isAllowed ? styles.permissionCardActive : ''}`}>
                        <CheckSquare size={20} className={styles.permIcon} />
                        <div className={styles.permInfo}>
                            <span className={styles.permName}>{screen.name}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderLevelsPanel = (roleId) => {
        const roleLevels = levels[roleId] || [];
        
        return (
            <div className={styles.levelsSection}>
                <div className={styles.levelsHeader}>
                    <p className={styles.subtitle}>Gerencie a hierarquia deste cargo (Ex: Junior, Pleno, Senior)</p>
                    <Button size="small" onClick={() => setLevelModal({ isOpen: true, roleId, data: null })}>
                        <Plus size={16} /> Adicionar Nível
                    </Button>
                </div>
                
                {roleLevels.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Layers size={48} className={styles.emptyIcon} />
                        <h4 className={styles.emptyTitle}>Sem Níveis Hierárquicos</h4>
                        <p className={styles.emptyText}>Este cargo é genérico e não possui variações de níveis. Adicione níveis para criar uma escada de progressão.</p>
                    </div>
                ) : (
                    <div className={styles.levelsList}>
                        {roleLevels.sort((a,b) => a.ordem - b.ordem).map((level, idx, arr) => (
                            <div key={level.id} className={styles.levelItem}>
                                <div style={{display: 'flex', alignItems: 'center'}}>
                                    <div className={styles.reorderBtns}>
                                        <button className={styles.orderBtn} disabled={idx === 0} onClick={() => reorderLevel(roleId, level, 'up')} title="Mover para cima"><ArrowUp size={14} /></button>
                                        <button className={styles.orderBtn} disabled={idx === arr.length - 1} onClick={() => reorderLevel(roleId, level, 'down')} title="Mover para baixo"><ArrowDown size={14} /></button>
                                    </div>
                                    <div className={styles.levelOrder}>{level.ordem}</div>
                                    <div className={styles.levelDetails}>
                                        <span className={styles.levelName}>
                                            {level.nome_nivel} 
                                            {!level.status && <span style={{marginLeft: 8, fontSize: '0.7em', color: '#f87171'}}>(Inativo)</span>}
                                        </span>
                                        <span className={styles.levelDesc}>{level.descricao || 'Sem descrição'}</span>
                                    </div>
                                </div>
                                <div className={styles.levelActions}>
                                    <Button size="small" variant="ghost" onClick={() => setLevelModal({ isOpen: true, roleId, data: level })} title="Editar Nível">
                                        <Edit2 size={16} />
                                    </Button>
                                    <Button size="small" variant="ghost" className="text-danger" onClick={() => handleDeleteLevel(roleId, level.id)} title="Excluir Nível">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}><Shield size={24} /> Cargos e Níveis</h2>
                    <p className={styles.subtitle}>Gerencie permissões de sistema e a estrutura hierárquica</p>
                </div>
                <Button onClick={() => setRoleModal({ isOpen: true, data: null })}>
                    <Plus size={18} /> Novo Cargo
                </Button>
            </div>

            <div className={styles.topBar}>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Buscar cargo..." 
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select 
                    className={styles.filterSelect}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="ALL">Todos os Status</option>
                    <option value="ACTIVE">Apenas Ativos</option>
                    <option value="INACTIVE">Apenas Inativos</option>
                </select>
                <div className={styles.resultsCounter}>
                    {filteredRoles.length} cargo(s)
                </div>
            </div>

            {pageError ? (
                <div className={styles.emptyState} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <Shield size={48} className={styles.emptyIcon} style={{ color: '#f87171' }} />
                    <h4 className={styles.emptyTitle} style={{ color: '#f87171' }}>Falha na Comunicação</h4>
                    <p className={styles.emptyText}>{pageError}</p>
                    <Button style={{ marginTop: 16 }} onClick={fetchRoles}>Tentar Novamente</Button>
                </div>
            ) : loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Mapeando sistema de cargos...</div>
            ) : (
                <div className={styles.rolesList}>
                    {filteredRoles.map(role => {
                        const isExpanded = expandedRole === role.id;
                        return (
                            <div key={role.id} className={`${styles.roleCard} ${isExpanded ? styles.roleCardExpanded : ''}`}>
                                <div className={styles.roleHeader} onClick={() => handleExpandRole(role.id)}>
                                    <div className={styles.roleInfo}>
                                        <span className={styles.roleName}>{role.nome_cargo}</span>
                                        <div className={styles.roleMeta}>
                                            <span className={styles.metaItem}>
                                                <CheckSquare size={14} /> {(role.telas_permitidas || []).length} Permissões
                                            </span>
                                            <span className={`${styles.statusBadge} ${role.status ? styles.statusActive : styles.statusInactive}`}>
                                                {role.status ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.roleActions}>
                                        <Button size="small" variant="ghost" onClick={(e) => { e.stopPropagation(); setRoleModal({ isOpen: true, data: role }); }}>
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button size="small" variant="ghost" className="text-danger" onClick={(e) => handleDeleteRole(role.id, e)}>
                                            <Trash2 size={16} />
                                        </Button>
                                        <button className={styles.expandBtn}>
                                            <ChevronDown size={20} className={`${styles.expandIcon} ${isExpanded ? styles.expandIconOpen : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className={styles.roleContent}>
                                        <div className={styles.tabs}>
                                            <button 
                                                className={`${styles.tabBtn} ${activeTab === 'permissions' ? styles.tabActive : ''}`}
                                                onClick={() => setActiveTab('permissions')}
                                            >
                                                <Shield size={16} /> Permissões Base
                                            </button>
                                            <button 
                                                className={`${styles.tabBtn} ${activeTab === 'levels' ? styles.tabActive : ''}`}
                                                onClick={() => setActiveTab('levels')}
                                            >
                                                <Layers size={16} /> Níveis Hierárquicos
                                            </button>
                                        </div>
                                        <div className={styles.tabContent}>
                                            {activeTab === 'permissions' ? renderPermissionsPanel(role) : renderLevelsPanel(role.id)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {!loading && filteredRoles.length === 0 && (
                        <div className={styles.emptyState}>
                            <Shield size={48} className={styles.emptyIcon} />
                            <h4 className={styles.emptyTitle}>Nenhum Cargo Encontrado</h4>
                            <p className={styles.emptyText}>Não localizamos cargos com os filtros atuais. Adicione novos cargos no botão superior.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Simple Modals as Overlays directly (Ensuring Premium UI without wrapper conflicts) */}
            {roleModal.isOpen && (
                <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <GlassCard style={{ width: '100%', maxWidth: '600px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-light)' }}>{roleModal.data ? 'Editar Cargo Base' : 'Novo Cargo Base'}</h3>
                            <button onClick={() => setRoleModal({ isOpen: false, data: null })} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveRole}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nome do Cargo</label>
                                <input type="text" name="nome_cargo" required className={styles.formInput} defaultValue={roleModal.data?.nome_cargo || ''} placeholder="Ex: Analista Fiscal" />
                            </div>
                            
                            <label className={styles.formCheckbox}>
                                <input type="checkbox" name="status" className={styles.checkboxInput} defaultChecked={roleModal.data ? roleModal.data.status : true} />
                                Ativo no sistema
                            </label>

                            <h4 style={{ color: 'var(--text-light)', marginTop: '24px', marginBottom: '12px', fontSize: '1rem' }}>Concessão de Telas</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {AVAILABLE_SCREENS.map(screen => (
                                    <label key={screen.id} className={styles.formCheckbox}>
                                        <input 
                                            type="checkbox" 
                                            name={`perm_${screen.id}`} 
                                            className={styles.checkboxInput} 
                                            defaultChecked={roleModal.data?.telas_permitidas?.includes(screen.id)}
                                        />
                                        {screen.name}
                                    </label>
                                ))}
                            </div>

                            <div className={styles.modalFooter}>
                                <Button type="button" variant="ghost" onClick={() => setRoleModal({ isOpen: false, data: null })}>Cancelar</Button>
                                <Button type="submit">Salvar Cargo</Button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}

            {levelModal.isOpen && (
                <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
                    <GlassCard style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-light)' }}>{levelModal.data ? 'Editar Nível' : 'Novo Nível'}</h3>
                            <button onClick={() => setLevelModal({ isOpen: false, roleId: null, data: null })} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveLevel}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Nome Deste Nível</label>
                                <input type="text" name="nome_nivel" required className={styles.formInput} defaultValue={levelModal.data?.nome_nivel || ''} placeholder="Ex: Junior" />
                            </div>
                            
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Ordem de Precedência (Progressão Numérica)</label>
                                <input type="number" name="ordem" required className={styles.formInput} defaultValue={levelModal.data?.ordem || (levels[levelModal.roleId]?.length > 0 ? Math.max(...levels[levelModal.roleId].map(l => l.ordem)) + 1 : 1)} min="1" />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>Descrição de Escopo (Opcional)</label>
                                <input type="text" name="descricao" className={styles.formInput} defaultValue={levelModal.data?.descricao || ''} placeholder="Breve descrição dos requisitos deste nível" />
                            </div>

                            <label className={styles.formCheckbox}>
                                <input type="checkbox" name="status" className={styles.checkboxInput} defaultChecked={levelModal.data ? levelModal.data.status : true} />
                                Status Ativo
                            </label>

                            <div className={styles.modalFooter}>
                                <Button type="button" variant="ghost" onClick={() => setLevelModal({ isOpen: false, roleId: null, data: null })}>Cancelar</Button>
                                <Button type="submit">Salvar Nível</Button>
                            </div>
                        </form>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};
