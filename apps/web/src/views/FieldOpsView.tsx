import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, AlertBanner } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';

export const FieldOpsView: React.FC = () => {
  const {
    currentLanguage,
    isOffline,
    toggleOffline,
    pendingMutations,
    queueMutation,
    clearPendingMutations,
    projects,
    selectedProjectId,
  } = useEosContext();

  const [checklists, setChecklists] = useState([
    { id: 'chk-01', label: 'Overhead Truss Rigging Torque Check', completed: true, critical: true },
    { id: 'chk-02', label: 'Generator Grounding & Fuel Spill Perimeter', completed: true, critical: true },
    { id: 'chk-03', label: 'Emergency Exit Route Clearance & Signage', completed: false, critical: true },
    { id: 'chk-04', label: 'AV Control Desk Talkback Comms Verification', completed: false, critical: false },
  ]);

  const [incidentLogged, setIncidentLogged] = useState(false);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleToggleChecklist = (id: string) => {
    setChecklists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c))
    );
    if (isOffline) {
      queueMutation('update_checklist', 'FieldChecklist', { checklistId: id });
    }
  };

  const handleLogIncident = () => {
    setIncidentLogged(true);
    if (isOffline) {
      queueMutation('report_incident', 'HseIncident', {
        severity: 'minor',
        description: 'Temporary water leak near hall 2 service bay. Decoupled from public client view.',
      });
    }
  };

  const viewState = isOffline
    ? ViewStateFactory.offline(
        pendingMutations.length,
        new Date().toISOString(),
        'Field device running offline. Observations queued locally; supervisor inspection required upon reconnect.'
      )
    : ViewStateFactory.ready(checklists);

  return (
    <div data-testid="field-ops-workspace" style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Mobile-First Header */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <span style={{ fontWeight: 700, fontSize: '15px' }}>
              {currentLanguage === 'ar' ? 'عمليات الموقع الميدانية (PWA)' : 'Field Ops PWA'}
            </span>
          </div>
          <Badge variant={isOffline ? 'warning' : 'success'}>
            {isOffline ? (currentLanguage === 'ar' ? 'غير متصل (محلي)' : 'OFFLINE') : (currentLanguage === 'ar' ? 'متصل' : 'ONLINE')}
          </Badge>
        </div>
        <div style={{ fontSize: '13px', color: '#94a3b8' }}>
          {currentProject.title} [{currentProject.projectCode}]
        </div>
      </div>

      <ViewStateRenderer
        viewState={viewState}
        onSyncOfflineQueue={() => {
          clearPendingMutations();
          toggleOffline();
        }}
      >
        {() => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Actions Panel */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
              }}
            >
              <Button size="sm" variant="secondary" onClick={toggleOffline}>
                {isOffline ? '⚡ Reconnect Network' : '📶 Simulate Offline Loss'}
              </Button>
              <Button size="sm" variant="danger" onClick={handleLogIncident}>
                🚨 {currentLanguage === 'ar' ? 'تسجيل حادث سلامة' : 'Log Incident'}
              </Button>
            </div>

            {incidentLogged && (
              <AlertBanner
                type="warning"
                title="HSE Incident Recorded"
                action={{ label: 'Dismiss', onClick: () => setIncidentLogged(false) }}
              >
                Incident recorded into internal log. Internal narrative is strictly decoupled and stripped from the Client Portal.
              </AlertBanner>
            )}

            {/* Checklist Runner */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700 }}>
                {currentLanguage === 'ar' ? 'قائمة الفحص الميداني والجاهزية' : 'Live Field Readiness Checklist'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {checklists.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      backgroundColor: item.completed ? '#f0fdf4' : '#ffffff',
                      border: `1px solid ${item.completed ? '#86efac' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => {}}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: item.completed ? 'line-through' : 'none',
                          color: item.completed ? '#166534' : '#0f172a',
                        }}
                      >
                        {item.label}
                      </div>
                      {item.critical && (
                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                          • Critical Safety Gate
                        </span>
                      )}
                    </div>
                    {item.completed ? (
                      <Badge variant="success">PASS</Badge>
                    ) : (
                      <Badge variant={item.critical ? 'danger' : 'neutral'}>PENDING</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ViewStateRenderer>
    </div>
  );
};
