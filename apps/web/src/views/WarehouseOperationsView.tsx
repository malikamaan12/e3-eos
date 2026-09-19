import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';

export interface WarehouseZoneSummary {
  zone: string;
  assetCount: number;
  itemCount: number;
  damagedCount: number;
  status: 'nominal' | 'warning';
}

export interface WarehouseMovement {
  id: string;
  assetId: string;
  source: string;
  destination: string;
  movementType: string;
  quantity: number;
  condition: string;
  projectId?: string;
  evidenceUris: string[];
  userId: string;
  timestamp: string;
  notes?: string;
}

export const MOVEMENT_STAGES = [
  'received',
  'stored',
  'reserved',
  'picked',
  'packed',
  'dispatched',
  'on_site',
  'returned',
  'inspected',
  'restocked',
];

export const WarehouseOperationsView: React.FC = () => {
  const { apiClient, currentProject } = useEosContext();
  const [zones, setZones] = useState<WarehouseZoneSummary[]>([]);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    source: 'Intake Bay 01',
    destination: 'AV',
    movementType: 'stored',
    quantity: 1,
    condition: 'good',
    notes: '',
  });

  const loadWarehouseData = async () => {
    setLoading(true);
    try {
      const [zoneList, movList, assetList] = await Promise.all([
        apiClient.getWarehouseZones().catch(() => []),
        fetch(`${apiClient['baseUrl'] || '/api/v1'}/warehouse-movements`, {
          headers: apiClient['getHeaders'] ? apiClient['getHeaders']() : {},
        })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j) => j.data || [])
          .catch(() => []),
        fetch(`${apiClient['baseUrl'] || '/api/v1'}/assets`, {
          headers: apiClient['getHeaders'] ? apiClient['getHeaders']() : {},
        })
          .then((r) => (r.ok ? r.json() : { data: [] }))
          .then((j) => j.data || [])
          .catch(() => []),
      ]);

      setZones(zoneList);
      setMovements(movList);
      setAssets(assetList);
      if (assetList.length > 0 && !formData.assetId) {
        setFormData((prev) => ({ ...prev, assetId: assetList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const handleExecuteMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalDest = formData.destination;
      // Invariant: Damaged condition during inspection automatically routes to Quarantine zone
      if (formData.movementType === 'inspected' && ['damaged', 'quarantined'].includes(formData.condition)) {
        finalDest = 'Quarantine';
      }

      await apiClient.executeWarehouseMovement({
        assetId: formData.assetId,
        source: formData.source,
        destination: finalDest,
        movementType: formData.movementType,
        quantity: Number(formData.quantity),
        condition: formData.condition,
        projectId: currentProject?.id || 'PRJ-2026-FEE-01',
        evidenceUris: [],
        userId: '10000000-0000-4000-8000-000000000009',
        notes: formData.notes,
      });

      setIsMoveModalOpen(false);
      await loadWarehouseData();
    } catch (err: any) {
      alert(err.message || 'Failed to execute movement');
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'received':
        return { bg: '#e0f2fe', text: '#0369a1', label: 'Received' };
      case 'stored':
        return { bg: 'var(--surface-2, #151e2e)', text: 'var(--text-secondary, #cbd5e1)', label: 'Stored' };
      case 'reserved':
        return { bg: '#fef3c7', text: '#b45309', label: 'Reserved' };
      case 'picked':
        return { bg: '#fef08a', text: '#854d0e', label: 'Picked' };
      case 'packed':
        return { bg: '#fed7aa', text: '#c2410c', label: 'Packed' };
      case 'dispatched':
        return { bg: '#ddd6fe', text: '#6d28d9', label: 'Dispatched' };
      case 'on_site':
        return { bg: '#dcfce7', text: '#15803d', label: 'On Site' };
      case 'returned':
        return { bg: '#ffedd5', text: '#9a3412', label: 'Returned' };
      case 'inspected':
        return { bg: '#fce7f3', text: '#be185d', label: 'Inspected' };
      case 'restocked':
        return { bg: '#ccfbf1', text: '#0f766e', label: 'Restocked' };
      default:
        return { bg: 'var(--surface-2, #151e2e)', text: 'var(--text-secondary, #cbd5e1)', label: type };
    }
  };

  const filteredAssets = selectedZoneFilter === 'all'
    ? assets
    : assets.filter((a) => a.zone?.toLowerCase() === selectedZoneFilter.toLowerCase());

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>📦</span>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              Warehouse Operations & 10 Zones Hub
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #94a3b8)' }}>
            Governed physical delivery lifecycle: Received ➔ Stored ➔ Reserved ➔ Picked ➔ Packed ➔ Dispatched ➔ On Site ➔ Returned ➔ Inspected ➔ Restocked
          </p>
        </div>
        <button
          id="btn-execute-movement"
          onClick={() => setIsMoveModalOpen(true)}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--accent, #d97706)',
            color: 'var(--surface-1, #0f1624)',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>🔄</span> Execute Physical Movement
        </button>
      </div>

      {/* 10 Warehouse Zones Grid */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)', marginBottom: '12px' }}>
          Doha Central Depot — 10 Operational Zones
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {zones.map((z) => {
            const isSelected = selectedZoneFilter.toLowerCase() === z.zone.toLowerCase();
            const isQuarantine = z.zone === 'Quarantine';
            const isReturns = z.zone === 'Returns';

            return (
              <div
                key={z.zone}
                onClick={() => setSelectedZoneFilter(isSelected ? 'all' : z.zone)}
                style={{
                  backgroundColor: isQuarantine ? 'rgba(239,68,68,0.12)' : isReturns ? 'rgba(249,115,22,0.12)' : 'var(--surface-1, #0f1624)',
                  border: isSelected
                    ? '2px solid var(--accent, #d97706)'
                    : isQuarantine
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid var(--border-default, #2a374b)',
                  padding: '14px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: isQuarantine ? '#991b1b' : 'var(--text-primary, #f8fafc)' }}>
                    {z.zone === 'AV' && '🔊 '}
                    {z.zone === 'Lighting' && '💡 '}
                    {z.zone === 'Furniture' && '🪑 '}
                    {z.zone === 'Games' && '🎮 '}
                    {z.zone === 'Scenic' && '🎭 '}
                    {z.zone === 'Branding' && '🏷️ '}
                    {z.zone === 'Tools' && '🔧 '}
                    {z.zone === 'Consumables' && '📦 '}
                    {z.zone === 'Quarantine' && '☣️ '}
                    {z.zone === 'Returns' && '↩️ '}
                    {z.zone}
                  </span>
                  {z.damagedCount > 0 ? (
                    <span style={{ fontSize: '10px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                      {z.damagedCount} damaged
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#4ade80', padding: '2px 6px', borderRadius: '8px', fontWeight: 700 }}>
                      Nominal
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>{z.itemCount} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted, #94a3b8)' }}>units</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '4px' }}>
                  {z.assetCount} asset classes registered
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split: Filtered Stock & Custodial Movement Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Zone Stock Ledger */}
        <div style={{ backgroundColor: 'var(--surface-1, #0f1624)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              Physical Stock by Zone {selectedZoneFilter !== 'all' && `(${selectedZoneFilter})`}
            </h3>
            {selectedZoneFilter !== 'all' && (
              <button
                onClick={() => setSelectedZoneFilter('all')}
                style={{ fontSize: '11px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                Clear Zone Filter
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {filteredAssets.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                No assets currently stationed in this zone.
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default, #2a374b)',
                    backgroundColor: asset.condition === 'damaged' ? '#fff1f2' : 'var(--surface-2, #151e2e)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary, #f8fafc)' }}>{asset.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontFamily: 'monospace' }}>
                        {asset.assetTag} • Barcode: {asset.barcode}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        backgroundColor: asset.availability === 'available' ? '#dcfce7' : asset.availability === 'allocated' ? '#fef3c7' : '#fee2e2',
                        color: asset.availability === 'available' ? '#15803d' : asset.availability === 'allocated' ? '#b45309' : '#b91c1c',
                      }}
                    >
                      {asset.availability}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px', color: 'var(--text-secondary, #cbd5e1)' }}>
                    <span>Location: <strong>{asset.zone} ({asset.location})</strong></span>
                    <span>Qty: <strong>{asset.quantity} {asset.unit}</strong></span>
                    <span>Condition: <strong>{asset.condition}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 10-Stage Custodial Movement Audit Ledger */}
        <div style={{ backgroundColor: 'var(--surface-1, #0f1624)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-default, #2a374b)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
              Custodial Movement History (10-Stage Lifecycle)
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Live Physical Chain of Custody</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
            {movements.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
                No movements recorded yet.
              </div>
            ) : (
              movements.map((mov) => {
                const badge = getMovementBadge(mov.movementType);
                const asset = assets.find((a) => a.id === mov.assetId || a.assetTag === mov.assetId);
                const assetDisplay = asset ? `${asset.name} (${asset.assetTag})` : (mov.assetId || 'Unknown Asset');
                return (
                  <div
                    key={mov.id}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default, #2a374b)',
                      backgroundColor: 'var(--surface-1, #0f1624)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '2px' }}>
                      {assetDisplay}
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-primary, #f8fafc)', margin: '4px 0' }}>
                      <strong>{mov.source}</strong> ➔ <strong>{mov.destination}</strong> ({mov.quantity} units)
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
                      Condition: <strong>{mov.condition}</strong> {mov.notes && `• Notes: ${mov.notes}`}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Movement Execution Modal */}
      {isMoveModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-1, #0f1624)',
              borderRadius: '12px',
              maxWidth: '550px',
              width: '90%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #f8fafc)' }}>
                Execute Warehouse Movement
              </h3>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMovement}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Target Asset *
                </label>
                <select
                  id="select-move-asset"
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.assetTag}) — Zone: {a.zone}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                    Movement Stage *
                  </label>
                  <select
                    id="select-move-type"
                    value={formData.movementType}
                    onChange={(e) => setFormData({ ...formData, movementType: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                  >
                    {MOVEMENT_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                    Source Location
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                    Destination Zone
                  </label>
                  <select
                    id="select-move-destination"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                  >
                    {zones.map((z) => (
                      <option key={z.zone} value={z.zone}>
                        Zone: {z.zone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Item Condition & Physical Assessment *
                </label>
                <select
                  id="select-move-condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                >
                  <option value="good">Good / Serviceable (Passes Inspection)</option>
                  <option value="needs_maintenance">Needs Maintenance</option>
                  <option value="damaged">Damaged (Auto-routes destination to Quarantine zone)</option>
                  <option value="quarantined">Quarantined (Safety hold)</option>
                </select>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '4px' }}>
                  Custodial / Inspector Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Record packaging notes, serial checks, or transit damage observations..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default, #2a374b)', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  style={{ padding: '8px 14px', backgroundColor: 'var(--surface-2, #151e2e)', color: 'var(--text-secondary, #cbd5e1)', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-confirm-movement"
                  style={{ padding: '8px 18px', backgroundColor: '#0284c7', color: 'var(--surface-1, #0f1624)', borderRadius: '6px', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Record Movement Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseOperationsView;
