import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface AssetsDeliveryViewProps {
  projectId: string;
}

export const AssetsDeliveryView: React.FC<AssetsDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

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
            </tbody>
          </table>
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
                    <Badge variant="success">{asset.condition}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge variant={asset.availability === 'allocated' ? 'primary' : 'success'}>
                      {asset.availability}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
