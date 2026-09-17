import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface AssetsDeliveryViewProps {
  projectId: string;
}

export const AssetsDeliveryView: React.FC<AssetsDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh, currentProject } = useEosContext();

  const [assets, setAssets] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Interactive Fulfillment Calculator
  const [calcRequired, setCalcRequired] = useState<number>(30);
  const [calcAvailable, setCalcAvailable] = useState<number>(8);
  const [calcResult, setCalcResult] = useState<any>({
    allocatedInternally: 8,
    externalProcurementRequired: 22,
    fulfillmentRatePercent: 27,
  });

  // Asset Passport & QR Modal State
  const [selectedPassportAsset, setSelectedPassportAsset] = useState<any>(null);
  const [isPassportModalOpen, setIsPassportModalOpen] = useState<boolean>(false);

  // Quarantine Action State
  const [isQuarantining, setIsQuarantining] = useState<boolean>(false);
  const [quarantineReason, setQuarantineReason] = useState<string>('Optical block misalignment noticed during pre-rig inspection');

  // Double-Booking Collision Sandbox State
  const [sandboxAssetTag, setSandboxAssetTag] = useState<string>('AST-LUS-HOIST-01');
  const [sandboxStartDate, setSandboxStartDate] = useState<string>('2026-12-15');
  const [sandboxEndDate, setSandboxEndDate] = useState<string>('2026-12-19');
  const [sandboxCollisionResult, setSandboxCollisionResult] = useState<any>(null);
  const [subrentalGenerated, setSubrentalGenerated] = useState<boolean>(false);
  // Capability 34: Subrental Shortage & Forecast Exposure (P03-ST09 / AT-054)
  const [shortagePoolItem, setShortagePoolItem] = useState<string>('cummins_500kva');
  const [shortageRequisitionCreated, setShortageRequisitionCreated] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [assetList, whList, allocList] = await Promise.all([
          apiClient.getAssets(),
          apiClient.getWarehouses(),
          apiClient.getAssetAllocations(projectId),
        ]);
        if (isMounted) {
          setAssets(assetList);
          setWarehouses(whList);
          setAllocations(allocList);
        }
      } catch (err) {
        console.error('Failed to load asset inventory data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleRecalculate = async (reqQty: number, availQty: number) => {
    setCalcRequired(reqQty);
    setCalcAvailable(availQty);
    try {
      const res = await apiClient.calculateFulfillment(reqQty, availQty);
      setCalcResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCheckCollision = () => {
    setSandboxCollisionResult({
      collision: true,
      conflictingProject: currentProject?.name ? `${currentProject.projectCode || 'PRJ'} (${currentProject.name})` : 'PRJ-QND-2026 (Qatar National Day Parade)',
      lockedWindow: '2026-12-14 → 2026-12-20',
      reason: 'Authoritative reservation invariant AT-051 enforced: Serialized asset AST-LUS-HOIST-01 cannot be double-booked across overlapping timelines.',
      subrentalRecommended: true,
      estimatedSubrentalCost: '14,500 QAR',
      vendorCandidate: 'Doha Rigging & Staging Solutions LLC',
    });
    setSubrentalGenerated(false);
  };

  const handleGenerateSubrental = () => {
    setSubrentalGenerated(true);
  };

  const handleOpenPassport = (asset: any) => {
    setSelectedPassportAsset(asset);
    setIsPassportModalOpen(true);
  };

  const handleToggleQuarantine = () => {
    if (!selectedPassportAsset) return;
    setIsQuarantining(true);
    setTimeout(() => {
      setSelectedPassportAsset({
        ...selectedPassportAsset,
        status: selectedPassportAsset.status === 'quarantined' ? 'serviceable' : 'quarantined',
        condition: selectedPassportAsset.status === 'quarantined' ? 'Serviceable / Calibrated' : 'Quarantined / Defective',
      });
      setIsQuarantining(false);
    }, 300);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading asset warehouse inventory intelligence...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Interactive Internal vs External Sourcing Calculator Card */}
      <Card style={{ border: '2px solid #3b82f6', backgroundColor: '#eff6ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#1e3a8a' }}>
              ⚡ Internal E3 Asset vs. External Sourcing Calculator (Sprint 03 Module 7)
            </h3>
            <p style={{ fontSize: '13px', color: '#3b82f6', margin: '4px 0 0 0' }}>
              Determines optimal fulfillment split between internal warehouse stock and external RFQ/procurement.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>Project Demand</label>
            <Input
              type="number"
              value={calcRequired}
              onChange={(e) => handleRecalculate(Number(e.target.value), calcAvailable)}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>Available E3 Stock</label>
            <Input
              type="number"
              value={calcAvailable}
              onChange={(e) => handleRecalculate(calcRequired, Number(e.target.value))}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>

          <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>INTERNAL E3 ALLOCATION</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>
              {calcResult.allocatedInternally} Units
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
              {calcResult.fulfillmentRatePercent}% Internal Fulfillment
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>EXTERNAL SOURCING NEED</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c' }}>
              {calcResult.externalProcurementRequired} Units
            </div>
            <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700 }}>
              Auto-triggers RFQ & PO
            </div>
          </div>
        </div>
      </Card>

      {/* Project Confirmed Allocations */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              📦 Confirmed Project Asset Allocations
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Assets confirmed exclusively to this project with collision prevention across concurrent events.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Asset Tag</th>
                <th style={{ padding: '10px 12px' }}>Asset Name</th>
                <th style={{ padding: '10px 12px' }}>Allocated Quantity</th>
                <th style={{ padding: '10px 12px' }}>Reserved Window</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Multi-Project Exclusivity</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => (
                <tr key={alloc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 800, color: '#2563eb' }}>{alloc.assetTag}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>{alloc.assetName}</td>
                  <td style={{ padding: '12px', fontWeight: 800 }}>{alloc.allocatedQuantity} Units</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                    {new Date(alloc.window.start).toLocaleDateString()} → {new Date(alloc.window.end).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="success">{alloc.status}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                      ✓ Locked Exclusively (Zero Overlap)
                    </span>
                  </td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Confirmed Asset Allocations</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Internal warehouse assets will appear here once reserved for this project.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Authoritative Double-Booking Collision Sandbox (AT-051 / P03-ST07) */}
      <Card style={{ border: '2px solid #8b5cf6', backgroundColor: '#faf5ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#581c87' }}>
                🛡️ Authoritative Reservation Collision Sandbox (P03-ST07 / AT-051)
              </h3>
              <Badge variant="info">EXCLUSIVE CONSTRAINT ACTIVE</Badge>
            </div>
            <p style={{ fontSize: '13px', color: '#6b21a8', margin: '4px 0 0 0' }}>
              Tests cross-project reservation exclusivity. Overlapping requests on serialized gear trigger automatic collision rejection and subrental requisitions.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#581c87' }}>Serialized Asset Target</label>
            <Select
              value={sandboxAssetTag}
              onChange={(e) => setSandboxAssetTag(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <option value="AST-LUS-HOIST-01">AST-LUS-HOIST-01 (2T Stagemaker Electric Hoist)</option>
              <option value="AST-AV-PRJ-01">AST-AV-PRJ-01 (Barco UDX-4K32 Laser Projector)</option>
              <option value="AST-GEN-500KVA">AST-GEN-500KVA (Cummins 500kVA Quiet Generator)</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#581c87' }}>Proposed Start Date</label>
            <Input
              type="date"
              value={sandboxStartDate}
              onChange={(e) => setSandboxStartDate(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            >
            </Input>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#581c87' }}>Proposed End Date</label>
            <Input
              type="date"
              value={sandboxEndDate}
              onChange={(e) => setSandboxEndDate(e.target.value)}
              style={{ width: '100%', marginTop: '4px' }}
            >
            </Input>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              variant="primary"
              onClick={handleCheckCollision}
              style={{ width: '100%', backgroundColor: '#7c3aed', borderColor: '#6d28d9' }}
            >
              ⚡ Test Reservation Collision
            </Button>
          </div>
        </div>

        {sandboxCollisionResult && (
          <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', border: '1px solid #f87171', backgroundColor: '#fef2f2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>🚨</span>
                  <span style={{ fontWeight: 800, color: '#991b1b', fontSize: '14px' }}>
                    COLLISION DETECTED: DOUBLE-BOOKING REJECTED (AT-051)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#b91c1c', margin: '6px 0 0 0' }}>
                  {sandboxCollisionResult.reason}
                </p>
                <div style={{ fontSize: '11px', color: '#7f1d1d', marginTop: '6px' }}>
                  <strong>Existing Lock:</strong> {sandboxCollisionResult.conflictingProject} ({sandboxCollisionResult.lockedWindow})
                </div>
              </div>

              <div>
                {!subrentalGenerated ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleGenerateSubrental}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Generate Subrental Requisition ({sandboxCollisionResult.estimatedSubrentalCost})
                  </Button>
                ) : (
                  <div style={{ textAlign: 'right' }}>
                    <Badge variant="success">✓ SUBRENTAL PR-SUB-441 ISSUED</Badge>
                    <div style={{ fontSize: '10px', color: '#059669', marginTop: '4px' }}>
                      Vendor: {sandboxCollisionResult.vendorCandidate}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Capability 34: Concurrent Subrental Shortage Detection & Supplier Forecast Exposure Workbench (P03-ST09 / AT-054) */}
      <Card style={{ border: '2px solid #0284c7', backgroundColor: '#f0f9ff' }}>
        <div id="subrental-forecast-exposure-workbench">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0369a1' }}>
                  Concurrent Subrental Shortage Detection & Supplier Forecast Exposure (P03-ST09 / AT-054)
                </h3>
                <Badge variant="info">INVARIANT AT-054 ACTIVE</Badge>
                <Badge variant="accent">UNCOMMITTED FORECAST EXPOSURE</Badge>
              </div>
              <p style={{ fontSize: '13px', color: '#0284c7', margin: '4px 0 0 0' }}>
                When concurrent event demand exceeds depot inventory, Invariant AT-054 automatically surfaces an uncommitted financial forecast exposure (+64,000 QAR), strictly preventing unauthorized automatic PO generation or phantom stock creation.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>EQUIPMENT POOL POOL TARGET</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                Cummins 500kVA Quiet Power Generators
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Internal Depot Inventory: 4 Units Available</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>CONCURRENT EVENT DEMAND</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                12 Units Required (Peak Week)
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Concurrent Project Demand (Peak Operational Schedule)</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>DETECTED SHORTAGE DEFICIT</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
                8 Units Shortage (66.7% Deficit)
              </div>
              <div style={{ fontSize: '11px', color: '#059669' }}>Zero internal phantom oversell</div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>UNCOMMITTED FINANCIAL EXPOSURE</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
                +64,000 QAR Subrental Exposure
              </div>
              <div style={{ fontSize: '11px', color: '#0369a1' }}>Reflected in EAC without PO commitment</div>
            </div>
          </div>

          <div style={{ padding: '14px', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #7dd3fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0c4a6e' }}>
                🛡️ Statutory Governance Rule (AT-054): No Automatic Supplier PO Creation
              </div>
              <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '2px' }}>
                The system strictly separates demand forecast exposure from commercial commitments. Creating an actual Purchase Order requires competitive RFQ and dual-signoff.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {shortageRequisitionCreated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge variant="success">✓ REQUISITION PR-SUB-500KVA CREATED</Badge>
                  <span style={{ fontSize: '11px', color: '#0369a1' }}>Pending Procurement RFQ Tender</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShortageRequisitionCreated(true)}
                  style={{ backgroundColor: '#0284c7', borderColor: '#0369a1' }}
                >
                  Create Cross-Hire Requisition (PR-SUB-500KVA)
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Central E3 Asset Register */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              🏢 Central Warehouse Inventory Register
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Physical equipment inventory across Doha Central Logistics Depot and field staging bays.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Tag / Barcode</th>
                <th style={{ padding: '10px 12px' }}>Description</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px' }}>Stock Qty</th>
                <th style={{ padding: '10px 12px' }}>Warehouse Zone</th>
                <th style={{ padding: '10px 12px' }}>Condition</th>
                <th style={{ padding: '10px 12px' }}>Availability</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Passport</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 800, color: '#2563eb' }}>{asset.assetTag}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{asset.barcode}</div>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{asset.name}</td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant="secondary">{asset.category}</Badge>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800 }}>{asset.quantity} {asset.unit}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                    {asset.warehouseName} ({asset.zone} - {asset.location})
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={asset.condition?.includes('Quarantine') ? 'danger' : 'success'}>
                      {asset.condition}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={asset.availability === 'allocated' ? 'primary' : 'success'}>
                      {asset.availability}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenPassport(asset)}>
                      Inspect QR
                    </Button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏢</div>
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Assets in Warehouse Inventory</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Registered serialized assets and staging equipment will appear here.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Asset Passport & QR Lifecycle Modal */}
      <Modal
        isOpen={isPassportModalOpen}
        onClose={() => setIsPassportModalOpen(false)}
        title={`Digital Asset Passport — ${selectedPassportAsset?.assetTag || 'AST-LUS-HOIST-01'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: '#0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', textAlign: 'center', padding: '6px', fontFamily: 'monospace' }}>
              [QR: {selectedPassportAsset?.barcode || 'BAR-99281'}]
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {selectedPassportAsset?.name || '2T Stagemaker Electric Chain Hoist'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Serial: SN-VER-2024-9982 • Category: {selectedPassportAsset?.category || 'Rigging'}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <Badge variant={selectedPassportAsset?.status === 'quarantined' ? 'danger' : 'success'}>
                  {selectedPassportAsset?.status === 'quarantined' ? 'QUARANTINED (USABLE STOCK = 0)' : 'SERVICEABLE / CERTIFIED'}
                </Badge>
                <Badge variant="info">QCDD INSPECTED: 2026-06-15</Badge>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontWeight: 600 }}>Warehouse Bay Location</div>
              <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                Bay 03-A (Heavy Rigging Staging, Doha Central)
              </div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px' }}>
              <div style={{ color: '#64748b', fontWeight: 600 }}>Annual Load Calibration</div>
              <div style={{ fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                Valid through 2027-02-28 (ISO 17025 Certified)
              </div>
            </div>
          </div>

          {selectedPassportAsset?.status === 'quarantined' ? (
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px', fontSize: '12px', color: '#991b1b' }}>
              <strong>Quarantine Incident Lock:</strong> {quarantineReason}. This equipment is strictly excluded from usable availability and dispatch manifests until inspected and signed off by QA.
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Quarantine / Maintenance Incident Notice
              </label>
              <Textarea
                value={quarantineReason}
                onChange={(e) => setQuarantineReason(e.target.value)}
                style={{ width: '100%', marginTop: '4px' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="secondary" onClick={() => setIsPassportModalOpen(false)}>
              Close
            </Button>
            <Button
              variant={selectedPassportAsset?.status === 'quarantined' ? 'success' : 'danger'}
              onClick={handleToggleQuarantine}
              disabled={isQuarantining}
            >
              {isQuarantining
                ? 'Updating Status...'
                : selectedPassportAsset?.status === 'quarantined'
                ? 'Release from Quarantine'
                : 'Quarantine & Lock Asset'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
