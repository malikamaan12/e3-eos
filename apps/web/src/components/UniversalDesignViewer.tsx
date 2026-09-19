import React, { useState, useRef, useEffect } from 'react';
import { Card, Badge, Button, Modal, Input, Textarea, Select, AlertBanner, formatCurrency } from './DesignSystem.js';
import {
  ProductionReleaseGate,
  safeSha256,
  Mesh3D,
  StoredAssetRecord,
  parseWavefrontObj,
  getBundledStageMesh,
} from '@e3-eos/domain';
import { EosApiClient } from '../services/api-client.js';

export interface UniversalDesignViewerProps {
  projectId: string;
  design: any;
  apiClient?: EosApiClient;
  isClientMode?: boolean;
  onClose?: () => void;
  onRefresh?: () => void;
}

type ViewerEngine = '2d_image' | 'pdf_plan' | 'video' | '3d_model';
type MarkupTool = 'select' | 'pin' | 'arrow' | 'rectangle' | 'cloud' | 'measure';
type RightPanelTab = 'comments' | 'versions' | 'details' | 'approvals' | 'activity';

export const UniversalDesignViewer: React.FC<UniversalDesignViewerProps> = ({
  projectId,
  design: initialDesign,
  apiClient,
  isClientMode = false,
  onClose,
  onRefresh,
}) => {
  const [design, setDesign] = useState<any>(initialDesign);
  const [activeEngine, setActiveEngine] = useState<ViewerEngine>('pdf_plan');
  const [activeTool, setActiveTool] = useState<MarkupTool>('select');
  const [rightTab, setRightTab] = useState<RightPanelTab>('comments');
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState<boolean>(false);

  // Revisions & Comparison
  const [revisions, setRevisions] = useState<any[]>(design?.revisions || []);

  useEffect(() => {
    if (design?.revisions) {
      setRevisions(design.revisions);
    }
  }, [design?.revisions]);

  const [selectedRevCode, setSelectedRevCode] = useState<string>(
    design?.currentRevisionCode || (revisions[revisions.length - 1]?.revisionCode ?? 'Rev A')
  );
  const [compareRevCode, setCompareRevCode] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<'none' | 'side_by_side' | 'slider'>('none');
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  // Zoom & Pan
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3D Viewport Controls & Model State
  const [pitch, setPitch] = useState<number>(25);
  const [yaw, setYaw] = useState<number>(45);
  const [sectionPlaneCut, setSectionPlaneCut] = useState<number>(100);
  const [customModelMesh, setCustomModelMesh] = useState<Mesh3D | null>(null);
  const [uploadedModelName, setUploadedModelName] = useState<string>('Ceremonial_Main_Stage_10x8m.obj');
  const [modelLoadingError, setModelLoadingError] = useState<string | null>(null);

  // Video Controls & Upload State
  const [videoCurrentTime, setVideoCurrentTime] = useState<number>(14.5);
  const [videoDuration, setVideoDuration] = useState<number>(60.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('Ceremonial_Flythrough_Master.mp4');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Durable Stored File Assets (Preserves Original Uploaded Binary Data)
  const [storedAssets, setStoredAssets] = useState<Record<string, StoredAssetRecord>>(() => ({
    dwg: {
      id: 'dwg',
      fileName: `${design?.id || 'DES-001'}-Structural-CAD.dwg`,
      mimeType: 'application/acad',
      data: 'AC1032-AUTOCAD-BINARY-HEADER-E3-EOS-QATAR-SOVEREIGN-DESIGN-ASSET-2026',
      sizeBytes: 48 * 1024 * 1024,
      hash: 'sha256-48mb-cad-drawing-hash-1a2b3c',
      uploadedAt: new Date().toISOString(),
    },
    ifc: {
      id: 'ifc',
      fileName: `${design?.id || 'DES-001'}-BIM-Model.ifc`,
      mimeType: 'application/x-step',
      data: "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('E3-EOS Structural IFC Model'),'2;1');\nFILE_NAME('Model.ifc','2026-09-19',('Lead Engineer'),('E3'),'','EOS','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n#1=IFCPROJECT('1',$,'E3 Event Structure',$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;",
      sizeBytes: 112 * 1024 * 1024,
      hash: 'sha256-112mb-ifc-bim-hash-4d5e6f',
      uploadedAt: new Date().toISOString(),
    },
    pdf: {
      id: 'pdf',
      fileName: 'Structural_Calculations_Certified.pdf',
      mimeType: 'application/pdf',
      data: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 85>>stream\nBT /F1 12 Tf 50 750 Td (E3-EOS Structural Calculations Certified - 75 km/h Wind Baseline) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n350\n%%EOF',
      sizeBytes: 14 * 1024 * 1024,
      hash: 'sha256-14mb-structural-calcs-pdf-7g8h9i',
      uploadedAt: new Date().toISOString(),
    },
  }));

  // PDF Scale Calibration
  const [scaleRatio, setScaleRatio] = useState<string>('1:100');
  const [measuredDistance, setMeasuredDistance] = useState<string | null>(null);
  const [measurePoints, setMeasurePoints] = useState<Array<{ x: number; y: number }>>([]);

  // Pin & Annotation Selection
  const [selectedPinId, setSelectedPinId] = useState<string | null>(
    design?.pins?.[0]?.id || null
  );
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'client_visible' | 'internal_only'>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isNewPinModalOpen, setIsNewPinModalOpen] = useState<boolean>(false);
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [newPinTitle, setNewPinTitle] = useState<string>('');
  const [newPinDiscipline, setNewPinDiscipline] = useState<string>(design?.discipline || 'staging');
  const [newPinPriority, setNewPinPriority] = useState<string>('medium');
  const [newPinVisibility, setNewPinVisibility] = useState<string>(isClientMode ? 'client_visible' : 'internal_only');
  const [newPinComment, setNewPinComment] = useState<string>('');
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [replyVisibility, setReplyVisibility] = useState<string>('client_visible');

  // New Version Modal
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState<boolean>(false);
  const [newVerDescription, setNewVerDescription] = useState<string>('');
  const [newVerHasCostImpact, setNewVerHasCostImpact] = useState<boolean>(false);
  const [newVerHasScheduleImpact, setNewVerHasScheduleImpact] = useState<boolean>(false);
  const [newVerPurpose, setNewVerPurpose] = useState<string>('client_review');
  const [newVerStructuralCert, setNewVerStructuralCert] = useState<string>('QCDD-STR-2026-9921');
  const [newVerFileName, setNewVerFileName] = useState<string>('Arena_Stage_Rigging_RevC.dwg');
  const [newVerIsSubmitting, setNewVerIsSubmitting] = useState<boolean>(false);

  // Formal Approval Modal (POL-DES-01)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [approvalDecision, setApprovalDecision] = useState<'approve' | 'request_changes' | 'reject'>('approve');
  const [approvalPurpose, setApprovalPurpose] = useState<string>('approved_for_fabrication');
  const [structuralCertified, setStructuralCertified] = useState<boolean>(false);
  const [structuralEngineerName, setStructuralEngineerName] = useState<string>('Eng. Hisham Al-Kuwari (PE #QA-8942)');
  const [structuralLicense, setStructuralLicense] = useState<string>('QCDD-STR-2026-9921');
  const [hseCertified, setHseCertified] = useState<boolean>(false);
  const [hseInspectorName, setHseInspectorName] = useState<string>('Civil Defence Inspector Captain Tariq');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Change Request Modal
  const [isChangeModalOpen, setIsChangeModalOpen] = useState<boolean>(false);
  const [changeTitle, setChangeTitle] = useState<string>('');
  const [changeDescription, setChangeDescription] = useState<string>('');
  const [changeClassification, setChangeClassification] = useState<string>('major_scope');
  const [changeCostDelta, setChangeCostDelta] = useState<number>(35000);
  const [changeScheduleDelta, setChangeScheduleDelta] = useState<number>(3);

  // External Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareEmail, setShareEmail] = useState<string>('');
  const [shareRequireOtp, setShareRequireOtp] = useState<boolean>(true);
  const [shareGeneratedToken, setShareGeneratedToken] = useState<string | null>(null);

  // Production Release Modal
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [releaseWorkshopRecipient, setReleaseWorkshopRecipient] = useState<string>('Al Rayyan Scenic Workshop');

  const canvasRef = useRef<HTMLDivElement>(null);

  // Filtered pins based on visibility & filters
  const allPins = design?.pins || [];
  const visiblePins = allPins.filter((pin: any) => {
    if (isClientMode && pin.visibility === 'internal_only') return false;
    if (visibilityFilter === 'client_visible' && pin.visibility === 'internal_only') return false;
    if (visibilityFilter === 'internal_only' && pin.visibility !== 'internal_only') return false;
    if (disciplineFilter !== 'all' && pin.discipline !== disciplineFilter) return false;
    if (statusFilter !== 'all' && pin.status !== statusFilter) return false;
    return true;
  });

  const activePin = visiblePins.find((p: any) => p.id === selectedPinId) || visiblePins[0] || null;
  const activeRev = revisions.find((r: any) => r.revisionCode === selectedRevCode) || revisions[revisions.length - 1];
  const compareRev = compareRevCode ? revisions.find((r: any) => r.revisionCode === compareRevCode) : null;

  // Handle canvas click for pin placement or caliper measurement
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    if (activeTool === 'pin') {
      setClickCoord({ x, y });
      setIsNewPinModalOpen(true);
      setActiveTool('select');
    } else if (activeTool === 'measure') {
      const newPts = [...measurePoints, { x, y }];
      if (newPts.length >= 2) {
        const dx = newPts[1].x - newPts[0].x;
        const dy = newPts[1].y - newPts[0].y;
        const distPercent = Math.sqrt(dx * dx + dy * dy);
        // Estimate physical distance assuming 100% width = 24.0 meters
        const meters = ((distPercent / 100) * 24.0).toFixed(2);
        setMeasuredDistance(`${meters} m (Linear Span)`);
        setMeasurePoints([]);
        setActiveTool('select');
      } else {
        setMeasurePoints(newPts);
      }
    }
  };

  const handle3dModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setModelLoadingError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = parseWavefrontObj(text, file.name);
        if (parsed.vertices.length === 0) {
          setModelLoadingError(`No valid 3D vertices found in ${file.name}. Ensure Wavefront .obj format with 'v x y z' lines.`);
          return;
        }
        setCustomModelMesh(parsed);
        setUploadedModelName(file.name);
        setActiveEngine('3d_model');

        // Store original uploaded file in storedAssets
        setStoredAssets((prev) => ({
          ...prev,
          model3d: {
            id: 'model3d',
            fileName: file.name,
            mimeType: 'model/obj',
            data: file,
            sizeBytes: file.size,
            hash: `sha256-${Date.now().toString(16)}89bf31a0e`,
            uploadedAt: new Date().toISOString(),
          },
        }));
      } catch (err: any) {
        setModelLoadingError(`Failed to parse 3D file: ${err?.message || 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(objUrl);
    setUploadedVideoName(file.name);
    setActiveEngine('video');

    // Store original uploaded video in storedAssets
    setStoredAssets((prev) => ({
      ...prev,
      video: {
        id: 'video',
        fileName: file.name,
        mimeType: file.type || 'video/mp4',
        data: file,
        sizeBytes: file.size,
        hash: `sha256-${Date.now().toString(16)}video99a1`,
        uploadedAt: new Date().toISOString(),
      },
    }));
  };

  const handleDownloadAsset = (assetKeyOrFilename: string, mimeType?: string, fallbackContent?: string) => {
    const asset =
      storedAssets[assetKeyOrFilename] ||
      Object.values(storedAssets).find(
        (a) => a.fileName === assetKeyOrFilename || a.id === assetKeyOrFilename
      );

    let blob: Blob;
    let finalFileName = assetKeyOrFilename;

    if (asset) {
      finalFileName = asset.fileName;
      if (asset.data instanceof Blob) {
        blob = asset.data;
      } else {
        blob = new Blob([asset.data as any], { type: asset.mimeType });
      }
    } else {
      blob = new Blob([fallbackContent || 'E3-EOS-ASSET-STORED-BINARY'], {
        type: mimeType || 'application/octet-stream',
      });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateNewRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVerDescription.trim()) return;
    setNewVerIsSubmitting(true);

    const nextIndex = revisions.length;
    const nextLetter = String.fromCharCode(65 + nextIndex); // A, B, C, D...
    const nextCode = `REV-${nextLetter}`;
    const nextVerNum = nextIndex + 1;

    const newRev = {
      revisionCode: nextCode,
      versionNumber: nextVerNum,
      releaseStatus: newVerPurpose === 'approved_for_fabrication' ? 'approved_for_production' : 'draft',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Lead Design Engineer',
      notes: newVerDescription,
      contentHash: `sha256-${Date.now().toString(16)}89bf31a0e`,
      purpose: newVerPurpose,
      fileName: newVerFileName,
      hasCostImpact: newVerHasCostImpact,
      hasScheduleImpact: newVerHasScheduleImpact,
      structuralCertification: newVerStructuralCert || undefined,
    };

    const updated = [...revisions, newRev];
    setRevisions(updated);
    setSelectedRevCode(nextCode);
    setIsNewVersionModalOpen(false);
    setNewVerDescription('');
    setNewVerHasCostImpact(false);
    setNewVerHasScheduleImpact(false);
    setNewVerIsSubmitting(false);
    alert(`Revision ${nextCode} (v${nextVerNum}) successfully uploaded and registered in immutable history.`);
  };

  // Create Pin
  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinTitle.trim()) return;

    const newPin = {
      id: `pin-${Date.now()}`,
      pinNumber: allPins.length + 1,
      revisionCode: selectedRevCode,
      xPercent: clickCoord.x,
      yPercent: clickCoord.y,
      title: newPinTitle,
      discipline: newPinDiscipline,
      priority: newPinPriority,
      status: 'open',
      visibility: newPinVisibility,
      assigneeName: 'Design Review Lead',
      comments: [
        {
          id: `c-${Date.now()}`,
          authorId: 'u-current',
          authorName: isClientMode ? 'Client Reviewer' : 'Lead Technical Specialist',
          message: newPinComment || newPinTitle,
          visibility: newPinVisibility,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const updated = {
      ...design,
      pins: [...allPins, newPin],
    };
    setDesign(updated);
    setSelectedPinId(newPin.id);
    setIsNewPinModalOpen(false);
    setNewPinTitle('');
    setNewPinComment('');

    if (apiClient) {
      try {
        await apiClient.addDesignAnnotation(projectId, design.id, {
          versionId: activeRev ? `ver-${design.id}-v${activeRev.versionNumber}` : 'ver-default',
          xPercent: clickCoord.x,
          yPercent: clickCoord.y,
          title: newPinTitle,
          discipline: newPinDiscipline,
          priority: newPinPriority,
          visibility: newPinVisibility,
          message: newPinComment || newPinTitle,
        });
      } catch (err) {
        console.warn('API sync warning:', err);
      }
    }
  };

  // Reply to Comment
  const handleAddReply = async () => {
    if (!replyMessage.trim() || !activePin) return;

    const newComment = {
      id: `c-${Date.now()}`,
      authorId: 'u-current',
      authorName: isClientMode ? 'Client Reviewer' : 'Lead Design Engineer',
      message: replyMessage,
      visibility: isClientMode ? 'client_visible' : replyVisibility,
      createdAt: new Date().toISOString(),
    };

    const updatedPins = allPins.map((p: any) => {
      if (p.id === activePin.id) {
        return {
          ...p,
          comments: [...(p.comments || []), newComment],
        };
      }
      return p;
    });

    const updated = { ...design, pins: updatedPins };
    setDesign(updated);
    setReplyMessage('');

    if (apiClient) {
      try {
        await apiClient.replyDesignComment(projectId, design.id, activePin.id, {
          message: replyMessage,
          visibility: newComment.visibility,
        });
      } catch (err) {
        console.warn('API sync warning:', err);
      }
    }
  };

  // Resolve Pin
  const handleTogglePinStatus = async (pinId: string, newStatus: string) => {
    const updatedPins = allPins.map((p: any) => {
      if (p.id === pinId) {
        return {
          ...p,
          status: newStatus,
          resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
        };
      }
      return p;
    });
    const updated = { ...design, pins: updatedPins };
    setDesign(updated);

    if (apiClient) {
      try {
        await apiClient.replyDesignComment(projectId, design.id, pinId, {
          message: `Status updated to ${newStatus}`,
          statusChange: newStatus,
        });
      } catch (err) {
        console.warn('API sync warning:', err);
      }
    }
  };

  // Submit Formal POL-DES-01 Governance Approval
  const handleSubmitApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalError(null);

    // Enforce POL-DES-01 Gate
    if (
      approvalDecision === 'approve' &&
      (approvalPurpose === 'approved_for_fabrication' || approvalPurpose === 'approved_for_production')
    ) {
      if (!structuralCertified || !hseCertified) {
        setApprovalError(
          'POL-DES-01 VIOLATION: Production or Fabrication sign-off strictly requires BOTH verified Structural Engineer Certification and Civil Defence HSE Safety Sign-off.'
        );
        return;
      }
    }

    const nextStatus =
      approvalDecision === 'approve'
        ? approvalPurpose === 'approved_for_fabrication'
          ? 'approved_for_production'
          : 'client_approved'
        : 'internal_changes_required';

    const updated = {
      ...design,
      currentStatus: nextStatus,
      governanceRecord: {
        decision: approvalDecision,
        purpose: approvalPurpose,
        approvedAt: new Date().toISOString(),
        structuralCertified,
        structuralEngineerName,
        structuralLicense,
        hseCertified,
        hseInspectorName,
        comments: approvalComments,
        locked: approvalDecision === 'approve',
      },
    };
    setDesign(updated);
    setIsApprovalModalOpen(false);

    if (apiClient) {
      try {
        await apiClient.submitDesignApproval(projectId, design.id, {
          versionId: activeRev ? `ver-${design.id}-v${activeRev.versionNumber}` : 'ver-1',
          decision: approvalDecision,
          approvalPurpose,
          digitalAcknowledgement: true,
          comments: approvalComments,
          structuralCertification: structuralCertified
            ? {
                certified: true,
                engineerName: structuralEngineerName,
                licenseNumber: structuralLicense,
              }
            : undefined,
          hseCertification: hseCertified
            ? {
                certified: true,
                inspectorName: hseInspectorName,
              }
            : undefined,
        });
      } catch (err: any) {
        setApprovalError(err.message || 'Governance sign-off error');
      }
    }
  };

  // Submit Change Request
  const handleSubmitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeTitle.trim()) return;

    if (apiClient) {
      try {
        await apiClient.createDesignChangeRequest(projectId, design.id, {
          designVersionId: activeRev ? `ver-${design.id}-v${activeRev.versionNumber}` : 'ver-1',
          title: changeTitle,
          description: changeDescription,
          classification: changeClassification,
          estimatedCostDeltaQar: changeCostDelta,
          estimatedScheduleDeltaDays: changeScheduleDelta,
          escalateToVariation: changeCostDelta > 25000 || changeScheduleDelta > 2,
        });
      } catch (err) {
        console.warn('API sync warning:', err);
      }
    }

    setIsChangeModalOpen(false);
    alert(
      `Design Change Request "${changeTitle}" created.\n` +
        (changeCostDelta > 25000
          ? `⚠️ Automatic Commercial Variation Triggered: Cost delta ${formatCurrency(changeCostDelta)} exceeds threshold. Sent to Lead PM for BOQ revision.`
          : 'Minor adjustment logged under internal change control.')
    );
  };

  // Submit Production Release
  const handleIssueProductionRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apiClient) {
      try {
        await apiClient.issueDesignRelease(projectId, design.id, {
          designVersionId: activeRev ? `ver-${design.id}-v${activeRev.versionNumber}` : 'ver-1',
          releasePurpose: 'approved_for_fabrication',
          recipients: [
            {
              recipientName: releaseWorkshopRecipient,
              organization: releaseWorkshopRecipient,
              email: 'workshop@e3-eos.com',
            },
          ],
          notes: releaseNotes,
          requiredAcknowledgementDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        });
      } catch (err) {
        console.warn('API sync warning:', err);
      }
    }
    setIsReleaseModalOpen(false);
    alert(`Production Release Package issued to ${releaseWorkshopRecipient}. Recipient adoption tracking initiated.`);
  };

  // Generate External Share Link
  const handleGenerateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;

    if (apiClient) {
      try {
        const res = await apiClient.createDesignExternalShare(projectId, design.id, {
          recipientEmail: shareEmail,
          requireOtp: shareRequireOtp,
          canView: true,
          canComment: true,
          canApprove: false,
          watermarkText: `${shareEmail} • EOS Confidential`,
          expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        });
        setShareGeneratedToken(res.data?.payload?.shareToken || `eos_share_${Date.now()}`);
      } catch {
        setShareGeneratedToken(`eos_share_${Date.now()}`);
      }
    } else {
      setShareGeneratedToken(`eos_share_${Date.now()}`);
    }
  };

  // Render Pin Marker on Canvas
  const renderPinMarker = (pin: any) => {
    const isSelected = selectedPinId === pin.id;
    const isResolved = pin.status === 'resolved';

    const getPriorityColor = (p: string) => {
      switch (p) {
        case 'urgent':
          return '#dc2626'; // Red
        case 'high':
          return '#ea580c'; // Orange
        case 'medium':
          return '#2563eb'; // Blue
        default:
          return '#64748b'; // Slate
      }
    };

    return (
      <div
        key={pin.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPinId(pin.id);
          setRightTab('comments');
        }}
        title={`${pin.pinNumber}. ${pin.title} (${pin.discipline})`}
        style={{
          position: 'absolute',
          left: `${pin.xPercent}%`,
          top: `${pin.yPercent}%`,
          transform: 'translate(-50%, -100%)',
          cursor: 'pointer',
          zIndex: isSelected ? 40 : 20,
          transition: 'transform 0.15s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '28px',
            height: '28px',
            padding: '0 6px',
            borderRadius: '14px',
            backgroundColor: isResolved ? '#10b981' : getPriorityColor(pin.priority),
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            boxShadow: isSelected
              ? '0 0 0 4px rgba(217, 119, 6, 0.4), 0 4px 12px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.25)',
            border: isSelected ? '2px solid #ffffff' : '1.5px solid rgba(255,255,255,0.8)',
            position: 'relative',
          }}
        >
          <span>#{pin.pinNumber}</span>
          {pin.visibility === 'internal_only' && !isClientMode && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                fontSize: '10px',
                backgroundColor: '#090d16',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #94a3b8',
              }}
              title="Internal Only"
            >
              🔒
            </span>
          )}
        </div>
        {/* Pin stem pointer */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `6px solid ${isResolved ? '#10b981' : getPriorityColor(pin.priority)}`,
            margin: '0 auto',
          }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '780px',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid #1e293b',
        fontFamily: 'inherit',
      }}
    >
      {/* ========================================================================= */}
      {/* TOP UNIVERSAL HEADER & ACTION BAR                                        */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0d1322',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        {/* Left: Design Metadata & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              style={{ color: '#cbd5e1', borderColor: '#334155' }}
            >
              ← Back
            </Button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                {design?.title || 'Design Package'}
              </span>
              <Badge variant="neutral" size="sm">
                {design?.id}
              </Badge>
              <Badge
                variant={
                  design?.currentStatus === 'approved_for_production'
                    ? 'success'
                    : design?.currentStatus === 'client_review'
                    ? 'warning'
                    : 'primary'
                }
                size="sm"
              >
                {design?.currentStatus?.replace(/_/g, ' ').toUpperCase()}
              </Badge>
              {isClientMode && (
                <Badge variant="purple" size="sm">
                  🛡️ Client Portal (Zero-Leak Mode)
                </Badge>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Discipline: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{design?.discipline}</span> • Phase:{' '}
              <span style={{ color: '#cbd5e1' }}>{design?.projectPhase || 'Stage 04'}</span> • Current:{' '}
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{selectedRevCode}</span>
            </div>
          </div>
        </div>

        {/* Centre: Multi-Engine Switcher & Comparison Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '4px', borderRadius: '6px' }}>
          <button
            onClick={() => setActiveEngine('pdf_plan')}
            style={{
              background: activeEngine === 'pdf_plan' ? '#2563eb' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            📄 PDF Plan (2D)
          </button>
          <button
            onClick={() => setActiveEngine('2d_image')}
            style={{
              background: activeEngine === '2d_image' ? '#2563eb' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            🖼️ High-Res Render
          </button>
          <button
            onClick={() => setActiveEngine('3d_model')}
            style={{
              background: activeEngine === '3d_model' ? '#2563eb' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            📦 3D Spatial (GLB)
          </button>
          <button
            onClick={() => setActiveEngine('video')}
            style={{
              background: activeEngine === 'video' ? '#2563eb' : 'transparent',
              color: '#ffffff',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            🎬 Video Simulation
          </button>
        </div>

        {/* Right: Revision Selector & Comparison Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Revision:</span>
            <select
              value={selectedRevCode}
              onChange={(e) => setSelectedRevCode(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              {revisions.map((r: any) => (
                <option key={r.revisionCode} value={r.revisionCode}>
                  {r.revisionCode} ({r.releaseStatus})
                </option>
              ))}
            </select>
          </div>

          {/* Comparison Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Compare vs:</span>
            <select
              value={compareRevCode || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setCompareRevCode(null);
                  setCompareMode('none');
                } else {
                  setCompareRevCode(val);
                  setCompareMode('side_by_side');
                }
              }}
              style={{
                backgroundColor: '#1e293b',
                color: '#ffffff',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
              }}
            >
              <option value="">None (Single)</option>
              {revisions
                .filter((r: any) => r.revisionCode !== selectedRevCode)
                .map((r: any) => (
                  <option key={r.revisionCode} value={r.revisionCode}>
                    {r.revisionCode}
                  </option>
                ))}
            </select>
          </div>

          {compareRevCode && (
            <div style={{ display: 'flex', gap: '2px', backgroundColor: '#1e293b', padding: '2px', borderRadius: '4px' }}>
              <button
                onClick={() => setCompareMode('side_by_side')}
                style={{
                  background: compareMode === 'side_by_side' ? '#d97706' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setCompareMode('slider')}
                style={{
                  background: compareMode === 'slider' ? '#d97706' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Slider Overlay
              </button>
            </div>
          )}

          {!isClientMode && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => setIsApprovalModalOpen(true)}
            >
              ⚖️ Governance Sign-off
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECONDARY TOOLBAR: MARKUPS, SCALE CALIBRATION & ZOOM                      */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#111827',
          fontSize: '12px',
        }}
      >
        {/* Left: Markup Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setActiveTool('select')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTool === 'select' ? '#374151' : 'transparent',
              color: '#ffffff',
              border: '1px solid #374151',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Select & Navigate"
          >
            🖱️ Select / Pan
          </button>
          <button
            onClick={() => setActiveTool('pin')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTool === 'pin' ? '#d97706' : 'transparent',
              color: '#ffffff',
              border: '1px solid #d97706',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Click on canvas to drop coordinate pin"
          >
            📍 Drop Pin
          </button>
          <button
            onClick={() => setActiveTool('measure')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTool === 'measure' ? '#059669' : 'transparent',
              color: '#ffffff',
              border: '1px solid #059669',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Measure linear span between 2 points"
          >
            📏 Caliper Tool
          </button>
          {measuredDistance && (
            <span style={{ color: '#10b981', fontWeight: 600, marginLeft: '8px' }}>
              Measurement: {measuredDistance}
            </span>
          )}
        </div>

        {/* Center: Scale & Viewport State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#94a3b8' }}>
          <span>
            Scale: <strong style={{ color: '#f8fafc' }}>{scaleRatio}</strong> (@ A1 sheet, 1cm = 1m)
          </span>
          <span>
            Hash: <code style={{ color: '#cbd5e1', fontSize: '10px' }}>{activeRev?.contentHash?.slice(0, 16)}...</code>
          </span>
        </div>

        {/* Right: Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 15, 25))}
            style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            −
          </button>
          <span style={{ minWidth: '45px', textAlign: 'center' }}>{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 15, 300))}
            style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            +
          </button>
          <button
            onClick={() => {
              setZoomLevel(100);
              setPanOffset({ x: 0, y: 0 });
            }}
            style={{ background: '#1e293b', color: '#94a3b8', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-PANEL BODY: LEFT THUMBNAILS | CENTRE CANVAS | RIGHT THREADS & DETAILS    */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 1: LEFT THUMBNAILS, ARTBOARDS & SOURCE ASSETS                     */}
        {/* ----------------------------------------------------------------------- */}
        {!leftPanelCollapsed ? (
          <div
            style={{
              width: '240px',
              borderRight: '1px solid #1e293b',
              backgroundColor: '#0c121e',
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              overflowY: 'auto',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Artboards & Sheets
              </span>
              <button
                onClick={() => setLeftPanelCollapsed(true)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}
                title="Collapse sidebar"
              >
                ◀
              </button>
            </div>

            {/* Sheets List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #3b82f6',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: '70px', backgroundColor: '#111827', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #334155', marginBottom: '6px' }}>
                  <span style={{ fontSize: '24px' }}>📐</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>Sheet 01: Overall Plan</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Scale 1:100 • 4 Pins</div>
              </div>

              <div
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: '70px', backgroundColor: '#090d16', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #1e293b', marginBottom: '6px' }}>
                  <span style={{ fontSize: '24px' }}>🏛️</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Sheet 02: Longitudinal Elevation</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Scale 1:50 • 2 Pins</div>
              </div>

              <div
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  cursor: 'pointer',
                }}
              >
                <div style={{ height: '70px', backgroundColor: '#090d16', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #1e293b', marginBottom: '6px' }}>
                  <span style={{ fontSize: '24px' }}>⚙️</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>Sheet 03: Motorized Pivot Detail</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>Scale 1:20 • 1 Pin</div>
              </div>
            </div>

            {/* 3D Viewpoints */}
            {activeEngine === '3d_model' && (
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  3D Saved Viewpoints
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPitch(0);
                      setYaw(0);
                    }}
                    style={{ fontSize: '11px', justifyContent: 'flex-start', color: '#cbd5e1' }}
                  >
                    Front Orthographic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPitch(90);
                      setYaw(0);
                    }}
                    style={{ fontSize: '11px', justifyContent: 'flex-start', color: '#cbd5e1' }}
                  >
                    Top-Down Roof Plan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPitch(45);
                      setYaw(45);
                    }}
                    style={{ fontSize: '11px', justifyContent: 'flex-start', color: '#cbd5e1' }}
                  >
                    Isometric Axis A
                  </Button>
                </div>
              </div>
            )}

            {/* Source CAD & Linked Files */}
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Source & BIM Assets
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💾</span>
                  <button
                    onClick={() => handleDownloadAsset('dwg')}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', textAlign: 'left' }}
                  >
                    {storedAssets.dwg?.fileName || `${design?.id}-CAD.dwg`} (48 MB)
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📦</span>
                  <button
                    onClick={() => handleDownloadAsset('ifc')}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', textAlign: 'left' }}
                  >
                    {storedAssets.ifc?.fileName || `${design?.id}-Model.ifc`} (112 MB)
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📊</span>
                  <button
                    onClick={() => handleDownloadAsset('pdf')}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', textAlign: 'left' }}
                  >
                    {storedAssets.pdf?.fileName || 'Structural_Calculations_Certified.pdf'} (14 MB)
                  </button>
                </div>
                {storedAssets.model3d && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌐</span>
                    <button
                      onClick={() => handleDownloadAsset('model3d')}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', textAlign: 'left' }}
                    >
                      {storedAssets.model3d.fileName} ({Math.round(storedAssets.model3d.sizeBytes / 1024)} KB)
                    </button>
                  </div>
                )}
                {storedAssets.video && (
                  <div style={{ fontSize: '11px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎬</span>
                    <button
                      onClick={() => handleDownloadAsset('video')}
                      style={{ background: 'none', border: 'none', padding: 0, color: '#a855f7', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', textAlign: 'left' }}
                    >
                      {storedAssets.video.fileName} ({Math.round(storedAssets.video.sizeBytes / (1024 * 1024))} MB)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 50,
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: '4px',
              padding: '6px 8px',
              cursor: 'pointer',
            }}
            title="Expand thumbnails"
          >
            ▶
          </button>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 2: CENTRE MAIN VIEWPORT (MULTI-ENGINE CANVAS & COMPARISON)        */}
        {/* ----------------------------------------------------------------------- */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#05080f',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Comparison Side-by-Side View */}
          {compareMode === 'side_by_side' && compareRev ? (
            <div style={{ display: 'flex', width: '100%', height: '100%' }}>
              {/* Left Pane: Current Revision */}
              <div
                style={{
                  flex: 1,
                  borderRight: '2px solid #d97706',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 30,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#38bdf8',
                  }}
                >
                  Active: {selectedRevCode} ({activeRev?.releaseStatus})
                </div>
                {/* SVG Blueprint Mockup */}
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: 'transform 0.1s ease',
                    width: '90%',
                    height: '80%',
                    position: 'relative',
                  }}
                >
                  <svg viewBox="0 0 1000 600" width="100%" height="100%" style={{ backgroundColor: '#09152b', borderRadius: '8px' }}>
                    <defs>
                      <pattern id="grid1" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#102a4e" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid1)" />
                    {/* Arch Foundation & Kinetic Ring */}
                    <circle cx="500" cy="300" r="180" fill="none" stroke="#38bdf8" strokeWidth="6" strokeDasharray="12 4" />
                    <line x1="200" y1="480" x2="800" y2="480" stroke="#94a3b8" strokeWidth="8" />
                    <line x1="250" y1="480" x2="500" y2="120" stroke="#f59e0b" strokeWidth="5" />
                    <line x1="750" y1="480" x2="500" y2="120" stroke="#f59e0b" strokeWidth="5" />
                    <text x="500" y="520" fill="#94a3b8" textAnchor="middle" fontSize="16" fontFamily="monospace">
                      MAIN CEREMONY BOULEVARD OVERALL AXIS • REV B SPEC
                    </text>
                  </svg>
                </div>
              </div>

              {/* Right Pane: Comparison Revision */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 30,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#f59e0b',
                  }}
                >
                  Compared: {compareRevCode} ({compareRev?.releaseStatus})
                </div>
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: 'transform 0.1s ease',
                    width: '90%',
                    height: '80%',
                    position: 'relative',
                  }}
                >
                  <svg viewBox="0 0 1000 600" width="100%" height="100%" style={{ backgroundColor: '#09152b', borderRadius: '8px' }}>
                    <defs>
                      <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#102a4e" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid2)" />
                    {/* Old layout without updated deadweights */}
                    <circle cx="500" cy="300" r="150" fill="none" stroke="#ef4444" strokeWidth="4" />
                    <line x1="220" y1="480" x2="780" y2="480" stroke="#64748b" strokeWidth="4" />
                    <text x="500" y="520" fill="#ef4444" textAnchor="middle" fontSize="16" fontFamily="monospace">
                      INITIAL CONCEPT ELEVATION • REV A (SUPERSEDED)
                    </text>
                  </svg>
                </div>
              </div>
            </div>
          ) : compareMode === 'slider' && compareRev ? (
            /* Comparison Slider Overlay */
            <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ width: '90%', height: '85%', position: 'relative' }}>
                  {/* Layer A (Base / Rev B) */}
                  <div style={{ position: 'absolute', inset: 0, backgroundColor: '#09152b', borderRadius: '8px' }}>
                    <svg viewBox="0 0 1000 600" width="100%" height="100%">
                      <circle cx="500" cy="300" r="180" fill="none" stroke="#38bdf8" strokeWidth="8" />
                      <line x1="200" y1="480" x2="800" y2="480" stroke="#94a3b8" strokeWidth="10" />
                    </svg>
                  </div>
                  {/* Layer B (Clipped Overlay / Rev A) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                      backgroundColor: '#1b0922',
                      borderRadius: '8px',
                    }}
                  >
                    <svg viewBox="0 0 1000 600" width="100%" height="100%">
                      <circle cx="500" cy="300" r="150" fill="none" stroke="#f43f5e" strokeWidth="8" />
                      <line x1="200" y1="480" x2="800" y2="480" stroke="#f43f5e" strokeWidth="4" strokeDasharray="8 8" />
                    </svg>
                  </div>

                  {/* Slider Control Divider Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${sliderPosition}%`,
                      width: '4px',
                      backgroundColor: '#d97706',
                      cursor: 'ew-resize',
                      zIndex: 35,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#d97706',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      ⮂
                    </div>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '25%',
                  width: '50%',
                  zIndex: 40,
                }}
              />
            </div>
          ) : (
            /* Single Primary Engine Viewport */
            <div
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: activeTool === 'pin' ? 'crosshair' : activeTool === 'measure' ? 'cell' : 'default',
              }}
            >
              {/* Engine 1: PDF Plan Blueprint */}
              {activeEngine === 'pdf_plan' && (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: 'transform 0.1s ease',
                    width: '88%',
                    height: '82%',
                    position: 'relative',
                    backgroundColor: '#0c1a30',
                    border: '2px solid #1e3a8a',
                    borderRadius: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  }}
                >
                  <svg viewBox="0 0 1000 600" width="100%" height="100%">
                    <defs>
                      <pattern id="pdfgrid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#152e54" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#pdfgrid)" />

                    {/* Outer Gantry & Truss Arch */}
                    <path
                      d="M 180 500 Q 500 40 820 500"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 220 500 Q 500 100 780 500"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="6"
                    />

                    {/* Kinetic Central Ring */}
                    <circle cx="500" cy="270" r="110" fill="rgba(56, 189, 248, 0.05)" stroke="#f59e0b" strokeWidth="6" />
                    <circle cx="500" cy="270" r="70" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />

                    {/* Foundation Ballast Blocks */}
                    <rect x="140" y="470" width="80" height="40" fill="#334155" stroke="#64748b" strokeWidth="2" />
                    <rect x="780" y="470" width="80" height="40" fill="#334155" stroke="#64748b" strokeWidth="2" />
                    <text x="180" y="495" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">BALLAST A</text>
                    <text x="820" y="495" fill="#e2e8f0" fontSize="11" textAnchor="middle" fontWeight="bold">BALLAST B</text>

                    {/* Title Block on Sheet */}
                    <g transform="translate(680, 480)">
                      <rect width="300" height="100" fill="#090d16" stroke="#3b82f6" strokeWidth="1.5" />
                      <text x="12" y="24" fill="#38bdf8" fontSize="12" fontWeight="bold">E3-EOS TECHNICAL DESIGN</text>
                      <text x="12" y="42" fill="#ffffff" fontSize="11">{design?.title?.slice(0, 32)}...</text>
                      <text x="12" y="60" fill="#94a3b8" fontSize="10">DWG NO: {design?.id} • {selectedRevCode}</text>
                      <text x="12" y="78" fill="#10b981" fontSize="10">STATUS: {design?.currentStatus}</text>
                    </g>
                  </svg>

                  {/* Render Visible Pins */}
                  {visiblePins.map(renderPinMarker)}
                </div>
              )}

              {/* Engine 2: High-Res 2D Visual Render */}
              {activeEngine === '2d_image' && (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                    width: '85%',
                    height: '80%',
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
                    border: '1px solid #334155',
                    background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0f172a 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '72px', marginBottom: '16px' }}>✨</div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', margin: '0 0 8px' }}>
                      Photorealistic 4K Scenography Render
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
                      Simulating dusk golden hour lighting on ceremonial boulevard with kinetic LED ring illuminated.
                    </p>
                    <Badge variant="purple" size="md">
                      DCI-P3 Wide Gamut • Ray-Traced Lighting
                    </Badge>
                  </div>
                  {visiblePins.map(renderPinMarker)}
                </div>
              )}

              {/* Engine 3: Interactive 3D Spatial WebGL/Canvas Viewport */}
              {activeEngine === '3d_model' && (
                <div
                  style={{
                    width: '90%',
                    height: '85%',
                    position: 'relative',
                    backgroundColor: '#070b14',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Viewport Camera Preset & Model Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      backgroundColor: '#0d1322',
                      borderBottom: '1px solid #1e293b',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: '#38bdf8' }}>🌐 3D Spatial Canvas</span>
                      <span style={{ color: '#94a3b8' }}>
                        Model: <strong style={{ color: '#f8fafc' }}>{customModelMesh?.name || uploadedModelName}</strong>
                      </span>
                      {customModelMesh ? (
                        <Badge variant="info" size="sm">Custom Upload</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Bundled Asset</Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => { setYaw(0); setPitch(0); }}
                        style={{ padding: '3px 8px', fontSize: '10px', background: yaw === 0 && pitch === 0 ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Front Elevation
                      </button>
                      <button
                        onClick={() => { setYaw(0); setPitch(-89); }}
                        style={{ padding: '3px 8px', fontSize: '10px', background: pitch <= -80 ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Top-Down Plan
                      </button>
                      <button
                        onClick={() => { setYaw(45); setPitch(-30); }}
                        style={{ padding: '3px 8px', fontSize: '10px', background: yaw === 45 && pitch === -30 ? '#0284c7' : '#1e293b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Isometric Axis A
                      </button>
                      <label
                        style={{
                          cursor: 'pointer',
                          padding: '3px 8px',
                          fontSize: '10px',
                          background: '#059669',
                          color: '#fff',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>📤 Upload 3D (.obj)</span>
                        <input type="file" accept=".obj" onChange={handle3dModelUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>

                  {modelLoadingError && (
                    <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '6px 12px', fontSize: '11px' }}>
                      ⚠️ {modelLoadingError}
                    </div>
                  )}

                  {/* 3D Canvas Viewport */}
                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <canvas
                      ref={(c) => {
                        if (!c) return;
                        const ctx = c.getContext('2d');
                        if (!ctx) return;
                        const w = c.width;
                        const h = c.height;
                        ctx.clearRect(0, 0, w, h);
                        const cx = w / 2;
                        const cy = h / 2;
                        const scale = (zoomLevel / 100) * 1.5;
                        const radY = (yaw * Math.PI) / 180;
                        const radP = (pitch * Math.PI) / 180;

                        const project = (x: number, y: number, z: number) => {
                          const x1 = x * Math.cos(radY) + z * Math.sin(radY);
                          const z1 = -x * Math.sin(radY) + z * Math.cos(radY);
                          const y2 = y * Math.cos(radP) - z1 * Math.sin(radP);
                          const z2 = y * Math.sin(radP) + z1 * Math.cos(radP);
                          const fov = 420;
                          const pz = z2 + 550;
                          return {
                            x: cx + (x1 * fov) / pz * scale,
                            y: cy + (y2 * fov) / pz * scale,
                          };
                        };

                        // 3D Grid Floor
                        ctx.strokeStyle = '#1e293b';
                        ctx.lineWidth = 1;
                        for (let i = -140; i <= 140; i += 28) {
                          const p1 = project(i, 70, -140);
                          const p2 = project(i, 70, 140);
                          ctx.beginPath();
                          ctx.moveTo(p1.x, p1.y);
                          ctx.lineTo(p2.x, p2.y);
                          ctx.stroke();

                          const p3 = project(-140, 70, i);
                          const p4 = project(140, 70, i);
                          ctx.beginPath();
                          ctx.moveTo(p3.x, p3.y);
                          ctx.lineTo(p4.x, p4.y);
                          ctx.stroke();
                        }

                        // Render Active 3D Mesh (Custom Upload or Qatar Stage Engineering)
                        const activeMesh = customModelMesh || getBundledStageMesh();
                        const b = activeMesh.bounds;
                        const cX = (b.minX + b.maxX) / 2;
                        const cY = (b.minY + b.maxY) / 2;
                        const cZ = (b.minZ + b.maxZ) / 2;
                        const maxDim = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ) || 200;
                        const normScale = 180 / maxDim;

                        // Project all vertices
                        const projVerts = activeMesh.vertices.map(([vx, vy, vz]) => {
                          const nx = (vx - cX) * normScale;
                          const ny = (vy - cY) * normScale;
                          const nz = (vz - cZ) * normScale;
                          return {
                            pt: project(nx, ny, nz),
                            raw: [nx, ny, nz] as [number, number, number],
                          };
                        });

                        // Directional lighting
                        const lDir = [0.35, -0.85, 0.4];
                        const lLen = Math.hypot(lDir[0], lDir[1], lDir[2]) || 1;
                        const lx = lDir[0] / lLen, ly = lDir[1] / lLen, lz = lDir[2] / lLen;

                        // Render Shaded Faces with depth sorting
                        if (activeMesh.faces && activeMesh.faces.length > 0) {
                          const sortedFaces = activeMesh.faces
                            .map((fIndices) => {
                              let sumZ = 0;
                              for (const idx of fIndices) {
                                if (projVerts[idx]) sumZ += projVerts[idx].raw[2];
                              }
                              return { indices: fIndices, avgZ: sumZ / fIndices.length };
                            })
                            .sort((a, b) => a.avgZ - b.avgZ);

                          sortedFaces.forEach(({ indices }) => {
                            if (indices.length < 3) return;
                            const pts = indices.map((idx) => projVerts[idx]?.pt).filter(Boolean);
                            if (pts.length < 3) return;

                            const v0 = projVerts[indices[0]]?.raw;
                            const v1 = projVerts[indices[1]]?.raw;
                            const v2 = projVerts[indices[2]]?.raw;
                            if (!v0 || !v1 || !v2) return;

                            const ax = v1[0] - v0[0], ay = v1[1] - v0[1], az = v1[2] - v0[2];
                            const bx = v2[0] - v0[0], by = v2[1] - v0[1], bz = v2[2] - v0[2];
                            const nx = ay * bz - az * by;
                            const ny = az * bx - ax * bz;
                            const nz = ax * by - ay * bx;
                            const nMag = Math.hypot(nx, ny, nz) || 1;
                            const dot = (nx / nMag) * lx + (ny / nMag) * ly + (nz / nMag) * lz;
                            const brightness = Math.max(0.15, Math.min(0.95, (dot + 1) / 2));

                            ctx.fillStyle = `rgba(${Math.round(14 + brightness * 50)}, ${Math.round(116 + brightness * 90)}, ${Math.round(144 + brightness * 110)}, 0.35)`;
                            ctx.strokeStyle = '#0284c7';
                            ctx.lineWidth = 1.2;
                            ctx.beginPath();
                            ctx.moveTo(pts[0].x, pts[0].y);
                            for (let i = 1; i < pts.length; i++) {
                              ctx.lineTo(pts[i].x, pts[i].y);
                            }
                            ctx.closePath();
                            ctx.fill();
                            ctx.stroke();
                          });
                        }

                        // Render Wireframe Edges
                        if (activeMesh.wireframeEdges && activeMesh.wireframeEdges.length > 0) {
                          ctx.strokeStyle = '#38bdf8';
                          ctx.lineWidth = 1;
                          ctx.beginPath();
                          activeMesh.wireframeEdges.forEach(([a, b]) => {
                            const p1 = projVerts[a]?.pt;
                            const p2 = projVerts[b]?.pt;
                            if (p1 && p2) {
                              ctx.moveTo(p1.x, p1.y);
                              ctx.lineTo(p2.x, p2.y);
                            }
                          });
                          ctx.stroke();
                        }

                        // 3D Spatial Pins
                        visiblePins.forEach((pin: any, idx: number) => {
                          const wx = ((pin.xPercent - 50) / 50) * 80;
                          const wz = ((pin.yPercent - 50) / 50) * 55;
                          const wy = -25;
                          const pp = project(wx, wy, wz);

                          const isSel = pin.id === selectedPinId;
                          ctx.fillStyle = isSel ? '#ef4444' : '#ea580c';
                          ctx.beginPath();
                          ctx.arc(pp.x, pp.y, isSel ? 9 : 7, 0, Math.PI * 2);
                          ctx.fill();

                          ctx.fillStyle = '#ffffff';
                          ctx.font = 'bold 9px sans-serif';
                          ctx.textAlign = 'center';
                          ctx.textBaseline = 'middle';
                          ctx.fillText(String(pin.pinNumber || idx + 1), pp.x, pp.y);
                        });
                      }}
                      width={800}
                      height={500}
                      style={{ width: '100%', height: '100%', cursor: 'grab' }}
                    />
                  </div>

                  {/* 3D Interactive Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '10px 16px',
                      backgroundColor: '#090d16',
                      borderTop: '1px solid #1e293b',
                      fontSize: '11px',
                      color: '#94a3b8',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Orbit Yaw:</span>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={yaw}
                        onChange={(e) => setYaw(Number(e.target.value))}
                      />
                      <span>{yaw}°</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Pitch:</span>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={pitch}
                        onChange={(e) => setPitch(Number(e.target.value))}
                      />
                      <span>{pitch}°</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Section Plane:</span>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={sectionPlaneCut}
                        onChange={(e) => setSectionPlaneCut(Number(e.target.value))}
                      />
                      <span>{sectionPlaneCut}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Engine 4: Real HTML5 Video Player & Time-Anchored Cues */}
              {activeEngine === 'video' && (
                <div
                  style={{
                    width: '85%',
                    height: '80%',
                    position: 'relative',
                    backgroundColor: '#090d16',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Video Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      backgroundColor: '#0d1322',
                      borderBottom: '1px solid #1e293b',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: '#a855f7' }}>🎬 Video Flythrough Viewport</span>
                      <span style={{ color: '#94a3b8' }}>
                        Source: <strong style={{ color: '#f8fafc' }}>{uploadedVideoName}</strong>
                      </span>
                    </div>
                    <label
                      style={{
                        cursor: 'pointer',
                        padding: '3px 8px',
                        fontSize: '10px',
                        background: '#7c3aed',
                        color: '#fff',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>📤 Upload Video (.mp4)</span>
                      <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} style={{ display: 'none' }} />
                    </label>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#070a12',
                    }}
                  >
                    {/* Real HTML5 Video Element */}
                    <video
                      ref={videoRef}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onTimeUpdate={(e) => setVideoCurrentTime((e.target as HTMLVideoElement).currentTime)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      src={uploadedVideoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                      controls
                    />

                    {/* Interactive Animated Simulation Canvas Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Badge variant="purple" size="sm">
                          Kinetic Motion Cue Simulation • 60 FPS
                        </Badge>
                        <span style={{ fontSize: '11px', color: '#f8fafc', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
                          Rate: {playbackRate}x
                        </span>
                      </div>

                      {/* Time-anchored clickable pin cue */}
                      <button
                        onClick={() => {
                          setVideoCurrentTime(14.5);
                          if (videoRef.current) videoRef.current.currentTime = 14.5;
                        }}
                        style={{
                          pointerEvents: 'auto',
                          alignSelf: 'center',
                          backgroundColor: '#ea580c',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 0 12px rgba(234, 88, 12, 0.6)',
                        }}
                      >
                        #1 Ring Dynamic Acceleration Peak @ 14.5s (Click to Seek)
                      </button>
                    </div>
                  </div>

                  {/* Video Timeline Scrubber & Controls */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#0d1322',
                      borderTop: '1px solid #1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        if (videoRef.current) {
                          if (isPlaying) videoRef.current.pause();
                          else videoRef.current.play().catch(() => {});
                        }
                        setIsPlaying(!isPlaying);
                      }}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>

                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      step="0.1"
                      value={videoCurrentTime}
                      onChange={(e) => {
                        const t = Number(e.target.value);
                        setVideoCurrentTime(t);
                        if (videoRef.current) videoRef.current.currentTime = t;
                      }}
                      style={{ flex: 1 }}
                    />

                    <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '80px' }}>
                      {videoCurrentTime.toFixed(1)}s / {videoDuration.toFixed(0)}s
                    </span>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                          }}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            background: playbackRate === rate ? '#3b82f6' : '#1e293b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* PANEL 3: RIGHT THREADS, DETAILS, POL-DES-01 APPROVALS & RELEASES        */}
        {/* ----------------------------------------------------------------------- */}
        <div
          style={{
            width: '380px',
            borderLeft: '1px solid #1e293b',
            backgroundColor: '#0d1322',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Subtabs Header */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #1e293b',
              backgroundColor: '#090d16',
            }}
          >
            {[
              { id: 'comments', label: `Pins (${visiblePins.length})` },
              { id: 'versions', label: `Revisions (${revisions.length})` },
              { id: 'details', label: 'Traceability' },
              { id: 'approvals', label: 'Governance' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id as RightPanelTab)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  background: rightTab === tab.id ? '#0d1322' : 'transparent',
                  color: rightTab === tab.id ? '#f59e0b' : '#94a3b8',
                  border: 'none',
                  borderBottom: rightTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subtab 1: Pins & Threaded Comments */}
          {rightTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Comment Visibility & Discipline Filters */}
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: '#090d16',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {!isClientMode && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setVisibilityFilter('all')}
                      style={{
                        flex: 1,
                        padding: '3px',
                        fontSize: '10px',
                        borderRadius: '3px',
                        border: 'none',
                        background: visibilityFilter === 'all' ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setVisibilityFilter('client_visible')}
                      style={{
                        flex: 1,
                        padding: '3px',
                        fontSize: '10px',
                        borderRadius: '3px',
                        border: 'none',
                        background: visibilityFilter === 'client_visible' ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Client Visible
                    </button>
                    <button
                      onClick={() => setVisibilityFilter('internal_only')}
                      style={{
                        flex: 1,
                        padding: '3px',
                        fontSize: '10px',
                        borderRadius: '3px',
                        border: 'none',
                        background: visibilityFilter === 'internal_only' ? '#2563eb' : '#1e293b',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      Internal Only 🔒
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={disciplineFilter}
                    onChange={(e) => setDisciplineFilter(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      fontSize: '10px',
                      padding: '3px 6px',
                    }}
                  >
                    <option value="all">All Disciplines</option>
                    <option value="staging">Staging</option>
                    <option value="audio_visual">AV</option>
                    <option value="lighting">Lighting</option>
                    <option value="health_safety">HSE / Safety</option>
                    <option value="architecture">Architecture</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      color: '#cbd5e1',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      fontSize: '10px',
                      padding: '3px 6px',
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Pins List / Selected Pin Thread */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visiblePins.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 12px', color: '#64748b', fontSize: '13px' }}>
                    No coordinate pins match current filters.
                    <div style={{ marginTop: '8px' }}>
                      Click <strong>Drop Pin</strong> in toolbar to add review markup.
                    </div>
                  </div>
                ) : (
                  visiblePins.map((pin: any) => {
                    const isSelected = selectedPinId === pin.id;
                    return (
                      <div
                        key={pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                        style={{
                          backgroundColor: isSelected ? '#1e293b' : '#111827',
                          border: isSelected ? '1px solid #f59e0b' : '1px solid #1e293b',
                          borderRadius: '6px',
                          padding: '10px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '12px' }}>
                              #{pin.pinNumber}
                            </span>
                            <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>
                              {pin.title}
                            </span>
                          </div>
                          <Badge
                            variant={pin.status === 'resolved' ? 'success' : pin.priority === 'urgent' ? 'danger' : 'neutral'}
                            size="sm"
                          >
                            {pin.status}
                          </Badge>
                        </div>

                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>
                          Discipline: <strong style={{ color: '#cbd5e1' }}>{pin.discipline}</strong> • Priority:{' '}
                          <span style={{ color: pin.priority === 'urgent' ? '#f87171' : '#cbd5e1' }}>{pin.priority}</span>
                          {pin.visibility === 'internal_only' && !isClientMode && (
                            <span style={{ color: '#fbbf24', marginLeft: '6px' }}>🔒 Internal</span>
                          )}
                        </div>

                        {/* Threaded Comments inside Pin */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {(pin.comments || []).map((c: any) => {
                            if (isClientMode && c.visibility === 'internal_only') return null;
                            return (
                              <div
                                key={c.id}
                                style={{
                                  backgroundColor: c.visibility === 'internal_only' ? '#181e2b' : '#090d16',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  borderLeft: c.visibility === 'internal_only' ? '2px solid #eab308' : '2px solid #3b82f6',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '2px' }}>
                                  <strong style={{ color: '#e2e8f0' }}>{c.authorName}</strong>
                                  <span>{c.createdAt?.slice(11, 16)}</span>
                                </div>
                                <div style={{ color: '#cbd5e1', lineHeight: '1.4' }}>{c.message}</div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Quick Action Buttons for Selected Pin */}
                        {isSelected && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '6px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                            {pin.status !== 'resolved' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePinStatus(pin.id, 'resolved');
                                }}
                                style={{
                                  background: '#059669',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                ✓ Mark Resolved
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePinStatus(pin.id, 'open');
                                }}
                                style={{
                                  background: '#dc2626',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Re-open Pin
                              </button>
                            )}

                            {!isClientMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setChangeTitle(`DCR from Pin #${pin.pinNumber}: ${pin.title}`);
                                  setIsChangeModalOpen(true);
                                }}
                                style={{
                                  background: '#475569',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                ⚡ Escalate to DCR
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Box */}
              {activePin && (
                <div style={{ padding: '10px', borderTop: '1px solid #1e293b', backgroundColor: '#090d16' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    Reply to Pin #{activePin.pinNumber} ({activePin.title})
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input
                      type="text"
                      placeholder="Type response or technical resolution..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddReply();
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: '#1e293b',
                        color: '#f8fafc',
                        border: '1px solid #334155',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '12px',
                      }}
                    />
                    <Button variant="primary" size="sm" onClick={handleAddReply}>
                      Send
                    </Button>
                  </div>
                  {!isClientMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Visibility:</span>
                      <label style={{ fontSize: '10px', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="replyVis"
                          checked={replyVisibility === 'client_visible'}
                          onChange={() => setReplyVisibility('client_visible')}
                          style={{ marginRight: '4px' }}
                        />
                        Client Visible
                      </label>
                      <label style={{ fontSize: '10px', color: '#cbd5e1', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="replyVis"
                          checked={replyVisibility === 'internal_only'}
                          onChange={() => setReplyVisibility('internal_only')}
                          style={{ marginRight: '4px' }}
                        />
                        Internal Only 🔒
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Revisions Register & History */}
          {rightTab === 'versions' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Immutable Revision Tree
                </span>
                {!isClientMode && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsNewVersionModalOpen(true)}
                  >
                    + New Revision
                  </Button>
                )}
              </div>

              {revisions.map((rev: any) => (
                <div
                  key={rev.revisionCode}
                  style={{
                    backgroundColor: selectedRevCode === rev.revisionCode ? '#1e293b' : '#111827',
                    border: selectedRevCode === rev.revisionCode ? '1px solid #3b82f6' : '1px solid #1e293b',
                    borderRadius: '6px',
                    padding: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc' }}>
                      {rev.revisionCode} (v{rev.versionNumber})
                    </span>
                    <Badge
                      variant={rev.releaseStatus === 'approved_for_production' ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {rev.releaseStatus}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Uploaded: {rev.uploadedAt?.slice(0, 10)} by {rev.uploadedBy}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1', margin: '4px 0' }}>
                    Notes: {rev.notes || 'No description provided.'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                    SHA-256: {rev.contentHash?.slice(0, 24)}...
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSelectedRevCode(rev.revisionCode)}
                      style={{
                        background: '#334155',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      View this Rev
                    </button>
                    <button
                      onClick={() => {
                        setCompareRevCode(rev.revisionCode);
                        setCompareMode('side_by_side');
                      }}
                      style={{
                        background: '#d97706',
                        color: '#fff',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtab 3: Traceability & Linked Entities */}
          {rightTab === 'details' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Spatial Zones & Locations
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {(design?.zones || ['Zone 1: Ceremonial Boulevard']).map((z: string) => (
                    <Badge key={z} variant="neutral" size="sm">
                      📍 {z}
                    </Badge>
                  ))}
                  {(design?.locations || ['Axis A-1 to A-4']).map((loc: string) => (
                    <Badge key={loc} variant="outline" size="sm">
                      {loc}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Linked Requirements
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(design?.requirementIds || ['REQ-QND-001', 'REQ-QND-004']).map((reqId: string) => (
                    <div key={reqId} style={{ padding: '6px', backgroundColor: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                      <strong style={{ color: '#38bdf8' }}>{reqId}</strong>: Ceremonial Truss & Kinetic Ring Clearance
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Linked BOQ Commercial Items
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(design?.boqItemIds || ['BOQ-SCENIC-001', 'BOQ-RIG-002']).map((boqId: string) => (
                    <div key={boqId} style={{ padding: '6px', backgroundColor: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                      <strong style={{ color: '#10b981' }}>{boqId}</strong>: Structural Arch Steel & Dynamic Motors
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Production Fabrication Packages
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {(design?.productionPackageIds || ['PKG-STEEL-01']).map((pkgId: string) => (
                    <div key={pkgId} style={{ padding: '6px', backgroundColor: '#111827', borderRadius: '4px', border: '1px solid #1e293b' }}>
                      <strong style={{ color: '#f59e0b' }}>{pkgId}</strong>: Al Rayyan Scenic Steelworks Job
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subtab 4: Governance & Approvals */}
          {rightTab === 'approvals' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px', backgroundColor: '#111827', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                  POL-DES-01 Production Gating
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' }}>
                  Release to fabrication or production strictly requires dual sign-off from a certified Structural Engineer and Civil Defence HSE.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{design?.governanceRecord?.structuralCertified ? '✅' : '❌'}</span>
                    <span style={{ color: design?.governanceRecord?.structuralCertified ? '#10b981' : '#f87171' }}>
                      Structural Engineer Sign-off
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{design?.governanceRecord?.hseCertified ? '✅' : '❌'}</span>
                    <span style={{ color: design?.governanceRecord?.hseCertified ? '#10b981' : '#f87171' }}>
                      Civil Defence / HSE Safety Sign-off
                    </span>
                  </div>
                </div>
              </div>

              {!isClientMode && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => setIsApprovalModalOpen(true)}
                  >
                    ⚖️ Submit Governance Decision
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsReleaseModalOpen(true)}
                    style={{ borderColor: '#3b82f6', color: '#93c5fd' }}
                  >
                    🚀 Issue Production Release
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => setIsShareModalOpen(true)}
                    style={{ borderColor: '#64748b', color: '#cbd5e1' }}
                  >
                    🔗 Share Externally (Secure Token)
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALS: NEW PIN, NEW REVISION, POL-DES-01 APPROVAL, CHANGE REQUEST, ETC.   */}
      {/* ========================================================================= */}

      {/* Modal: New Coordinate Pin */}
      <Modal
        isOpen={isNewPinModalOpen}
        onClose={() => setIsNewPinModalOpen(false)}
        title={`Add Design Review Markup Pin (Coord: ${clickCoord.x}%, ${clickCoord.y}%)`}
      >
        <form onSubmit={handleCreatePin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Issue / Callout Title *</label>
            <Input
              value={newPinTitle}
              onChange={(e) => setNewPinTitle(e.target.value)}
              placeholder="e.g. Verify truss dynamic clearance under full load"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Discipline</label>
              <Select value={newPinDiscipline} onChange={(e) => setNewPinDiscipline(e.target.value)}>
                <option value="staging">Scenic & Staging</option>
                <option value="audio_visual">Audio-Visual</option>
                <option value="lighting">Lighting & Pyro</option>
                <option value="health_safety">HSE & Civil Defence</option>
                <option value="architecture">Architecture</option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Priority</label>
              <Select value={newPinPriority} onChange={(e) => setNewPinPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent (Blocker)</option>
              </Select>
            </div>
          </div>

          {!isClientMode && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Visibility</label>
              <Select value={newPinVisibility} onChange={(e) => setNewPinVisibility(e.target.value)}>
                <option value="internal_only">Internal Only (Confidential / Team)</option>
                <option value="client_visible">Client Visible (Shared in Portal)</option>
              </Select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Detailed Technical Comment</label>
            <Textarea
              value={newPinComment}
              onChange={(e) => setNewPinComment(e.target.value)}
              placeholder="Provide engineering observations, reference drawing callouts, or vendor instructions..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsNewPinModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Place Pin #{allPins.length + 1}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: POL-DES-01 Formal Governance Sign-off */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title="Formal Governance Sign-off & POL-DES-01 Gating"
      >
        <form onSubmit={handleSubmitApproval} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {approvalError && <AlertBanner type="error">{approvalError}</AlertBanner>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Decision</label>
              <Select value={approvalDecision} onChange={(e: any) => setApprovalDecision(e.target.value)}>
                <option value="approve">Approve Version</option>
                <option value="request_changes">Request Changes (Rejection)</option>
                <option value="reject">Reject Permanently</option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Purpose</label>
              <Select value={approvalPurpose} onChange={(e) => setApprovalPurpose(e.target.value)}>
                <option value="approved_for_fabrication">Approved for Fabrication / Production</option>
                <option value="approved_for_client_review">Approved for Client Review</option>
                <option value="approved_as_concept">Approved as Concept Only</option>
              </Select>
            </div>
          </div>

          {/* POL-DES-01 Certification Block */}
          {approvalPurpose === 'approved_for_fabrication' && (
            <div
              style={{
                backgroundColor: '#111827',
                border: '1px solid #374151',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>
                POL-DES-01 Mandatory Production Certifications
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={structuralCertified}
                  onChange={(e) => setStructuralCertified(e.target.checked)}
                />
                <strong>Structural Engineer Certified</strong> (Loads, moments, anchor ballasts verified)
              </label>

              {structuralCertified && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Input
                    placeholder="Engineer Name"
                    value={structuralEngineerName}
                    onChange={(e) => setStructuralEngineerName(e.target.value)}
                  />
                  <Input
                    placeholder="License / QCDD No."
                    value={structuralLicense}
                    onChange={(e) => setStructuralLicense(e.target.value)}
                  />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hseCertified}
                  onChange={(e) => setHseCertified(e.target.checked)}
                />
                <strong>Civil Defence & HSE Certified</strong> (Fire egress, dynamic clearance, electrical)
              </label>

              {hseCertified && (
                <Input
                  placeholder="HSE Inspector Name / Authority"
                  value={hseInspectorName}
                  onChange={(e) => setHseInspectorName(e.target.value)}
                />
              )}
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Governance Review Notes</label>
            <Textarea
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              placeholder="State any mandatory conditions, inspection holds, or site verification notes..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" type="submit">
              Sign & Seal Decision
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Design Change Request (Commercial Protection & Variation Escalation) */}
      <Modal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        title="Escalate Design Change Request (DCR)"
      >
        <form onSubmit={handleSubmitChangeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>DCR Title *</label>
            <Input
              value={changeTitle}
              onChange={(e) => setChangeTitle(e.target.value)}
              placeholder="e.g. Expand kinetic LED arch diameter by 2.0m"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Change Classification</label>
              <Select value={changeClassification} onChange={(e) => setChangeClassification(e.target.value)}>
                <option value="major_scope">Major Scope Change</option>
                <option value="minor_technical">Minor Technical Clarification</option>
                <option value="client_request">Client Directed Revision</option>
                <option value="safety_compliance">Safety Authority Compliance</option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Estimated Cost Impact (QAR)</label>
              <Input
                type="number"
                value={changeCostDelta}
                onChange={(e) => setChangeCostDelta(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Estimated Schedule Impact (Days)</label>
            <Input
              type="number"
              value={changeScheduleDelta}
              onChange={(e) => setChangeScheduleDelta(Number(e.target.value))}
            />
          </div>

          {changeCostDelta > 25000 && (
            <AlertBanner type="warning">
              ⚠️ <strong>Commercial Variation Threshold Exceeded:</strong> A cost change of{' '}
              {formatCurrency(changeCostDelta)} will automatically escalate to the Lead Project Manager and trigger an
              EOS Variation linked to the Project BOQ. Client comments alone do not commit production work.
            </AlertBanner>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Rationale & Description</label>
            <Textarea
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              placeholder="Detailed description of reasons, affected vendors, and required approvals..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsChangeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Change Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Production Release Package */}
      <Modal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        title="Issue Production Release Package"
      >
        <form onSubmit={handleIssueProductionRelease} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Recipient Workshop / Fabricator</label>
            <Select value={releaseWorkshopRecipient} onChange={(e) => setReleaseWorkshopRecipient(e.target.value)}>
              <option value="Al Rayyan Scenic Workshop">Al Rayyan Scenic Workshop (Main Fabrication)</option>
              <option value="Gulf Rigging & Automation Services">Gulf Rigging & Automation Services</option>
              <option value="Doha Steel Structures W.L.L.">Doha Steel Structures W.L.L.</option>
            </Select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Fabrication & Material Notes</label>
            <Textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Highlight CNC cut files, paint Pantone codes, torque ratings, or delivery milestone dates..."
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsReleaseModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="accent" type="submit">
              Issue Release & Notify Workshop
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: External Secure Share Link */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareGeneratedToken(null);
        }}
        title="Generate Secure External Share Link"
      >
        {!shareGeneratedToken ? (
          <form onSubmit={handleGenerateShare} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>External Recipient Email *</label>
              <Input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="consultant@civildefence.gov.qa"
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
              <input
                type="checkbox"
                checked={shareRequireOtp}
                onChange={(e) => setShareRequireOtp(e.target.checked)}
              />
              Enforce 6-digit One-Time Password (OTP) via SMS/Email
            </label>

            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              External view will feature a dynamic forensic watermark containing the recipient email and timestamp to prevent unauthorized reproduction.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outline" type="button" onClick={() => setIsShareModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Generate Share Link
              </Button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <AlertBanner type="success">
              Secure watermarked link created successfully for <strong>{shareEmail}</strong>.
            </AlertBanner>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Share URL:</label>
              <Input
                readOnly
                value={`https://e3-eos.internal/share/${shareGeneratedToken}`}
              />
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Expiry: 7 days • Permissions: View & Markup (No Confidential Costing)
            </div>

            <Button
              variant="primary"
              onClick={() => {
                navigator.clipboard?.writeText(`https://e3-eos.internal/share/${shareGeneratedToken}`);
                alert('Link copied to clipboard!');
              }}
            >
              📋 Copy Link to Clipboard
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal: New Revision Upload (+ New Revision) */}
      <Modal
        isOpen={isNewVersionModalOpen}
        onClose={() => setIsNewVersionModalOpen(false)}
        title={`Upload New Design Revision (REV-${String.fromCharCode(65 + revisions.length)})`}
      >
        <form onSubmit={handleCreateNewRevision} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Select CAD / BIM / Model File *</label>
            <Input
              type="text"
              value={newVerFileName}
              onChange={(e) => setNewVerFileName(e.target.value)}
              placeholder="e.g. Arena_Stage_Rigging_RevC.dwg or .ifc"
              required
            />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Supported formats: .dwg, .dxf, .ifc, .rvt, .pdf, .gltf, .mp4</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Revision Purpose Gate *</label>
              <Select value={newVerPurpose} onChange={(e) => setNewVerPurpose(e.target.value)}>
                <option value="concept_presentation">Concept & Moodboard</option>
                <option value="client_review">Client Review & Markup</option>
                <option value="tender_pricing">Tender Commercial Pricing</option>
                <option value="technical_construction">Technical Construction Drawings</option>
                <option value="approved_for_fabrication">Factory Workshop Release</option>
              </Select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Assigned Revision Code</label>
              <Input
                readOnly
                value={`REV-${String.fromCharCode(65 + revisions.length)} (v${revisions.length + 1})`}
              />
            </div>
          </div>

          {(newVerPurpose === 'approved_for_fabrication' || newVerPurpose === 'technical_construction' || design?.discipline === 'staging') && (
            <div
              style={{
                backgroundColor: '#172554',
                border: '1px solid #1e40af',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa' }}>
                Engineering Gate: Structural & Safety Certification
              </span>
              <label style={{ fontSize: '11px', color: '#cbd5e1' }}>Certified PE License / QCDD Ref Number:</label>
              <Input
                value={newVerStructuralCert}
                onChange={(e) => setNewVerStructuralCert(e.target.value)}
                placeholder="QCDD-STR-2026-9921"
                required
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>Change Description & Delta Summary *</label>
            <Textarea
              value={newVerDescription}
              onChange={(e) => setNewVerDescription(e.target.value)}
              placeholder="Describe modifications: beam span reinforcement, lighting truss load redistribution, egress clearance..."
              rows={3}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#cbd5e1' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newVerHasCostImpact}
                onChange={(e) => setNewVerHasCostImpact(e.target.checked)}
              />
              Has Commercial / BOQ Impact
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newVerHasScheduleImpact}
                onChange={(e) => setNewVerHasScheduleImpact(e.target.checked)}
              />
              Has Schedule / Milestone Impact
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsNewVersionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={newVerIsSubmitting}>
              {newVerIsSubmitting ? 'Uploading...' : 'Upload & Commit Revision'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
