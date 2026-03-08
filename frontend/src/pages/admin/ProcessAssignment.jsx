import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import {
    Search, Filter, Play, CheckCircle,
    ChevronRight, ChevronLeft, Layout,
    Users, Send, FileText, Calendar
} from 'lucide-react';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';

export const ProcessAssignment = () => {
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
        // Filtro de Busca e Regime
        const matchName = (c.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.cnpj || '').includes(searchTerm);
        const matchRegime = selectedRegime ? c.regime === selectedRegime : true;
        
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
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '800',
                                            background: client.regime === 'Simples Nacional' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: client.regime === 'Simples Nacional' ? '#34d399' : '#fbbf24',
                                            border: `1px solid ${client.regime === 'Simples Nacional' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                                        }}>
                                            {client.regime?.toUpperCase()}
                                        </span>
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
        <div style={{ animation: 'slideRight 0.4s ease-out', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Confirmação de Lançamento</h2>
                <p style={{ color: 'var(--text-muted)' }}>Revise os detalhes antes de iniciar o fluxo de trabalho</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <GlassCard style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--primary-color)' }}>
                        <Layout size={24} />
                        <h4 style={{ fontWeight: 'bold' }}>Processo Escolhido</h4>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{selectedTemplate?.nome}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Calendar size={14} /> Frequência: {selectedTemplate?.frequencia || 'Mensal'}
                    </div>
                </GlassCard>

                <GlassCard style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#10b981' }}>
                        <Users size={24} />
                        <h4 style={{ fontWeight: 'bold' }}>Impacto</h4>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{selectedClientIds.length} Clientes</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxHeight: '100px', overflowY: 'auto', borderTop: '1px outset rgba(0,0,0,0.05)', paddingTop: '8px' }}>
                        {clients.filter(c => selectedClientIds.includes(c.id)).map(c => c.razao_social || "Sem Nome").join(', ')}
                    </div>
                </GlassCard>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentStep(2)}>
                    Ajustar Clientes
                </Button>
                <Button
                    variant="primary"
                    style={{ flex: 2, height: '54px', fontSize: '1.1rem', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4)' }}
                    onClick={handleStartProcess}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Processando...' : '🔥 Confirmar e Lançar Agora'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="view-section active" style={{ padding: '24px 0' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--text-dark) 0%, #64748b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Lançamento de Processos
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginTop: '8px' }}>Inicie fluxos de trabalho em lote para seus clientes de forma organizada</p>
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
