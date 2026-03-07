import React, { useState } from 'react';
import { Layers, Shield, Settings as SettingsIcon, Users, Database, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { RolesSettings } from './components/RolesSettings';
import { TeamSettings } from './components/TeamSettings';
import { AuditSettings } from './components/AuditSettings';
import { api } from '../../services/api';
import { useDialog } from '../../contexts/DialogContext';

const Settings = () => {
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const [activeTab, setActiveTab] = useState('team');
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
                message: "O arquivo de backup foi gerado e baixado com sucesso!",
                variant: 'success'
            });
        } catch (error) {
            console.error("Erro ao fazer backup:", error);
            showAlert({
                title: 'Erro no Backup',
                message: "Falha ao se conectar com o servidor para exportar o banco. Tente novamente mais tarde.",
                variant: 'danger'
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const tabs = [
        { id: 'team', label: 'Gest\u00e3o de Equipe', icon: Users },
        { id: 'roles', label: 'Cargos e N\u00edveis', icon: Shield },
        { id: 'processes', label: 'Fluxo de Trabalho', icon: Layers },
        { id: 'audit', label: 'Auditoria (Logs)', icon: FileText },
        { id: 'backup', label: 'Geral & Backup', icon: Database },
    ];

    return (
        <div className="view-section active" style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 100px)' }}>

            {/* Menu Lateral de Abas */}
            <GlassCard style={{ width: '250px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '8px' }}>
                    Painel de Controle
                </h3>

                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none',
                            background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-light)',
                            borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: '500',
                            transition: 'all 0.2s', borderLeft: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </GlassCard>

            {/* Conte\u00fado da Aba */}
            <div style={{ flex: 1, paddingRight: '12px', overflowY: 'auto' }}>
                {activeTab === 'team' && <TeamSettings />}

                {activeTab === 'roles' && <RolesSettings />}

                {activeTab === 'processes' && (
                    <GlassCard style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <Layers size={48} color="var(--primary-color)" />
                        <h2>Central de Processos</h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>
                            Gerencie os ciclos, depend\u00eancias e templates de tarefas que orientam a produ\u00e7\u00e3o do seu escrit\u00f3rio.
                        </p>
                        <Button variant="primary" onClick={() => navigate('/admin/process-templates')}>
                            Configurar Processos
                        </Button>
                    </GlassCard>
                )}

                {activeTab === 'audit' && (
                    <AuditSettings />
                )}

                {activeTab === 'backup' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Database className="text-secondary" /> Base de Dados (Supabase)
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Ferramentas cr\u00edticas de restaura\u00e7\u00e3o e hard-reset do banco.
                            </p>
                        </div>
                        <GlassCard style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <h3 style={{ color: 'var(--text-light)', margin: '0 0 8px 0' }}>Download de Backup Total</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Gera um arquivo JSON estruturado com tds as coleções lidas do Postgres.</p>
                                </div>
                                <Button variant="secondary" onClick={handleDownloadBackup} disabled={isDownloading} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Database size={16} /> {isDownloading ? 'Gerando...' : 'Exportar JSON'}
                                </Button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>Zona de Perigo: Importar Backup</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Essa a\u00e7\u00e3o deletar\u00e1 os registros atuais e reescrever\u00e1 o banco baseado no seu arquivo.</p>
                                </div>
                                <Button style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    For\u00e7ar Restaura\u00e7\u00e3o
                                </Button>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
