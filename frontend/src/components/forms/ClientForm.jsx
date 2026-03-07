import React, { useState, useEffect } from 'react';
import { GlassInput } from '../ui/GlassInput/GlassInput';
import { GlassSelect } from '../ui/GlassSelect/GlassSelect';
import { Button } from '../ui/Button/Button';
import api from '../../services/api';
import { Info, MapPin, Key, Shield, HardDrive, Mail, Phone, ExternalLink, Search, LayoutGrid, List as ListIcon, CheckCircle2 } from 'lucide-react';

export const ClientForm = ({ initialData, onSuccess, onCancel }) => {
    // Abas do formulário
    const [activeTab, setActiveTab] = useState('geral');

    // Estado Completo Espelhando o Backend Python (models/cliente.py)
    const [formData, setFormData] = useState({
        razao_social: '',
        cnpj: '',
        codigo: '',
        regime: '',
        responsavel_fiscal: '',
        data_abertura: '',
        tipo_empresa: '',
        contato_nome: '',
        email: '',
        telefone: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        login_ecac: '',
        senha_ecac: '',
        login_sefaz: '',
        senha_sefaz: '',
        login_pref: '',
        senha_pref: '',
        login_dominio: '',
        senha_dominio: '',
        outros_acessos: '',
        drive_link: '',
        status: 'ativo'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableProcesses, setAvailableProcesses] = useState([]);
    const [clientProcesses, setClientProcesses] = useState([]);
    const [viewMode, setViewMode] = useState('grid');
    const [processSearchTerm, setProcessSearchTerm] = useState('');

    useEffect(() => {
        const fetchProcesses = async () => {
            try {
                // Busca todos os processos ativos
                const resProcessos = await api.get('/processos');
                setAvailableProcesses(resProcessos.data || []);

                // Se estiver editando, busca quais processos este cliente está
                if (initialData && (initialData.id || initialData.id_interno)) {
                    const clientId = initialData.id || initialData.id_interno;
                    const resVinculo = await api.get(`/processos/clientes/${clientId}`);
                    setClientProcesses((resVinculo.data || []).map(p => p.id));
                }
            } catch (err) {
                console.error("Erro ao carregar processos:", err);
            }
        };
        fetchProcesses();
    }, [initialData]);

    const handleToggleProcess = async (processId) => {
        const isLinked = clientProcesses.includes(processId);

        // Se for modo de edição, tentamos sincronizar com o banco imediatamente para melhor UX
        if (initialData && (initialData.id || initialData.id_interno)) {
            const clientId = initialData.id || initialData.id_interno;
            try {
                if (isLinked) {
                    await api.delete(`/processos/clientes/${clientId}/${processId}`);
                } else {
                    await api.post(`/processos/clientes/${clientId}/${processId}`);
                }
            } catch (err) {
                console.error("Erro ao sincronizar processo com o servidor:", err);
                // Não bloqueamos a UI, apenas logamos
            }
        }

        // Atualiza o estado local independente do modo (garante que no creation mode funcione)
        if (isLinked) {
            setClientProcesses(prev => prev.filter(id => id !== processId));
        } else {
            setClientProcesses(prev => [...prev, processId]);
        }
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                razao_social: initialData.razao_social || initialData.nome || '',
                cnpj: initialData.cnpj || '',
                codigo: initialData.codigo || '',
                regime: initialData.regime || '',
                responsavel_fiscal: initialData.responsavel_fiscal || '',
                data_abertura: initialData.data_abertura || '',
                tipo_empresa: initialData.tipo_empresa || '',
                contato_nome: initialData.contato_nome || '',
                email: initialData.email || '',
                telefone: initialData.telefone || '',
                inscricao_estadual: initialData.inscricao_estadual || '',
                inscricao_municipal: initialData.inscricao_municipal || '',
                login_ecac: initialData.login_ecac || '',
                senha_ecac: initialData.senha_ecac || '',
                login_sefaz: initialData.login_sefaz || '',
                senha_sefaz: initialData.senha_sefaz || '',
                login_pref: initialData.login_pref || '',
                senha_pref: initialData.senha_pref || '',
                login_dominio: initialData.login_dominio || '',
                senha_dominio: initialData.senha_dominio || '',
                outros_acessos: initialData.outros_acessos || '',
                drive_link: initialData.drive_link || '',
                status: initialData.ativo === false ? 'inativo' : (initialData.status?.toLowerCase() || 'ativo'),
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            ativo: formData.status === 'ativo'
        };
        delete payload.status;

        // Log de depuração para verificar o que está sendo enviado
        console.log("📤 [ClientForm] Enviando payload:", payload);

        if (!payload.razao_social) {
            setError("A Razão Social é obrigatória.");
            setLoading(false);
            return;
        }

        try {
            if (initialData && (initialData.id || initialData.id_interno)) {
                const clientId = initialData.id || initialData.id_interno;
                console.log(`🔄 [ClientForm] Atualizando cliente ${clientId}`);
                const response = await api.put(`/clientes/${clientId}`, payload);
                if (onSuccess) onSuccess(response.data, 'edit');
            } else {
                const response = await api.post('/clientes', payload);
                const newClient = response.data;
                const newClientId = newClient.id || newClient.id_interno;

                // Se houver processos selecionados no modo de criação, vinculamos agora
                if (newClientId && clientProcesses.length > 0) {
                    try {
                        await Promise.all(clientProcesses.map(procId =>
                            api.post(`/processos/clientes/${newClientId}/${procId}`)
                        ));
                    } catch (linkErr) {
                        console.error("Erro ao vincular processos ao novo cliente:", linkErr);
                    }
                }

                if (onSuccess) onSuccess(newClient, 'create');
            }
        } catch (err) {
            console.error("Erro ao salvar cliente:", err);
            setError(err.response?.data?.detail || "Ocorreu um erro ao salvar o cliente. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const isEditMode = !!initialData;

    const renderTabs = () => (
        <div style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '2rem',
            overflowX: 'auto',
            paddingBottom: '2px'
        }}>
            {[
                { id: 'geral', label: 'Geral', icon: Info },
                { id: 'inscricoes', label: 'Inscrições', icon: Shield },
                { id: 'contato', label: 'Contato', icon: MapPin },
                { id: 'acessos', label: 'Acessos e Senhas', icon: Key },
                { id: 'drive', label: 'Drive', icon: HardDrive },
                { id: 'processos', label: 'Processos Mensais', icon: Shield }
            ].map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                        padding: '10px 20px',
                        background: 'transparent',
                        color: activeTab === tab.id ? '#818cf8' : 'var(--text-muted)',
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid #818cf8' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: activeTab === tab.id ? '700' : '500',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>

            {error && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '4px solid var(--danger)',
                    padding: '1rem',
                    borderRadius: '0 8px 8px 0',
                    color: '#ff8080',
                    fontSize: '0.9rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Shield size={18} />
                    {error}
                </div>
            )}

            {renderTabs()}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, minHeight: '400px' }}>

                {activeTab === 'geral' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <GlassInput name="razao_social" label="Razão Social / Nome Fantasia" value={formData.razao_social} onChange={handleChange} placeholder="Ex: RB Contabilidade LTDA" required />
                        </div>
                        <GlassInput name="cnpj" label="CNPJ" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" required />
                        <GlassInput name="codigo" label="Código Interno" value={formData.codigo} onChange={handleChange} placeholder="Ex: 001" />
                        <GlassInput name="regime" label="Regime Tributário" value={formData.regime} onChange={handleChange} placeholder="Ex: Simples Nacional, Lucro Real" />
                        <GlassInput name="tipo_empresa" label="Tipo Jurídico" value={formData.tipo_empresa} onChange={handleChange} placeholder="Ex: ME, EPP, LTDA" />
                        <GlassInput name="data_abertura" label="Data de Abertura" type="date" value={formData.data_abertura} onChange={handleChange} />
                        <GlassInput name="responsavel_fiscal" label="Responsável Fiscal" value={formData.responsavel_fiscal} onChange={handleChange} placeholder="Nome do Contador Responsável" />
                        <div style={{ gridColumn: 'span 2' }}>
                            <GlassSelect name="status" label="Status do Cliente" value={formData.status} onChange={handleChange} options={[{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }]} required />
                        </div>
                    </div>
                )}

                {activeTab === 'inscricoes' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <GlassInput name="inscricao_estadual" label="Inscrição Estadual (I.E)" value={formData.inscricao_estadual} onChange={handleChange} placeholder="Dígitos da I.E" />
                        <GlassInput name="inscricao_municipal" label="Inscrição Municipal (I.M)" value={formData.inscricao_municipal} onChange={handleChange} placeholder="Dígitos da I.M" />
                    </div>
                )}

                {activeTab === 'contato' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <GlassInput name="contato_nome" label="Nome do Contato Principal" value={formData.contato_nome} onChange={handleChange} placeholder="Pessoa de contato na empresa" />
                        </div>
                        <GlassInput name="email" label="E-mail de Contato" type="email" value={formData.email} onChange={handleChange} placeholder="email@empresa.com" />
                        <GlassInput name="telefone" label="Telefone / WhatsApp" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />
                    </div>
                )}

                {activeTab === 'drive' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            <HardDrive size={48} color="#818cf8" style={{ marginBottom: '1rem', opacity: 0.8 }} />
                            <h4 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Link do Google Drive</h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Insira o link da pasta de documentos deste cliente para acesso rápido através da lista.</p>
                        </div>
                        <GlassInput
                            name="drive_link"
                            label="URL da Pasta do Drive"
                            value={formData.drive_link}
                            onChange={handleChange}
                            placeholder="https://drive.google.com/drive/folders/..."
                            icon="fas fa-link"
                        />
                    </div>
                )}

                {activeTab === 'acessos' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                        <div style={{ gridColumn: 'span 2', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <h4 style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>Plataforma e-CAC</h4>
                            <GlassInput name="login_ecac" label="Login e-CAC" value={formData.login_ecac} onChange={handleChange} />
                            <GlassInput name="senha_ecac" label="Senha e-CAC" type="password" value={formData.senha_ecac} onChange={handleChange} />
                        </div>

                        <div style={{ gridColumn: 'span 2', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <h4 style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>SEFAZ (Estadual)</h4>
                            <GlassInput name="login_sefaz" label="Login SEFAZ" value={formData.login_sefaz} onChange={handleChange} />
                            <GlassInput name="senha_sefaz" label="Senha SEFAZ" type="password" value={formData.senha_sefaz} onChange={handleChange} />
                        </div>

                        <div style={{ gridColumn: 'span 2', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <h4 style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>Prefeitura (Municipal)</h4>
                            <GlassInput name="login_pref" label="Login Prefeitura" value={formData.login_pref} onChange={handleChange} />
                            <GlassInput name="senha_pref" label="Senha Prefeitura" type="password" value={formData.senha_pref} onChange={handleChange} />
                        </div>

                        <div style={{ gridColumn: 'span 2', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <h4 style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: '#818cf8', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>Sistema Domínio</h4>
                            <GlassInput name="login_dominio" label="Login Domínio" value={formData.login_dominio} onChange={handleChange} />
                            <GlassInput name="senha_dominio" label="Senha Domínio" type="password" value={formData.senha_dominio} onChange={handleChange} />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <GlassInput name="outros_acessos" label="Outros Acessos e Observações" value={formData.outros_acessos} onChange={handleChange} />
                        </div>
                    </div>
                )}

                {activeTab === 'processos' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
                        {/* Toolbar da Aba */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar processos..."
                                    value={processSearchTerm}
                                    onChange={(e) => setProcessSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px 8px 36px',
                                        background: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    style={{
                                        padding: '6px 10px',
                                        background: viewMode === 'grid' ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
                                        color: viewMode === 'grid' ? '#818cf8' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    title="Visualização em Grade"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    style={{
                                        padding: '6px 10px',
                                        background: viewMode === 'list' ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
                                        color: viewMode === 'list' ? '#818cf8' : 'var(--text-muted)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                    title="Visualização em Lista"
                                >
                                    <ListIcon size={18} />
                                </button>
                            </div>
                        </div>

                        {availableProcesses.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Shield size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                <p>Nenhum processo mensal encontrado no sistema.</p>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'grid' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                                        {availableProcesses
                                            .filter(p => p.nome.toLowerCase().includes(processSearchTerm.toLowerCase()))
                                            .map(proc => {
                                                const isLinked = clientProcesses.includes(proc.id);
                                                return (
                                                    <div
                                                        key={proc.id}
                                                        onClick={() => handleToggleProcess(proc.id)}
                                                        style={{
                                                            padding: '20px',
                                                            background: isLinked ? 'rgba(129, 140, 248, 0.05)' : 'rgba(255,255,255,0.02)',
                                                            border: isLinked ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.08)',
                                                            borderRadius: '16px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '12px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            position: 'relative',
                                                            overflow: 'hidden',
                                                            transform: isLinked ? 'translateY(-2px)' : 'none',
                                                            boxShadow: isLinked ? '0 10px 20px -5px rgba(129, 140, 248, 0.3)' : 'none'
                                                        }}
                                                    >
                                                        {isLinked && (
                                                            <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#818cf8' }}>
                                                                <CheckCircle2 size={20} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 style={{ fontWeight: '700', fontSize: '1.05rem', color: isLinked ? '#fff' : 'var(--text-light)', marginBottom: '4px' }}>{proc.nome}</h4>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em' }}>
                                                                {proc.descricao || 'Sem descrição definida.'}
                                                            </p>
                                                        </div>
                                                        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: '700',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.5px',
                                                                color: isLinked ? '#818cf8' : 'var(--text-muted)'
                                                            }}>
                                                                {isLinked ? 'ATIVADO' : 'DESATIVADO'}
                                                            </span>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '16px',
                                                                borderRadius: '10px',
                                                                background: isLinked ? '#818cf8' : 'rgba(255,255,255,0.1)',
                                                                position: 'relative',
                                                                transition: 'all 0.3s'
                                                            }}>
                                                                <div style={{
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    borderRadius: '50%',
                                                                    background: '#fff',
                                                                    position: 'absolute',
                                                                    top: '2px',
                                                                    left: isLinked ? '18px' : '2px',
                                                                    transition: 'all 0.3s'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {availableProcesses
                                            .filter(p => p.nome.toLowerCase().includes(processSearchTerm.toLowerCase()))
                                            .map(proc => {
                                                const isLinked = clientProcesses.includes(proc.id);
                                                return (
                                                    <div
                                                        key={proc.id}
                                                        onClick={() => handleToggleProcess(proc.id)}
                                                        style={{
                                                            padding: '12px 20px',
                                                            background: isLinked ? 'rgba(129, 140, 248, 0.05)' : 'rgba(255,255,255,0.02)',
                                                            border: isLinked ? '1px solid #818cf8' : '1px solid rgba(255,255,255,0.05)',
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '16px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                                            <div style={{
                                                                width: '40px',
                                                                height: '40px',
                                                                borderRadius: '8px',
                                                                background: isLinked ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: isLinked ? '#818cf8' : 'var(--text-muted)'
                                                            }}>
                                                                <Shield size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 style={{ fontWeight: '600', fontSize: '0.95rem', color: isLinked ? '#fff' : 'var(--text-light)' }}>{proc.nome}</h4>
                                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>{proc.descricao}</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {isLinked && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>ATIVO</span>}
                                                            <div style={{
                                                                width: '36px',
                                                                height: '20px',
                                                                borderRadius: '10px',
                                                                background: isLinked ? '#818cf8' : 'rgba(255,255,255,0.1)',
                                                                position: 'relative',
                                                                transition: 'all 0.3s'
                                                            }}>
                                                                <div style={{
                                                                    width: '14px',
                                                                    height: '14px',
                                                                    borderRadius: '50%',
                                                                    background: '#fff',
                                                                    position: 'absolute',
                                                                    top: '3px',
                                                                    left: isLinked ? '19px' : '3px',
                                                                    transition: 'all 0.3s'
                                                                }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* Footer com botões de Ação */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '1.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.05)'
            }}>
                <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} style={{ padding: '12px 24px' }}>
                    Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={loading} style={{ padding: '12px 32px' }}>
                    {loading ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Cadastrar Cliente')}
                </Button>
            </div>
        </form>
    );
};

export default ClientForm;

