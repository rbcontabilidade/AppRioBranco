import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import { Button } from '../../../components/ui/Button/Button';
import DataTable from '../../../components/ui/DataTable/DataTable';
import api, { getCargos } from '../../../services/api';
import { Users, UserPlus, Edit2, Trash2 } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

export const EmployeesSettings = () => {
    const queryClient = useQueryClient();

    const { data: employees = [], isLoading: loadingEmp } = useQuery({
        queryKey: ['funcionarios'],
        queryFn: async () => (await api.get('/funcionarios')).data || [],
        staleTime: 5 * 60 * 1000
    });

    const { data: sectors = [], isLoading: loadingSec } = useQuery({
        queryKey: ['setores'],
        queryFn: async () => (await api.get('/setores')).data || [],
        staleTime: 5 * 60 * 1000
    });

    const { data: cargos = [], isLoading: loadingCargos } = useQuery({
        queryKey: ['cargos_permissoes'],
        queryFn: async () => {
            const res = await getCargos();
            return Array.isArray(res) ? res : (res?.data || []);
        },
        staleTime: 5 * 60 * 1000
    });

    const loading = loadingEmp || loadingSec || loadingCargos;

    // Helper: busca o nome do cargo pelo ID
    const getCargoName = (cargoId) => {
        const cargo = cargos.find(c => c.id === cargoId);
        return cargo?.nome_cargo || null;
    };

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        cargo_id: '',
        senha: '',
        setor_id: '',
        ativo: true
    });

    const openModal = (emp = null) => {
        if (emp) {
            setEditingId(emp.id);
            setFormData({
                nome: emp.nome,
                cargo_id: emp.cargo_id ? String(emp.cargo_id) : '',
                senha: '',
                setor_id: emp.setor_id || '',
                ativo: emp.ativo
            });
        } else {
            setEditingId(null);
            setFormData({ nome: '', cargo_id: '', senha: '', setor_id: '', ativo: true });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };

            // Converter IDs para inteiros
            if (!payload.setor_id) { payload.setor_id = null; } else { payload.setor_id = parseInt(payload.setor_id, 10); }
            if (!payload.cargo_id) { payload.cargo_id = null; } else { payload.cargo_id = parseInt(payload.cargo_id, 10); }

            // Derivar a permissao a partir do cargo selecionado (retrocompatibilidade)
            if (payload.cargo_id) {
                const selectedCargo = cargos.find(c => c.id === payload.cargo_id);
                if (selectedCargo) {
                    const cargoName = selectedCargo.nome_cargo.toLowerCase();
                    if (cargoName === 'admin' || cargoName === 'administrador') {
                        payload.permissao = 'admin';
                    } else if (cargoName === 'gerente' || cargoName === 'supervisor') {
                        payload.permissao = 'gerente';
                    } else {
                        payload.permissao = 'operacional';
                    }
                }
            } else {
                payload.permissao = 'operacional';
            }

            if (editingId && !payload.senha) delete payload.senha;

            if (editingId) {
                await api.put(`/funcionarios/${editingId}`, payload);
            } else {
                if (!payload.senha) {
                    alert("A senha é obrigatória para novos funcionários!");
                    return;
                }
                await api.post('/funcionarios', payload);
            }

            setModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
        } catch (err) {
            console.error(err);
            alert("Não foi possível salvar os dados do funcionário.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Atenção! Deletar o funcionário é irreversível. Prosseguir?")) return;
        try {
            await api.delete(`/funcionarios/${id}`);
            queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
        } catch (err) {
            console.error(err);
            alert("Erro ao excluir. O funcionário pode ter históricos amarrados.");
        }
    };

    const tableColumns = ['Nome', 'Cargo', 'Setor', 'Status', 'Ações'];

    const tableData = employees.map(row => {
        const cargoName = getCargoName(row.cargo_id);
        const isAdmin = cargoName?.toLowerCase() === 'admin';

        return [
            row.nome,
            cargoName ? (
                <span style={{
                    background: isAdmin ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                    color: isAdmin ? '#818cf8' : '#cbd5e1',
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '500'
                }}>
                    {cargoName}
                </span>
            ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem Cargo</span>,
            row.setores?.nome || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem Setor</span>,
            row.ativo ?
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Ativo</span> :
                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Inativo</span>,
            <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="small" onClick={() => openModal(row)}><Edit2 size={14} /></Button>
                <Button variant="danger" size="small" onClick={() => handleDelete(row.id)}><Trash2 size={14} /></Button>
            </div>
        ];
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users className="text-secondary" /> Gestão de Funcionários
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Controle os acessos, cargos e vincule ao Setor Oficial do funcionário.
                    </p>
                </div>
                <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => openModal()}>
                    <UserPlus size={16} /> Novo Usuário
                </Button>
            </div>

            <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
                <DataTable
                    columns={tableColumns}
                    data={tableData}
                    loading={loading}
                    emptyMessage="Nenhum funcionário encontrado na base."
                />
            </GlassCard>

            <SettingsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Funcionário' : 'Novo Funcionário'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Nome (Login) *</label>
                        <input
                            type="text"
                            required
                            className="glass-input"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            placeholder="Nome de acesso no sistema"
                        />
                    </div>
                    <div>
                        <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Senha {editingId && '(Deixe em branco para manter a atual)'} {!editingId && '*'}</label>
                        <input
                            type="password"
                            required={!editingId}
                            className="glass-input"
                            value={formData.senha}
                            onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                            placeholder="***********"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Cargo / Nível de Acesso *</label>
                            <select
                                required
                                className="glass-input"
                                value={formData.cargo_id}
                                onChange={(e) => setFormData({ ...formData, cargo_id: e.target.value })}
                            >
                                <option value="">Selecione um cargo...</option>
                                {cargos
                                    .filter(c => c.status === true || c.status === 'ativo' || c.status === 'true' || c.status === undefined)
                                    .map(cargo => (
                                        <option key={cargo.id} value={String(cargo.id)}>{cargo.nome_cargo}</option>
                                    ))
                                }
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Setor Relacionado</label>
                            <select
                                className="glass-input"
                                value={formData.setor_id}
                                onChange={(e) => setFormData({ ...formData, setor_id: e.target.value })}
                            >
                                <option value="">(Sem Setor)</option>
                                {sectors.map(sec => (
                                    <option key={sec.id} value={sec.id}>{sec.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <input
                            type="checkbox"
                            id="ativo-check"
                            checked={formData.ativo}
                            onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                            style={{ width: '18px', height: '18px' }}
                        />
                        <label htmlFor="ativo-check" style={{ color: 'var(--text-light)' }}>Conta Ativa (Pode logar)</label>
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
