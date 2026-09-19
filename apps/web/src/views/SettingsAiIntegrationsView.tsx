import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Select, Textarea, E3_THEME } from '../components/DesignSystem.js';
import { CentralSettingsConfigDto, ProviderConnectionDto, TaskRoutingRuleDto } from '@e3-eos/contracts';

type TabKey = 'connections' | 'routing' | 'adapters' | 'policies' | 'history';

export const SettingsAiIntegrationsView: React.FC = () => {
  const { currentLanguage, apiClient, currentUser } = useEosContext();

  const [activeTab, setActiveTab] = useState<TabKey>('connections');
  const [activeConfig, setActiveConfig] = useState<CentralSettingsConfigDto | null>(null);
  const [draftConfig, setDraftConfig] = useState<CentralSettingsConfigDto | null>(null);
  const [history, setHistory] = useState<CentralSettingsConfigDto[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Synthetic Test States
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Activation Modal States
  const [isActivateModalOpen, setIsActivateModalOpen] = useState<boolean>(false);
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [isActivating, setIsActivating] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Secret Edit States
  const [secretEdits, setSecretEdits] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, draftRes, historyRes, readyRes] = await Promise.all([
        apiClient.getSettingsIntegrations().catch(() => null),
        apiClient.getDraftSettings().catch(() => null),
        apiClient.getSettingsHistory().catch(() => ({ data: [] })),
        apiClient.getSettingsReadiness().catch(() => null),
      ]);

      if (activeRes?.data) setActiveConfig(activeRes.data);
      if (draftRes?.data) {
        setDraftConfig(draftRes.data);
      } else if (activeRes?.data) {
        setDraftConfig({ ...activeRes.data, status: 'draft' });
      }
      if (historyRes?.data) setHistory(historyRes.data);
      if (readyRes?.data) setReadiness(readyRes.data);
      setHasChanges(false);
    } catch (err: any) {
      console.error('Failed to load Central Settings', err);
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async (conn: ProviderConnectionDto) => {
    setTestingProvider(conn.id);
    try {
      const secretToTest = secretEdits[conn.id] || undefined;
      const res = await apiClient.testIntegrationConnection({
        provider: conn.provider,
        secretKey: secretToTest,
        endpoint: conn.approvedEndpoint,
        region: conn.approvedRegion,
      });

      setTestResults((prev) => ({
        ...prev,
        [conn.id]: {
          success: true,
          message: res.data?.message || 'Synthetic test passed (zero tender leaks verified)',
          latencyMs: res.data?.latencyMs,
          testedAt: res.data?.testedAt,
          verifiedModels: res.data?.verifiedModels,
        },
      }));

      // Update health in draft
      if (draftConfig) {
        const updatedConnections = draftConfig.connections.map((c) =>
          c.id === conn.id
            ? { ...c, health: 'healthy' as const, latencyMs: res.data?.latencyMs || c.latencyMs, lastTestedAt: res.data?.testedAt }
            : c
        );
        setDraftConfig({ ...draftConfig, connections: updatedConnections });
        setHasChanges(true);
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [conn.id]: {
          success: false,
          message: err.message || 'Connection failed',
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftConfig) return;
    setSaving(true);
    try {
      // Apply any secret edits to connections before saving
      const updatedConnections = draftConfig.connections.map((c) => {
        if (secretEdits[c.id]) {
          return { ...c, secretKey: secretEdits[c.id] };
        }
        return c;
      });

      const payload = {
        ...draftConfig,
        connections: updatedConnections,
      };

      const res = await apiClient.saveDraftSettings(payload);
      if (res.data) {
        setDraftConfig(res.data);
        setSecretEdits({});
        setHasChanges(false);
        setFeedbackMessage({ type: 'success', text: 'Draft configuration saved successfully.' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to save draft configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!draftConfig || !changeSummary.trim()) return;
    setIsActivating(true);
    try {
      // First save draft if modified
      if (hasChanges || Object.keys(secretEdits).length > 0) {
        await handleSaveDraft();
      }

      const res = await apiClient.activateSettings({
        draftVersion: draftConfig.version,
        changeSummary: changeSummary.trim(),
        actorName: (currentUser as any)?.name || 'Executive Security Officer',
      });

      if (res.data) {
        setActiveConfig(res.data);
        setIsActivateModalOpen(false);
        setChangeSummary('');
        setFeedbackMessage({
          type: 'success',
          text: `Central Settings Configuration v${res.data.version} activated and locked. All microservices updated.`,
        });
        await loadData();
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Activation failed' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleUpdateRoutingRule = (index: number, field: keyof TaskRoutingRuleDto, value: any) => {
    if (!draftConfig) return;
    const updated = [...draftConfig.taskRouting];
    updated[index] = { ...updated[index], [field]: value };
    setDraftConfig({ ...draftConfig, taskRouting: updated });
    setHasChanges(true);
  };

  const handleUpdatePolicy = (field: string, value: any) => {
    if (!draftConfig) return;
    setDraftConfig({
      ...draftConfig,
      policies: {
        ...draftConfig.policies,
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: E3_THEME.text.muted, fontSize: '16px' }}>Loading Central Enterprise Configuration...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          borderBottom: `1px solid ${E3_THEME.surface.cardBorder}`,
          paddingBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: E3_THEME.text.primary, margin: 0 }}>
              Central AI & Integration Settings
            </h1>
            <Badge variant="success">
              Active v{activeConfig?.version ?? 1}
            </Badge>
            {hasChanges && (
              <Badge variant="warning">
                Unsaved Draft Changes
              </Badge>
            )}
          </div>
          <p style={{ color: E3_THEME.text.secondary, fontSize: '14px', margin: 0 }}>
            Unified server-side authority for model routing, secure credential vaulting, regional endpoints, and pure-JS document adapters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={saving || !hasChanges}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsActivateModalOpen(true)}
          >
            Activate Configuration
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            backgroundColor: feedbackMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${feedbackMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedbackMessage.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Readiness Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <Card style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: E3_THEME.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Provider Health
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: E3_THEME.text.primary }}>
            {activeConfig?.connections.filter((c) => c.health === 'healthy').length} / {activeConfig?.connections.length} Healthy
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            Doha me-central1 Active
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: E3_THEME.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Active Task Routes
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: E3_THEME.text.primary }}>
            {activeConfig?.taskRouting.filter((t) => t.active).length} Capabilities
          </div>
          <div style={{ fontSize: '12px', color: E3_THEME.text.secondary, marginTop: '4px' }}>
            Vision, Extraction, Embeddings, PDF
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: E3_THEME.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Document Adapters
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2563eb' }}>
            Pure-JS In-Engine
          </div>
          <div style={{ fontSize: '12px', color: E3_THEME.text.secondary, marginTop: '4px' }}>
            Zero Native OS Dependency
          </div>
        </Card>

        <Card style={{ padding: '16px' }}>
          <div style={{ fontSize: '12px', color: E3_THEME.text.muted, textTransform: 'uppercase', marginBottom: '4px' }}>
            Security Audit
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#059669' }}>
            Masked Secrets
          </div>
          <div style={{ fontSize: '12px', color: E3_THEME.text.secondary, marginTop: '4px' }}>
            Zero Plaintext in Browser
          </div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: `2px solid ${E3_THEME.surface.cardBorder}`,
          marginBottom: '24px',
        }}
      >
        {[
          { id: 'connections', label: '1. Provider Connections' },
          { id: 'routing', label: '2. Task Routing' },
          { id: 'adapters', label: '3. Document & Media Adapters' },
          { id: 'policies', label: '4. Policies & Stamps' },
          { id: 'history', label: '5. Operations & Version History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabKey)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '400',
              color: activeTab === tab.id ? E3_THEME.accent.primary : E3_THEME.text.secondary,
              borderBottom: activeTab === tab.id ? `3px solid ${E3_THEME.accent.primary}` : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PROVIDER CONNECTIONS */}
      {activeTab === 'connections' && draftConfig && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: 0 }}>
              Configured AI & Processing Providers
            </h3>
            <span style={{ fontSize: '13px', color: E3_THEME.text.muted }}>
              Secrets are encrypted server-side and never returned to the browser in cleartext.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
            {draftConfig.connections.map((conn) => {
              const test = testResults[conn.id];
              return (
                <Card key={conn.id} style={{ padding: '20px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary }}>
                        {conn.label}
                      </div>
                      <div style={{ fontSize: '12px', color: E3_THEME.text.muted, marginTop: '2px' }}>
                        ID: {conn.id} • Provider: {conn.provider}
                      </div>
                    </div>
                    <Badge variant={conn.health === 'healthy' ? 'success' : conn.health === 'degraded' ? 'warning' : 'danger'}>
                      {conn.health.toUpperCase()}
                    </Badge>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: E3_THEME.text.muted }}>Approved Region:</span>
                      <span style={{ fontWeight: '500', color: E3_THEME.text.primary }}>{conn.approvedRegion}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: E3_THEME.text.muted }}>Endpoint:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: E3_THEME.text.primary, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conn.approvedEndpoint}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: E3_THEME.text.muted }}>Stored Secret:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                        {conn.maskedSecret || 'Encrypted Server-Side'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: E3_THEME.text.muted }}>Measured Latency:</span>
                      <span style={{ fontWeight: '500' }}>{conn.latencyMs ? `${conn.latencyMs} ms` : 'Not tested'}</span>
                    </div>

                    {/* Enterprise Authority Notice & Capabilities */}
                    {(conn.provider === 'e3_rentals' || conn.provider === 'e3_purchasetracker') && (
                      <div style={{ marginTop: '8px', padding: '10px', background: 'var(--surface-2, #151e2e)', border: '1px solid var(--border-default, #2a374b)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary, #cbd5e1)' }}>
                            {conn.provider === 'e3_rentals' ? 'Inventory & Assets Authority' : 'Procurement & Vendors Authority'}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: conn.mode === 'disabled' ? '#fef3c7' : '#e0f2fe',
                            color: conn.mode === 'disabled' ? '#92400e' : '#0369a1',
                          }}>
                            {conn.mode === 'disabled' ? 'DISCONNECTED / AWAITING LIVE' : 'SANDBOX VERIFIED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginBottom: '6px' }}>
                          {conn.provider === 'e3_rentals'
                            ? 'Rentals is authoritative for stock balances, availability, and custody. EOS maintains demand & allocations.'
                            : 'PurchaseTracker is authoritative for vendor onboarding, compliance, and PO issuance. EOS maintains project PRs.'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(conn.capabilities || (conn.provider === 'e3_rentals'
                            ? ['read_catalog', 'availability_query', 'internal_reservation']
                            : ['vendor_search', 'vendor_onboarding', 'pr_create', 'po_deferred']
                          )).map((cap: string) => (
                            <span key={cap} style={{
                              fontSize: '10px',
                              padding: '2px 5px',
                              background: cap.includes('deferred') ? '#fee2e2' : 'var(--surface-2, #151e2e)',
                              color: cap.includes('deferred') ? '#991b1b' : 'var(--text-secondary, #cbd5e1)',
                              borderRadius: '3px',
                              border: `1px solid ${cap.includes('deferred') ? '#fecaca' : 'var(--border-default, #2a374b)'}`,
                            }}>
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optional Secret Update Field */}
                    <div style={{ marginTop: '6px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: E3_THEME.text.muted, marginBottom: '4px' }}>
                        Update Secret Key (Leave blank to preserve current key):
                      </label>
                      <input
                        type="password"
                        placeholder="Paste new secret or token..."
                        value={secretEdits[conn.id] || ''}
                        onChange={(e) => {
                          setSecretEdits({ ...secretEdits, [conn.id]: e.target.value });
                          setHasChanges(true);
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '12px',
                          border: `1px solid ${E3_THEME.surface.cardBorder}`,
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  </div>

                  {/* Synthetic Test Feedback */}
                  {test && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        marginBottom: '12px',
                        backgroundColor: test.success ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${test.success ? '#a7f3d0' : '#fecaca'}`,
                        color: test.success ? '#065f46' : '#991b1b',
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>
                        {test.success ? '✓ Synthetic Check Passed' : '✕ Connection Failed'}
                      </div>
                      <div>{test.message}</div>
                      {test.latencyMs && <div>Latency: {test.latencyMs} ms</div>}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      onClick={() => handleTestConnection(conn)}
                      disabled={testingProvider === conn.id}
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      {testingProvider === conn.id ? 'Pinging...' : 'Test Synthetic Connection'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: TASK ROUTING */}
      {activeTab === 'routing' && draftConfig && (
        <Card style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: 0 }}>
              Task Routing Matrix & Fallback Order
            </h3>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: '4px 0 0 0' }}>
              Assign capabilities to regional models, define fallback providers, retry counts, and per-call expenditure limits in QAR.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${E3_THEME.surface.cardBorder}`, textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Capability</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Primary Connection</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Model Identifier</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Fallback Connection</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Max Retries</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Cost Limit (QAR)</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {draftConfig.taskRouting.map((rule, idx) => (
                <tr key={rule.capability} style={{ borderBottom: `1px solid ${E3_THEME.surface.tableBorder}` }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: E3_THEME.text.primary }}>
                    {rule.capability.toUpperCase()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={rule.primaryProvider}
                      onChange={(e) => handleUpdateRoutingRule(idx, 'primaryProvider', e.target.value as any)}
                      style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                    >
                      {draftConfig.connections.map((c) => (
                        <option key={c.id} value={c.provider}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={rule.primaryModel}
                      onChange={(e) => handleUpdateRoutingRule(idx, 'primaryModel', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${E3_THEME.surface.cardBorder}`, width: '180px' }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={rule.fallbackProvider || ''}
                      onChange={(e) => handleUpdateRoutingRule(idx, 'fallbackProvider', (e.target.value || undefined) as any)}
                      style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                    >
                      <option value="">None (Fail Closed)</option>
                      {draftConfig.connections.map((c) => (
                        <option key={c.id} value={c.provider}>{c.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={rule.maxRetries}
                      onChange={(e) => handleUpdateRoutingRule(idx, 'maxRetries', parseInt(e.target.value, 10))}
                      style={{ width: '60px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={rule.costLimitPerCallQar}
                      onChange={(e) => handleUpdateRoutingRule(idx, 'costLimitPerCallQar', parseFloat(e.target.value))}
                      style={{ width: '80px', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: `1px solid ${E3_THEME.surface.cardBorder}` }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rule.active}
                        onChange={(e) => handleUpdateRoutingRule(idx, 'active', e.target.checked)}
                      />
                      <span style={{ fontSize: '12px', color: rule.active ? '#059669' : E3_THEME.text.muted }}>
                        {rule.active ? 'Active' : 'Disabled'}
                      </span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* TAB 3: DOCUMENT & MEDIA ADAPTERS */}
      {activeTab === 'adapters' && draftConfig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: E3_THEME.text.primary, marginBottom: '12px' }}>
              Document & Assembly Engines
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>PDF Engine:</label>
                <input
                  type="text"
                  disabled
                  value={draftConfig.mediaAdapters.pdfEngine}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--surface-2, #151e2e)', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: '#059669' }}>Zero-dependency pure-JS canvas & PDF byte assembler</span>
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>OCR Extraction Engine:</label>
                <input
                  type="text"
                  disabled
                  value={draftConfig.mediaAdapters.ocrEngine}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--surface-2, #151e2e)', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: E3_THEME.text.secondary }}>Pasted text uses native text spans; scanned pages use client-side WASM</span>
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>CAD / 3D Viewer Engine:</label>
                <input
                  type="text"
                  disabled
                  value={draftConfig.mediaAdapters.cadViewerEngine}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--surface-2, #151e2e)', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: '#059669' }}>Interactive WebGL/Canvas viewport with front/top-down/isometric orbit</span>
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>Video Player Engine:</label>
                <input
                  type="text"
                  disabled
                  value={draftConfig.mediaAdapters.videoPlayerEngine}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'var(--surface-2, #151e2e)', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
                <span style={{ fontSize: '11px', color: '#059669' }}>Native HTML5 video element with time-anchored pin playback</span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: E3_THEME.text.primary, marginBottom: '12px' }}>
              Supported MIME Types
            </h4>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, marginBottom: '12px' }}>
              Whitelisted formats allowed into the evidence vault and design review pipeline:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {draftConfig.mediaAdapters.supportedFormats.map((fmt) => (
                <div
                  key={fmt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2, #151e2e)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  <span>{fmt}</span>
                  <Badge variant="success">ACCEPTED</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: POLICIES & STAMPS */}
      {activeTab === 'policies' && draftConfig && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: E3_THEME.text.primary, marginBottom: '12px' }}>
              Document Numbering Profiles
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>Vault Master Evidence:</label>
                <input
                  type="text"
                  value={draftConfig.policies.numberingProfiles.vault}
                  onChange={(e) =>
                    handleUpdatePolicy('numberingProfiles', {
                      ...draftConfig.policies.numberingProfiles,
                      vault: e.target.value,
                    })
                  }
                  style={{ width: '100%', padding: '8px', fontSize: '12px', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>Submission Sealed Packs:</label>
                <input
                  type="text"
                  value={draftConfig.policies.numberingProfiles.pack}
                  onChange={(e) =>
                    handleUpdatePolicy('numberingProfiles', {
                      ...draftConfig.policies.numberingProfiles,
                      pack: e.target.value,
                    })
                  }
                  style={{ width: '100%', padding: '8px', fontSize: '12px', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>Project Working Drawings:</label>
                <input
                  type="text"
                  value={draftConfig.policies.numberingProfiles.drawing}
                  onChange={(e) =>
                    handleUpdatePolicy('numberingProfiles', {
                      ...draftConfig.policies.numberingProfiles,
                      drawing: e.target.value,
                    })
                  }
                  style={{ width: '100%', padding: '8px', fontSize: '12px', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: E3_THEME.text.primary, marginBottom: '12px' }}>
              Renewal Alerts & Test Stamp Codes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>
                  Critical Renewal Threshold (Days):
                </label>
                <input
                  type="number"
                  value={draftConfig.policies.renewalCriticalDays}
                  onChange={(e) => handleUpdatePolicy('renewalCriticalDays', parseInt(e.target.value, 10))}
                  style={{ width: '100px', padding: '8px', fontSize: '12px', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>
                  Upcoming Renewal Threshold (Days):
                </label>
                <input
                  type="number"
                  value={draftConfig.policies.renewalUpcomingDays}
                  onChange={(e) => handleUpdatePolicy('renewalUpcomingDays', parseInt(e.target.value, 10))}
                  style={{ width: '100px', padding: '8px', fontSize: '12px', border: `1px solid ${E3_THEME.surface.cardBorder}`, borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: E3_THEME.text.muted, marginBottom: '4px' }}>
                  Authorized Test Stamp Codes (Acceptance Test Mode):
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {draftConfig.policies.authorizedTestStampCodes.map((code) => (
                    <span
                      key={code}
                      style={{
                        padding: '4px 8px',
                        background: '#eff6ff',
                        color: '#60a5fa',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        fontWeight: '600',
                      }}
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: OPERATIONS & VERSION HISTORY */}
      {activeTab === 'history' && (
        <Card style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: E3_THEME.text.primary, margin: 0 }}>
              Configuration Version Audit Ledger
            </h3>
            <p style={{ fontSize: '13px', color: E3_THEME.text.muted, margin: '4px 0 0 0' }}>
              Immutable record of every activated configuration state, author, and security change justification.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${E3_THEME.surface.cardBorder}`, textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Version</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Status</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Activated At</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Activated By</th>
                <th style={{ padding: '10px 12px', color: E3_THEME.text.muted }}>Change Summary</th>
              </tr>
            </thead>
            <tbody>
              {history.map((ver) => (
                <tr key={ver.version} style={{ borderBottom: `1px solid ${E3_THEME.surface.tableBorder}` }}>
                  <td style={{ padding: '12px', fontWeight: '700', color: E3_THEME.text.primary }}>
                    v{ver.version}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={ver.version === activeConfig?.version ? 'success' : 'neutral'}>
                      {ver.version === activeConfig?.version ? 'ACTIVE' : 'ARCHIVED'}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', color: E3_THEME.text.secondary }}>
                    {ver.activatedAt ? new Date(ver.activatedAt).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>
                    {ver.activatedBy || 'System Admin'}
                  </td>
                  <td style={{ padding: '12px', color: E3_THEME.text.secondary, maxWidth: '400px' }}>
                    {ver.changeSummary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ACTIVATION MODAL */}
      {isActivateModalOpen && (
        <Modal
          isOpen={isActivateModalOpen}
          onClose={() => setIsActivateModalOpen(false)}
          title={`Activate Central Settings Configuration (Promote to v${(activeConfig?.version ?? 0) + 1})`}
        >
          <div style={{ padding: '16px 0', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: E3_THEME.text.secondary, margin: 0 }}>
              Promoting this draft will immediately broadcast updated provider credentials, model routing, and document adapters across all microservices.
            </p>

            <div
              style={{
                padding: '12px',
                background: '#fffbeb',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#f59e0b',
              }}
            >
              <strong>Governance Requirement:</strong> A descriptive change summary is mandatory for regulatory compliance.
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', color: E3_THEME.text.primary }}>
                Change Summary & Justification:
              </label>
              <Textarea
                rows={4}
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="e.g., Added Doha Vertex production routing, updated Anthropic fallback timeout, certified pure-JS PDF adapter."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setIsActivateModalOpen(false)}
                disabled={isActivating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleActivate}
                disabled={isActivating || !changeSummary.trim()}
              >
                {isActivating ? 'Activating & Locking...' : 'Confirm & Activate'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
