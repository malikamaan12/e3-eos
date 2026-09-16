import React, { useState, useRef, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, AlertBanner, Card, Input, Textarea, Select, Modal } from '../components/DesignSystem.js';
import { ViewStateRenderer } from '../components/ViewStateRenderer.js';
import { ViewStateFactory } from '../view-states.js';

interface SnagItem {
  id: string;
  title: string;
  location: string;
  trade: string;
  severity: 'critical' | 'moderate' | 'cosmetic';
  photos: string[];
  status: 'open' | 'in_progress' | 'resolved';
  loggedAt: string;
}

interface PodRecord {
  id: string;
  shipmentCode: string;
  carrier: string;
  truckPlate: string;
  itemsCount: number;
  recipientName: string;
  recipientRole: string;
  condition: 'intact' | 'damaged_partial' | 'packaging_damaged';
  signatureTimestamp: string;
  signed: boolean;
}

interface CatalogAsset {
  assetTag: string;
  description: string;
  category: string;
  zone: string;
  status: string;
  assignedTech: string;
  dimensions?: string;
  serialNumber: string;
  lastScanned?: string;
  critical?: boolean;
}

const FIELD_ASSET_CATALOG: Record<string, CatalogAsset> = {
  'AST-SCN-001': {
    assetTag: 'AST-SCN-001',
    description: 'Custom Wooden Registration Counters (120x80cm)',
    category: 'Scenic / Joinery',
    zone: 'DECC Hall 1 - East Foyer',
    status: 'Picked & Staged for Dispatch',
    assignedTech: 'Tariq Mansoor (Scenic Lead)',
    dimensions: '120cm x 80cm x 110cm',
    serialNumber: 'SN-SCN-2026-081',
    critical: false,
  },
  'AST-LGT-002': {
    assetTag: 'AST-LGT-002',
    description: 'Martin Mac Viper Profile Moving Head 1000W',
    category: 'Lighting / FX',
    zone: 'Main Stage Overhead Truss - Sector B',
    status: 'Rigged & Patched',
    assignedTech: 'Zaid Al-Harbi (Master Electrician)',
    dimensions: '47kg Flight Case (x2 Fixtures)',
    serialNumber: 'SN-LGT-MV-9912',
    critical: true,
  },
  'AST-AV-003': {
    assetTag: 'AST-AV-003',
    description: 'Shure Axient Digital Quad Wireless Receiver',
    category: 'Audio / RF',
    zone: 'FOH Audio Control Deck - Hall 1',
    status: 'QC Inspected',
    assignedTech: 'Karim Haddad (RF Engineer)',
    dimensions: '1U Rackmount Unit (G56 Band)',
    serialNumber: 'SN-SHURE-AXD-440',
    critical: true,
  },
  'AST-RIG-004': {
    assetTag: 'AST-RIG-004',
    description: 'Eurotruss HD34 3-Meter Square Truss Section',
    category: 'Rigging / Truss',
    zone: 'Loading Bay 2 - Rigging Staging',
    status: 'Picked & Staged for Dispatch',
    assignedTech: 'Rashid Al-Kuwari (Lead Rigger)',
    dimensions: '290mm x 290mm x 3000mm (EN-1090)',
    serialNumber: 'SN-ET-HD34-300-88',
    critical: true,
  },
  'AST-PWR-005': {
    assetTag: 'AST-PWR-005',
    description: 'Cummins 500kVA Sound-Attenuated Power Generator',
    category: 'Power / Plant',
    zone: 'External Yard - Generator Pad #1',
    status: 'QC Inspected',
    assignedTech: 'Bilal Nasser (Chief Plant Engineer)',
    dimensions: 'ISO 20ft Container Enclosure',
    serialNumber: 'SN-CUMMINS-500-Q3',
    critical: true,
  },
  'BDG-VIP-8821': {
    assetTag: 'BDG-VIP-8821',
    description: 'VIP Ministerial Delegate Security All-Access NFC Badge',
    category: 'Credentials / Security',
    zone: 'Royal Protocol / VIP Lounge 1',
    status: 'QC Inspected',
    assignedTech: 'Protocol Security Office',
    dimensions: 'Encrypted MIFARE DESFire EV3',
    serialNumber: 'SN-VIP-NFC-8821-QA',
    critical: true,
  },
  'TRK-QA-7819': {
    assetTag: 'TRK-QA-7819',
    description: 'Al-Maha Heavy Logistics Semi-Trailer (QA-7819-HV)',
    category: 'Logistics / Fleet',
    zone: 'DECC Cargo Dock Bay 4',
    status: 'In Transit',
    assignedTech: 'Gulf Rapid Dispatch (Driver: Omar Farooq)',
    dimensions: '40ft Curtain-Sider (30 Pallets)',
    serialNumber: 'SN-FLEET-TRK-7819',
    critical: false,
  },
};

const triggerScanAudioBeep = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch {
    // Audio safe fallback
  }
};

const triggerHapticVibrate = () => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([60, 40, 60]);
    } catch {
      // Haptic safe fallback
    }
  }
};

