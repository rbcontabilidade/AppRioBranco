import React from 'react';
import { X, User, Clock, Terminal, Monitor, Globe, Shield, Info, Check, Copy } from 'lucide-react';
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
    let style = {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid',
      display: 'inline-block'
    };
    
    if (status === 'success') {
      style = { ...style, background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' };
    } else if (status === 'failure') {
      style = { ...style, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' };
    } else {
      style = { ...style, background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.3)' };
    }

    const labels = { success: 'Sucesso', failure: 'Falha', warning: 'Aviso' };
    return <span style={style}>{labels[status] || status}</span>;
  };

  const getSeverityBadge = (severity) => {
    let style = {
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      border: '1px solid',
      display: 'inline-block'
    };

    const configs = {
      low: { background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.3)', label: 'Baixa' },
      medium: { background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', borderColor: 'rgba(234, 179, 8, 0.3)', label: 'Média' },
      high: { background: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', borderColor: 'rgba(249, 115, 22, 0.3)', label: 'Alta' },
      critical: { background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', label: 'Crítica' }
    };

    const config = configs[severity] || configs.low;
    
    return (
      <span style={{ ...style, background: config.background, color: config.color, borderColor: config.borderColor }}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div 
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)', zIndex: 100, transition: 'opacity 0.3s' }}
      />
      
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: '600px', backgroundColor: '#1a1c1e', zIndex: 101, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease-out forwards' }}>
        
        <style>
          {`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}
        </style>

        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Shield size={22} color="var(--secondary-color, #a855f7)" /> Detalhes do Evento
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 0 0' }}>
              ID: <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.id}</span>
              <button onClick={handleCopyId} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: '4px', borderRadius: '4px' }}>
                {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              </button>
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ padding: '8px', background: 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Sessão: Resumo da Ação */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600' }}>Ação</label>
              <div style={{ color: '#fff', fontWeight: '500', textTransform: 'capitalize' }}>{log.action_type}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600' }}>Módulo</label>
              <div style={{ color: '#fff', fontWeight: '500', textTransform: 'capitalize' }}>{log.module}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600' }}>Status</label>
              <div>{getStatusBadge(log.status)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600' }}>Severidade</label>
              <div>{getSeverityBadge(log.severity)}</div>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', fontWeight: '600' }}>Descrição</label>
              <div style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: '1.6' }}>{log.description || 'Sem descrição.'}</div>
            </div>
          </section>

          {/* Sessão: Quem e Quando */}
          <section style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingLeft: '4px' }}>
              <Clock size={16} /> Origem e Tempo
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <User size={18} color="#6b7280" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Usuário</div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: '500' }}>{log.user_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{log.user_email}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary-color, #a855f7)', fontWeight: '500', marginTop: '2px' }}>{log.user_role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock size={18} color="#6b7280" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Data e Hora</div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', fontWeight: '500' }}>
                    {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : 'Data não informada'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    UTC {log.created_at ? format(new Date(log.created_at), "xxx") : ''}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Sessão: Entidade */}
          {(log.entity_type || log.entity_label) && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingLeft: '4px' }}>
                <Info size={16} /> Entidade Afetada
              </h4>
              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tipo</div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', textTransform: 'capitalize' }}>{log.entity_type || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>ID da Entidade</div>
                  <div style={{ fontSize: '0.875rem', color: '#fff', fontFamily: 'monospace' }}>{log.entity_id || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Nome/Label</div>
                  <div style={{ fontSize: '0.875rem', color: '#fff' }}>{log.entity_label || 'N/A'}</div>
                </div>
              </div>
            </section>
          )}

          {/* Sessão: Mudanças (Valores) */}
          {(Object.keys(log.old_values || {}).length > 0 || Object.keys(log.new_values || {}).length > 0) && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingLeft: '4px' }}>
                <Terminal size={16} /> Alterações de Dados
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', paddingLeft: '4px' }}>Valor Anterior</div>
                  <pre style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '12px', fontSize: '0.75rem', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto', textAlign: 'left', margin: 0 }}>
                    {typeof log.old_values === 'string' ? log.old_values : JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', paddingLeft: '4px' }}>Novo Valor</div>
                  <pre style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '12px', fontSize: '0.75rem', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '240px', overflowY: 'auto', textAlign: 'left', margin: 0 }}>
                    {typeof log.new_values === 'string' ? log.new_values : JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              </div>
            </section>
          )}

          {/* Sessão: Metadados e Info Técnica */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, paddingLeft: '4px' }}>
              <Monitor size={16} /> Informações Técnicas
            </h4>
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={14} color="#6b7280" />
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>IP:</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff', textTransform: 'uppercase' }}>{log.ip_address || 'Privado/Oculto'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Monitor size={14} color="#6b7280" />
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Plataforma:</span>
                  <span style={{ fontSize: '0.75rem', color: '#fff' }}>{log.metadata?.platform || 'N/A'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>User Agent:</div>
                <div style={{ fontSize: '10px', lineHeight: '1.2', color: '#9ca3af', fontFamily: 'monospace', backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)', wordBreak: 'break-all' }}>
                  {log.user_agent || log.metadata?.userAgent || 'Não identificado'}
                </div>
              </div>
            </div>
          </section>

          {/* Botão de RAW JSON */}
          <section style={{ paddingTop: '16px' }}>
             <details>
                <summary style={{ fontSize: '0.75rem', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', listStyle: 'none', marginBottom: '12px', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = '#6b7280'}>
                   <Info size={14} /> Ver Payload JSON Completo
                </summary>
                <div style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: 0 }}>
                  <pre style={{ fontSize: '10px', color: '#9ca3af', padding: '16px', overflowX: 'auto', backgroundColor: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', whiteSpace: 'pre-wrap', height: '256px', overflowY: 'auto', fontFamily: 'monospace', margin: 0 }}>
                    {JSON.stringify(log, null, 2)}
                  </pre>
                </div>
             </details>
          </section>

        </div>

        {/* Footer */}
        <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
          <Button variant="secondary" style={{ width: '100%' }} onClick={onClose}>
            Fechar Detalhes
          </Button>
        </div>

      </div>
    </>
  );
};
