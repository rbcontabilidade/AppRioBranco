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
        let style = "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ";
        
        if (type === 'status') {
            const colors = {
                success: 'bg-success/10 text-success border-success/20',
                failure: 'bg-danger/10 text-danger border-danger/20',
                warning: 'bg-warning/10 text-warning border-warning/20'
            };
            style += colors[value] || colors.success;
        } else if (type === 'severity') {
            const colors = {
                low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
                critical: 'bg-red-500/10 text-red-500 border-red-500/20'
            };
            style += colors[value] || colors.low;
        }

        return <span className={style}>{value}</span>;
    };

    const tableColumns = ['Data/Hora', 'Usuário', 'Módulo', 'Ação', 'Entidade', 'Status', 'Severidade', ''];

    const tableData = logs.map(log => [
        <div className="flex flex-col">
          <span className="text-white font-medium">{format(new Date(log.created_at), "dd/MM/yyyy")}</span>
          <span className="text-[10px] text-gray-500">{format(new Date(log.created_at), "HH:mm:ss")}</span>
        </div>,
        <div className="flex flex-col max-w-[150px]">
          <span className="text-white truncate" title={log.user_name}>{log.user_name}</span>
          <span className="text-[10px] text-gray-400 truncate">{log.user_role}</span>
        </div>,
        <span className="capitalize text-gray-300">{log.module}</span>,
        <span className="capitalize font-medium text-secondary">{log.action_type}</span>,
        <div className="flex flex-col max-w-[180px]">
          <span className="text-white truncate font-medium">{log.entity_label || '-'}</span>
          <span className="text-[10px] text-gray-500 uppercase">{log.entity_type}</span>
        </div>,
        renderBadge('status', log.status),
        renderBadge('severity', log.severity),
        <button 
            onClick={() => setSelectedLog(log)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
            title="Ver detalhes"
        >
            <Eye size={18} />
        </button>
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header com Stats Rápidos */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-secondary/20 rounded-lg">
                            <ShieldAlert className="text-secondary" size={24} />
                        </div>
                        Logs de Auditoria
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Rastreabilidade total das operações críticas do sistema.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={exportToCSV} disabled={logs.length === 0} className="flex items-center gap-2">
                        <Download size={18} /> Exportar CSV
                    </Button>
                    <Button variant="primary" onClick={fetchLogs} className="flex items-center gap-2">
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </Button>
                </div>
            </div>

            {/* Barra de Filtros */}
            <GlassCard className="p-4 bg-white/5 border-white/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                    {/* Busca */}
                    <div className="relative col-span-1 sm:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text"
                            name="search"
                            placeholder="Buscar por usuário, descrição..."
                            value={filters.search}
                            onChange={handleFilterChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-secondary transition-colors"
                        />
                    </div>

                    {/* Módulo */}
                    <select 
                        name="module"
                        value={filters.module}
                        onChange={handleFilterChange}
                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-secondary"
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
                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-secondary"
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
                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-secondary"
                    >
                        <option value="">Severidade</option>
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="critical">Crítica</option>
                    </select>

                    {/* Data Início */}
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                        <input 
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-2 py-2 text-xs text-white focus:outline-none"
                        />
                    </div>

                    {/* Botão Limpar */}
                    <button 
                        onClick={clearFilters}
                        className="flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white transition-colors p-2"
                    >
                        <XCircle size={16} /> Limpar Filtros
                    </button>
                </div>
            </GlassCard>

            {/* Tabela de Dados */}
            <div className="relative min-h-[400px]">
                {error ? (
                    <GlassCard className="flex flex-col items-center justify-center p-12 text-center border-danger/20">
                        <AlertCircle size={48} className="text-danger mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h3>
                        <p className="text-gray-400 max-w-md">{error}</p>
                        <Button variant="secondary" className="mt-6" onClick={fetchLogs}>Tentar Novamente</Button>
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
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-10 transition-all">
                        <RefreshCw className="text-secondary animate-spin" size={32} />
                    </div>
                )}
            </div>

            {/* Paginação */}
            {!error && totalCount > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                    <div className="text-sm text-gray-500">
                        Mostrando <span className="text-white font-medium">{Math.min(logs.length, pageSize)}</span> de <span className="text-white font-medium">{totalCount}</span> registros
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1 || loading}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-1.5 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (page <= 3) pageNum = i + 1;
                                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = page - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                            page === pageNum 
                                            ? 'bg-secondary text-white shadow-lg shadow-secondary/20' 
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        <button 
                            disabled={page >= totalPages || loading}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
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
