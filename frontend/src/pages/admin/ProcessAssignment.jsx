import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import {
    Search, Filter, Play, CheckCircle,
    ChevronRight, ChevronLeft, Layout,
    Users, Send, FileText, Calendar, ArrowLeft
} from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';

export const ProcessAssignment = () => {
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const [currentStep, setCurrentStep] = useState(1);

    // Dados
    const [templates, setTemplates] = useState([]);
    const [clients, setClients] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Seleções
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedClientIds, setSelectedClientIds] = useState([]);
    const [assignedClientIds, setAssignedClientIds] = useState([]); // Clientes já vinculados

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRegime, setSelectedRegime] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoadingData(true);
                const [resProcessos, resClientes] = await Promise.all([
                    api.get('/processos'),
                    api.get('/clientes')
                ]);
                setTemplates(resProcessos.data?.processos || resProcessos.data || []);
                setClients(resClientes.data?.clientes || resClientes.data || []);
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
                // Fallback Mocks
                setTemplates([
                    { id: 1, nome: 'Fechamento Fiscal Mensal', descricao: 'Apuracao completa de impostos e entrega de guias.', qtd_rotinas: 8, frequencia: 'Mensal' },
                    { id: 2, nome: 'Folha de Pagamento', descricao: 'Geracao de holerites, encargos e social.', qtd_rotinas: 12, frequencia: 'Mensal' }
                ]);
                setClients([
                    { id: 101, razao_social: 'Exemplo Empresa LTDA', cnpj: '12.345.678/0001-90', regime: 'Simples Nacional' },
                    { id: 102, razao_social: 'Comercio de Peças SA', cnpj: '98.765.432/0001-10', regime: 'Lucro Presumido' },
                ]);
            } finally {
                setLoadingData(false);
            }
        };
        loadInitialData();
    }, []);

    const filteredClients = clients.filter(c => {
        // Filtro de Busca (Nome, Razão Social ou CNPJ)
        const matchName = (c.razao_social || c.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.cnpj || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''));

        // Filtro de Regime (Inteligente: aceita regime ou regime_tributario)
        let matchRegime = true;
        if (selectedRegime) {
            const clientRegime = (c.regime_tributario || c.regime || '').toLowerCase().trim();
            const targetRegime = selectedRegime.toLowerCase().trim();
            
            // Verificação parcial ou exata para lidar com variações
            matchRegime = clientRegime.includes(targetRegime) || targetRegime.includes(clientRegime);
        }
        
        return matchName && matchRegime;
    });

    const handleSelectTemplate = async (template) => {
        setSelectedTemplate(template);
        setSelectedClientIds([]);
        setAssignedClientIds([]);
        
        try {
            // Busca clientes que já possuem este processo vinculado
            const resAtribuidos = await api.get(`/processos/${template.id}/clientes-atribuidos`);
            // Garante que os IDs sejam convertidos para número e padronizados
            const atribuidos = (resAtribuidos.data || []).map(id => Number(id));
            setAssignedClientIds(atribuidos);
            setSelectedClientIds([...atribuidos]); // Clone para evitar mutação direta
            console.log("✅ Clientes Atribuídos Carregados (Padronizados): ", atribuidos);
        } catch (error) {
            console.error("Erro ao buscar clientes já atribuídos:", error);
        }
        
        setCurrentStep(2);
    };

    const toggleClientSelection = (rawId) => {
        const id = Number(rawId);
        setSelectedClientIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAllFiltered = () => {
        const filteredIds = filteredClients.map(c => Number(c.id || c.id_interno));
        const allFilteredSelected = filteredIds.every(id => selectedClientIds.includes(id));
        
        if (allFilteredSelected) {
            // Desmarca todos os que estão no filtro atual
            setSelectedClientIds(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            // Marca todos os que estão no filtro atual
            setSelectedClientIds(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleStartProcess = async () => {
        setIsSubmitting(true);
        try {
            // Calcula quem realmente deve ser ADICIONADO (está na seleção mas não estava no banco)
            const toAdd = selectedClientIds.filter(id => !assignedClientIds.includes(id));
            
            // Calcula quem realmente deve ser REMOVIDO (estava no banco mas não está mais na seleção)
            const toRemove = assignedClientIds.filter(id => !selectedClientIds.includes(id));

            console.log("🚀 Iniciando atualização em lote:", {
                templateId: selectedTemplate?.id,
                adicionar: toAdd.length,
                remover: toRemove.length
            });

            const promessas = [];

            toAdd.forEach(clientId => {
                const url = `/processos/clientes/${clientId}/${selectedTemplate.id}`;
                console.log(`📤 Enviando POST para: ${url}`);
                promessas.push(api.post(url));
            });

            toRemove.forEach(clientId => {
                const url = `/processos/clientes/${clientId}/${selectedTemplate.id}`;
                console.log(`🗑️ Enviando DELETE para: ${url}`);
                promessas.push(api.delete(url));
            });

            await Promise.all(promessas);

            let message = `${toAdd.length} clientes vinculados`;
            if (toRemove.length > 0) {
                message += ` e ${toRemove.length} removidos`;
            }
            message += ` no processo '${selectedTemplate.nome}' com sucesso.`;

            await showAlert({
                title: 'Atualização Concluída!',
                message,
                variant: 'success'
            });

            // Reset
            setSelectedTemplate(null);
            setSelectedClientIds([]);
            setAssignedClientIds([]);
            setCurrentStep(1);
        } catch (error) {
            const errorMsg = error.response?.data?.detail || error.message;
            const fullUrl = error.config?.url || 'URL desconhecida';
            console.error("Erro detalhado ao lançar processo:", {
                msg: errorMsg,
                url: fullUrl,
                data: error.response?.data
            });
            showAlert({
                title: 'Erro na Atualização',
                message: `Houve um erro: ${errorMsg}`,
                variant: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Renderizadores de Passos
    const renderStepIndicators = () => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginBottom: '32px' }}>
            {[
                { step: 1, label: 'Template', icon: <Layout size={20} /> },
                { step: 2, label: 'Clientes', icon: <Users size={20} /> },
                { step: 3, label: 'Revisão', icon: <Send size={20} /> }
            ].map(item => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: currentStep >= item.step ? 1 : 0.4 }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: currentStep === item.step ? 'var(--primary-color)' : currentStep > item.step ? '#10b981' : 'rgba(0,0,0,0.1)',
                        color: 'white', transition: 'all 0.3s',
                        boxShadow: currentStep === item.step ? '0 0 15px rgba(59, 130, 246, 0.4)' : 'none'
                    }}>
                        {currentStep > item.step ? <CheckCircle size={22} /> : item.icon}
                    </div>
                    <span style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.label}</span>
                    {item.step < 3 && <div style={{ height: '2px', width: '40px', backgroundColor: 'rgba(0,0,0,0.05)', marginLeft: '12px' }} />}
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div style={{ animation: 'slideRight 0.4s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Qual processo deseja lançar?</h2>
                <p style={{ color: 'var(--text-muted)' }}>Escolha um modelo de fluxo pré-configurado para iniciar</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {loadingData ? (
                    Array(3).fill(0).map((_, i) => (
                        <GlassCard key={i} style={{ height: '180px', opacity: 0.5 }} className="skeleton-loading" />
                    ))
                ) : (
                    templates.map(t => (
                        <GlassCard
                            key={t.id}
                            onClick={() => handleSelectTemplate(t)}
                            style={{
                                padding: '24px', cursor: 'pointer', transition: 'all 0.2s',
                                border: selectedTemplate?.id === t.id ? '2px solid var(--primary-color)' : '1px solid rgba(0,0,0,0.05)',
                                display: 'flex', flexDirection: 'column', gap: '12px'
                            }}
                            className="hover-card"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ p: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: 'var(--primary-color)' }}>
                                    <FileText size={20} />
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                                    {t.frequencia || 'Mensal'}
                                </span>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>{t.nome}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{t.descricao || 'Sem descrição definida.'}</p>
                            <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: '600' }}>
                                {t.qtd_rotinas || 0} rotinas vinculadas
                            </div>
                        </GlassCard>
                    ))
                )}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div style={{ animation: 'slideRight 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Quais clientes vão entrar no fluxo?</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Selecione os clientes que devem iniciar o processo <b>{selectedTemplate?.nome}</b></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-color)' }}>{selectedClientIds.length}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>SELECIONADOS</div>
                </div>
            </div>

            <GlassCard style={{ padding: '20px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }} />
                    <input
                        className="glass-input"
                        placeholder="Pesquisar por nome ou CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '48px', width: '100%', height: '48px' }}
                    />
                </div>
                <div style={{ minWidth: '240px' }}>
                    <select
                        className="glass-input"
                        value={selectedRegime}
                        onChange={(e) => setSelectedRegime(e.target.value)}
                        style={{ height: '48px' }}
                    >
                        <option value="">Todos os Regimes</option>
                        <option value="Simples Nacional">Simples Nacional</option>
                        <option value="Lucro Presumido">Lucro Presumido</option>
                        <option value="Lucro Real">Lucro Real</option>
                    </select>
                </div>
            </GlassCard>

            <div style={{ maxHeight: '450px', overflowY: 'auto', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', backdropFilter: 'blur(10px)', boxShadow: 'var(--shadow-glass)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(30, 41, 59, 0.95)', borderBottom: '1px solid var(--border-glass-light)' }}>
                        <tr>
                            <th style={{ padding: '16px', textAlign: 'center', width: '60px' }}>
                                <input
                                    type="checkbox"
                                    className="glass-checkbox"
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    checked={filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.includes(Number(c.id)))}
                                    onChange={handleSelectAllFiltered}
                                />
                            </th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', letterSpacing: '0.5px' }}>CLIENTE</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', letterSpacing: '0.5px' }}>CNPJ</th>
                            <th style={{ padding: '16px', fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: '800', letterSpacing: '0.5px' }}>REGIME</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClients.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                                    {assignedClientIds.length === clients.length && clients.length > 0 && filteredClients.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ p: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981' }}>
                                                <CheckCircle size={32} />
                                            </div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#ffffff' }}>Tudo pronto!</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                Todos os clientes já estão vinculados a este processo.
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            Nenhum cliente encontrado para os filtros aplicados.
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            console.log("🔍 Renderizando Clientes:", filteredClients),
                            filteredClients.map(client => (
                                <tr
                                    key={client.id || client.id_interno}
                                    onClick={() => toggleClientSelection(client.id || client.id_interno)}
                                    style={{
                                        cursor: 'pointer', borderTop: '1px solid var(--border-glass)',
                                        background: selectedClientIds.includes(Number(client.id || client.id_interno)) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                        transition: 'all 0.2s',
                                        color: 'var(--text-main)'
                                    }}
                                    className="table-row-hover"
                                >
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            readOnly
                                            className="glass-checkbox"
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            checked={selectedClientIds.includes(Number(client.id || client.id_interno))}
                                        />
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '700', color: '#ffffff' }}>
                                        {client.razao_social || "Sem Nome"}
                                    </td>
                                    <td style={{ padding: '16px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                                        {client.cnpj || "---"}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {(() => {
                                            const regime = (client.regime_tributario || client.regime || '').toLowerCase();
                                            const isSimples = regime.includes('simples');
                                            const isLucro = regime.includes('lucro');
                                            
                                            let color = '#94a3b8';
                                            let bg = 'rgba(148, 163, 184, 0.1)';
                                            
                                            if (isSimples) { color = '#34d399'; bg = 'rgba(16, 185, 129, 0.2)'; }
                                            else if (isLucro) { color = '#fbbf24'; bg = 'rgba(245, 158, 11, 0.2)'; }

                                            return (
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800',
                                                    background: bg, color: color,
                                                    border: `1px solid ${bg.replace('0.2', '0.3')}`
                                                }}>
                                                    {(client.regime_tributario || client.regime || 'N/A').toUpperCase()}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft size={20} /> Voltar ao Template
                </Button>
                <Button variant="primary" disabled={selectedClientIds.length === 0} onClick={() => setCurrentStep(3)}>
                    Revisar e Lançar <ChevronRight size={20} />
                </Button>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div style={{ animation: 'slideRight 0.4s ease-out', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Confirmar Inicialização</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Tudo pronto para disparar as tarefas do mês.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '40px' }}>
                <GlassCard style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ 
                        position: 'absolute', top: '-10px', right: '-10px', 
                        opacity: 0.05, transform: 'rotate(15deg)' 
                    }}>
                        <Layout size={120} />
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                        <div style={{ 
                            p: '10px', background: 'rgba(59, 130, 246, 0.15)', 
                            borderRadius: '12px', color: 'var(--primary-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '44px', height: '44px'
                        }}>
                            <FileText size={24} />
                        </div>
                        <h4 style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-main)' }}>Fluxo de Trabalho</h4>
                    </div>
                    
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', marginBottom: '12px' }}>{selectedTemplate?.nome}</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            <Calendar size={18} style={{ color: 'var(--primary-color)' }} /> 
                            <span>Frequência: <b>{selectedTemplate?.frequencia || 'Mensal'}</b></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            <CheckCircle size={18} style={{ color: '#10b981' }} /> 
                            <span><b>{selectedTemplate?.qtd_rotinas || 0}</b> Rotinas configuradas</span>
                        </div>
                    </div>

                    <div style={{ 
                        marginTop: '24px', p: '12px', borderRadius: '10px', 
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic'
                    }}>
                        "{selectedTemplate?.descricao || 'Sem descrição definida.'}"
                    </div>
                </GlassCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <GlassCard style={{ padding: '24px', flex: 1, borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#10b981' }}>
                            <Users size={24} />
                            <h4 style={{ fontWeight: '800', fontSize: '1rem' }}>Impacto do Cadastro</h4>
                        </div>
                        <div style={{ fontSize: '2.4rem', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{selectedClientIds.length}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>Empresas Vinculadas</div>
                    </GlassCard>

                    <GlassCard style={{ padding: '20px', flex: 2, background: 'rgba(0,0,0,0.2)' }}>
                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>Lista de Selecionados</h4>
                        <div style={{ 
                            maxHeight: '140px', overflowY: 'auto', pr: '8px', 
                            display: 'flex', flexWrap: 'wrap', gap: '8px' 
                        }}>
                            {clients.filter(c => selectedClientIds.includes(c.id || c.id_interno)).map(c => (
                                <span key={c.id || c.id_interno} style={{
                                    fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {c.razao_social || c.nome || "Empresa"}
                                </span>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button
                    onClick={() => setCurrentStep(2)}
                    style={{
                        flex: 1, height: '56px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                    className="hover-card"
                >
                    <ChevronLeft size={20} /> Ajustar Clientes
                </button>
                <button
                    onClick={handleStartProcess}
                    disabled={isSubmitting}
                    style={{
                        flex: 2, height: '56px', borderRadius: '14px', border: 'none',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, #4f46e5 100%)',
                        color: '#fff', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer',
                        transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
                        opacity: isSubmitting ? 0.7 : 1
                    }}
                    className="hover-card"
                >
                    {isSubmitting ? (
                        <>Iniciando...</>
                    ) : (
                        <>
                            <Play size={22} fill="currentColor" /> LANÇAR AGORA
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="view-section active" style={{ padding: '24px 0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <header style={{ 
                    marginBottom: '40px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '24px' 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button 
                            onClick={() => navigate('/processes')}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            className="hover-card"
                            title="Voltar para Gestão de Templates"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 style={{ 
                                fontSize: '2rem', 
                                fontWeight: '800', 
                                margin: 0,
                                background: 'linear-gradient(135deg, var(--text-dark, #fff) 0%, #64748b 100%)', 
                                WebkitBackgroundClip: 'text', 
                                WebkitTextFillColor: 'transparent' 
                            }}>
                                Lançamento de Processos
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', margin: '4px 0 0 0' }}>Inicie fluxos de trabalho em lote para seus clientes</p>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                    }}>
                        <Layout size={16} /> PASSO {currentStep} DE 3
                    </div>
                </header>

                {renderStepIndicators()}

                <div style={{ minHeight: '600px' }}>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideRight {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .hover-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
                    border-color: var(--primary-color) !important;
                }
                .skeleton-loading {
                    background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                .table-row-hover:hover {
                    background: rgba(255,255,255,0.05) !important;
                }
                .glass-checkbox {
                    accent-color: var(--primary-color);
                    border: 2px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                }
            `}} />
        </div>
    );
};

export default ProcessAssignment;
