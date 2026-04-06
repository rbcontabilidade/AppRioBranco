import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import DataTable from '../../../components/ui/DataTable/DataTable';
import { auditService } from '../../../services/auditService';
import { 
  ShieldAlert, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/Button/Button';
import { AuditDetailsDrawer } from './AuditDetailsDrawer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AuditSettings = () => {
    // Estados principais
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 15;

    // Filtros
    const [filters, setFilters] = useState({
        search: '',
        module: '',
        action_type: '',
        status: '',
        severity: '',
        startDate: '',
        endDate: ''
    });

    // Estado do Drawer
    const [selectedLog, setSelectedLog] = useState(null);

    // Fetch de dados
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, count, error: apiError } = await auditService.getLogs(filters, page, pageSize);
            if (apiError) throw new Error(apiError);
            setLogs(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error("Erro ao buscar logs:", err);
            setError("Não foi possível carregar os logs de auditoria. Verifique sua conexão e permissões.");
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Volta para primeira página ao filtrar
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            module: '',
            action_type: '',
            status: '',
            severity: '',
            startDate: '',
            endDate: ''
        });
        setPage(1);
    };

    const exportToCSV = () => {
        if (logs.length === 0) return;

        const headers = ["ID", "Data", "Usuário", "Email", "Módulo", "Ação", "Entidade", "Status", "Severidade", "Descrição"];
        const csvRows = [headers.join(",")];

        logs.forEach(log => {
            const row = [
                log.id,
                format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
                `"${log.user_name}"`,
                log.user_email,
                log.module,
                log.action_type,
                `"${log.entity_label || log.entity_type || ''}"`,
                log.status,
                log.severity,
                `"${(log.description || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(","));
        });

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `auditoria_fiscalapp_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Formatação de badges para a tabela
    const renderBadge = (type, value) => {
        let style = {
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            border: '1px solid',
            display: 'inline-block'
        };
        
        if (type === 'status') {
            const colors = {
                success: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.2)' },
                failure: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' },
                warning: { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.2)' }
            };
            const theme = colors[value] || colors.success;
            style = { ...style, background: theme.bg, color: theme.color, borderColor: theme.borderColor };
        } else if (type === 'severity') {
            const colors = {
                low: { bg: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.2)' },
                medium: { bg: 'rgba(234, 179, 8, 0.1)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.2)' },
                high: { bg: 'rgba(249, 115, 22, 0.1)', color: '#fb923c', borderColor: 'rgba(249, 115, 22, 0.2)' },
                critical: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }
            };
            const theme = colors[value] || colors.low;
            style = { ...style, background: theme.bg, color: theme.color, borderColor: theme.borderColor };
        }

        return <span style={style}>{value}</span>;
    };

    const tableColumns = ['Data/Hora', 'Usuário', 'Módulo', 'Ação', 'Entidade', 'Status', 'Severidade', ''];

    const tableData = logs.map(log => {
        const dateObj = log.created_at ? new Date(log.created_at) : new Date();
        return [
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#fff', fontWeight: '500' }}>{format(dateObj, "dd/MM/yyyy")}</span>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{format(dateObj, "HH:mm:ss")}</span>
        </div>,
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '150px' }}>
          <span style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.user_name}>{log.user_name}</span>
          <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.user_role}</span>
        </div>,
        <span style={{ textTransform: 'capitalize', color: '#d1d5db' }}>{log.module}</span>,
        <span style={{ textTransform: 'capitalize', fontWeight: '500', color: 'var(--secondary-color, #a855f7)' }}>{log.action_type}</span>,
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '180px' }}>
          <span style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }}>{log.entity_label || '-'}</span>
          <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>{log.entity_type}</span>
        </div>,
        renderBadge('status', log.status),
        renderBadge('severity', log.severity),
        <button 
            onClick={() => setSelectedLog(log)}
            style={{ padding: '8px', background: 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            title="Ver detalhes"
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
        >
            <Eye size={18} />
        </button>
    ];
    });

    const totalPages = Math.ceil(totalCount / pageSize);

    const inputStyle = {
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '10px 16px',
        color: '#fff',
        fontSize: '0.875rem',
        outline: 'none',
        transition: 'all 0.2s',
        minWidth: '140px'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header com Stats Rápidos */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <div style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', display: 'flex' }}>
                            <ShieldAlert color="var(--secondary-color, #a855f7)" size={24} />
                        </div>
                        Logs de Auditoria
                    </h2>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                        Rastreabilidade total das operações críticas do sistema.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" onClick={exportToCSV} disabled={logs.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={18} /> Exportar CSV
                    </Button>
                    <Button variant="primary" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros */}
            <GlassCard style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    {/* Busca */}
                    <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px', maxWidth: '300px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} size={16} />
                        <input 
                            type="text"
                            name="search"
                            placeholder="Buscar por usuário, descrição..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            style={{ ...inputStyle, width: '100%', paddingLeft: '36px', boxSizing: 'border-box' }}
                        />
                    </div>

                    {/* Módulo */}
                    <select 
                        name="module"
                        value={filters.module}
                        onChange={handleFilterChange}
                        style={inputStyle}
                    >
                        <option value="">Todos Módulos</option>
                        <option value="auth">Autenticação</option>
                        <option value="clientes">Clientes</option>
                        <option value="processos">Processos</option>
                        <option value="permissões">Permissoes</option>
                        <option value="sistema">Sistema</option>
                    </select>

                    {/* Status */}
                    <select 
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        style={inputStyle}
                    >
                        <option value="">Todos Status</option>
                        <option value="success">Sucesso</option>
                        <option value="failure">Falha</option>
                        <option value="warning">Aviso</option>
                    </select>

                    {/* Severidade */}
                    <select 
                        name="severity"
                        value={filters.severity}
                        onChange={handleFilterChange}
                        style={inputStyle}
                    >
                        <option value="">Severidade</option>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                    </select>

                    {/* Data Início */}
                    <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px' }}>
                        <Calendar color="#6b7280" size={16} />
                        <input 
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            style={{ background: 'transparent', border: 'none', color: '#d1d5db', outline: 'none', fontSize: '0.875rem' }}
                        />
                    </div>

                    {/* Botão Limpar */}
                    <button 
                        onClick={clearFilters}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '500', color: '#9ca3af', background: 'transparent', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginLeft: 'auto', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                    >
                        <XCircle size={16} /> Limpar
                    </button>
                </div>
            </GlassCard>

            {/* Tabela de Dados */}
            <div style={{ position: 'relative', minHeight: '400px' }}>
                {error ? (
                    <GlassCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Ops! Algo deu errado</h3>
                        <p style={{ color: '#9ca3af', maxWidth: '400px' }}>{error}</p>
                        <div style={{ marginTop: '24px' }}>
                            <Button variant="secondary" onClick={fetchLogs}>Tentar Novamente</Button>
                        </div>
                    </GlassCard>
                ) : (
                    <DataTable
                        columns={tableColumns}
                        data={tableData}
                        loading={loading}
                        emptyMessage="Nenhum registro de auditoria encontrado para os filtros selecionados."
                    />
                )}
                
                {/* Loader Overlay */}
                {loading && logs.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', zIndex: 10 }}>
                        <RefreshCw color="var(--secondary-color, #a855f7)" size={32} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                )}
            </div>

            {/* Paginação */}
            {!error && totalCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '0 8px' }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Mostrando <span style={{ color: '#fff', fontWeight: '500' }}>{Math.min(logs.length, pageSize)}</span> de <span style={{ color: '#fff', fontWeight: '500' }}>{totalCount}</span> registros
                    </div>
                    <div style={{ display: 'flex', itemsCenter: 'center', gap: '8px' }}>
                        <button 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: (page === 1 || loading) ? 'not-allowed' : 'pointer', opacity: (page === 1 || loading) ? 0.3 : 1 }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div style={{ display: 'flex', itemsCenter: 'center', gap: '6px', padding: '0 8px' }}>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (page <= 3) pageNum = i + 1;
                                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = page - 2 + i;

                                const isActive = page === pageNum;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s', background: isActive ? 'var(--secondary-color, #a855f7)' : 'rgba(255,255,255,0.05)', color: isActive ? '#fff' : '#9ca3af', border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxShadow: isActive ? '0 4px 12px rgba(168, 85, 247, 0.2)' : 'none' }}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', cursor: (page >= totalPages || loading) ? 'not-allowed' : 'pointer', opacity: (page >= totalPages || loading) ? 0.3 : 1 }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Detalhes Drawer */}
            {selectedLog && (
                <AuditDetailsDrawer 
                    log={selectedLog} 
                    onClose={() => setSelectedLog(null)} 
                />
            )}
        </div>
    );
};

