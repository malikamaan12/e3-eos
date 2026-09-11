import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';

interface ProductionDeliveryViewProps {
  projectId: string;
}

export const ProductionDeliveryView: React.FC<ProductionDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Release Gate Modal
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [releasingPkg, setReleasingPkg] = useState<any | null>(null);
  const [gateDesign, setGateDesign] = useState<boolean>(true);
  const [gateCommercial, setGateCommercial] = useState<boolean>(true);
  const [gateSafety, setGateSafety] = useState<boolean>(true);
  const [gateVendor, setGateVendor] = useState<boolean>(true);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  // New Snag Modal
  const [isSnagModalOpen, setIsSnagModalOpen] = useState<boolean>(false);
  const [newSnagTitle, setNewSnagTitle] = useState<string>('');
  const [newSnagSeverity, setNewSnagSeverity] = useState<string>('minor');
  const [newSnagBlocksDispatch, setNewSnagBlocksDispatch] = useState<boolean>(false);
  const [isSubmittingSnag, setIsSubmittingSnag] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const pkgList = await apiClient.getProductionPackages(projectId);
        if (isMounted) {
          setPackages(pkgList);
          if (pkgList.length > 0) {
            const first = pkgList[0];
            setSelectedPkg(first);
            const [inspList, snagList] = await Promise.all([
              apiClient.getInspections(projectId, first.id),
              apiClient.getSnags(projectId, first.id),
            ]);
            if (isMounted) {
              setInspections(inspList);
              setSnags(snagList);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load production delivery data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [apiClient, projectId, refreshTrigger]);

  const handleSelectPackage = async (pkg: any) => {
    setSelectedPkg(pkg);
    try {
      const [inspList, snagList] = await Promise.all([
        apiClient.getInspections(projectId, pkg.id),
        apiClient.getSnags(projectId, pkg.id),
      ]);
      setInspections(inspList);
      setSnags(snagList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReleaseGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releasingPkg) return;
    setIsReleasing(true);
    try {
      await apiClient.evaluateFabricationRelease(projectId, releasingPkg.id, {
        designApproved: gateDesign,
        commercialApproved: gateCommercial,
        safetyApproved: gateSafety,
        vendorAwarded: gateVendor,
        approvedBy: 'E3 Operations Director',
      });
      setIsReleaseModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Fabrication release failed');
    } finally {
      setIsReleasing(false);
    }
  };

  const handleCreateSnagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || !newSnagTitle) return;
    setIsSubmittingSnag(true);
    try {
      await apiClient.createSnag(projectId, selectedPkg.id, {
        projectId,
        packageId: selectedPkg.id,
        title: newSnagTitle,
        severity: newSnagSeverity,
        blocksDispatch: newSnagSeverity === 'critical' || newSnagBlocksDispatch,
        blocksReadiness: newSnagSeverity === 'critical',
      });
      setIsSnagModalOpen(false);
      setNewSnagTitle('');
      const snagList = await apiClient.getSnags(projectId, selectedPkg.id);
      setSnags(snagList);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create snag');
    } finally {
      setIsSubmittingSnag(false);
    }
  };

  const handleResolveSnag = async (snagId: string) => {
    if (!selectedPkg) return;
    try {
      await apiClient.updateSnagStatus(projectId, selectedPkg.id, snagId, {
        status: 'resolved',
        notes: 'Defect rectified and re-inspected by QA QC supervisor.',
      });
      const snagList = await apiClient.getSnags(projectId, selectedPkg.id);
      setSnags(snagList);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve snag');
    }
  };

  const hasCriticalSnag = snags.some(
    (s) => (s.severity === 'critical' || s.blocksDispatch) && s.status !== 'resolved' && s.status !== 'accepted'
  );

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading production and fabrication intelligence...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Dispatch Blocker Alert Banner */}
      {hasCriticalSnag && (
        <div
          id="dispatch-blocker-alert"
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🛑</span>
          <div>
            <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '14px' }}>
              DISPATCH BLOCKED: UNRESOLVED CRITICAL SNAGS DETECTED
            </div>
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
              EOS invariant AT-058 strictly prohibits moving production packages into 'ready_for_dispatch' while critical quality defects remain open.
            </div>
          </div>
        </div>
      )}

      {/* Production Packages Overview */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              🏭 Production Packages & Fabrication Release Gate
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Fabrication cannot begin until Design, Commercial, Structural/HSE, and Vendor Award conditions are certified.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg)}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: selectedPkg?.id === pkg.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: selectedPkg?.id === pkg.id ? '#f8fafc' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb' }}>{pkg.packageCode}</span>
                <Badge variant={pkg.status === 'delivered' ? 'success' : 'primary'}>{pkg.status}</Badge>
              </div>

              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px 0' }}>{pkg.title}</h4>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Vendor: {pkg.vendorName || 'ABC Joinery & Fabrication'}</div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>Material: <strong>{pkg.material}</strong></span>
                <span>Qty: <strong>{pkg.completedQuantity} / {pkg.quantity}</strong></span>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                {pkg.status === 'not_released' && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReleasingPkg(pkg);
                      setIsReleaseModalOpen(true);
                    }}
                  >
                    Release for Fabrication
                  </Button>
                )}
                {pkg.status !== 'not_released' && (
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                    ✓ Fabrication Released & Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* QC Inspections & Snagging Matrix */}
      {selectedPkg && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                🔍 Quality Inspections & Snag Register ({selectedPkg.packageCode})
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                Formal factory acceptance tests, site receipts, and progressive snag rectification logs.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setIsSnagModalOpen(true)}>
              + Log Snag
            </Button>
          </div>

          {/* Inspections List */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
              Completed Inspections
            </h4>
            {inspections.map((insp) => (
              <div
                key={insp.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                      {insp.inspectionType.toUpperCase().replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                      by {insp.inspectorName} on {new Date(insp.inspectionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge variant={insp.result === 'passed' ? 'success' : 'danger'}>{insp.result}</Badge>
                </div>

                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {insp.checklist?.map((chk: any, idx: number) => (
                    <div key={idx} style={{ fontSize: '12px', color: chk.passed ? '#15803d' : '#b91c1c' }}>
                      {chk.passed ? '✓' : '✗'} {chk.item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Snags Table */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
              Snags & Rectification Status
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Snag Description</th>
                    <th style={{ padding: '8px 12px' }}>Severity</th>
                    <th style={{ padding: '8px 12px' }}>Assigned To</th>
                    <th style={{ padding: '8px 12px' }}>Dispatch Impact</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                    <th style={{ padding: '8px 12px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {snags.map((snag) => (
                    <tr key={snag.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{snag.title}</div>
                        {snag.resolutionNotes && (
                          <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                            Resolution: {snag.resolutionNotes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={snag.severity === 'critical' ? 'danger' : 'warning'}>
                          {snag.severity}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{snag.assignedToName || 'Shop Supervisor'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {snag.blocksDispatch ? (
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>🛑 BLOCKS DISPATCH</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>Non-blocking</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge variant={snag.status === 'resolved' ? 'success' : 'warning'}>
                          {snag.status}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {snag.status !== 'resolved' && (
                          <Button size="sm" variant="secondary" onClick={() => handleResolveSnag(snag.id)}>
                            Mark Rectified
                          </Button>
                        )}
                        {snag.status === 'resolved' && (
                          <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>✓ Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {snags.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                        Zero open snags recorded for this package.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Fabrication Release Gate Validator Modal */}
      {isReleaseModalOpen && releasingPkg && (
        <Modal
          isOpen={true}
          title={`Fabrication Release Gate Validator: ${releasingPkg.packageCode}`}
          onClose={() => setIsReleaseModalOpen(false)}
        >
          <form onSubmit={handleReleaseGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Verify mandatory conditions before authorizing workshop cut, weld, and assembly.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={gateDesign}
                  onChange={(e) => setGateDesign(e.target.checked)}
                />
                <strong>1. Design Package Approved</strong> (Approved Drawing Revision available to shop)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={gateCommercial}
                  onChange={(e) => setGateCommercial(e.target.checked)}
                />
                <strong>2. Commercial Commitment Authorized</strong> (Approved budget and PO issued)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={gateSafety}
                  onChange={(e) => setGateSafety(e.target.checked)}
                />
                <strong>3. Structural & HSE Safety Clearances</strong> (Load calculations verified)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={gateVendor}
                  onChange={(e) => setGateVendor(e.target.checked)}
                />
                <strong>4. Vendor Contract & Compliance Active</strong> (Contractual terms confirmed)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsReleaseModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isReleasing || !gateDesign || !gateCommercial || !gateSafety || !gateVendor}
              >
                {isReleasing ? 'Certifying Release...' : 'Certify Release for Fabrication'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Log Snag Modal */}
      {isSnagModalOpen && selectedPkg && (
        <Modal
          isOpen={true}
          title={`Log Snag Defect: ${selectedPkg.packageCode}`}
          onClose={() => setIsSnagModalOpen(false)}
        >
          <form onSubmit={handleCreateSnagSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Snag Description</label>
              <Input
                type="text"
                value={newSnagTitle}
                onChange={(e) => setNewSnagTitle(e.target.value)}
                placeholder="e.g. Paint finish scratch on left counter fascia"
                style={{ width: '100%', marginTop: '4px' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Severity</label>
                <Select
                  value={newSnagSeverity}
                  onChange={(e) => setNewSnagSeverity(e.target.value)}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <option value="critical">Critical (Hard Dispatch Blocker)</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="observation">Observation</option>
                </Select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={newSnagSeverity === 'critical' || newSnagBlocksDispatch}
                    disabled={newSnagSeverity === 'critical'}
                    onChange={(e) => setNewSnagBlocksDispatch(e.target.checked)}
                  />
                  Blocks Dispatch
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <Button type="button" variant="ghost" onClick={() => setIsSnagModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmittingSnag}>
                {isSubmittingSnag ? 'Logging...' : 'Log Snag Defect'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
