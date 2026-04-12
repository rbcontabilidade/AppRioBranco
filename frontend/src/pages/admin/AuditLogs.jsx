import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import DataTable from '../../components/ui/DataTable/DataTable';
import { auditService } from '../../services/auditService';
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
  AlertCircle,
  FileText,
  History
} from 'lucide-react';
import { Button } from '../../components/ui/Button/Button';
import { AuditDetailsDrawer } from './components/AuditDetailsDrawer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AuditLogs = () => {
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
        link.setAttribute("download", `auditoria_rbapp_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
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
          <span style={{ color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500' }} title={log.user_name}>{log.user_name}</span>
          <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.user_role}</span>
        </div>,
        <span style={{ textTransform: 'capitalize', color: '#d1d5db' }}>{log.module}</span>,
        <span style={{ textTransform: 'capitalize', fontWeight: '600', color: 'var(--primary-color, #6366f1)' }}>{log.action_type}</span>,
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
        <div className="view-section active" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.5s ease-out' }}>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>

            {/* Header da Página */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                        <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', display: 'flex' }}>
                            <ShieldAlert color="var(--primary-color, #6366f1)" size={28} />
                        </div>
                        Auditoria do Sistema
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} /> Registros históricos de todas as operações críticas e acessos
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="secondary" onClick={exportToCSV} disabled={logs.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={18} /> Exportar Relatório
                    </Button>
                    <Button variant="primary" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={18} className={loading ? 'spinning' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Sincronizar
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros Inteligentes */}
            <GlassCard style={{ padding: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                    {/* Busca Global */}
                    <div style={{ position: 'relative', flexGrow: 1, minWidth: '240px' }}>
                        <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
                        <input 
                            type="text"
                            name="search"
                            placeholder="Buscar por usuário, e-mail ou descrição..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            style={{ ...inputStyle, width: '100%', paddingLeft: '44px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Filtro Módulo */}
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
                            <option value="sistema">Geral / Sistema</option>
                        </select>

                        {/* Filtro Tipo Ação */}
                        <select 
                            name="action_type"
                            value={filters.action_type}
                            onChange={handleFilterChange}
                            style={inputStyle}
                        >
                            <option value="">Todas Ações</option>
                            <option value="login">Login</option>
                            <option value="create">Criação</option>
                            <option value="update">Edição</option>
                            <option value="delete">Exclusão</option>
                        </select>

                        {/* Filtro Severidade */}
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

                        {/* Filtro de Datas */}
                        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px' }}>
                            <Calendar color="#64748b" size={18} />
                            <input 
                                type="date"
                                name="startDate"
                                title="Data Inicial"
                                value={filters.startDate}
                                onChange={handleFilterChange}
                                style={{ background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontSize: '0.875rem' }}
                            />
                            <span style={{ color: '#475569' }}>-</span>
                            <input 
                                type="date"
                                name="endDate"
                                title="Data Final"
                                value={filters.endDate}
                                onChange={handleFilterChange}
                                style={{ background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontSize: '0.875rem' }}
                            />
                        </div>

                        {/* Botão Resetar */}
                        <button 
                            onClick={clearFilters}
                            title="Limpar Filtros"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                        >
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Container da Tabela com Paginação */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    {error ? (
                        <GlassCard style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                            <AlertCircle size={56} color="#ef4444" style={{ marginBottom: '20px', opacity: 0.6 }} />
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Falha na Comunicação</h3>
                            <p style={{ color: '#94a3b8', maxWidth: '450px', fontSize: '1rem', lineHeight: '1.5' }}>{error}</p>
                            <div style={{ marginTop: '24px' }}>
                                <Button variant="primary" onClick={fetchLogs}>Tentar Novamente</Button>
                            </div>
                        </GlassCard>
                    ) : (
                        <div style={{ background: 'rgba(15, 23, 42, 0.3)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                            <DataTable
                                columns={tableColumns}
                                data={tableData}
                                loading={loading && logs.length === 0}
                                emptyMessage="Nenhuma trilha de auditoria encontrada para os parâmetros definidos."
                            />
                        </div>
                    )}
                    
                    {/* Overlay de Loading suave quando já tem dados */}
                    {loading && logs.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', zIndex: 10 }}>
                             <div style={{ background: '#1e293b', padding: '20px 32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
                                <RefreshCw color="var(--primary-color, #6366f1)" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                <span>Atualizando registros...</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* Paginação Premium */}
                {!error && totalCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', padding: '8px 12px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            Exibindo <span style={{ color: '#fff', fontWeight: '600' }}>{logs.length}</span> de <span style={{ color: '#fff', fontWeight: '600' }}>{totalCount}</span> eventos registrados
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button 
                                disabled={page === 1 || loading}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: (page === 1 || loading) ? 'not-allowed' : 'pointer', opacity: (page === 1 || loading) ? 0.3 : 1, transition: 'all 0.2s' }}
                                onMouseOver={(e) => !loading && page > 1 && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            >
                                <ChevronLeft size={22} />
                            </button>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                            style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', transition: 'all 0.2s', background: isActive ? 'var(--primary-color, #6366f1)' : 'rgba(255,255,255,0.03)', color: isActive ? '#fff' : '#94a3b8', border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', boxShadow: isActive ? '0 8px 16px -4px rgba(99, 102, 241, 0.4)' : 'none' }}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button 
                                disabled={page >= totalPages || loading}
                                onClick={() => setPage(p => p + 1)}
                                style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', cursor: (page >= totalPages || loading) ? 'not-allowed' : 'pointer', opacity: (page >= totalPages || loading) ? 0.3 : 1, transition: 'all 0.2s' }}
                                onMouseOver={(e) => !loading && page < totalPages && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            >
                                <ChevronRight size={22} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

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

export default AuditLogs;