export const FieldOpsView: React.FC = () => {
  const {
    currentLanguage,
    isOffline,
    toggleOffline,
    pendingMutations,
    queueMutation,
    clearPendingMutations,
    syncPendingMutations,
    removePendingMutation,
    clearSyncedMutations,
    projects,
    selectedProjectId,
  } = useEosContext();

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Viewport mode: mobile frame (<480px) vs desktop responsive
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Screen width detection for 390px mobile viewport stacking
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 420;
    }
    return false;
  });

  React.useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth <= 420);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Active mobile tab
  const [mobileTab, setMobileTab] = useState<'pod' | 'snag' | 'scanner' | 'qc' | 'crew' | 'dsr' | 'checklist' | 'queue'>('checklist');

  // 1. Checklist State
  const [checklists, setChecklists] = useState([
    { id: 'chk-01', label: 'Overhead Truss Rigging Torque Check', completed: true, critical: true },
    { id: 'chk-02', label: 'Generator Grounding & Fuel Spill Perimeter', completed: true, critical: true },
    { id: 'chk-03', label: 'Emergency Exit Route Clearance & Signage', completed: false, critical: true },
    { id: 'chk-04', label: 'AV Control Desk Talkback Comms Verification', completed: false, critical: false },
  ]);

  // 2. POD State
  const [podRecords, setPodRecords] = useState<PodRecord[]>([
    {
      id: 'pod-001',
      shipmentCode: 'SHP-DOHA-001',
      carrier: 'Al-Maha Logistics WLL',
      truckPlate: 'QA-7819-HV',
      itemsCount: 30,
      recipientName: 'Omar Farooq',
      recipientRole: 'Site Field Supervisor',
      condition: 'intact',
      signatureTimestamp: '2026-09-12 08:30 AST',
      signed: true,
    },
    {
      id: 'pod-002',
      shipmentCode: 'SHP-DOHA-002',
      carrier: 'Gulf Rapid Freight',
      truckPlate: 'QA-3402-LD',
      itemsCount: 16,
      recipientName: 'Omar Farooq',
      recipientRole: 'Site Field Supervisor',
      condition: 'intact',
      signatureTimestamp: '',
      signed: false,
    },
  ]);
  const [selectedPod, setSelectedPod] = useState<PodRecord>(podRecords[1]);
  const [podRecipient, setPodRecipient] = useState<string>('Omar Farooq');
  const [podRole, setPodRole] = useState<string>('Site Field Supervisor');
  const [podCondition, setPodCondition] = useState<'intact' | 'damaged_partial' | 'packaging_damaged'>('intact');
  const [signatureConfirmed, setSignatureConfirmed] = useState<boolean>(false);

  const isSyntheticDemo = selectedProjectId === 'f1111111-1111-4111-8111-111111111111' || selectedProjectId === '00000000-0000-4000-8000-000000000001';

  // 3. Snag State
  const [snags, setSnags] = useState<SnagItem[]>(() =>
    isSyntheticDemo
      ? [
          {
            id: 'sng-01',
            title: 'Cracked edge banding on Counter #14',
            location: 'Main Hall 1 - East Foyer',
            trade: 'Scenic / Joinery',
            severity: 'moderate',
            photos: ['snag-counter14-edge.jpg', 'snag-counter14-full.jpg'],
            status: 'open',
            loggedAt: '2026-09-12 09:15 AST',
          },
        ]
      : []
  );
  const [snagTitle, setSnagTitle] = useState<string>('');
  const [snagLocation, setSnagLocation] = useState<string>('');
  const [snagTrade, setSnagTrade] = useState<string>('Rigging / AV');
  const [snagSeverity, setSnagSeverity] = useState<'critical' | 'moderate' | 'cosmetic'>('critical');
  const [snagPhotos, setSnagPhotos] = useState<string[]>([]);
  const [newPhotoName, setNewPhotoName] = useState<string>('');

  // 4. Barcode / QR Scanner State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimRef = useRef<number | null>(null);

  const [scannedTag, setScannedTag] = useState<string>('AST-SCN-001');
  const [scanResult, setScanResult] = useState<CatalogAsset | null>(FIELD_ASSET_CATALOG['AST-SCN-001']);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTagInput, setManualTagInput] = useState<string>('');
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<string | null>(null);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Clean up camera stream on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleProcessCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    triggerScanAudioBeep();
    triggerHapticVibrate();

    const found = FIELD_ASSET_CATALOG[cleanCode];
    setScannedTag(cleanCode);

    if (found) {
      setScanResult({
        ...found,
        lastScanned: new Date().toLocaleTimeString(),
      });
      setScanFeedbackMsg(`Recognized: ${found.description}`);
    } else {
      setScanResult({
        assetTag: cleanCode,
        description: `Field Asset / Material Tag (${cleanCode})`,
        category: 'Scenic / Staging',
        zone: 'DECC Hall 1 - Staging Bay',
        status: 'Picked & Staged for Dispatch',
        assignedTech: 'Site Field Supervisor',
        serialNumber: `SN-${cleanCode}`,
        lastScanned: new Date().toLocaleTimeString(),
      });
      setScanFeedbackMsg(`Registered tag: ${cleanCode}`);
    }

    setTimeout(() => setScanFeedbackMsg(null), 3000);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access (getUserMedia) is not supported in this environment.');
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // Continuous barcode detection if BarcodeDetector is supported
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'ean_13', 'code_39', 'data_matrix'],
          });
          const detectLoop = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const rawValue = barcodes[0].rawValue;
                  if (rawValue) {
                    handleProcessCode(rawValue);
                  }
                }
              }
            } catch {
              // Frame dropped safely
            }
            if (streamRef.current) {
              scanAnimRef.current = requestAnimationFrame(detectLoop);
            }
          };
          scanAnimRef.current = requestAnimationFrame(detectLoop);
        } catch {
          // BarcodeDetector setup failure safe
        }
      }
    } catch (err: any) {
      setCameraError(err.message || 'Unable to access device camera. Please check camera permissions.');
      setIsCameraActive(false);
    } finally {
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanAnimRef.current) {
      cancelAnimationFrame(scanAnimRef.current);
      scanAnimRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const switchFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 150);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const nextTorch = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setIsTorchOn(nextTorch);
      } catch {
        alert('Torch/Flashlight is not supported on this device hardware.');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toUpperCase();
    let detectedTag = 'AST-SCN-001';
    if (fileName.includes('LGT') || fileName.includes('VIPER')) detectedTag = 'AST-LGT-002';
    else if (fileName.includes('AV') || fileName.includes('SHURE')) detectedTag = 'AST-AV-003';
    else if (fileName.includes('RIG') || fileName.includes('TRUSS')) detectedTag = 'AST-RIG-004';
    else if (fileName.includes('PWR') || fileName.includes('GEN')) detectedTag = 'AST-PWR-005';
    else if (fileName.includes('VIP') || fileName.includes('BADGE')) detectedTag = 'BDG-VIP-8821';
    else if (fileName.includes('TRK') || fileName.includes('TRUCK')) detectedTag = 'TRK-QA-7819';
    handleProcessCode(detectedTag);
  };

  const handleConfirmPick = (asset: CatalogAsset) => {
    const updated: CatalogAsset = {
      ...asset,
      status: 'Picked & Staged for Dispatch',
      lastScanned: new Date().toLocaleTimeString(),
    };
    setScanResult(updated);
    if (isOffline) {
      queueMutation('confirm_dispatch_pick', 'AssetInventory', {
        assetTag: asset.assetTag,
        zone: asset.zone,
        description: asset.description,
      });
    }
    setScanFeedbackMsg(`Asset ${asset.assetTag} marked as Picked & Staged!`);
    setTimeout(() => setScanFeedbackMsg(null), 3000);
  };

  const handleQuickQcPass = (asset: CatalogAsset) => {
    const updated: CatalogAsset = {
      ...asset,
      status: 'QC Inspected',
      lastScanned: new Date().toLocaleTimeString(),
    };
    setScanResult(updated);
    if (isOffline) {
      queueMutation('qc_inspect_pass', 'QualityControl', {
        assetTag: asset.assetTag,
        inspector: 'Site Field Supervisor',
        zone: asset.zone,
      });
    }
    setScanFeedbackMsg(`Asset ${asset.assetTag} passed Quality Control!`);
    setTimeout(() => setScanFeedbackMsg(null), 3000);
  };

  const handleFlagSnagFromAsset = (asset: CatalogAsset) => {
    setSnagTitle(`Defect identified on ${asset.description} (${asset.assetTag})`);
    setSnagLocation(asset.zone);
    setSnagTrade(asset.category);
    setMobileTab('snag');
  };

  const handleSyncQueue = async () => {
    setIsSyncingQueue(true);
    try {
      const res = await syncPendingMutations();
      setSyncToast({
        message: `Sync finished: ${res.success} mutation(s) synchronized with cloud server.`,
        type: 'success',
      });
    } catch {
      setSyncToast({
        message: 'Sync encountered network errors. Mutations remain safely queued locally.',
        type: 'error',
      });
    } finally {
      setIsSyncingQueue(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // 5. QC Inspection State
  const [qcStatus, setQcStatus] = useState<'pass' | 'fail_quarantine'>('pass');
  const [qcNotes, setQcNotes] = useState<string>('Visual inspection confirmed zero structural defects');

  // 6. Crew Check-in State
  const [crewMember, setCrewMember] = useState<string>('Rashid Al-Kuwari (Lead Rigger)');
  const [crewCheckedIn, setCrewCheckedIn] = useState<boolean>(false);

  // HSE Incident
  const [incidentLogged, setIncidentLogged] = useState(false);

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

  const handleSignPod = () => {
    const updated = {
      ...selectedPod,
      recipientName: podRecipient,
      recipientRole: podRole,
      condition: podCondition,
      signatureTimestamp: new Date().toLocaleString(),
      signed: true,
    };
    setPodRecords((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPod(updated);
    setSignatureConfirmed(true);
    if (isOffline) {
      queueMutation('sign_pod', 'DeliveryPod', { shipmentId: updated.shipmentCode, signature: 'safe-digital-sig' });
    }
  };

  const handleCreateSnag = (e: React.FormEvent) => {
    e.preventDefault();
    const newSnag: SnagItem = {
      id: `sng-${Date.now().toString().slice(-3)}`,
      title: snagTitle,
      location: snagLocation,
      trade: snagTrade,
      severity: snagSeverity,
      photos: snagPhotos,
      status: 'open',
      loggedAt: new Date().toLocaleTimeString(),
    };
    setSnags([newSnag, ...snags]);
    setSnagTitle('');
    if (isOffline) {
      queueMutation('create_snag', 'FieldSnag', newSnag as unknown as Record<string, unknown>);
    }
  };

  const handleAddPhoto = () => {
    if (newPhotoName.trim()) {
      setSnagPhotos([...snagPhotos, newPhotoName.trim()]);
      setNewPhotoName('');
    }
  };

  const handleSimulateScan = (tag: string) => {
    handleProcessCode(tag);
  };

  const viewState = isOffline
    ? ViewStateFactory.offline(
        pendingMutations.length,
        new Date().toISOString(),
        'Field device running offline. Observations queued locally; supervisor inspection required upon reconnect.'
      )
    : ViewStateFactory.ready(checklists);

  return (
    <div data-testid="field-ops-workspace" style={{ maxWidth: isMobileFrame ? '460px' : '1080px', width: '100%', margin: '0 auto', transition: 'max-width 0.3s ease', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {/* Viewport Width Controller Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          borderRadius: '8px 8px 0 0',
          padding: '8px 16px',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📱</span>
          <span style={{ fontWeight: 700 }}>Mobile Field PWA (<span style={{ color: '#38bdf8' }}>{isMobileFrame ? '<480px Viewport' : 'Desktop Viewport'}</span>)</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setIsMobileFrame(true)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isMobileFrame ? '#2563eb' : '#334155',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Mobile Frame
          </button>
          <button
            onClick={() => setIsMobileFrame(false)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: !isMobileFrame ? '#2563eb' : '#334155',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Full Width
          </button>
        </div>
      </div>

      {/* Main Field PWA Frame */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '2px solid #cbd5e1',
          borderRadius: '0 0 12px 12px',
          padding: isNarrowScreen ? '12px' : '16px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {/* Mobile Header */}
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📱</span>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>
                Field Ops PWA (E3 Field Operations Hub)
              </span>
            </div>
            <Badge variant={isOffline ? 'warning' : 'success'}>
              {isOffline ? 'OFFLINE QUEUE' : 'ONLINE LIVE'}
            </Badge>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>{currentProject.title}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{currentProject.projectCode}</span>
          </div>
        </div>

        {/* Quick Network & Safety Action Bar */}
        <div style={{ display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row', gap: '8px', marginBottom: '14px', width: '100%' }}>
          <Button size="md" variant={isOffline ? 'accent' : 'secondary'} onClick={toggleOffline} style={{ flex: 1, fontSize: '12px', minHeight: '44px', width: '100%' }}>
            {isOffline ? '⚡ Sync Offline Queue' : '📶 Simulate Offline'}
          </Button>
          <Button size="md" variant="danger" onClick={handleLogIncident} style={{ flex: 1, fontSize: '12px', minHeight: '44px', width: '100%' }}>
            🚨 HSE Incident
          </Button>
        </div>

        {incidentLogged && (
          <div style={{ marginBottom: '12px' }}>
            <AlertBanner
              type="warning"
              title="HSE Incident Recorded"
              action={{ label: 'Dismiss', onClick: () => setIncidentLogged(false) }}
            >
              Incident stored in internal site log. Client portal view strictly decoupled.
            </AlertBanner>
          </div>
        )}

        {/* Mobile Tab Navigation */}
        <div
          id="field-ops-mobile-tabs"
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '8px',
            marginBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {[
            { id: 'queue', label: '📥 Offline Queue', badge: pendingMutations.filter((m) => m.status === 'pending').length },
            { id: 'pod', label: '✍️ POD Receipt', badge: podRecords.filter(p => !p.signed).length },
            { id: 'snag', label: '📸 Snag & Photo', badge: snags.length },
            { id: 'scanner', label: '📷 QR Scanner', badge: 0 },
            { id: 'qc', label: '🔬 QC Inspect', badge: 0 },
            { id: 'crew', label: '👷 Crew Checkin', badge: 0 },
            { id: 'checklist', label: '📋 Readiness Chk', badge: checklists.filter(c => !c.completed).length },
          ].map((tab) => {
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`mobile-tab-${tab.id}`}
                onClick={() => setMobileTab(tab.id as any)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  backgroundColor: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '44px',
                  flexShrink: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                      color: isActive ? '#ffffff' : '#b91c1c',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 1. WORKFLOW: POD SIGN-OFF (PROOF OF DELIVERY) */}
        {mobileTab === 'pod' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Proof of Delivery (POD) Receipt
                </h3>
                <Badge variant={selectedPod.signed ? 'success' : 'warning'}>
                  {selectedPod.signed ? 'POD SIGNED & SEALED' : 'PENDING SIGN-OFF'}
                </Badge>
              </div>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0' }}>
                Physical freight acceptance at venue dock. Signature establishes custodial transfer.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <Select
                  label="Select Arrived Shipment"
                  value={selectedPod.id}
                  onChange={(e) => {
                    const found = podRecords.find((p) => p.id === e.target.value);
                    if (found) setSelectedPod(found);
                  }}
                  options={podRecords.map((p) => ({
                    value: p.id,
                    label: `${p.shipmentCode} (${p.carrier} - ${p.truckPlate})`,
                  }))}
                />

                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    <div><strong>Carrier:</strong> {selectedPod.carrier}</div>
                    <div><strong>Truck Reg:</strong> {selectedPod.truckPlate}</div>
                    <div><strong>Manifest:</strong> {selectedPod.itemsCount} Items Offloaded</div>
                    <div><strong>Dock Location:</strong> DECC Gate 4 (Bay B)</div>
                  </div>
                </div>

                <Select
                  label="Freight Condition Upon Unloading"
                  value={podCondition}
                  onChange={(e) => setPodCondition(e.target.value as any)}
                  options={[
                    { value: 'intact', label: '✅ Intact / Zero Transit Damage' },
                    { value: 'damaged_partial', label: '⚠️ Partial Damage Noted' },
                    { value: 'packaging_damaged', label: '📦 Outer Crate / Wrap Damaged' },
                  ]}
                />

                <div style={{ display: 'grid', gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  <Input
                    label="Recipient Signatory"
                    value={podRecipient}
                    onChange={(e) => setPodRecipient(e.target.value)}
                  />
                  <Input
                    label="Signatory Role"
                    value={podRole}
                    onChange={(e) => setPodRole(e.target.value)}
                  />
                </div>

                {/* Digital Signature Pad Simulator */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Digital Touch Signature Pad
                  </label>
                  <div
                    style={{
                      border: '2px dashed #94a3b8',
                      borderRadius: '6px',
                      height: '80px',
                      backgroundColor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      position: 'relative',
                    }}
                  >
                    {selectedPod.signed || signatureConfirmed ? (
                      <div style={{ textAlign: 'center', color: '#166534' }}>
                        <div style={{ fontFamily: 'Brush Script MT, cursive', fontSize: '24px', fontWeight: 700 }}>
                          {podRecipient}
                        </div>
                        <div style={{ fontSize: '10px', color: '#15803d' }}>
                          Verified Digital Stamp • {selectedPod.signatureTimestamp || 'Signed Just Now'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        ✍️ Sign Here with Finger / Stylus
                      </span>
                    )}
                  </div>
                </div>

                {!selectedPod.signed && (
                  <Button
                    id="btn-confirm-pod"
                    variant="primary"
                    size="md"
                    onClick={handleSignPod}
                    style={{ width: '100%', marginTop: '4px', fontWeight: 800 }}
                  >
                    ✍️ Confirm & Seal Proof of Delivery (POD)
                  </Button>
                )}

                {selectedPod.signed && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#166534' }}>
                    ✅ <strong>Custodial Transfer Completed:</strong> Goods verified and custody transferred to DECC Site Staging Bay. POD archived into project audit register.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. WORKFLOW: SNAG CREATION WITH PHOTO UPLOAD */}
        {mobileTab === 'snag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Capture Field Snag & Photographic Evidence
              </h3>

              <form onSubmit={handleCreateSnag} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Input
                  label="Snag Description / Defect"
                  value={snagTitle}
                  onChange={(e) => setSnagTitle(e.target.value)}
                  placeholder="e.g. Scuffed paint on panel A-12"
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 1fr', gap: '8px' }}>
                  <Input
                    label="Zone / Location"
                    value={snagLocation}
                    onChange={(e) => setSnagLocation(e.target.value)}
                    placeholder="e.g. Hall 1 - Sector B"
                    required
                  />
                  <Select
                    label="Discipline"
                    value={snagTrade}
                    onChange={(e) => setSnagTrade(e.target.value)}
                    options={[
                      { value: 'Scenic / Joinery', label: 'Scenic / Joinery' },
                      { value: 'Rigging / AV', label: 'Rigging / AV' },
                      { value: 'Lighting / Power', label: 'Lighting / Power' },
                      { value: 'Branding / Vinyl', label: 'Branding / Vinyl' },
                      { value: 'HSE Safety', label: 'HSE Safety' },
                    ]}
                  />
                </div>

                <Select
                  label="Severity Classification"
                  value={snagSeverity}
                  onChange={(e) => setSnagSeverity(e.target.value as any)}
                  options={[
                    { value: 'critical', label: '🔴 Critical Blocker (Opening Blocker)' },
                    { value: 'moderate', label: '🟡 Moderate (Rectify pre-show)' },
                    { value: 'cosmetic', label: '🟢 Cosmetic Defect' },
                  ]}
                />

                {/* Mobile Camera / Photo Upload Simulator */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Attach Site Photos ({snagPhotos.length} Attached)
                  </label>

                  <div style={{ display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row', gap: '6px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      aria-label="New photo file name"
                      value={newPhotoName}
                      onChange={(e) => setNewPhotoName(e.target.value)}
                      placeholder="e.g. photo-dock-counter.jpg"
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '11px',
                        minHeight: '44px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Button type="button" size="sm" variant="secondary" onClick={handleAddPhoto} style={{ minHeight: '44px' }}>
                      📷 Snap Photo
                    </Button>
                  </div>

                  {/* Photo Thumbnails Preview */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {snagPhotos.map((photo, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '10px',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>🖼️</span>
                        <span>{photo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button id="btn-submit-snag" type="submit" variant="primary" size="md" style={{ width: '100%', fontWeight: 800 }}>
                  🚨 Log Field Snag Item
                </Button>
              </form>
            </div>

            {/* List of Recent Snags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                Active Field Snags ({snags.length})
              </div>
              {snags.map((snag) => (
                <div
                  key={snag.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a' }}>{snag.title}</span>
                    <Badge variant={snag.severity === 'critical' ? 'danger' : snag.severity === 'moderate' ? 'warning' : 'neutral'}>
                      {snag.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div style={{ color: '#64748b', marginBottom: '4px' }}>
                    📍 {snag.location} • 🔧 {snag.trade}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {snag.photos.map((p, idx) => (
                      <span key={idx} style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontSize: '9px' }}>
                        📷 {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. WORKFLOW: WAREHOUSE PICKING & QR SCANNER */}
        {mobileTab === 'scanner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  Real-Time Camera Barcode & QR Scanner
                </h3>
                <Badge variant={isCameraActive ? 'success' : 'neutral'}>
                  {isCameraActive ? `LIVE (${facingMode.toUpperCase()})` : 'STANDBY'}
                </Badge>
              </div>

              {/* Feedback toast / message */}
              {scanFeedbackMsg && (
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🔔</span>
                  <span>{scanFeedbackMsg}</span>
                </div>
              )}

              {/* Camera Error / Permission Banner */}
              {cameraError && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    color: '#92400e',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    marginBottom: '10px',
                  }}
                >
                  ⚠️ <strong>Camera Notice:</strong> {cameraError} (You can use the photo upload button or manual tag entry below).
                </div>
              )}

              {/* Viewfinder Viewport */}
              <div
                style={{
                  backgroundColor: '#090d16',
                  borderRadius: '10px',
                  height: '210px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '12px',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                }}
              >
                {/* Real Camera Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{
                    display: isCameraActive ? 'block' : 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Scan Reticle & Laser Beam Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '140px',
                    height: '140px',
                    border: '2px solid #38bdf8',
                    borderRadius: '12px',
                    boxShadow: '0 0 16px rgba(56, 189, 248, 0.4)',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '12px', height: '12px', borderTop: '3px solid #0284c7', borderLeft: '3px solid #0284c7' }} />
                    <div style={{ width: '12px', height: '12px', borderTop: '3px solid #0284c7', borderRight: '3px solid #0284c7' }} />
                  </div>

                  {/* Pulsing Laser Scan Line */}
                  <div
                    style={{
                      height: '2px',
                      backgroundColor: '#ef4444',
                      boxShadow: '0 0 10px #ef4444, 0 0 4px #ffffff',
                      animation: 'scanLaser 2s infinite ease-in-out',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ width: '12px', height: '12px', borderBottom: '3px solid #0284c7', borderLeft: '3px solid #0284c7' }} />
                    <div style={{ width: '12px', height: '12px', borderBottom: '3px solid #0284c7', borderRight: '3px solid #0284c7' }} />
                  </div>
                </div>

                {/* Overlaid status text or start button */}
                {!isCameraActive ? (
                  <div style={{ position: 'absolute', textAlign: 'center', zIndex: 2, padding: '10px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                      Camera standby. Tap below to start live viewfinder.
                    </div>
                    <Button size="sm" variant="primary" onClick={startCamera} style={{ fontSize: '11px' }}>
                      📸 Start Live Camera
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      right: '8px',
                      textAlign: 'center',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '10px',
                      color: '#38bdf8',
                      fontWeight: 600,
                    }}
                  >
                    Align Barcode / QR Code inside reticle
                  </div>
                )}
              </div>

              {/* Hardware Camera Controls Toolbar */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant={isCameraActive ? 'danger' : 'primary'}
                  onClick={toggleCamera}
                  style={{ flex: 1, minHeight: '44px', fontSize: '11px' }}
                >
                  {isCameraActive ? '🔴 Stop Camera' : '📸 Start Camera'}
                </Button>

                {isCameraActive && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={switchFacingMode}
                      style={{ fontSize: '11px', minHeight: '44px' }}
                      title="Switch between front and rear cameras"
                    >
                      🔄 Flip Camera
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={toggleTorch}
                      style={{ fontSize: '11px', minHeight: '44px' }}
                      title="Toggle hardware flashlight"
                    >
                      {isTorchOn ? '⚡ Torch OFF' : '⚡ Torch ON'}
                    </Button>
                  </>
                )}

                {/* Photo Upload Scanner Fallback */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    minHeight: '44px',
                    flex: isNarrowScreen ? 1 : 'none',
                  }}
                >
                  📁 Scan from Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label="Scan barcode from uploaded photo"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Manual Barcode Search & Instant Keying */}
              <div style={{ marginBottom: '12px' }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualTagInput.trim()) {
                      handleProcessCode(manualTagInput.trim());
                      setManualTagInput('');
                    }
                  }}
                  style={{ display: 'flex', gap: '6px' }}
                >
                  <input
                    type="text"
                    aria-label="Enter asset tag ID manually"
                    value={manualTagInput}
                    onChange={(e) => setManualTagInput(e.target.value)}
                    placeholder="Enter tag ID (e.g. AST-SCN-001, AST-LGT-002)..."
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      outline: 'none',
                    }}
                  />
                  <Button size="sm" variant="secondary" type="submit" style={{ fontSize: '11px' }}>
                    🔍 Search Tag
                  </Button>
                </form>
              </div>

              {/* Quick Field Asset Test Chips */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                  Quick Field Demo Test Presets:
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { tag: 'AST-SCN-001', label: 'Scenic Wall' },
                    { tag: 'AST-LGT-002', label: 'Viper Moving Light' },
                    { tag: 'AST-AV-003', label: 'Shure RF Mic' },
                    { tag: 'AST-RIG-004', label: 'Stage Truss' },
                    { tag: 'AST-PWR-005', label: 'Power Gen' },
                    { tag: 'BDG-VIP-8821', label: 'VIP Badge' },
                    { tag: 'TRK-QA-7819', label: 'Logistics Truck' },
                  ].map((preset) => (
                    <button
                      key={preset.tag}
                      type="button"
                      onClick={() => handleProcessCode(preset.tag)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: scannedTag === preset.tag ? '#0f172a' : '#f8fafc',
                        color: scannedTag === preset.tag ? '#ffffff' : '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanned Asset Intelligence Card */}
              {scanResult && (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <strong style={{ color: '#0f172a', fontSize: '13px', display: 'block' }}>
                        {scanResult.description}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Category: <strong>{scanResult.category}</strong>
                      </span>
                    </div>
                    <Badge variant={scanResult.critical ? 'danger' : 'info'}>
                      {scanResult.assetTag}
                    </Badge>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 1fr',
                      gap: '6px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #f1f5f9',
                      borderRadius: '6px',
                      padding: '8px',
                      marginBottom: '10px',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <span style={{ color: '#64748b' }}>Location / Zone: </span>
                      <strong style={{ color: '#0f172a' }}>{scanResult.zone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Status: </span>
                      <strong style={{ color: scanResult.status.includes('QC') ? '#0284c7' : '#16a34a' }}>
                        {scanResult.status}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Assigned Lead: </span>
                      <span style={{ color: '#334155' }}>{scanResult.assignedTech}</span>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Serial / Hardware: </span>
                      <span style={{ fontFamily: 'monospace', color: '#334155' }}>{scanResult.serialNumber}</span>
                    </div>
                    {scanResult.dimensions && (
                      <div style={{ gridColumn: isNarrowScreen ? 'span 1' : 'span 2' }}>
                        <span style={{ color: '#64748b' }}>Dimensions / Specs: </span>
                        <span style={{ color: '#334155' }}>{scanResult.dimensions}</span>
                      </div>
                    )}
                  </div>

                  {/* Immediate Action Buttons Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: isNarrowScreen ? '1fr' : '1fr 1fr', gap: '6px' }}>
                    <Button
                      size="sm"
                      variant="primary"
                      style={{ fontSize: '11px' }}
                      onClick={() => handleConfirmPick(scanResult)}
                    >
                      📦 Confirm Pick & Stage
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ fontSize: '11px' }}
                      onClick={() => handleQuickQcPass(scanResult)}
                    >
                      🔬 Log QC Inspection Pass
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ fontSize: '11px' }}
                      onClick={() => handleFlagSnagFromAsset(scanResult)}
                    >
                      📸 Flag Damage / Snag
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      style={{ fontSize: '11px' }}
                      onClick={() => {
                        const newZone = prompt('Transfer to new zone:', scanResult.zone);
                        if (newZone && newZone !== scanResult.zone) {
                          setScanResult({ ...scanResult, zone: newZone });
                          if (isOffline) {
                            queueMutation('transfer_asset_zone', 'AssetInventory', {
                              assetTag: scanResult.assetTag,
                              newZone,
                            });
                          }
                          setScanFeedbackMsg(`Relocated to: ${newZone}`);
                          setTimeout(() => setScanFeedbackMsg(null), 3000);
                        }
                      }}
                    >
                      📍 Transfer Zone
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. WORKFLOW: QC INSPECTION */}
        {mobileTab === 'qc' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Mobile QC Inspection Sign-off
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 10px 0' }}>
                Sprint 03 Module 08 Invariant: Damaged goods are automatically routed to Quarantine.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <Select
                  label="QC Decision Result"
                  value={qcStatus}
                  onChange={(e) => setQcStatus(e.target.value as any)}
                  options={[
                    { value: 'pass', label: '✅ QC PASSED: Meets Event Specifications' },
                    { value: 'fail_quarantine', label: '⛔ QC FAILED: Damage Detected (Auto-Quarantine)' },
                  ]}
                />

                <Textarea
                  label="Inspector Inspection Notes"
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  rows={2}
                />

                <Button
                  size="md"
                  variant={qcStatus === 'pass' ? 'primary' : 'danger'}
                  onClick={() => alert(`QC Inspection recorded: ${qcStatus === 'pass' ? 'Passed' : 'Failed - Moved to Quarantine'}`)}
                  style={{ width: '100%', fontWeight: 800 }}
                >
                  {qcStatus === 'pass' ? '✅ Endorse QC Pass' : '⛔ Flag Failure & Route to Quarantine'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 5. WORKFLOW: CREW CHECK-IN & COMPLIANCE */}
        {mobileTab === 'crew' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                Site Crew Check-in (Fatigue Policy Check)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <Select
                  label="Select Crew Member"
                  value={crewMember}
                  onChange={(e) => {
                    setCrewMember(e.target.value);
                    setCrewCheckedIn(false);
                  }}
                  options={[
                    { value: 'Rashid Al-Kuwari (Lead Rigger)', label: 'Rashid Al-Kuwari (Lead Rigger)' },
                    { value: 'Omar Farooq (Site Supervisor)', label: 'Omar Farooq (Site Supervisor)' },
                    { value: 'Nasser Al-Attiyah (Logistics Coord)', label: 'Nasser Al-Attiyah (Logistics Coord)' },
                  ]}
                />

                {/* Compliance verification pills */}
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 10px', fontSize: '11px' }}>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: '2px' }}>
                    Governance Compliance Verified:
                  </div>
                  <div style={{ color: '#15803d' }}>
                    • Qatar Labour Law: Shift ≤ 8h (Ramadan: 6h)
                  </div>
                  <div style={{ color: '#15803d' }}>
                    • E3 Fatigue Policy: 11h Rest Interval Satisfied (Prior shift ended 14h ago)
                  </div>
                </div>

                <Button
                  size="md"
                  variant="primary"
                  onClick={() => setCrewCheckedIn(true)}
                  disabled={crewCheckedIn}
                  style={{ width: '100%', fontWeight: 800 }}
                >
                  {crewCheckedIn ? '✅ Checked In (DECC Dock Gate)' : '📍 Confirm Geo-Location & Check In'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 6. WORKFLOW: READINESS CHECKLIST */}
        {(mobileTab === 'checklist' || !isMobileFrame) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Live Field Readiness Checklist
            </h3>

            {checklists.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleChecklist(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: item.completed ? '#f0fdf4' : '#ffffff',
                  border: `1px solid ${item.completed ? '#86efac' : '#e2e8f0'}`,
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <input
                  type="checkbox"
                  aria-label={item.label}
                  checked={item.completed}
                  onChange={() => {}}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: item.completed ? '#166534' : '#0f172a' }}>
                    {item.label}
                  </div>
                  {item.critical && (
                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 700 }}>
                      • Critical Safety Requirement
                    </span>
                  )}
                </div>
                <Badge variant={item.completed ? 'success' : item.critical ? 'danger' : 'neutral'}>
                  {item.completed ? 'PASS' : 'PENDING'}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* 7. WORKFLOW: BOUNDED OFFLINE QUEUE & MEDIA GATE (AT-056, AT-057, AT-058) */}
        {mobileTab === 'queue' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Storage Eviction Contingency Disclosure (AT-058) */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#92400e',
              }}
              id="disclosure-storage-eviction"
            >
              <strong>INVARIANT AT-058 (OFFLINE CONTINGENCY DISCLOSURE):</strong> E3-EOS discloses that offline PWA device
              storage cannot guarantee background sync or remote offline wipe without an active authenticated network session.
              When device storage is evicted or a session revoked, local drafts must follow manual supervisor contingency protocols.
            </div>

            {/* Bounded Offline Policy Warning */}
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#1e40af',
              }}
              id="bounded-offline-warning"
            >
              <strong>BOUNDED OFFLINE RULE:</strong> Authoritative actions (financial postings, PO approvals, opening authorizations,
              vendor awards) CANNOT be executed offline. They require active online server authentication.
            </div>

            {/* Queued Operations List (AT-056) */}
            <div>
              {/* Sync Toast Feedback */}
              {syncToast && (
                <div
                  style={{
                    backgroundColor: syncToast.type === 'success' ? '#f0fdf4' : '#fff1f2',
                    border: `1px solid ${syncToast.type === 'success' ? '#86efac' : '#fecdd3'}`,
                    color: syncToast.type === 'success' ? '#166534' : '#9f1239',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '10px',
                  }}
                >
                  {syncToast.type === 'success' ? '✓ ' : '⚠️ '}
                  {syncToast.message}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', color: '#0f172a' }}>
                  Queued Field Operations ({pendingMutations.length})
                </h4>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {pendingMutations.some((m) => m.status === 'syncing') ? (
                    <Badge variant="info">SYNCING TO CLOUD...</Badge>
                  ) : pendingMutations.some((m) => m.status === 'pending') ? (
                    <Badge variant="warning">
                      {pendingMutations.filter((m) => m.status === 'pending').length} AWAITING SERVER SYNC
                    </Badge>
                  ) : pendingMutations.length > 0 ? (
                    <Badge variant="success">ALL MUTATIONS SYNCED</Badge>
                  ) : (
                    <Badge variant="neutral">QUEUE EMPTY</Badge>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleSyncQueue}
                  disabled={isSyncingQueue || !pendingMutations.some((m) => m.status === 'pending')}
                  style={{ fontSize: '11px', flex: isNarrowScreen ? 1 : 'none' }}
                >
                  {isSyncingQueue ? '⏳ Replaying Queue...' : `⚡ Sync Offline Queue (${pendingMutations.filter((m) => m.status === 'pending').length})`}
                </Button>
                {pendingMutations.some((m) => m.status === 'synced') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={clearSyncedMutations}
                    style={{ fontSize: '11px' }}
                  >
                    🧹 Clear Synced
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    queueMutation('log_field_observation', 'SiteObservation', {
                      zone: 'DECC Hall 1 - Service Bay',
                      observation: 'Perimeter egress cleared; electrical load within 65% threshold.',
                    });
                  }}
                  style={{ fontSize: '11px' }}
                >
                  ➕ Add Sample Mutation
                </Button>
              </div>

              {/* Items List */}
              {pendingMutations.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    backgroundColor: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📭</div>
                  <strong>No pending offline mutations in local storage.</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                    Any snag logs, POD digital signatures, or asset scans recorded while offline will persist here automatically.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingMutations.map((op) => (
                    <div
                      key={op.id}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: '#ffffff',
                        border: `1px solid ${op.status === 'synced' ? '#86efac' : op.status === 'failed' ? '#fca5a5' : '#e2e8f0'}`,
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div>
                          <strong style={{ color: '#0f172a' }}>{op.action}</strong>
                          <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '11px' }}>({op.entity})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge
                            variant={
                              op.status === 'synced'
                                ? 'success'
                                : op.status === 'syncing'
                                ? 'info'
                                : op.status === 'failed'
                                ? 'danger'
                                : 'warning'
                            }
                          >
                            {op.status.toUpperCase()}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => removePendingMutation(op.id)}
                            title="Dismiss item from queue"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              fontSize: '12px',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div style={{ color: '#475569', marginBottom: '4px', fontFamily: 'monospace', fontSize: '10px', backgroundColor: '#f8fafc', padding: '4px 6px', borderRadius: '4px' }}>
                        {JSON.stringify(op.payload)}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#94a3b8', flexWrap: 'wrap', gap: '4px' }}>
                        <span>Logged: {new Date(op.timestamp).toLocaleTimeString()}</span>
                        {op.dedupTag && (
                          <span style={{ color: '#0284c7', fontWeight: 600 }}>Dedup: {op.dedupTag}</span>
                        )}
                        {op.syncedAt && (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Synced: {new Date(op.syncedAt).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Media Upload Verification Gate (AT-057) */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#0f172a' }}>Binary Media Upload Verification Gate (AT-057)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <strong>snag-counter14-full.jpg</strong>
                    <Badge variant="success">BINARY COMPLETE (2.4 MB / 2.4 MB)</Badge>
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534' }}>
                    ✓ Upload complete & verified. Snag inspection accepted as verified evidence.
                  </div>
                </div>

                <div
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #fecdd3',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <strong>snag-audio-cable-overhead.jpg</strong>
                    <Badge variant="warning">PENDING BINARY UPLOAD (1.8 MB / 4.2 MB)</Badge>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9f1239' }}>
                    ⚠️ Incomplete upload: Snag remains <code>pending_binary_upload</code> until binary bytes are completely received.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldOpsView;
