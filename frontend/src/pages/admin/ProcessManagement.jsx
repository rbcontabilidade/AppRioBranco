import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, PlayCircle, Edit, LayoutGrid, List, Trash2, Users, Search, Filter, X, ArrowUpDown, Clock, SortAsc, SortDesc, ListFilter } from 'lucide-react';
import { api } from '../../services/api';
import { auditService } from '../../services/auditService';
import DataTable from '../../components/ui/DataTable/DataTable';
import ProcessTemplateModal from '../../components/forms/ProcessTemplateModal';

export const ProcessManagement = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [viewMode, setViewMode] = useState('card'); // 'card' ou 'list'

    // Estado de Filtros e Ordenação
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        sector: 'Todos',
        frequency: 'Todas',
        status: 'Ativos'
    });
    const [sortBy, setSortBy] = useState('newest'); // 'az', 'za', 'newest', 'oldest', 'tasks'
    const [showFilters, setShowFilters] = useState(false);

    // Carregar filtros do sessionStorage
    useEffect(() => {
        const savedFilters = sessionStorage.getItem('process_filters');
        if (savedFilters) {
            try {
                const parsed = JSON.parse(savedFilters);
                if (parsed.searchTerm !== undefined) setSearchTerm(parsed.searchTerm);
                if (parsed.filters) setFilters(parsed.filters);
                if (parsed.sortBy) setSortBy(parsed.sortBy);
                if (parsed.viewMode) setViewMode(parsed.viewMode);
            } catch (e) {
                console.error("Erro ao carregar filtros salvos:", e);
            }
        }
    }, []);

    // Salvar filtros no sessionStorage
    useEffect(() => {
        const stateToSave = { searchTerm, filters, sortBy, viewMode };
        sessionStorage.setItem('process_filters', JSON.stringify(stateToSave));
    }, [searchTerm, filters, sortBy, viewMode]);

    const fetchProcessos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/processos');
            const arrayDeProcessos = response.data?.processos || response.data || [];
            setTemplates(arrayDeProcessos);
        } catch (error) {
            console.error("Erro ao buscar processos da API:", error);
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Filtragem e Ordenação (Memoizada)
    const filteredTemplates = React.useMemo(() => {
        let result = [...templates];

        // 1. Busca por texto
        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter(t => 
                t.nome?.toLowerCase().includes(lowSearch) ||
                t.descricao?.toLowerCase().includes(lowSearch) ||
                (t.setores || []).some(s => s.toLowerCase().includes(lowSearch)) ||
                (t.responsaveis || []).some(r => r.toLowerCase().includes(lowSearch))
            );
        }

        // 2. Filtro por Setor
        if (filters.sector !== 'Todos') {
            result = result.filter(t => (t.setores || []).includes(filters.sector));
        }

        // 3. Filtro por Frequência
        if (filters.frequency !== 'Todas') {
            result = result.filter(t => t.frequencia === filters.frequency);
        }

        // 4. Filtro por Status
        if (filters.status === 'Ativos') {
            result = result.filter(t => t.is_active !== false);
        } else if (filters.status === 'Inativos') {
            result = result.filter(t => t.is_active === false);
        }

        // 5. Ordenação
        result.sort((a, b) => {
            switch (sortBy) {
                case 'az':
                    return a.nome.localeCompare(b.nome);
                case 'za':
                    return b.nome.localeCompare(a.nome);
                case 'oldest':
                    return new Date(a.criado_em) - new Date(b.criado_em);
                case 'newest':
                    return new Date(b.criado_em) - new Date(a.criado_em);
                case 'tasks':
                    return (b.qtd_rotinas || 0) - (a.qtd_rotinas || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [templates, searchTerm, filters, sortBy]);

    // Extrair setores únicos para o filtro
    const availableSectors = React.useMemo(() => {
        const sectors = new Set();
        templates.forEach(t => (t.setores || []).forEach(s => sectors.add(s)));
        return ['Todos', ...Array.from(sectors).sort()];
    }, [templates]);

    useEffect(() => {
        fetchProcessos();
    }, []);

    const handleOpenCreate = () => {
        setSelectedTemplate(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (template) => {
        setSelectedTemplate(template);
        setIsModalOpen(true);
    };

    const handleDeleteProcess = async (processId, processName) => {
        const isConfirmed = window.confirm(`Tem certeza que deseja excluir o processo "${processName}" e todas as suas tarefas e vínculos com clientes?\n\nEssa ação não pode ser desfeita.`);

        if (isConfirmed) {
            try {
                setLoading(true);
                
                // Buscar dados atuais antes de deletar para o log
                const processData = templates.find(t => t.id === processId) || { id: processId, nome: processName };

                await api.delete(`/processos/${processId}`);
                
                // Registro de Auditoria: Sucesso
                await auditService.log({
                    action_type: 'delete',
                    module: 'processos',
                    entity_type: 'template_processo',
                    entity_id: processId,
                    entity_label: processName,
                    description: `Excluiu permanentemente o template de processo '${processName}'.`,
                    old_values: processData,
                    status: 'success',
                    severity: 'high'
                });

                await fetchProcessos();
            } catch (error) {
                console.error("Erro ao excluir processo:", error);
                const errorMsg = error.response?.data?.detail || error.message || "Erro desconhecido";
                
                // Registro de Auditoria: Falha
                await auditService.log({
                    action_type: 'delete',
                    module: 'processos',
                    entity_type: 'template_processo',
                    entity_id: processId,
                    entity_label: processName,
                    description: `Falha ao tentar excluir o processo '${processName}': ${errorMsg}`,
                    status: 'failure',
                    severity: 'high'
                });

                alert("Ocorreu um erro ao tentar excluir o processo: " + errorMsg);
            } finally {
                setLoading(false);
            }
        }
    };
    const columns = ['Nome', 'Frequência', 'Setores', 'Equipe', 'Rotinas', 'Clientes Ativos', 'Ações'];

    const dataRows = filteredTemplates.map(t => [
        <div style={{ fontWeight: '600' }}>{t.nome}</div>,
        <span style={{ 
            fontSize: '0.75rem', 
            padding: '2px 8px', 
            borderRadius: '4px', 
            backgroundColor: 'rgba(255,255,255,0.1)',
            color: 'var(--text-dark)'
        }}>
            {t.frequencia || 'Mensal'}
        </span>,
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(t.setores || []).map(s => (
                <span key={s} style={{ fontSize: '0.7rem', color: 'var(--primary-color)', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {s}
                </span>
            ))}
        </div>,
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(t.responsaveis || []).join(', ') || '-'}
        </div>,
        t.qtd_rotinas || 0,
        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{t.qtd_clientes || 0}</span>,
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="small" onClick={() => handleOpenEdit(t)}>
                <Edit size={14} />
            </Button>
            <Button variant="danger" size="small" onClick={() => handleDeleteProcess(t.id, t.nome)} style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                <Trash2 size={14} />
            </Button>
            <Button variant="primary" size="small" onClick={() => navigate('/admin/process-assignment')}>
                Atribuir
            </Button>
        </div>
    ]);

    return (
        <div className="view-section active">
            <header className="section-header" style={{ marginBottom: '24px' }}>
                <div className="section-title-group">
                    <h1>Sistemas de Processos</h1>
                    <p className="subtitle">Gerencie os modelos dos seus fluxos operacionais e visualize o engajamento de clientes</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setViewMode('card')}
                            style={{
                                padding: '8px', borderRadius: '8px', border: 'none',
                                backgroundColor: viewMode === 'card' ? 'var(--primary-color)' : 'transparent',
                                color: 'white', cursor: 'pointer', display: 'flex'
                            }}
                            title="Visualização em Cards"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px', borderRadius: '8px', border: 'none',
                                backgroundColor: viewMode === 'list' ? 'var(--primary-color)' : 'transparent',
                                color: 'white', cursor: 'pointer', display: 'flex'
                            }}
                            title="Visualização em Lista"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <Button variant="secondary" onClick={() => navigate('/admin/process-assignment')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PlayCircle size={18} /> Lançar Processo
                    </Button>
                    <Button variant="primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Novo Template
                    </Button>
                </div>
            </header>

            {/* Barra de Busca e Filtros Avançados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Input de Busca */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, setor ou equipe..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        {searchTerm && (
                            <X 
                                size={16} 
                                onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }} 
                            />
                        )}
                    </div>

                    {/* Botão de Filtros */}
                    <Button 
                        variant="secondary" 
                        onClick={() => setShowFilters(!showFilters)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            backgroundColor: showFilters || Object.values(filters).some(v => v !== 'Todos' && v !== 'Todas' && v !== 'Ativos') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                            borderColor: showFilters ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)'
                        }}
                    >
                        <Filter size={18} /> Filtros
                    </Button>

                    {/* Ordenação */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <ArrowUpDown size={16} style={{ color: 'var(--text-muted)' }} />
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ background: 'none', border: 'none', color: 'white', outline: 'none', padding: '8px 0', cursor: 'pointer', fontSize: '0.9rem' }}
                        >
                            <option value="newest" style={{ background: '#1a1a1a' }}>Mais Recentes</option>
                            <option value="oldest" style={{ background: '#1a1a1a' }}>Mais Antigos</option>
                            <option value="az" style={{ background: '#1a1a1a' }}>Nome (A-Z)</option>
                            <option value="za" style={{ background: '#1a1a1a' }}>Nome (Z-A)</option>
                            <option value="tasks" style={{ background: '#1a1a1a' }}>Qtd. Tarefas</option>
                        </select>
                    </div>
                </div>

                {/* Painel Expansível de Filtros */}
                {showFilters && (
                    <GlassCard style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', border: '1px solid var(--primary-color)', animation: 'slideDown 0.3s ease' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Setor</label>
                            <select 
                                value={filters.sector}
                                onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                                style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                            >
                                {availableSectors.map(s => <option key={s} value={s} style={{ background: '#1a1a1a' }}>{s}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Frequência</label>
                            <select 
                                value={filters.frequency}
                                onChange={(e) => setFilters(prev => ({ ...prev, frequency: e.target.value }))}
                                style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="Todas" style={{ background: '#1a1a1a' }}>Todas</option>
                                <option value="Mensal" style={{ background: '#1a1a1a' }}>Mensal</option>
                                <option value="Anual" style={{ background: '#1a1a1a' }}>Anual</option>
                                <option value="Avulso" style={{ background: '#1a1a1a' }}>Avulso</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Status</label>
                            <select 
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="Todos" style={{ background: '#1a1a1a' }}>Todos</option>
                                <option value="Ativos" style={{ background: '#1a1a1a' }}>Ativos</option>
                                <option value="Inativos" style={{ background: '#1a1a1a' }}>Inativos</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Button 
                                variant="secondary" 
                                size="small" 
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilters({ sector: 'Todos', frequency: 'Todas', status: 'Ativos' });
                                    setSortBy('newest');
                                }}
                                style={{ width: '100%' }}
                            >
                                Limpar Filtros
                            </Button>
                        </div>
                    </GlassCard>
                )}

                {/* Chips de Acesso Rápido */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        onClick={() => setFilters(prev => ({ ...prev, frequency: 'Mensal' }))}
                        style={{ 
                            padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', 
                            background: filters.frequency === 'Mensal' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                            color: 'white', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <ListFilter size={14} /> Rotinas Mensais
                    </button>
                    {availableSectors.filter(s => s !== 'Todos').slice(0, 3).map(s => (
                        <button 
                            key={s}
                            onClick={() => setFilters(prev => ({ ...prev, sector: s }))}
                            style={{ 
                                padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', 
                                background: filters.sector === s ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                                color: 'white', cursor: 'pointer', fontSize: '0.8rem'
                            }}
                        >
                            {s}
                        </button>
                    ))}
                    <button 
                        onClick={() => setSortBy('az')}
                        style={{ 
                            padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', 
                            background: sortBy === 'az' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                            color: 'white', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <SortAsc size={14} /> A-Z
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                    Carregando sistemas de processos...
                </div>
            ) : filteredTemplates.length === 0 ? (
                <GlassCard style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '50%' }}>
                        <Search size={48} style={{ opacity: 0.2 }} />
                    </div>
                    <div>
                        <h3 style={{ color: 'white', marginBottom: '8px' }}>Nenhum processo encontrado</h3>
                        <p>Tente ajustar seus filtros ou termos de busca para encontrar o que procura.</p>
                    </div>
                    <Button variant="secondary" onClick={() => {
                        setSearchTerm('');
                        setFilters({ sector: 'Todos', frequency: 'Todas', status: 'Ativos' });
                    }}>
                        Limpar Todos os Filtros
                    </Button>
                </GlassCard>
            ) : viewMode === 'card' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
                    {filteredTemplates.map(template => (
                        <GlassCard key={template.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', position: 'relative', border: template.is_active === false ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.1)', opacity: template.is_active === false ? 0.6 : 1 }}>
                            {/* Badge de Status Inativo */}
                            {template.is_active === false && (
                                <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--danger)', color: 'white', fontWeight: 'bold', zIndex: 1 }}>
                                    INATIVO
                                </div>
                            )}

                            {/* Badge de Frequência */}
                            <div style={{ 
                                position: 'absolute', 
                                top: '16px', 
                                right: '16px', 
                                fontSize: '0.7rem', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                backgroundColor: template.frequencia === 'Anual' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                                color: template.frequencia === 'Anual' ? '#f59e0b' : 'var(--primary-color)',
                                fontWeight: 'bold',
                                border: template.frequencia === 'Anual' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                {template.frequencia || 'Mensal'}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', paddingRight: '60px' }}>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary-color)' }}>
                                    <FileText size={24} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={template.nome}>{template.nome}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{template.descricao}</p>
                                </div>
                            </div>

                            {/* Setores e Responsáveis */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {(template.setores || []).length > 0 && (
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {template.setores.map(s => (
                                            <span key={s} style={{ 
                                                fontSize: '0.65rem', 
                                                color: 'white', 
                                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                                padding: '4px 10px', 
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                {(template.responsaveis || []).length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            <Users size={14} />
                                            <span>Equipe:</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: '500' }}>
                                            {template.responsaveis.slice(0, 3).join(', ')}
                                            {template.responsaveis.length > 3 && ` +${template.responsaveis.length - 3}`}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rotinas</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{template.qtd_rotinas || 0}</div>
                                </div>
                                <div style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Clientes</div>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{template.qtd_clientes || 0}</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                <Button variant="secondary" size="small" onClick={() => handleOpenEdit(template)}>
                                    <Edit size={16} /> Editar
                                </Button>
                                <Button variant="danger" size="small" onClick={() => handleDeleteProcess(template.id, template.nome)} style={{ backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>
                                    <Trash2 size={16} /> Excluir
                                </Button>
                                <Button variant="primary" size="small" onClick={() => navigate('/admin/process-assignment')}>
                                    Atribuir
                                </Button>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            ) : (
                <div style={{ marginTop: '24px' }}>
                    <DataTable columns={columns} data={dataRows} />
                </div>
            )}

            <ProcessTemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchProcessos}
                initialData={selectedTemplate}
            />
        </div>
    );
};

export default ProcessManagement;
