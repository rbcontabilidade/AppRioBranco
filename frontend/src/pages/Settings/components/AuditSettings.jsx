import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import DataTable from '../../../components/ui/DataTable/DataTable';
import api from '../../../services/api';
import { ShieldAlert, Download } from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';

export const AuditSettings = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAudit = async () => {
            try {
                // Rota que criaremos no python para baixar logs
                const res = await api.get('/auditoria');
                setLogs(res.data);
            } catch (err) {
                console.error("Erro ao buscar logs", err);

                // Mocks Atuais de Auditoria
                setLogs([
                    { id: 1, relogio: '2026-03-02 14:30', usuario: 'Raphael (Admin)', acao: 'Login no Sistema', ip: '192.168.1.15' },
                    { id: 2, relogio: '2026-03-02 15:45', usuario: 'Breno', acao: 'Excluiu o cliente Empresa Fict\u00edcia', ip: '10.0.0.5' },
                    { id: 3, relogio: '2026-03-03 09:12', usuario: 'Raphael (Admin)', acao: 'Criou novo Processo em Lote', ip: '192.168.1.15' },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchAudit();
    }, []);

    const tableColumns = ['Data/Hora', 'Usu\u00e1rio Respons\u00e1vel', 'A\u00e7\u00e3o Realizada', 'Endere\u00e7o IP'];

    const tableData = logs.map(log => [
        log.relogio,
        log.usuario,
        log.acao,
        log.ip
    ]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert className="text-secondary" /> Logs de Auditoria
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Acompanhe todas as a\u00e7\u00f5es realizadas pelos funcion\u00e1rios na plataforma e rastreie incidentes.
                    </p>
                </div>
                <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Exportar CSV
                </Button>
            </div>

            <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
                <DataTable
                    columns={tableColumns}
                    data={tableData}
                    loading={loading}
                    emptyMessage="Nenhum log de atividade registrado."
                />
            </GlassCard>
        </div>
    );
};
