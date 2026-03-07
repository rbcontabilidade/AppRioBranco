import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, PlayCircle, Edit, LayoutGrid, List, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import DataTable from '../../components/ui/DataTable/DataTable';
import ProcessTemplateModal from '../../components/forms/ProcessTemplateModal';

export const ProcessManagement = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [viewMode, setViewMode] = useState('card'); // 'card' ou 'list'

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
                await api.delete(`/processos/${processId}`);
                await fetchProcessos();
                // Opcional: Aqui poderíamos introduzir um alert visual de sucesso mais elegante se houvesse, pro hora o fetchProcessos regarrega a lista
            } catch (error) {
                console.error("Erro ao excluir processo:", error);
                alert("Ocorreu um erro ao tentar excluir o processo. Tente novamente.");
            } finally {
                setLoading(false);
            }
        }
    };
    const columns = ['Nome', 'Frequência', 'Rotinas', 'Clientes Ativos', 'Ações'];

    const dataRows = templates.map(t => [
        <div style={{ fontWeight: '600' }}>{t.nome}</div>,
        t.frequencia || 'Mensal',
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
            <header className="section-header">
                <div className="section-title-group">
                    <h1>Sistemas de Processos</h1>
                    <p className="subtitle">Gerencie os modelos dos seus fluxos operacionais e visualize o engajamento de clientes</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginRight: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setViewMode('card')}
                            style={{
                                padding: '8px', borderRadius: '8px', border: 'none',
                                backgroundColor: viewMode === 'card' ? 'var(--primary-color)' : 'transparent',
                                color: 'white', cursor: 'pointer', display: 'flex'
                            }}
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

            {loading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: '#666' }}>
                    Carregando sistemas de processos...
                </div>
            ) : templates.length === 0 ? (
                <GlassCard style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '24px' }}>
                    <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>Nenhum modelo de processo cadastrado na base de dados.</p>
                </GlassCard>
            ) : viewMode === 'card' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
                    {templates.map(template => (
                        <GlassCard key={template.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary-color)' }}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>{template.nome}</h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>{template.descricao}</p>
                                </div>
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
