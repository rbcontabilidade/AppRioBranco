import React from 'react';
import { X, User, Clock, Terminal, Monitor, Globe, Shield, Info, AlertTriangle, AlertCircle, Copy, Check } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard/GlassCard';
import { Button } from '../../../components/ui/Button/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AuditDetailsDrawer = ({ log, onClose }) => {
  if (!log) return null;

  const [copied, setCopied] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(log.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status) => {
    const colors = {
      success: 'bg-success/20 text-success border-success/30',
      failure: 'bg-danger/20 text-danger border-danger/30',
      warning: 'bg-warning/20 text-warning border-warning/30'
    };
    const labels = {
      success: 'Sucesso',
      failure: 'Falha',
      warning: 'Aviso'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.success}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const configs = {
      low: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Baixa' },
      medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Média' },
      high: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: 'Alta' },
      critical: { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Crítica' }
    };
    const config = configs[severity] || configs.low;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-xl bg-[#1a1c1e] z-[101] shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={22} className="text-secondary" /> Detalhes do Evento
            </h3>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
              ID: <span className="font-mono text-xs">{log.id}</span>
              <button onClick={handleCopyId} className="hover:text-white transition-colors">
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              </button>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Sessão: Resumo da Ação */}
          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Ação</label>
              <div className="text-white font-medium capitalize">{log.action_type}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Módulo</label>
              <div className="text-white font-medium capitalize">{log.module}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Status</label>
              <div>{getStatusBadge(log.status)}</div>
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Severidade</label>
              <div>{getSeverityBadge(log.severity)}</div>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Descrição</label>
              <div className="text-gray-300 text-sm leading-relaxed">{log.description || 'Sem descrição.'}</div>
            </div>
          </section>

          {/* Sessão: Quem e Quando */}
          <section className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
            <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 px-1">
              <Clock size={16} /> Origem e Tempo
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User size={18} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Usuário</div>
                  <div className="text-sm text-white font-medium">{log.user_name}</div>
                  <div className="text-xs text-gray-400">{log.user_email}</div>
                  <div className="text-xs text-secondary mt-0.5 font-medium">{log.user_role}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500">Data e Hora</div>
                  <div className="text-sm text-white font-medium">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-gray-400">
                    UTC {format(new Date(log.created_at), "xxx")}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sessão: Entidade */}
          {(log.entity_type || log.entity_label) && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 px-1">
                <Info size={16} /> Entidade Afetada
              </h4>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-wrap gap-6">
                <div>
                  <div className="text-xs text-gray-500">Tipo</div>
                  <div className="text-sm text-white capitalize">{log.entity_type || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">ID da Entidade</div>
                  <div className="text-sm text-white font-mono">{log.entity_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Nome/Label</div>
                  <div className="text-sm text-white">{log.entity_label || 'N/A'}</div>
                </div>
              </div>
            </section>
          )}

          {/* Sessão: Mudanças (Valores) */}
          {(Object.keys(log.old_values || {}).length > 0 || Object.keys(log.new_values || {}).length > 0) && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 px-1">
                <Terminal size={16} /> Alterações de Dados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-medium px-1">Valor Anterior</div>
                  <pre className="bg-black/40 rounded-lg p-3 text-xs text-danger border border-danger/20 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-medium px-1">Novo Valor</div>
                  <pre className="bg-black/40 rounded-lg p-3 text-xs text-success border border-success/20 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              </div>
            </section>
          )}

          {/* Sessão: Metadados e Info Técnica */}
          <section className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2 px-1">
              <Monitor size={16} /> Informações Técnicas
            </h4>
            <div className="bg-black/30 rounded-xl p-4 border border-white/5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-400">IP:</span>
                  <span className="text-xs text-white uppercase">{log.ip_address || 'Privado/Oculto'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-400">Plataforma:</span>
                  <span className="text-xs text-white">{log.metadata?.platform || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-500">User Agent:</div>
                <div className="text-[10px] leading-tight text-gray-400 font-mono bg-black/40 p-2 rounded border border-white/5 break-all">
                  {log.user_agent || log.metadata?.userAgent || 'Não identificado'}
                </div>
              </div>
            </div>
          </section>

          {/* Botão de RAW JSON */}
          <section className="pt-4">
             <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-white transition-colors flex items-center gap-1 list-none group-open:mb-3">
                   <Info size={14} /> Ver Payload JSON Completo
                </summary>
                <GlassCard className="p-0 border-white/5">
                  <pre className="text-[10px] text-gray-400 p-4 overflow-x-auto bg-black/40 rounded-lg whitespace-pre-wrap h-64 overflow-y-auto font-mono">
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </GlassCard>
             </details>
          </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Fechar Detalhes
          </Button>
        </div>

      </div>
    </>
  );
};
