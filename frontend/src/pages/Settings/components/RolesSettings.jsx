import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import { Button } from '../../../components/ui/Button/Button';
import DataTable from '../../../components/ui/DataTable/DataTable';
import api from '../../../services/api';
import { Shield, Plus, Edit2, Trash2 } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

const AVAILABLE_SCREENS = [
    { id: 'dashboard', label: 'Dashboard Resumo' },
    { id: 'meu-desempenho', label: 'Meu Desempenho' },
    { id: 'operacional', label: 'Painel Operacional' },
    { id: 'mensagens', label: 'Mensagens Internas' },
    { id: 'clientes', label: 'Gestão de Clientes' },
    { id: 'rotinas', label: 'Rotinas e Fiscais' },
    { id: 'competencias', label: 'Competências' },
    { id: 'equipe', label: 'Visão de Equipe' },
    { id: 'settings', label: 'Configurações de Admin' }
];

export const RolesSettings = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nome_cargo: '', telas_permitidas: [] });

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const res = await api.get('/cargos');
            setRoles(res.data || []);
        } catch (err) {
            console.error("Erro ao buscar cargos", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Converte o array da view em string JSON para salvar no DB
            const payload = {
                nome_cargo: formData.nome_cargo,
                telas_permitidas: JSON.stringify(formData.telas_permitidas || [])
            };

            if (editingId) {
                await api.put(`/cargos/${editingId}`, payload);
            } else {
                await api.post('/cargos', payload);
            }
            setModalOpen(false);
            setFormData({ nome_cargo: '', telas_permitidas: [] });
            setEditingId(null);
            fetchRoles();
        } catch (err) {
            alert("Erro ao salvar o cargo.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Atenção: Deletar este cargo removerá as permissões dos funcionários associados. Deseja continuar?")) return;
        try {
            await api.delete(`/cargos/${id}`);
            fetchRoles();
        } catch (err) {
            alert("Erro ao excluir o cargo.");
        }
    };

    const openEdit = (role) => {
        setEditingId(role.id);

        let telasArray = [];
        try {
            telasArray = JSON.parse(role.telas_permitidas || '[]');
        } catch (e) {
            telasArray = [];
        }

        setFormData({
            nome_cargo: role.nome_cargo,
            telas_permitidas: Array.isArray(telasArray) ? telasArray : []
        });
        setModalOpen(true);
    };

    const handleScreenToggle = (screenId) => {
        setFormData(prev => {
            const currentObj = prev.telas_permitidas || [];
            const hasScreen = currentObj.includes(screenId);
            return {
                ...prev,
                telas_permitidas: hasScreen
                    ? currentObj.filter(id => id !== screenId)
                    : [...currentObj, screenId]
            };
        });
    };

    const tableColumns = ['ID', 'Nome do Cargo', 'Telas Permitidas (Acesso)', 'Ações'];

    const formatTelas = (telasStr) => {
        try {
            const arr = JSON.parse(telasStr || '[]');
            if (arr.length > 3) return arr.slice(0, 3).join(', ') + ` (+${arr.length - 3} telas)`;
            return arr.join(', ') || 'Nenhuma';
        } catch {
            return telasStr || 'Nenhuma';
        }
    }

    const tableData = roles.map(row => [
        row.id,
        row.nome_cargo,
        formatTelas(row.telas_permitidas),
        <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="small" onClick={() => openEdit(row)}><Edit2 size={14} /></Button>
            <Button variant="danger" size="small" onClick={() => handleDelete(row.id)}><Trash2 size={14} /></Button>
        </div>
    ]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield className="text-secondary" /> Cargos e Níveis
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Gerencie os papéis e o que cada perfil pode acessar no sistema.
                    </p>
                </div>
                <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingId(null); setFormData({ nome_cargo: '', telas_permitidas: [] }); setModalOpen(true); }}>
                    <Plus size={16} /> Novo Cargo
                </Button>
            </div>

            <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
                <DataTable
                    columns={tableColumns}
                    data={tableData}
                    loading={loading}
                    emptyMessage="Nenhum cargo cadsatrado."
                />
            </GlassCard>

            <SettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Cargo' : 'Novo Cargo'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Nome do Cargo (Ex: Gerente Fiscal) *</label>
                        <input
                            type="text"
                            required
                            className="glass-input"
                            value={formData.nome_cargo}
                            onChange={(e) => setFormData({ ...formData, nome_cargo: e.target.value })}
                            placeholder="Nome de Exibição"
                        />
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>Telas Permitidas no Menu</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {AVAILABLE_SCREENS.map(screen => {
                                const isChecked = formData.telas_permitidas.includes(screen.id);
                                return (
                                    <label key={screen.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isChecked ? 'var(--text-light)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleScreenToggle(screen.id)}
                                            style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        {screen.label}
                                    </label>
                                );
                            })}
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px', display: 'block' }}>
                            Selecione as telas que membros deste cargo terão acesso no painel. O restante será ocultado.
                        </small>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary">Salvar Perfil</Button>
                    </div>
                </form>
            </SettingsModal>
        </div>
    );
};
