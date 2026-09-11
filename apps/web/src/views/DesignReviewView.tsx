import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Textarea, Select } from '../components/DesignSystem.js';
import {
  DesignPackageItem,
  DesignPackageType,
  DesignReleaseStatus,
  DesignAnnotationPin,
  AnnotationStatus,
  AnnotationPriority,
  ProductionReleaseGate,
} from '@e3-eos/domain';

interface DesignReviewViewProps {
  projectId: string;
}

export const DesignReviewView: React.FC<DesignReviewViewProps> = ({ projectId }) => {
  const { refreshTrigger, triggerRefresh } = useEosContext();

  const [packageType, setPackageType] = useState<DesignPackageType>('elevations');
  const [selectedRevisionCode, setSelectedRevisionCode] = useState<'Rev A' | 'Rev B'>('Rev A');
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [selectedPinId, setSelectedPinId] = useState<string>('pin-1');

  // Signoff state for POL-DES-01
  const [structuralCertified, setStructuralCertified] = useState<boolean>(false);
  const [hseCertified, setHseCertified] = useState<boolean>(false);
  const [isSignoffModalOpen, setIsSignoffModalOpen] = useState<boolean>(false);
  const [gateEvaluation, setGateEvaluation] = useState<any>(null);

  // New Pin Modal
  const [isNewPinModalOpen, setIsNewPinModalOpen] = useState<boolean>(false);
  const [newPinCoord, setNewPinCoord] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [newPinTitle, setNewPinTitle] = useState<string>('Truss Deflection & Kinetic Swivel Clearance');
  const [newPinDiscipline, setNewPinDiscipline] = useState<string>('rigging');
  const [newPinPriority, setNewPinPriority] = useState<AnnotationPriority>('high');
  const [newPinComment, setNewPinComment] = useState<string>(
    'Confirm clear radius of motorized kinetic ring when rotated 45 degrees under load.'
  );

  // Active Design Package Mock Data
  const [designPackage, setDesignPackage] = useState<DesignPackageItem>({
    id: 'DES-QND-001',
    projectId,
    packageType: 'elevations',
    title: 'Main Ceremony 360° Kinetic LED Arch & Motorized Truss System',
    discipline: 'audio_visual',
    currentRevisionCode: 'Rev B',
    currentReleaseStatus: 'approved_concept', // Approved Concept is NOT production!
    linkedRequirementId: 'REQ-QND-001',
    createdAt: '2026-09-08T10:00:00Z',
    revisions: [
      {
        revisionCode: 'Rev A',
        versionNumber: 1,
        contentHash: 'a1b2c3d4e5f600112233445566778899aabbccddeeff00112233445566778899',
        storageUrl: 'designs/DES-QND-001-RevA.pdf',
        uploadedBy: 'Karim Haddad (Technical Director)',
        uploadedAt: '2026-09-08T10:00:00Z',
        notes: 'Initial concept elevation with 24m outer span and ground footings.',
        releaseStatus: 'approved_concept',
      },
      {
        revisionCode: 'Rev B',
        versionNumber: 2,
        contentHash: 'b2c3d4e5f6a111223344556677889900bbccddeeff00112233445566778899aa',
        storageUrl: 'designs/DES-QND-001-RevB.pdf',
        uploadedBy: 'Civil Defence Certified Structural Engineer',
        uploadedAt: '2026-09-10T14:30:00Z',
        notes: 'Updated tie-in deadweight ballasts and increased kinetic ring clearance to 1.8m.',
        releaseStatus: 'client_review',
        structuralEngineerSignoff: undefined,
        hseSignoff: undefined,
      },
    ],
    pins: [
      {
        id: 'pin-1',
        pinNumber: 1,
        revisionCode: 'Rev A',
        xPercent: 32,
        yPercent: 44,
        title: 'Central Kinetic Ring Motorized Pivot Joint',
        discipline: 'staging',
        priority: 'urgent',
        status: 'open',
        assigneeName: 'Karim Haddad (Technical Director)',
        comments: [
          {
            id: 'c-1',
            authorId: 'u-zaid',
            authorName: 'Zaid Mansour (Lead PM)',
            discipline: 'project_management',
            message: 'Client requires certification that dynamic braking torque is rated for 150% maximum load.',
            createdAt: '2026-09-09T11:00:00Z',
          },
          {
            id: 'c-2',
            authorId: 'u-karim',
            authorName: 'Karim Haddad (Technical Director)',
            discipline: 'staging',
            message: 'Dual electromagnetic failsafe brakes integrated into Rev B drawing callout #4.',
            createdAt: '2026-09-09T15:30:00Z',
          },
        ],
        createdAt: '2026-09-09T11:00:00Z',
      },
      {
        id: 'pin-2',
        pinNumber: 2,
        revisionCode: 'Rev A',
        xPercent: 78,
        yPercent: 68,
        title: 'Foundation Tie-Down Ballast Anchor Point',
        discipline: 'health_safety',
        priority: 'high',
        status: 'resolved',
        assigneeName: 'Civil Defence Structural Inspector',
        comments: [
          {
            id: 'c-3',
            authorId: 'u-hse',
            authorName: 'HSE & Safety Lead',
            discipline: 'health_safety',
            message: 'Civil Defence requires water/concrete deadweight anchors rather than road-surface drilling on Lusail Boulevard.',
            createdAt: '2026-09-09T12:00:00Z',
          },
        ],
        createdAt: '2026-09-09T12:00:00Z',
        resolvedAt: '2026-09-10T14:00:00Z',
      },
    ],
  });

  const activeRevision = designPackage.revisions.find((r) => r.revisionCode === selectedRevisionCode) || designPackage.revisions[0];
  const activePin = designPackage.pins.find((p) => p.id === selectedPinId) || designPackage.pins[0];

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setNewPinCoord({ x, y });
    setIsNewPinModalOpen(true);
  };

  const handleCreatePin = (e: React.FormEvent) => {
    e.preventDefault();
    const newPin: DesignAnnotationPin = {
      id: `pin-${Date.now()}`,
      pinNumber: designPackage.pins.length + 1,
      revisionCode: selectedRevisionCode,
      xPercent: newPinCoord.x,
      yPercent: newPinCoord.y,
      title: newPinTitle,
      discipline: newPinDiscipline,
      priority: newPinPriority,
      status: 'open',
      assigneeName: 'Zaid Mansour (Lead PM)',
      comments: [
        {
          id: `comm-${Date.now()}`,
          authorId: 'current-user',
          authorName: 'Lead Design Reviewer',
          discipline: newPinDiscipline,
          message: newPinComment,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setDesignPackage({
      ...designPackage,
      pins: [...designPackage.pins, newPin],
    });
    setSelectedPinId(newPin.id);
    setIsNewPinModalOpen(false);
  };

  const handleTogglePinStatus = (pinId: string, newStatus: AnnotationStatus) => {
    const updatedPins = designPackage.pins.map((p) => {
      if (p.id === pinId) {
        return {
          ...p,
          status: newStatus,
          resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
        };
      }
      return p;
    });
    setDesignPackage({ ...designPackage, pins: updatedPins });
  };

  const handleAddComment = (pinId: string, message: string) => {
    if (!message.trim()) return;
    const updatedPins = designPackage.pins.map((p) => {
      if (p.id === pinId) {
        return {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `c-${Date.now()}`,
              authorId: 'current-user',
              authorName: 'Lead Technical Reviewer',
              discipline: 'technical',
              message,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      }
      return p;
    });
    setDesignPackage({ ...designPackage, pins: updatedPins });
  };

  const handleCheckProductionGate = () => {
    const revWithSignoffs = {
      ...activeRevision,
      structuralEngineerSignoff: structuralCertified
        ? {
            certified: true,
            certifiedBy: 'Civil Defence Certified Structural Eng. Tareq Al-Nuaimi',
            certifiedAt: new Date().toISOString(),
            licenseNumber: 'QCD-SE-2026-991',
          }
        : undefined,
      hseSignoff: hseCertified
        ? {
            certified: true,
            certifiedBy: 'Chief HSE Inspector Rashid Mansoor',
            certifiedAt: new Date().toISOString(),
          }
        : undefined,
    };

    const evalResult = ProductionReleaseGate.evaluateProductionRelease(revWithSignoffs, 'approved_for_production');
    setGateEvaluation(evalResult);
    setIsSignoffModalOpen(true);
  };

  const handleConfirmProductionRelease = () => {
    if (gateEvaluation?.allowed) {
      setDesignPackage({
        ...designPackage,
        currentReleaseStatus: 'approved_for_production',
      });
      setIsSignoffModalOpen(false);
      triggerRefresh();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Design Register & Creative Review
            </span>
            <Badge variant="info">Stage 04: Technical Design Development</Badge>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            {designPackage.title}
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            Interactive 2D/3D viewer with coordinate pin threads, revision comparison, and POL-DES-01 fabrication release gate.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Release Status Badge */}
          <div
            id="badge-design-release-status"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '12px',
              backgroundColor:
                designPackage.currentReleaseStatus === 'approved_for_production'
                  ? '#dcfce7'
                  : designPackage.currentReleaseStatus === 'approved_concept'
                  ? '#fef3c7'
                  : '#eff6ff',
              color:
                designPackage.currentReleaseStatus === 'approved_for_production'
                  ? '#15803d'
                  : designPackage.currentReleaseStatus === 'approved_concept'
                  ? '#b45309'
                  : '#1d4ed8',
              border: '1px solid currentColor',
            }}
          >
            {designPackage.currentReleaseStatus === 'approved_for_production'
              ? '🟢 APPROVED FOR PRODUCTION (FABRICATION UNLOCKED)'
              : designPackage.currentReleaseStatus === 'approved_concept'
              ? '🟡 APPROVED CONCEPT (FABRICATION BLOCKED)'
              : '🔵 CLIENT REVIEW'}
          </div>

          <Button
            id="btn-release-production"
            variant="primary"
            size="md"
            onClick={handleCheckProductionGate}
          >
            🛡️ Production Release Gate (POL-DES-01)
          </Button>
        </div>
      </div>

      {/* Package Selector & Revision Controls */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Package Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { key: 'elevations', label: '📐 Elevations & Cross-Sections' },
              { key: 'floor_plans', label: '🗺️ General Layout & Floor Plans' },
              { key: '3d_renders', label: '🎨 3D Visualization Renders' },
              { key: 'technical_details', label: '🔩 Structural Detail Sheets' },
            ].map((pkg) => (
              <button
                key={pkg.key}
                onClick={() => setPackageType(pkg.key as DesignPackageType)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: packageType === pkg.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: packageType === pkg.key ? '#eff6ff' : '#ffffff',
                  color: packageType === pkg.key ? '#1d4ed8' : '#475569',
                  cursor: 'pointer',
                }}
              >
                {pkg.label}
              </button>
            ))}
          </div>

          {/* Revision & Comparison Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Active Revision:</span>
            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
              <button
                id="btn-select-rev-a"
                onClick={() => setSelectedRevisionCode('Rev A')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: selectedRevisionCode === 'Rev A' ? '#2563eb' : '#ffffff',
                  color: selectedRevisionCode === 'Rev A' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                Rev A (Initial)
              </button>
              <button
                id="btn-select-rev-b"
                onClick={() => setSelectedRevisionCode('Rev B')}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  backgroundColor: selectedRevisionCode === 'Rev B' ? '#2563eb' : '#ffffff',
                  color: selectedRevisionCode === 'Rev B' ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                }}
              >
                Rev B (Ballast Update)
              </button>
            </div>

            <Button
              id="btn-toggle-compare"
              variant={isCompareMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setIsCompareMode(!isCompareMode)}
            >
              {isCompareMode ? '👁️ Standard View' : '🔄 Compare Rev A vs Rev B'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Workspace Grid: Interactive Canvas + Pin Comments Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
        {/* Interactive CAD Elevation Canvas */}
        <Card style={{ padding: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                Elevation View — {selectedRevisionCode} {isCompareMode && '(Comparison Overlay Active)'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                Click anywhere on canvas to drop a review pin
              </span>
            </div>
            <Badge variant="neutral" size="sm">Scale 1:50 @ A1</Badge>
          </div>

          {/* Canvas Wrapper */}
          <div
            id="cad-canvas-viewer"
            onClick={handleCanvasClick}
            style={{
              position: 'relative',
              width: '100%',
              height: '460px',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              overflow: 'hidden',
              cursor: 'crosshair',
              border: '2px solid #334155',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            }}
          >
            {/* SVG Engineering Elevation Mockup */}
            <svg width="100%" height="100%" viewBox="0 0 800 460" preserveAspectRatio="none">
              {/* Engineering Grid */}
              <defs>
                <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cadGrid)" />

              {/* Ground Level line */}
              <line x1="40" y1="400" x2="760" y2="400" stroke="#64748b" strokeWidth="2" strokeDasharray="5,5" />
              <text x="50" y="420" fill="#64748b" fontSize="11" fontFamily="monospace">±0.00 FINISHED BOULEVARD PAVING</text>

              {/* Main Structural Arch */}
              <path
                d="M 120 400 L 120 180 Q 400 40 680 180 L 680 400"
                fill="none"
                stroke={isCompareMode ? '#f43f5e' : '#38bdf8'}
                strokeWidth="6"
              />

              {/* Kinetic Inner LED Ring */}
              <circle
                cx="400"
                cy="200"
                r="110"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeDasharray={isCompareMode ? '8,4' : 'none'}
              />

              {/* Foundation Deadweight Ballasts (Rev B Difference!) */}
              <rect x="80" y="380" width="80" height="20" fill="#0284c7" opacity="0.8" />
              <rect x="640" y="380" width="80" height="20" fill="#0284c7" opacity="0.8" />
              <text x="85" y="395" fill="#ffffff" fontSize="9" fontWeight="bold">2T BALLAST</text>
              <text x="645" y="395" fill="#ffffff" fontSize="9" fontWeight="bold">2T BALLAST</text>

              {/* Dimension Callouts */}
              <line x1="120" y1="70" x2="680" y2="70" stroke="#f59e0b" strokeWidth="1" />
              <text x="360" y="65" fill="#f59e0b" fontSize="11" fontWeight="bold">SPAN 24,000 mm</text>
            </svg>

            {/* Render Pins Over Canvas */}
            {designPackage.pins.map((pin) => {
              const isSelected = pin.id === selectedPinId;
              const pinColor =
                pin.status === 'resolved'
                  ? '#10b981'
                  : pin.priority === 'urgent'
                  ? '#ef4444'
                  : pin.priority === 'high'
                  ? '#f59e0b'
                  : '#3b82f6';

              return (
                <div
                  key={pin.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinId(pin.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pin.xPercent}%`,
                    top: `${pin.yPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    width: isSelected ? '32px' : '26px',
                    height: isSelected ? '32px' : '26px',
                    borderRadius: '50%',
                    backgroundColor: pinColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px',
                    boxShadow: isSelected ? '0 0 12px #ffffff' : '0 2px 6px rgba(0,0,0,0.4)',
                    border: '2px solid #ffffff',
                    cursor: 'pointer',
                    zIndex: isSelected ? 10 : 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pin.pinNumber}
                </div>
              );
            })}
          </div>

          {/* Comparison Mode Legend */}
          {isCompareMode && (
            <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '4px', fontSize: '11px', color: '#9f1239', display: 'flex', gap: '16px' }}>
              <span>🔴 <strong>Red Line:</strong> Rev A baseline geometry</span>
              <span>🟣 <strong>Purple Line:</strong> Rev B kinetic clearance modification</span>
              <span>🟦 <strong>Blue Block:</strong> Added Civil Defence foundation deadweight</span>
            </div>
          )}
        </Card>

        {/* Pin Discussion & Comments Panel */}
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '510px' }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                Pin #{activePin?.pinNumber}: {activePin?.title}
              </span>
              <Badge variant={activePin?.status === 'resolved' ? 'success' : 'warning'} size="sm">
                {activePin?.status?.toUpperCase()}
              </Badge>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
              <span>Discipline: <strong>{activePin?.discipline}</strong></span>
              <span>Priority: <strong style={{ color: activePin?.priority === 'urgent' ? '#ef4444' : '#f59e0b' }}>{activePin?.priority?.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Comment Thread List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {activePin?.comments.map((c) => (
              <div
                key={c.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '11px', color: '#0f172a' }}>{c.authorName}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#334155' }}>{c.message}</div>
              </div>
            ))}
          </div>

          {/* Add Reply / Status Actions */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>Pin Status:</span>
              <select
                value={activePin?.status || 'open'}
                onChange={(e) => handleTogglePinStatus(activePin.id, e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected_reopened">Reopened</option>
              </select>
              {activePin?.status === 'resolved' && (
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>✓ Resolved</span>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('replyText') as HTMLInputElement;
                handleAddComment(activePin.id, input.value);
                input.value = '';
              }}
              style={{ display: 'flex', gap: '6px' }}
            >
              <input
                name="replyText"
                placeholder="Type revision comment..."
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              />
              <Button type="submit" size="sm" variant="secondary">
                Reply
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Production Release Gate (POL-DES-01) Modal */}
      {isSignoffModalOpen && (
        <Modal
          isOpen={isSignoffModalOpen}
          onClose={() => setIsSignoffModalOpen(false)}
          title="Structural & Safety Fabrication Release Gate (POL-DES-01)"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Policy Explanation */}
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '12px 14px', fontSize: '12px', color: '#1e40af' }}>
              <strong>Governance Policy POL-DES-01:</strong> Concept drawings and aesthetic approvals do NOT authorize fabrication. Production release strictly requires formal sign-off from a certified Structural Engineer and the Lead HSE Inspector.
            </div>

            {/* Checkboxes for signoffs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="chk-structural-signoff"
                  checked={structuralCertified}
                  onChange={(e) => setStructuralCertified(e.target.checked)}
                />
                <span>
                  <strong>Certified Structural Engineering Sign-off:</strong> Civil Defence License #QCD-SE-2026-991
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="chk-hse-signoff"
                  checked={hseCertified}
                  onChange={(e) => setHseCertified(e.target.checked)}
                />
                <span>
                  <strong>HSE & Fire Safety Compliance Sign-off:</strong> Flame Retardancy & Egress Plan verified
                </span>
              </label>
            </div>

            {/* Gate Evaluation Result */}
            {structuralCertified && hseCertified ? (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px', color: '#166534', fontSize: '12px' }}>
                ✅ <strong>POL-DES-01 SATISFIED:</strong> All mandatory structural and HSE sign-offs are attached. Fabrication authorization can proceed.
              </div>
            ) : (
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '6px', padding: '12px', color: '#9f1239', fontSize: '12px' }}>
                ⛔ <strong>POL-DES-01 VIOLATION:</strong> Fabrication release denied. Missing required engineering certifications.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setIsSignoffModalOpen(false)}>
                Cancel
              </Button>
              <Button
                id="btn-confirm-production-release"
                variant="primary"
                disabled={!structuralCertified || !hseCertified}
                onClick={handleConfirmProductionRelease}
              >
                Authorize Fabrication Release
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Pin Modal */}
      {isNewPinModalOpen && (
        <Modal
          isOpen={isNewPinModalOpen}
          onClose={() => setIsNewPinModalOpen(false)}
          title={`Add Review Callout Pin at Coordinates (${newPinCoord.x}%, ${newPinCoord.y}%)`}
        >
          <form onSubmit={handleCreatePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Callout Title"
              value={newPinTitle}
              onChange={(e) => setNewPinTitle(e.target.value)}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Discipline"
                value={newPinDiscipline}
                onChange={(e) => setNewPinDiscipline(e.target.value)}
                options={[
                  { value: 'staging', label: 'Staging & Structures' },
                  { value: 'audio_visual', label: 'Audio / Visual' },
                  { value: 'rigging', label: 'Rigging' },
                  { value: 'health_safety', label: 'Health & Safety' },
                  { value: 'lighting', label: 'Lighting' },
                ]}
              />

              <Select
                label="Priority"
                value={newPinPriority}
                onChange={(e) => setNewPinPriority(e.target.value as AnnotationPriority)}
                options={[
                  { value: 'urgent', label: 'Urgent (Critical Path)' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>

            <Textarea
              label="Review Note / Action Item"
              value={newPinComment}
              onChange={(e) => setNewPinComment(e.target.value)}
              rows={3}
              required
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" onClick={() => setIsNewPinModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Pin Comment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
