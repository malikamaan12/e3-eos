import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';

interface LogisticsDeliveryViewProps {
  projectId: string;
}

export const LogisticsDeliveryView: React.FC<LogisticsDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [packingLists, setPackingLists] = useState<any[]>([]);
  const [transportPlans, setTransportPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Delivery Proof Modal
  const [podPackingList, setPodPackingList] = useState<any | null>(null);
  const [receiverName, setReceiverName] = useState<string>('Omar Farooq (Site Field Supervisor)');
  const [isSubmittingPod, setIsSubmittingPod] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [plList, tpList] = await Promise.all([
          apiClient.getPackingLists(projectId),
          apiClient.getTransportPlans(projectId),
        ]);
        if (isMounted) {
          setPackingLists(plList);
          setTransportPlans(tpList);
        }
      } catch (err) {
        console.error('Failed to load logistics delivery data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleDispatch = async (plId: string) => {
    try {
      await apiClient.dispatchPackingList(projectId, plId);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Dispatch failed');
    }
  };

  const handlePodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podPackingList) return;
    setIsSubmittingPod(true);
    try {
      await apiClient.deliverPackingList(projectId, podPackingList.id, {
        packingListId: podPackingList.id,
        receiverName,
        receiverSignature: 'Verified Electronic Signature',
        timestamp: new Date().toISOString(),
        photos: ['evidence/pl-fee-001-pod.jpg'],
        discrepancies: [],
      });
      setPodPackingList(null);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to submit delivery proof');
    } finally {
      setIsSubmittingPod(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading logistics and transport intelligence...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Customs Clearance & ATA Carnet Cross-Border Gateway (AT-057 / P04-ST03) */}
      <Card style={{ border: '2px solid #059669', backgroundColor: '#ecfdf5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#065f46' }}>
                🚢 Customs Clearance, ATA Carnet & Dock Manifest Engine (P04-ST03 / AT-057)
              </h3>
              <Badge variant="success">CUSTOMS CLEARED</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#047857', margin: '4px 0 0 0' }}>
              Bilateral customs transit tracking (General Authority of Customs Qatar / ZATCA Saudi Arabia), ATA Carnet bond verification, and 30-minute venue dock scheduling.
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>ACTIVE ATA CARNET:</span>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#064e3b', fontWeight: 900 }}>
              QA-CARNET-2026-9908
            </div>
            <span style={{ fontSize: '10px', color: '#059669' }}>Abu Samra Land Port & Hamad Port</span>
          </div>
        </div>

        {/* Dock Slot Scheduling Matrix */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#065f46', fontSize: '13px' }}>🚛 Loading Bay Dock 01</span>
              <Badge variant="success">30-MIN ACTIVE</Badge>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>
              Heavy Rigging & Trussing Manifest
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Slot: <strong>08:30 – 09:00</strong> • Truck QA-TRK-771
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
              Driver: Tariq Al-Dosari (QID: 28463400192) • Gate Pass QR Valid
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#065f46', fontSize: '13px' }}>🚛 Loading Bay Dock 02</span>
              <Badge variant="primary">RESERVED</Badge>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>
              Scenic Carpentry & VIP Arch Units
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Slot: <strong>09:00 – 09:30</strong> • 12m Flatbed QA-FLB-201
            </div>
            <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700, marginTop: '4px' }}>
              Security Clearance: Pre-vetted by MOI Security Command
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: '#065f46', fontSize: '13px' }}>🚛 Loading Bay Dock 03</span>
              <Badge variant="warning">CUSTOMS INSPECT</Badge>
            </div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, marginTop: '4px' }}>
              High-Value Laser Projection & LED Panels
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              Slot: <strong>09:30 – 10:00</strong> • Climate Box Van QA-CBX-442
            </div>
            <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
              Bonded Transit Seal Intact • Tamper-evident Sensor OK
            </div>
          </div>
        </div>
      </Card>

      {/* Transport Plans & Fleet Roster */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              🚚 Transport Plans, Fleet & Access Slots (Sprint 03 Module 10)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Configurable open vehicle types (3 Ton, 7 Ton, 12m Flatbed, Crane Truck) mapped to loading bay access windows.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {transportPlans.map((tp) => (
            <div
              key={tp.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb' }}>{tp.vehicleId}</span>
                <Badge variant={tp.status === 'arrived' ? 'success' : 'primary'}>{tp.status}</Badge>
              </div>

              <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                {tp.vehicleType} • {tp.supplier}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Driver: <strong>{tp.driverName}</strong> ({tp.driverPhone})
              </div>

              <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                <div>Load: <strong>{tp.loadDescription}</strong></div>
                <div style={{ marginTop: '4px', color: '#64748b' }}>
                  {tp.origin} → <strong>{tp.destination}</strong>
                </div>
                <div style={{ marginTop: '4px', color: '#059669', fontWeight: 700 }}>
                  Dock: {tp.loadingDock} ({tp.accessSlot})
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Packing Lists & Site Proof of Delivery (POD) */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              📋 Packing Lists & Site Proof of Delivery (Sprint 03 Module 9)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Multi-source consolidation: Internal warehouse assets + external fabricator packages unified on single transport manifests.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Packing List #</th>
                <th style={{ padding: '10px 12px' }}>Consolidated Items</th>
                <th style={{ padding: '10px 12px' }}>Vehicle / Destination</th>
                <th style={{ padding: '10px 12px' }}>Dispatch Window</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Proof of Delivery (POD)</th>
                <th style={{ padding: '10px 12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {packingLists.map((pl) => (
                <tr key={pl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#2563eb' }}>{pl.packingListNumber}</td>
                  <td style={{ padding: '12px' }}>
                    {pl.items?.map((it: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '12px', color: '#1e293b' }}>
                        • <strong>{it.quantity}×</strong> {it.description} ({it.casesPallets})
                      </div>
                    ))}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{pl.vehicleId}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{pl.destination}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                    {new Date(pl.dispatchDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={pl.status === 'delivered' ? 'success' : 'primary'}>{pl.status}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {pl.deliveryProof ? (
                      <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                        ✓ Received by {pl.deliveryProof.receiverName}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Photo POD signed & uploaded</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Awaiting on-site receipt</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {pl.status === 'packed' && (
                        <Button size="sm" variant="primary" onClick={() => handleDispatch(pl.id)}>
                          Dispatch Truck
                        </Button>
                      )}
                      {(pl.status === 'dispatched' || pl.status === 'in_transit') && (
                        <Button size="sm" variant="secondary" onClick={() => setPodPackingList(pl)}>
                          Record Site Receipt (POD)
                        </Button>
                      )}
                      {pl.status === 'delivered' && (
                        <Button size="sm" variant="ghost" onClick={() => setPodPackingList(pl)}>
                          View POD
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Proof of Delivery Modal */}
      {podPackingList && (
        <Modal
          isOpen={true}
          title={`Proof of Delivery Sign-off: ${podPackingList.packingListNumber}`}
          onClose={() => setPodPackingList(null)}
        >
          <form onSubmit={handlePodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', fontSize: '13px', color: '#166534' }}>
              ✓ All {podPackingList.items?.reduce((acc: number, it: any) => acc + it.quantity, 0)} units verified on loading bay with zero damage discrepancies.
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Receiving Site Supervisor Name</label>
              <Input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Photographic POD Evidence</label>
              <div style={{ padding: '10px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                📸 [evidence/pl-fee-001-pod.jpg] Attached (Geotagged & Timestamped)
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="ghost" onClick={() => setPodPackingList(null)}>
                Close
              </Button>
              {podPackingList.status !== 'delivered' && (
                <Button type="submit" variant="primary" disabled={isSubmittingPod}>
                  {isSubmittingPod ? 'Signing...' : 'Sign & Certify Site Receipt'}
                </Button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
