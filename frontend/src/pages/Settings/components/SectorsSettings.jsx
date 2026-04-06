import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import { Button } from '../../../components/ui/Button/Button';
import DataTable from '../../../components/ui/DataTable/DataTable';
import api from '../../../services/api';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const SectorsSettings = () => {
    const [sectors, setSectors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ nome: '' });

    const fetchSectors = async () => {
        try {
            setLoading(true);
            const res = await api.get('/setores');
            setSectors(res.data);
        } catch (err) {
            console.error("Erro ao carregar setores", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSectors();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/setores/${editingId}`, formData);
            } else {
                await api.post('/setores', formData);
            }
            setModalOpen(false);
            setFormData({ nome: '' });
            setEditingId(null);
            fetchSectors();
        } catch (err) {
            alert("Erro ao salvar setor.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Atenção: Deletar este setor desvinculará a organização de todos os funcionários ligados a ele. Deseja continuar?")) return;
        try {
            await api.delete(`/setores/${id}`);
            fetchSectors();
        } catch (err) {
            alert("Erro ao deletar setor.");
        }
    };

    const openEdit = (sector) => {
        setEditingId(sector.id);
        setFormData({ nome: sector.nome });
        setModalOpen(true);
    };

    const tableColumns = ['ID', 'Nome do Setor', 'Ações'];

    const tableData = sectors.map(row => [
        row.id,
        row.nome,
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
                        <Users className="text-secondary" /> Gestão de Setores
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Crie e gerencie os nomes de setores disponíveis na organização.
                    </p>
                </div>
                <Button variant="primary" onClick={() => { setEditingId(null); setFormData({ nome: '' }); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Novo Setor
                </Button>
            </div>

            <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
                <DataTable
                    columns={tableColumns}
                    data={tableData}
                    loading={loading}
                    emptyMessage="Nenhum setor cadastrado."
                />
            </GlassCard>

            <SettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Setor' : 'Novo Setor'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Nome do Setor *</label>
                        <input
                            type="text"
                            required
                            className="glass-input"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Ex: Recursos Humanos"
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                        <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" variant="primary">Salvar</Button>
                    </div>
                </form>
            </SettingsModal>
        </div>
    );
};
