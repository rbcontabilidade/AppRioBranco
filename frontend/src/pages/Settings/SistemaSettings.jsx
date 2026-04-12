import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, Layers, FileText, Shield, Download } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';
import { useNavigate } from 'react-router-dom';

import RolesSettings from './components/RolesSettings';

/**
 * Aba: Sistema (Admin only)
 * Agrupa ferramentas de backup, auditoria, cargos e processos.
 */
const SistemaSettings = () => {
    const { showAlert } = useDialog();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('backup');
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadBackup = async () => {
        setIsDownloading(true);
        try {
            const response = await api.get('/backup/download');
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_fiscalapp_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showAlert({
                title: 'Backup Concluído',
                message: 'O arquivo de backup foi gerado e baixado com sucesso!',
                variant: 'success'
            });
        } catch (error) {
            showAlert({
                title: 'Erro no Backup',
                message: 'Falha ao se conectar com o servidor. Tente novamente.',
                variant: 'danger'
            });
        } finally {
            setIsDownloading(false);
        }
    };

    // Seções internas do painel de sistema
    const sections = [
        { id: 'backup', label: 'Banco de Dados', icon: Database },
        { id: 'roles', label: 'Cargos e Niveis', icon: Shield },
        { id: 'processes', label: 'Fluxo de Trabalho', icon: Layers },
        { id: 'audit', label: 'Auditoria (Logs)', icon: FileText },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Cabeçalho */}
            <div>
                <h2 style={{
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '4px',
                }}>
                    <SettingsIcon size={22} color="var(--primary-light)" />
                    Sistema
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Configurações avançadas de cargos, backup, auditoria e fluxos de trabalho.
                </p>
            </div>

            {/* Sub-navegação horizontal */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0' }}>
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            border: 'none',
                            borderBottom: activeSection === s.id ? '2px solid var(--primary-light)' : '2px solid transparent',
                            background: 'transparent',
                            color: activeSection === s.id ? 'var(--primary-light)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: activeSection === s.id ? '600' : '400',
                            fontSize: '0.88rem',
                            transition: 'all 0.2s',
                            marginBottom: '-1px',
                        }}
                    >
                        <s.icon size={15} />
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo da seção */}
            <div>
                {activeSection === 'backup' && (
                    <GlassCard style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Exportar backup */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <h3 style={{ color: 'var(--text-main)', margin: '0 0 6px 0', fontSize: '1rem' }}>Download de Backup Total</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                    Gera um arquivo JSON com todos os dados do sistema.
                                </p>
                            </div>
                            <Button variant="secondary" onClick={handleDownloadBackup} disabled={isDownloading} style={{ display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                <Download size={16} />
                                {isDownloading ? 'Gerando...' : 'Exportar JSON'}
                            </Button>
                        </div>

                        {/* Zona de perigo */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ color: '#ef4444', margin: '0 0 6px 0', fontSize: '1rem' }}>Zona de Perigo: Importar Backup</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                    Esta ação deletará os registros atuais e reescreverá o banco com base no arquivo importado.
                                </p>
                            </div>
                            <Button style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.25)',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                whiteSpace: 'nowrap'
                            }}>
                                Forçar Restauração
                            </Button>
                        </div>
                    </GlassCard>
                )}

                {activeSection === 'roles' && <RolesSettings />}

                {activeSection === 'audit' && (
                    <GlassCard style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <FileText size={48} color="var(--primary-light)" style={{ opacity: 0.6 }} />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Central de Auditoria</h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.9rem' }}>
                            Acesse a página especializada em auditoria e rastreio de ações do sistema com filtros avançados.
                        </p>
                        <Button variant="primary" onClick={() => navigate('/admin/audit')}>
                            Abrir Registros de Auditoria
                        </Button>
                    </GlassCard>
                )}

                {activeSection === 'processes' && (
                    <GlassCard style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <Layers size={48} color="var(--primary-light)" style={{ opacity: 0.6 }} />
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Central de Processos</h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', fontSize: '0.9rem' }}>
                            Gerencie os ciclos, dependências e templates de tarefas que orientam a produção do escritório.
                        </p>
                        <Button variant="primary" onClick={() => navigate('/processes')}>
                            Abrir Gestão de Processos
                        </Button>
                    </GlassCard>
                )}
            </div>
        </div>
    );
};

export default SistemaSettings;
