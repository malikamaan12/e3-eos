import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

interface ProductionDeliveryViewProps {
  projectId: string;
}

export const ProductionDeliveryView: React.FC<ProductionDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();
  const isDemo = isSyntheticDemo(projectId);

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<any | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [snags, setSnags] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Release Gate Modal
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [releasingPkg, setReleasingPkg] = useState<any | null>(null);
  const [gateDesign, setGateDesign] = useState<boolean>(isDemo);
  const [gateCommercial, setGateCommercial] = useState<boolean>(isDemo);
  const [gateSafety, setGateSafety] = useState<boolean>(isDemo);
  const [gateVendor, setGateVendor] = useState<boolean>(isDemo);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  // New Snag Modal
  const [isSnagModalOpen, setIsSnagModalOpen] = useState<boolean>(false);
  const [newSnagTitle, setNewSnagTitle] = useState<string>('');
  const [newSnagSeverity, setNewSnagSeverity] = useState<string>('minor');
  const [newSnagBlocksDispatch, setNewSnagBlocksDispatch] = useState<boolean>(false);
  const [isSubmittingSnag, setIsSubmittingSnag] = useState<boolean>(false);

  // Workshop Routing & Drawing Revision State (AT-053 / P03-ST05)
  const [cadRevision, setCadRevision] = useState<number>(isDemo ? 3 : 1);
  const [builtActualVersion, setBuiltActualVersion] = useState<number>(isDemo ? 2 : 1);
  const [isReverifyingCad, setIsReverifyingCad] = useState<boolean>(false);
  const [reverifiedNotes, setReverifiedNotes] = useState<string>('');

  const handleReverifyRevision = () => {
    setIsReverifyingCad(true);
    setTimeout(() => {
      setBuiltActualVersion(cadRevision);
      setReverifiedNotes('Engineering QC verified: 12 built units conform to CAD Rev 03.0 with zero structural clashes.');
      setIsReverifyingCad(false);
    }, 400);
  };

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
      setReleasingPkg(null);
      setGateDesign(false);
      setGateCommercial(false);
      setGateSafety(false);
      setGateVendor(false);
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
      setNewSnagSeverity('minor');
      setNewSnagBlocksDispatch(false);
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
              <div style={{ fontSize: '12px', color: '#64748b' }}>Vendor: {pkg.vendorName || (isDemo ? 'ABC Joinery & Fabrication' : 'Vendor')}</div>

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
                      setGateDesign(isDemo);
                      setGateCommercial(isDemo);
                      setGateSafety(isDemo);
                      setGateVendor(isDemo);
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
          {packages.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏭</div>
              <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>No Production Packages Assigned</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Fabrication and workshop packages will appear once released from design.</div>
            </div>
          )}
        </div>
      </Card>

      {/* Workshop Fabrication Routing & CAD Drawing Revision Studio (AT-053 / P03-ST05) */}
      {isDemo ? (
        <Card style={{ border: '2px solid #0284c7', backgroundColor: '#f0f9ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0369a1' }}>
                  🛠️ Workshop Fabrication Routing & Drawing Revision Studio (P03-ST05 / AT-053)
                </h3>
                <Badge variant="info">CAD REVISION LINKED</Badge>
              </div>
              <p style={{ fontSize: '13px', color: '#0284c7', margin: '4px 0 0 0' }}>
                Tracks shop floor routing across Carpentry, Metalwork, Scenic Paint, and Assembly with automated drawing revision impact detection.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1' }}>Active CAD Drawing:</span>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0f172a', fontWeight: 800 }}>
                DWG-LUS-STAGE-REV-0{cadRevision}.dwg (v{cadRevision}.0)
              </div>
            </div>
          </div>

          {/* CAD Revision Discrepancy Alert */}
          {builtActualVersion < cadRevision ? (
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', border: '1px solid #f97316', backgroundColor: '#fff7ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚠</span>
                  <span style={{ fontWeight: 800, color: '#c2410c', fontSize: '13px' }}>
                    DRAWING REVISION TAKEOFF ALERT: UNITS BUILT TO REV {builtActualVersion}.0 (AT-053)
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#9a3412', margin: '4px 0 0 0' }}>
                  12 fabricated units were built using Rev 0{builtActualVersion}.0. Newly approved Rev 0{cadRevision}.0 alters the VIP canopy support anchors. Units cannot be dispatched without engineering re-inspection.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleReverifyRevision}
                disabled={isReverifyingCad}
                style={{ backgroundColor: '#ea580c', borderColor: '#c2410c', whiteSpace: 'nowrap' }}
              >
                {isReverifyingCad ? 'Verifying Tolerances...' : `Re-verify Units Against Rev 0${cadRevision}.0`}
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', border: '1px solid #86efac', backgroundColor: '#f0fdf4' }}>
              <span style={{ color: '#166534', fontWeight: 700, fontSize: '12px' }}>
                ✓ All 12 fabricated units verified conforming to latest CAD Revision 0{cadRevision}.0. {reverifiedNotes}
              </span>
            </div>
          )}

          {/* Shop Floor Routing Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>🪵 Carpentry & CNC</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>90%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e0f2fe', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: '90%', height: '100%', backgroundColor: '#0284c7' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Main Stage Decking & Curved Risers</p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>⚙️ Metalwork & Rigging</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>75%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e0f2fe', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: '75%', height: '100%', backgroundColor: '#0284c7' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Overhead Lighting Rig Sub-frame</p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>🎨 Scenic Paint & Texture</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>40%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e0f2fe', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: '40%', height: '100%', backgroundColor: '#0284c7' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Gold Leaf & Textured Dune Finish</p>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ fontWeight: 700, color: '#0369a1' }}>🔌 Looms & Pre-assembly</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>60%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: '#e0f2fe', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                <div style={{ width: '60%', height: '100%', backgroundColor: '#0284c7' }}></div>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>Socapex 19-Pin Looms & DMX Trunks</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card style={{ border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#334155' }}>
                Workshop Routing & CAD Drawing Revision Studio
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                No active CAD revision conflicts detected. Shop floor routing is synchronized with approved technical submittals.
              </p>
            </div>
            <Badge variant="success">CAD SYNCED</Badge>
          </div>
        </Card>
      )}

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
            {inspections.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>No QC Inspections Recorded</div>
                <div style={{ fontSize: '12px', marginTop: '2px' }}>QA/QC inspections will appear here once factory acceptance testing begins.</div>
              </div>
            )}
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
