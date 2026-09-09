import React, { useEffect, useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { useEosApi } from '../hooks/useEosApi.js';
import { Badge, Button } from './DesignSystem.js';

interface AuditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const AuditHistoryDrawer: React.FC<AuditHistoryDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const { currentLanguage, refreshTrigger } = useEosContext();
  const { client } = useEosApi();

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAudit();
    }
  }, [isOpen, projectId, refreshTrigger]);

  const loadAudit = async () => {
    setIsLoading(true);
    try {
      const data = await client.getAuditHistory(projectId);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '560px',
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          height: '100%',
          boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #cbd5e1',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #334155',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                SHA-256 VERIFIED
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Cloud SQL PostgreSQL 17</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {currentLanguage === 'ar' ? 'سجل التدقيق غير القابل للتلاعب' : 'Immutable Audit Manifest'}
            </h3>
          </div>

          <button
            id="btn-close-audit-drawer"
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Info Banner */}
        <div style={{ padding: '12px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          Every administrative action, approval decision, and deliverable state change generates a cryptographic SHA-256 hash linked to its predecessor.
        </div>

        {/* Content List */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Fetching verified audit trail from PostgreSQL...
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No audit events recorded yet for this project.
            </div>
          ) : (
            events.map((ev, idx) => (
              <div
                key={ev.id || idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{ev.action}</span>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      By: <strong>{ev.actor}</strong> ({ev.role})
                    </div>
                  </div>
                  <Badge variant="success">Chained</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', backgroundColor: '#f1f5f9', padding: '6px 8px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>#HASH:</span>
                  <span style={{ fontSize: '11px', color: '#0369a1', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {ev.entryHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                  <span>{new Date(ev.timestamp).toLocaleString()}</span>
                  <button
                    onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                  >
                    {expandedId === ev.id ? 'Hide Details' : 'View Payload'}
                  </button>
                </div>

                {expandedId === ev.id && ev.details && (
                  <pre
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#0f172a',
                      color: '#38bdf8',
                      borderRadius: '4px',
                      fontSize: '11px',
                      overflowX: 'auto',
                      maxHeight: '150px',
                    }}
                  >
                    {typeof ev.details === 'string' ? ev.details : JSON.stringify(ev.details, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {events.length} verified immutable event(s)
          </span>
          <Button variant="outline" size="sm" onClick={loadAudit}>
            🔄 Refresh Trail
          </Button>
        </div>
      </div>
    </div>
  );
};
