import React, { useState, useEffect } from 'react';
import DataTable from '../../components/ui/DataTable/DataTable';
import { Button } from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import ClientForm from '../../components/forms/ClientForm';
import { UserPlus, Edit2, Trash2, AlertTriangle, CheckCircle, Search, ExternalLink } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import api from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';

const Clients = () => {
    const { showConfirm, showAlert } = useDialog();
    // Estados do Componente
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('clients-sort-order') || 'razao_social-asc');

    // Estados do Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null); // null = Modo Criar

    // Estados para Seleção em Massa
    const [selectedIds, setSelectedIds] = useState([]);

    // 1. Filtragem e Ordenação (Calculados a cada render)
    const filteredClients = clients.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const name = String(c.razao_social || c.nome || '').toLowerCase();
        const cod = String(c.codigo || '').toLowerCase();
        const cnpjMatch = String(c.cnpj || '').toLowerCase();
        return name.includes(term) || cod.includes(term) || cnpjMatch.includes(term);
    });

    const sortedClients = [...filteredClients].sort((a, b) => {
        if (sortOrder === 'razao_social-asc') {
            return String(a.razao_social || a.nome || '').localeCompare(String(b.razao_social || b.nome || ''));
        } else if (sortOrder === 'razao_social-desc') {
            return String(b.razao_social || b.nome || '').localeCompare(String(a.razao_social || a.nome || ''));
        } else if (sortOrder === 'codigo-asc') {
            return (a.codigo || a.id_interno || a.id || 0) - (b.codigo || b.id_interno || b.id || 0);
        } else if (sortOrder === 'codigo-desc') {
            return (b.codigo || b.id_interno || b.id || 0) - (a.codigo || a.id_interno || a.id || 0);
        } else if (sortOrder === 'status-asc') {
            return (a.ativo === b.ativo) ? 0 : a.ativo ? -1 : 1;
        } else if (sortOrder === 'status-desc') {
            return (a.ativo === b.ativo) ? 0 : a.ativo ? 1 : -1;
        } else if (sortOrder === 'recent-asc') {
            return (b.id || b.id_interno || 0) - (a.id || a.id_interno || 0);
        }
        return 0;
    });

    // 2. Definições de Colunas e Dados da Tabela (Após sortedClients)
    const tableColumns = [
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} key="select-all-header">
            <input 
                type="checkbox" 
                checked={selectedIds.length === sortedClients.length && sortedClients.length > 0} 
                onChange={() => {
                    if (selectedIds.length === sortedClients.length) {
                        setSelectedIds([]);
                    } else {
                        setSelectedIds(sortedClients.map(c => c.id || c.id_interno));
                    }
                }}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }}
            />
        </div>,
        'CÓD', 'RAZÃO SOCIAL', 'CNPJ', 'REGIME', 'DRIVE', 'STATUS', 'AÇÕES'
    ];

    const formatCnpj = (cnpj) => {
        if (!cnpj) return 'N/A';
        let digits = String(cnpj).replace(/\D/g, '');
        digits = digits.padStart(14, '0');
        return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    };

    const tableData = sortedClients.map((client) => [
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} key={`select-${client.id || client.id_interno}`}>
            <input 
                type="checkbox" 
                checked={selectedIds.includes(client.id || client.id_interno)}
                onChange={() => {
                    const id = client.id || client.id_interno;
                    setSelectedIds(prev =>
                        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                    );
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
        </div>,
        <div style={{ color: 'var(--primary-color, #3b82f6)', fontWeight: '600', whiteSpace: 'nowrap' }}>#{client.codigo || client.id_interno || client.id || '000'}</div>,
        <div style={{ fontWeight: 'bold', color: 'var(--text-light, #fff)' }}>{client.razao_social || client.nome || 'Sem Nome'}</div>,
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)', whiteSpace: 'nowrap' }}>{formatCnpj(client.cnpj)}</div>,
        <div>
            <span style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                display: 'inline-block',
                whiteSpace: 'nowrap',
                backgroundColor: (client.regime_tributario || client.regime) === 'Simples Nacional' ? 'rgba(16, 185, 129, 0.1)' :
                    (client.regime_tributario || client.regime) === 'Lucro Presumido' ? 'rgba(59, 130, 246, 0.1)' :
                        (client.regime_tributario || client.regime) === 'Lucro Real' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: (client.regime_tributario || client.regime) === 'Simples Nacional' ? '#10b981' :
                    (client.regime_tributario || client.regime) === 'Lucro Presumido' ? '#3b82f6' :
                        (client.regime_tributario || client.regime) === 'Lucro Real' ? '#db2777' : '#f59e0b'
            }}>
                {client.regime_tributario || client.regime || 'Não Inf'}
            </span>
        </div>,
        client.drive_link ? (
            <a href={client.drive_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color, #3b82f6)' }}>
                <ExternalLink size={18} />
            </a>
        ) : <span style={{ color: 'var(--text-muted, #9ca3af)' }}>-</span>,
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '40px',
                height: '24px',
                cursor: 'pointer'
            }}>
                <input
                    type="checkbox"
                    checked={client.ativo === true}
                    onChange={() => handleToggleStatus(client)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: client.ativo ? 'var(--success, #10b981)' : '#4b5563',
                    transition: '.4s', borderRadius: '34px'
                }}>
                    <span style={{
                        position: 'absolute', content: '""', height: '18px', width: '18px',
                        left: client.ativo ? '18px' : '3px', bottom: '3px',
                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                    }} />
                </span>
            </label>
        </div>,
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button
                variant="secondary"
                size="small"
                onClick={() => handleEditClient(client)}
                style={{ padding: '0.4rem 0.6rem' }}
                title="Editar Cliente"
            >
                <Edit2 size={14} />
            </Button>
            <Button
                variant="danger"
                size="small"
                onClick={() => handleDeleteClient(client)}
                style={{ padding: '0.4rem 0.6rem' }}
                title="Excluir Cliente"
            >
                <Trash2 size={14} />
            </Button>
        </div>
    ]);


    const handleBulkDelete = async () => {
        const isConfirmed = await showConfirm({
            title: 'Excluir Selecionados',
            message: `Deseja excluir permanentemente os ${selectedIds.length} clientes selecionados?`,
            confirmText: 'Excluir Todos',
            variant: 'danger'
        });

        if (!isConfirmed) return;

        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => api.delete(`/clientes/${id}`)));
            setClients(prev => prev.filter(c => !selectedIds.includes(c.id || c.id_interno)));
            setSelectedIds([]);
            showAlert({ title: 'Sucesso', message: 'Clientes removidos com sucesso.', variant: 'success' });
        } catch (err) {
            setError("Erro ao processar exclusão em massa.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatus = async (active) => {
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => api.put(`/clientes/${id}`, { ativo: active })));
            setClients(prev => prev.map(c => 
                selectedIds.includes(c.id || c.id_interno) ? { ...c, ativo: active } : c
            ));
            setSelectedIds([]);
            showAlert({ title: 'Sucesso', message: 'Status atualizados com sucesso.', variant: 'success' });
        } catch (err) {
            setError("Erro ao atualizar status em massa.");
        } finally {
            setLoading(false);
        }
    };

    // Efeito para buscar clientes assim que a tela abre
    useEffect(() => {
        fetchClients();
    }, []);

    // Salvar preferência de ordenação no LocalStorage
    useEffect(() => {
        localStorage.setItem('clients-sort-order', sortOrder);
    }, [sortOrder]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            setError(null);

            // Timeout Wrapper para forçar queda de carregamento se a rede travar (Database Grace Period)
            const fetchWithTimeout = (promise, ms = 8000) => {
                let timer = null;
                const timeout = new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
                });
                return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
            };

            // Requisita a API Real usando os Headers de Autenticação Automáticos
            const response = await fetchWithTimeout(api.get('/clients'), 10000);

            // Certifique-se de prever o formato array retornado pela sua API 
            // ex: response.data ou response.data.clients
            const data = response.data?.clients || response.data || [];
            if (Array.isArray(data)) {
                setClients(data);
            } else {
                // Previne crash caso a API devolva algo diferente numa falha silenciosa
                setClients([]);
                console.warn("API retornou um formato inesperado para /clients:", data);
            }
        } catch (err) {
            console.error("Erro ao buscar a lista de clientes:", err);
            setError("Não foi possível carregar a lista de clientes. Tente atualizar a página.");
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setSelectedClient(null);
        setIsModalOpen(true);
    };

    const handleEditClient = (client) => {
        setSelectedClient(client);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
    };

    const handleFormSuccess = async (savedClient, mode) => {
        closeModal();

        // Alerta Premium de Sucesso
        await showAlert({
            title: 'Sucesso!',
            message: mode === 'create'
                ? "O novo cliente foi cadastrado corretamente na base de dados."
                : "Os dados do cliente foram atualizados com sucesso.",
            variant: 'success',
            confirmText: 'Ótimo'
        });

        // Recarrega lista pela API para espelhar as mudanças do BD
        fetchClients();
    };

    const handleDeleteClient = async (client) => {
        // Confirmar Deleção via Dialog Global (Premium UX)
        const isConfirmed = await showConfirm({
            title: 'Excluir Cliente',
            message: `Tem certeza que deseja remover permanentemente o cliente "${client.nome || client.razao_social}"? Esta ação não pode ser desfeita.`,
            confirmText: 'Sim, Excluir',
            cancelText: 'Cancelar',
            variant: 'danger'
        });

        if (!isConfirmed) return;

        try {
            // Achar ID certo
            const clientId = client.id || client.id_interno;

            // Requisição
            await api.delete(`/clientes/${clientId}`);

            // UI Otimista (Remove da lista instantaneamente sem fazer outro GET)
            setClients(prevClients => prevClients.filter(c => (c.id || c.id_interno) !== clientId));

            // Feedback
            setSuccessMsg("Cliente removido com sucesso!");
            setTimeout(() => setSuccessMsg(''), 3500);

        } catch (err) {
            console.error("Erro ao deletar cliente:", err);
            // Reutiliza o estado de erro local do form/lista da pagina inteira
            setError("Falha ao tentar remover este cliente. O servidor pode ter negado ou ele não existe mais.");
            setTimeout(() => setError(null), 6000);
        }
    };

    const handleToggleStatus = async (client) => {
        try {
            const newValue = !client.ativo;
            const clientId = client.id || client.id_interno;
            await api.put(`/clientes/${clientId}`, { ativo: newValue });
            setClients(prev => prev.map(c => (c.id || c.id_interno) === clientId ? { ...c, ativo: newValue } : c));
            setSuccessMsg(`Status do cliente atualizado com sucesso!`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            console.error("Erro ao atualizar status:", err);
            setError("Falha ao atualizar o status do cliente.");
            setTimeout(() => setError(null), 3000);
        }
    };





    const ClientSummaryCards = () => {
        const total = clients.length;
        const ativos = clients.filter(c => c.ativo === true).length;
        const inativos = total - ativos;

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Total de Clientes</span>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-light)' }}>{total}</span>
                </GlassCard>
                <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Clientes Ativos</span>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success, #10b981)' }}>{ativos}</span>
                </GlassCard>
                <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>Clientes Inativos</span>
                    <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger, #ef4444)' }}>{inativos}</span>
                </GlassCard>
            </div>
        );
    };

    return (
        <div className="view-section active">
            <header className="section-header">
                <div className="section-title-group">
                    <h1>Gestão de Clientes</h1>
                    <p className="subtitle">Gerencie as empresas e seus respectivos CNPJs</p>
                </div>
            </header>

            <ClientSummaryCards />

            {/* Barra de Ações em Massa (Elegante e Flutuante) */}
            {selectedIds.length > 0 && (
                <GlassCard style={{
                    position: 'fixed',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    padding: '16px 32px',
                    width: 'auto',
                    minWidth: '500px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    animation: 'slideUp 0.4s ease-out',
                    gap: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                        }}>
                            {selectedIds.length}
                        </div>
                        <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '1rem' }}>
                            {selectedIds.length === 1 ? 'Cliente selecionado' : 'Clientes selecionados'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button variant="secondary" size="small" onClick={() => handleBulkStatus(true)}>
                            <CheckCircle size={14} style={{ marginRight: '6px' }} /> Ativar
                        </Button>
                        <Button variant="secondary" size="small" onClick={() => handleBulkStatus(false)}>
                            <AlertTriangle size={14} style={{ marginRight: '6px' }} /> Inativar
                        </Button>
                        <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
                        <Button variant="danger" size="small" onClick={handleBulkDelete}>
                            <Trash2 size={14} style={{ marginRight: '6px' }} /> Excluir
                        </Button>
                        <button 
                            onClick={() => setSelectedIds([])}
                            style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'var(--text-muted)', 
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                marginLeft: '8px',
                                textDecoration: 'underline'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>

                    <style>{`
                        @keyframes slideUp {
                            from { transform: translate(-50%, 100px); opacity: 0; }
                            to { transform: translate(-50%, 0); opacity: 1; }
                        }
                    `}</style>
                </GlassCard>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por Nome, Código ou CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 10px 10px 40px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                color: 'var(--text-light)',
                                outline: 'none',
                            }}
                        />
                    </div>

                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(0, 0, 0, 0.2)',
                            color: 'var(--text-light)',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="razao_social-asc" style={{ color: '#000' }}>Ordem Alfabética (A-Z)</option>
                        <option value="razao_social-desc" style={{ color: '#000' }}>Ordem Alfabética (Z-A)</option>
                        <option value="codigo-asc" style={{ color: '#000' }}>Código (Crescente)</option>
                        <option value="codigo-desc" style={{ color: '#000' }}>Código (Decrescente)</option>
                        <option value="status-asc" style={{ color: '#000' }}>Status (Ativos Primeiro)</option>
                        <option value="status-desc" style={{ color: '#000' }}>Status (Inativos Primeiro)</option>
                        <option value="recent-asc" style={{ color: '#000' }}>Adicionados Recente</option>
                    </select>
                </div>

                <Button variant="primary" onClick={openCreateModal}>
                    <UserPlus size={18} style={{ marginRight: '8px' }} />
                    Novo Cliente
                </Button>
            </div>

            {/* Sucesso (Toast Verde) */}
            {successMsg && (
                <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderLeft: '4px solid var(--success)',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '0 8px 8px 0',
                    color: 'var(--text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <CheckCircle color="var(--success)" size={20} />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Tratamento de Erro Limpo */}
            {error && (
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
                    <span>{error}</span>
                </div>
            )
            }

            <div style={{ marginTop: '2rem' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '4rem' }}>
                        <div className="spinner-container">
                            <div className="loading-spinner"></div>
                            <div className="loading-spinner-inner"></div>
                        </div>
                    </div>
                ) : (
                    <DataTable
                        columns={tableColumns}
                        data={tableData}
                        hoverable={true}
                        selectable={false}
                    />
                )}
            </div>

            {/* Portal do Modal do Formulário */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={selectedClient ? "Editar Cadastro" : "Criar Novo Cliente"}
                size="lg"
            >
                <div className="modal-body" style={{ padding: '0 1rem 1rem' }}>
                    <ClientForm
                        initialData={selectedClient}
                        onSuccess={handleFormSuccess}
                        onCancel={closeModal}
                    />
                </div>
            </Modal>
        </div >
    );
};

export default Clients;
