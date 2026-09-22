import { safeSha256 } from '@e3-eos/domain';

export interface SyntheticDesignSeed {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  description: string;
  fileExtension: string;
  fileName: string;
  mimeType: string;
  category: 'native_view' | 'converted_view' | 'download_only';
  viewerEngine: 'pdf_plan' | '2d_image' | 'video' | '3d_model' | 'download_fallback';
  discipline: string;
  department: string;
  assetType: string;
  projectPhase: string;
  ownerName: string;
  currentRevisionCode: string;
  currentVersionNumber: number;
  currentStatus: string;
  priority: string;
  approvalPurpose: string;
  confidentiality: string;
  clientVisibility: boolean;
  zones: string[];
  locations: string[];
  tags: string[];
  sizeBytes: number;
  sampleData: string;
  revisions: Array<{
    revisionCode: string;
    versionNumber: number;
    contentHash: string;
    storageUrl: string;
    fileName: string;
    uploadedBy: string;
    uploadedAt: string;
    notes: string;
    releaseStatus: string;
    purpose?: string;
  }>;
  pins: Array<{
    id: string;
    pinNumber: number;
    revisionCode: string;
    xPercent: number;
    yPercent: number;
    videoTimestampSec?: number;
    threeDCoordinates?: { x: number; y: number; z: number };
    title: string;
    discipline: string;
    priority: string;
    status: string;
    visibility: string;
    assigneeName: string;
    comments: Array<{
      id: string;
      authorId: string;
      authorName: string;
      message: string;
      visibility: string;
      createdAt: string;
    }>;
    createdAt: string;
  }>;
  savedViewpoints?: Array<{
    id: string;
    name: string;
    yaw: number;
    pitch: number;
    zoomLevel: number;
    pan?: { x: number; y: number };
    authorName?: string;
    createdAt: string;
  }>;
}

export interface SyntheticWorkspaceSeed {
  id: string;
  projectId: string;
  name: string;
  description: string;
  responsibleDepartment: string;
  ownerName: string;
  color: string;
  icon: string;
  visibility: string;
  status: string;
}

export function getSyntheticAllFormatWorkspaces(projectId: string = 'PRJ-TEST-ALL-FORMATS'): SyntheticWorkspaceSeed[] {
  return [
    {
      id: `ws-${projectId}-cad-bim`,
      projectId,
      name: 'Architectural & Engineering Drawings (CAD/BIM)',
      description: 'Master general arrangement drawings, AutoCAD DWG/DXF files, and OpenBIM structural models.',
      responsibleDepartment: 'Technical Architecture & Engineering',
      ownerName: 'Eng. Hisham Al-Kuwari',
      color: '#2563eb',
      icon: '📐',
      visibility: 'client_visible',
      status: 'active',
    },
    {
      id: `ws-${projectId}-3d-video`,
      projectId,
      name: '3D Spatial Models & Motion Flythroughs',
      description: 'Wavefront OBJ meshes, GLTF node trees, 4K kinetic simulations, and holographic FX animations.',
      responsibleDepartment: 'Scenic & Staging Production',
      ownerName: 'Karim Haddad',
      color: '#8b5cf6',
      icon: '🌐',
      visibility: 'client_visible',
      status: 'active',
    },
    {
      id: `ws-${projectId}-branding`,
      projectId,
      name: 'Visual Renders & Graphic Artwork',
      description: 'Photorealistic dusk renders, Adobe Illustrator vector branding, and layered Photoshop composites.',
      responsibleDepartment: 'Creative Direction & Branding',
      ownerName: 'Nadia Mansour',
      color: '#ec4899',
      icon: '🎨',
      visibility: 'client_visible',
      status: 'active',
    },
    {
      id: `ws-${projectId}-specs`,
      projectId,
      name: 'Calculations, BOQ & Contract Specifications',
      description: 'PE wind load calculations, Master Production BOQs, MS Project rigging schedules, and sealed ZIP archives.',
      responsibleDepartment: 'Commercial & Structural Governance',
      ownerName: 'Zaid Mansour',
      color: '#10b981',
      icon: '📊',
      visibility: 'client_visible',
      status: 'active',
    },
  ];
}

export function getSyntheticAllFormatDesigns(projectId: string = 'PRJ-TEST-ALL-FORMATS'): SyntheticDesignSeed[] {
  const wsCad = `ws-${projectId}-cad-bim`;
  const ws3d = `ws-${projectId}-3d-video`;
  const wsBranding = `ws-${projectId}-branding`;
  const wsSpecs = `ws-${projectId}-specs`;

  return [
    // -------------------------------------------------------------------------
    // 1. PDF (.pdf) - Native View (PDF Plan Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-001-PDF',
      projectId,
      workspaceId: wsCad,
      title: '[PDF] Main Auditorium General Arrangement & Egress Plan',
      description: 'Multi-page vector drawing of 3,500-seat plenary auditorium including egress corridors, control booth, and translation suites.',
      fileExtension: '.pdf',
      fileName: 'Main_Auditorium_General_Arrangement_Plan.pdf',
      mimeType: 'application/pdf',
      category: 'native_view',
      viewerEngine: 'pdf_plan',
      discipline: 'architecture',
      department: 'Technical Architecture & Engineering',
      assetType: 'technical_drawing',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Eng. Hisham Al-Kuwari',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'client_review',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Plenary Hall', 'Zone 2: Translation Booths'],
      locations: ['Main Axis A-1 to A-8'],
      tags: ['PDF', 'Vector', 'Architecture', 'Egress'],
      sizeBytes: 14 * 1024 * 1024,
      sampleData: '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 120>>stream\nBT /F1 14 Tf 50 780 Td (E3-EOS Master Plenary Layout Plan - Rev B) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n385\n%%EOF',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('PDF_AUDITORIUM_REV_A'),
          storageUrl: `designs/DES-ALL-001-PDF-RevA.pdf`,
          fileName: 'Main_Auditorium_General_Arrangement_Plan_RevA.pdf',
          uploadedBy: 'Eng. Hisham Al-Kuwari',
          uploadedAt: '2026-09-01T08:00:00Z',
          notes: 'Initial preliminary seating arrangement and sightline elevation.',
          releaseStatus: 'concept_approved',
          purpose: 'concept',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('PDF_AUDITORIUM_REV_B'),
          storageUrl: `designs/DES-ALL-001-PDF-RevB.pdf`,
          fileName: 'Main_Auditorium_General_Arrangement_Plan_RevB.pdf',
          uploadedBy: 'Civil Defence Certified Architect',
          uploadedAt: '2026-09-12T11:30:00Z',
          notes: 'Expanded central aisle width to 2.4m per QCDD Life Safety Code.',
          releaseStatus: 'client_review',
          purpose: 'approved_for_fabrication',
        },
      ],
      pins: [
        {
          id: 'pin-pdf-1',
          pinNumber: 1,
          revisionCode: 'Rev B',
          xPercent: 42,
          yPercent: 35,
          title: 'Primary Egress Aisle Width',
          discipline: 'health_safety',
          priority: 'urgent',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Civil Defence Inspector',
          comments: [
            {
              id: 'c-pdf-1',
              authorId: 'u-hse',
              authorName: 'Civil Defence Inspector Tariq',
              message: 'Verified 2.40m clear opening for primary egress route.',
              visibility: 'client_visible',
              createdAt: '2026-09-12T12:00:00Z',
            },
          ],
          createdAt: '2026-09-12T11:45:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 2. PNG (.png) - Native View (2D Image Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-002-PNG',
      projectId,
      workspaceId: wsBranding,
      title: '[PNG] VIP Gala Golden Hour Key Visual Scenography',
      description: 'Ray-traced 4K visual rendering depicting banquet chandelier reflections, gold leaf tableware, and stage floral arches.',
      fileExtension: '.png',
      fileName: 'VIP_Gala_Dusk_Key_Visual.png',
      mimeType: 'image/png',
      category: 'native_view',
      viewerEngine: '2d_image',
      discipline: 'scenic',
      department: 'Creative Direction & Branding',
      assetType: 'visual_render',
      projectPhase: 'Stage 03: Concept Scheme',
      ownerName: 'Nadia Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'approved_as_concept',
      priority: 'high',
      approvalPurpose: 'concept',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 3: VIP Royal Pavilion'],
      locations: ['Main Banquet Table Axis 1'],
      tags: ['PNG', 'Render', 'Dusk', 'Lighting', 'Scenography'],
      sizeBytes: 8 * 1024 * 1024,
      sampleData: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('PNG_VIP_GALA_REV_A'),
          storageUrl: `designs/DES-ALL-002-PNG-RevA.png`,
          fileName: 'VIP_Gala_Dusk_Key_Visual.png',
          uploadedBy: 'Nadia Mansour',
          uploadedAt: '2026-09-05T14:00:00Z',
          notes: 'Master mood visual showing dusk lighting transition.',
          releaseStatus: 'approved_as_concept',
        },
      ],
      pins: [
        {
          id: 'pin-png-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 65,
          yPercent: 48,
          title: 'Chandelier Warm Color Temperature',
          discipline: 'lighting',
          priority: 'medium',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Sami Jarrah',
          comments: [
            {
              id: 'c-png-1',
              authorId: 'u-sami',
              authorName: 'Sami Jarrah (Lighting)',
              message: 'Confirming warm 2700K tungsten amber curve for VIP dinner.',
              visibility: 'client_visible',
              createdAt: '2026-09-06T09:00:00Z',
            },
          ],
          createdAt: '2026-09-05T15:00:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 3. JPG (.jpg) - Native View (2D Image Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-003-JPG',
      projectId,
      workspaceId: wsCad,
      title: '[JPG] Exhibition Hall High-Bay Ceiling Rigging Point Survey',
      description: 'High-resolution photographic survey documenting existing overhead beam clamps, sprinkler lines, and cable tray clearances.',
      fileExtension: '.jpg',
      fileName: 'DECC_Hall1_Ceiling_Truss_Site_Survey.jpg',
      mimeType: 'image/jpeg',
      category: 'native_view',
      viewerEngine: '2d_image',
      discipline: 'rigging',
      department: 'Technical Architecture & Engineering',
      assetType: 'site_survey',
      projectPhase: 'Stage 02: Site Feasibility',
      ownerName: 'Tariq Al-Ansari',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'approved_for_production',
      priority: 'medium',
      approvalPurpose: 'concept',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Exhibition Hall 1'],
      locations: ['Ceiling Grid Bays 12-16'],
      tags: ['JPG', 'Survey', 'Rigging', 'Photo', 'Ceiling'],
      sizeBytes: 5 * 1024 * 1024,
      sampleData: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('JPG_SITE_SURVEY_REV_A'),
          storageUrl: `designs/DES-ALL-003-JPG-RevA.jpg`,
          fileName: 'DECC_Hall1_Ceiling_Truss_Site_Survey.jpg',
          uploadedBy: 'Tariq Al-Ansari',
          uploadedAt: '2026-09-02T10:00:00Z',
          notes: 'Laser verified survey of high-bay clamp points.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [
        {
          id: 'pin-jpg-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 50,
          yPercent: 50,
          title: 'Beam Clamp Load Limit Tag',
          discipline: 'rigging',
          priority: 'high',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Tariq Al-Ansari',
          comments: [
            {
              id: 'c-jpg-1',
              authorId: 'u-tariq',
              authorName: 'Tariq Al-Ansari',
              message: 'Tag rated at 2,000 kg WLL per secondary node.',
              visibility: 'client_visible',
              createdAt: '2026-09-02T11:00:00Z',
            },
          ],
          createdAt: '2026-09-02T10:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 4. SVG (.svg) - Native View (2D Image Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-004-SVG',
      projectId,
      workspaceId: wsBranding,
      title: '[SVG] Sovereign Ceremony Monogram & Directional Wayfinding Totem',
      description: 'Infinite-resolution scalable vector artwork for illuminated monolith totems and VIP entrance portal signage.',
      fileExtension: '.svg',
      fileName: 'Sovereign_Emblem_Wayfinding_Totem_Vector.svg',
      mimeType: 'image/svg+xml',
      category: 'native_view',
      viewerEngine: '2d_image',
      discipline: 'graphic_creative',
      department: 'Creative Direction & Branding',
      assetType: 'branding_collateral',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Nadia Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'client_approved',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Boulevard Entrance'],
      locations: ['Totems T-01 to T-12'],
      tags: ['SVG', 'Vector', 'Branding', 'Wayfinding', 'Typography'],
      sizeBytes: 450 * 1024,
      sampleData: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%"><rect width="100%" height="100%" fill="#0a1128"/><circle cx="400" cy="300" r="180" fill="none" stroke="#d4af37" stroke-width="4"/><path d="M 400 150 L 450 280 L 590 280 L 475 365 L 520 495 L 400 415 L 280 495 L 325 365 L 210 280 L 350 280 Z" fill="#d4af37"/><text x="400" y="550" fill="#ffffff" font-size="24" font-family="sans-serif" text-anchor="middle" letter-spacing="4">STATE CELEBRATIONS 2026</text></svg>',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('SVG_WAYFINDING_REV_A'),
          storageUrl: `designs/DES-ALL-004-SVG-RevA.svg`,
          fileName: 'Sovereign_Emblem_Wayfinding_Totem_Vector.svg',
          uploadedBy: 'Nadia Mansour',
          uploadedAt: '2026-09-08T09:00:00Z',
          notes: 'Master scalable vector package with Pantone 871C metallic gold.',
          releaseStatus: 'client_approved',
        },
      ],
      pins: [
        {
          id: 'pin-svg-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 50,
          yPercent: 91,
          title: 'Arabic Typographic Balance',
          discipline: 'graphic_creative',
          priority: 'medium',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Nadia Mansour',
          comments: [
            {
              id: 'c-svg-1',
              authorId: 'u-nadia',
              authorName: 'Nadia Mansour',
              message: 'Diacritics aligned with National Identity manual v2.4.',
              visibility: 'client_visible',
              createdAt: '2026-09-08T10:00:00Z',
            },
          ],
          createdAt: '2026-09-08T09:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 5. MP4 (.mp4) - Native View (Video Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-005-MP4',
      projectId,
      workspaceId: ws3d,
      title: '[MP4] 360° Kinetic Ring Acceleration & Pyro Cue Simulation',
      description: '60 FPS motion simulation showing 12-axis winch synchronization, 24m kinetic LED ring descent, and synchronized pyrotechnic bursts.',
      fileExtension: '.mp4',
      fileName: 'Kinetic_Truss_Dynamic_Motion_Simulation.mp4',
      mimeType: 'video/mp4',
      category: 'native_view',
      viewerEngine: 'video',
      discipline: 'staging',
      department: 'Scenic & Staging Production',
      assetType: 'motion_video',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Karim Haddad',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'client_review',
      priority: 'urgent',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Boulevard'],
      locations: ['Main Arch Axis A-1'],
      tags: ['MP4', 'Video', 'Kinetic', 'Simulation', 'Pyro', '60FPS'],
      sizeBytes: 42 * 1024 * 1024,
      sampleData: 'MP4-VIDEO-DYNAMIC-STREAMING-BINARY-DATA-SIMULATION-E3-EOS',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('MP4_SIMULATION_REV_A'),
          storageUrl: `designs/DES-ALL-005-MP4-RevA.mp4`,
          fileName: 'Kinetic_Truss_Dynamic_Motion_Simulation_RevA.mp4',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-07T12:00:00Z',
          notes: 'Standard velocity kinetic descent sequence.',
          releaseStatus: 'concept_approved',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('MP4_SIMULATION_REV_B'),
          storageUrl: `designs/DES-ALL-005-MP4-RevB.mp4`,
          fileName: 'Kinetic_Truss_Dynamic_Motion_Simulation_RevB.mp4',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-11T16:00:00Z',
          notes: 'Added dynamic brake deceleration curve and fail-safe stop buffer at 14.5s.',
          releaseStatus: 'client_review',
        },
      ],
      pins: [
        {
          id: 'pin-mp4-1',
          pinNumber: 1,
          revisionCode: 'Rev B',
          xPercent: 50,
          yPercent: 40,
          videoTimestampSec: 14.5,
          title: 'Peak Kinetic Acceleration & Failsafe Brake Check',
          discipline: 'staging',
          priority: 'urgent',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Karim Haddad',
          comments: [
            {
              id: 'c-mp4-1',
              authorId: 'u-karim',
              authorName: 'Karim Haddad',
              message: 'At 14.5s maximum downward velocity of 1.2 m/s is attained. Failsafe magnetic brakes engage with 200% margin.',
              visibility: 'client_visible',
              createdAt: '2026-09-11T16:30:00Z',
            },
          ],
          createdAt: '2026-09-11T16:15:00Z',
        },
        {
          id: 'pin-mp4-2',
          pinNumber: 2,
          revisionCode: 'Rev B',
          xPercent: 70,
          yPercent: 30,
          videoTimestampSec: 32.0,
          title: 'Pyro Firing Sequence & Safety Arc Clearance',
          discipline: 'health_safety',
          priority: 'high',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Civil Defence Safety Lead',
          comments: [
            {
              id: 'c-mp4-2',
              authorId: 'u-hse',
              authorName: 'Civil Defence Safety Lead',
              message: 'Verified 45m exclusion radius from public barrier line at 32.0s mark.',
              visibility: 'client_visible',
              createdAt: '2026-09-11T17:00:00Z',
            },
          ],
          createdAt: '2026-09-11T16:45:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 6. WEBM (.webm) - Native View (Video Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-006-WEBM',
      projectId,
      workspaceId: ws3d,
      title: '[WEBM] Holographic Water Curtain Particle FX Loop',
      description: 'Alpha-channel transparent video asset displaying water curtain projection mapping, droplet turbulence, and laser dispersion.',
      fileExtension: '.webm',
      fileName: 'Stage_Holographic_Water_Curtain_Preview.webm',
      mimeType: 'video/webm',
      category: 'native_view',
      viewerEngine: 'video',
      discipline: 'audio_visual',
      department: 'Scenic & Staging Production',
      assetType: 'motion_video',
      projectPhase: 'Stage 03: Developed Scheme',
      ownerName: 'Sami Jarrah',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'internal_review',
      priority: 'medium',
      approvalPurpose: 'concept',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 2: Water Feature Stage'],
      locations: ['Fountain Gantry Nozzle Rig'],
      tags: ['WEBM', 'Video', 'FX', 'Hologram', 'Laser'],
      sizeBytes: 18 * 1024 * 1024,
      sampleData: 'WEBM-CONTAINER-TRANSPARENT-ALPHA-VIDEO-DATA-E3-EOS',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('WEBM_FX_REV_A'),
          storageUrl: `designs/DES-ALL-006-WEBM-RevA.webm`,
          fileName: 'Stage_Holographic_Water_Curtain_Preview.webm',
          uploadedBy: 'Sami Jarrah',
          uploadedAt: '2026-09-09T13:00:00Z',
          notes: 'High bit-rate VP9 loop render with alpha channel.',
          releaseStatus: 'internal_review',
        },
      ],
      pins: [
        {
          id: 'pin-webm-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 52,
          yPercent: 45,
          videoTimestampSec: 8.2,
          title: 'Droplet Density & Laser Scatter Alignment',
          discipline: 'audio_visual',
          priority: 'medium',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Sami Jarrah',
          comments: [
            {
              id: 'c-webm-1',
              authorId: 'u-sami',
              authorName: 'Sami Jarrah',
              message: 'Check laser alignment against mist nozzle row 3 at 8.2 seconds.',
              visibility: 'client_visible',
              createdAt: '2026-09-09T14:00:00Z',
            },
          ],
          createdAt: '2026-09-09T13:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 7. OBJ (.obj) - Native View (3D Spatial Canvas Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-007-OBJ',
      projectId,
      workspaceId: ws3d,
      title: '[OBJ] Ceremonial Main Stage 10x8m Polygonal Mesh & Risers',
      description: 'Wavefront OBJ 3D polygonal model featuring modular heavy-duty staging decks, dual accessibility ramps, and front-of-house backdrop framing.',
      fileExtension: '.obj',
      fileName: 'Ceremonial_Main_Stage_10x8m.obj',
      mimeType: 'model/obj',
      category: 'native_view',
      viewerEngine: '3d_model',
      discipline: 'staging',
      department: 'Scenic & Staging Production',
      assetType: '3d_model',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Karim Haddad',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'client_approved',
      priority: 'urgent',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Stage'],
      locations: ['Stage Grid Central'],
      tags: ['OBJ', '3D', 'Mesh', 'Wavefront', 'Staging', 'Orbit'],
      sizeBytes: 1850 * 1024,
      sampleData: '# Wavefront OBJ - Ceremonial Main Stage 10x8m\nv -5.0 0.0 -4.0\nv 5.0 0.0 -4.0\nv 5.0 1.2 -4.0\nv -5.0 1.2 -4.0\nv -5.0 0.0 4.0\nv 5.0 0.0 4.0\nv 5.0 1.2 4.0\nv -5.0 1.2 4.0\nf 1 2 3 4\nf 5 8 7 6\nf 1 5 6 2\nf 2 6 7 3\nf 3 7 8 4\nf 5 1 4 8\n',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('OBJ_STAGE_REV_A'),
          storageUrl: `designs/DES-ALL-007-OBJ-RevA.obj`,
          fileName: 'Ceremonial_Main_Stage_10x8m_RevA.obj',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-04T10:00:00Z',
          notes: 'Initial 10x8m platform geometry with single rear ramp.',
          releaseStatus: 'concept_approved',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('OBJ_STAGE_REV_B'),
          storageUrl: `designs/DES-ALL-007-OBJ-RevB.obj`,
          fileName: 'Ceremonial_Main_Stage_10x8m.obj',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-10T11:00:00Z',
          notes: 'Added dual symmetrical ramps with 1:12 ADA slope and safety handrails.',
          releaseStatus: 'client_approved',
        },
      ],
      savedViewpoints: [
        { id: 'vp-stage-front', name: 'Front Elevation', yaw: 0, pitch: 0, zoomLevel: 100, pan: { x: 0, y: 0 }, authorName: 'Karim Haddad', createdAt: '2026-09-10T12:00:00Z' },
        { id: 'vp-stage-top', name: 'Top-Down Plan', yaw: 0, pitch: -89, zoomLevel: 100, pan: { x: 0, y: 0 }, authorName: 'Karim Haddad', createdAt: '2026-09-10T12:00:00Z' },
        { id: 'vp-stage-iso', name: 'Isometric View A', yaw: 45, pitch: -30, zoomLevel: 105, pan: { x: 0, y: 0 }, authorName: 'Karim Haddad', createdAt: '2026-09-10T12:00:00Z' },
        { id: 'vp-stage-persp', name: 'Audience Perspective', yaw: -25, pitch: -15, zoomLevel: 115, pan: { x: 0, y: 0 }, authorName: 'Karim Haddad', createdAt: '2026-09-10T12:00:00Z' },
      ],
      pins: [
        {
          id: 'pin-obj-1',
          pinNumber: 1,
          revisionCode: 'Rev B',
          xPercent: 50,
          yPercent: 45,
          threeDCoordinates: { x: 0, y: -25, z: 0 },
          title: 'Central Lectern Load Bearing Point',
          discipline: 'staging',
          priority: 'high',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Karim Haddad',
          comments: [
            {
              id: 'c-obj-1',
              authorId: 'u-karim',
              authorName: 'Karim Haddad',
              message: 'Verified 750 kg/m² uniform distributed live load capacity.',
              visibility: 'client_visible',
              createdAt: '2026-09-10T12:30:00Z',
            },
          ],
          createdAt: '2026-09-10T12:15:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 8. GLTF (.gltf) - Native View (3D Spatial Canvas Engine)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-008-GLTF',
      projectId,
      workspaceId: ws3d,
      title: '[GLTF] Grand Boulevard Kinetic Pavilion Node Tree & Mesh',
      description: 'JSON-based GLTF 2.0 spatial model featuring curved canopy truss nodes, tension cables, and motor hoist positions.',
      fileExtension: '.gltf',
      fileName: 'Grand_Boulevard_Kinetic_Pavilion.gltf',
      mimeType: 'model/gltf+json',
      category: 'native_view',
      viewerEngine: '3d_model',
      discipline: 'staging',
      department: 'Scenic & Staging Production',
      assetType: '3d_model',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Karim Haddad',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'client_review',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Boulevard Plaza'],
      locations: ['Pavilion Structure P-1'],
      tags: ['GLTF', '3D', 'JSON', 'Nodes', 'Truss', 'Pavilion'],
      sizeBytes: 2400 * 1024,
      sampleData: JSON.stringify({
        asset: { version: '2.0', generator: 'E3-EOS GLTF Export' },
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0, name: 'KineticPavilionTruss' }],
        meshes: [{
          name: 'PavilionMesh',
          primitives: [{
            attributes: {
              POSITION: [
                [-6.0, 0.0, -3.0], [6.0, 0.0, -3.0], [6.0, 4.5, -3.0], [-6.0, 4.5, -3.0],
                [-6.0, 0.0, 3.0], [6.0, 0.0, 3.0], [6.0, 4.5, 3.0], [-6.0, 4.5, 3.0],
              ],
            },
            indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 5, 6, 1, 6, 2],
          }],
        }],
      }, null, 2),
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('GLTF_PAVILION_REV_A'),
          storageUrl: `designs/DES-ALL-008-GLTF-RevA.gltf`,
          fileName: 'Grand_Boulevard_Kinetic_Pavilion.gltf',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-08T15:00:00Z',
          notes: 'Standard GLTF 2.0 geometry hierarchy with cable tensioners.',
          releaseStatus: 'client_review',
        },
      ],
      savedViewpoints: [
        { id: 'vp-gltf-top', name: 'Top-Down Truss Rig', yaw: 0, pitch: -89, zoomLevel: 100, authorName: 'Karim Haddad', createdAt: '2026-09-08T15:30:00Z' },
        { id: 'vp-gltf-iso', name: 'North Approach Iso', yaw: 45, pitch: -25, zoomLevel: 105, authorName: 'Karim Haddad', createdAt: '2026-09-08T15:30:00Z' },
      ],
      pins: [
        {
          id: 'pin-gltf-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 55,
          yPercent: 40,
          threeDCoordinates: { x: 5, y: -25, z: 10 },
          title: 'Canopy Tension Cable Apex',
          discipline: 'staging',
          priority: 'medium',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Karim Haddad',
          comments: [
            {
              id: 'c-gltf-1',
              authorId: 'u-karim',
              authorName: 'Karim Haddad',
              message: 'Check stainless steel turnbuckle tension rating (min 45 kN).',
              visibility: 'client_visible',
              createdAt: '2026-09-08T16:00:00Z',
            },
          ],
          createdAt: '2026-09-08T15:45:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 9. DWG (.dwg) - Converted Derivative View (AutoCAD Native)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-009-DWG',
      projectId,
      workspaceId: wsCad,
      title: '[DWG] Lusail Boulevard Sub-Surface Utilities & Cable Trenches',
      description: 'AutoCAD native DWG engineering drawing. Rendered via converted vector preview with full layer controls, line weights, and dimension callouts.',
      fileExtension: '.dwg',
      fileName: 'Lusail_Boulevard_Underground_Services_CAD.dwg',
      mimeType: 'application/acad',
      category: 'converted_view',
      viewerEngine: 'pdf_plan',
      discipline: 'civil_infrastructure',
      department: 'Technical Architecture & Engineering',
      assetType: 'technical_drawing',
      projectPhase: 'Stage 03: Developed Scheme',
      ownerName: 'Eng. Hisham Al-Kuwari',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'approved_for_production',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Boulevard Underpass'],
      locations: ['Trench Grid T1-T8'],
      tags: ['DWG', 'AutoCAD', 'Civil', 'Utilities', 'Converted'],
      sizeBytes: 48 * 1024 * 1024,
      sampleData: 'AC1032-AUTOCAD-BINARY-HEADER-E3-EOS-LUSAIL-BOULEVARD-SERVICES-DWG-2026',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('DWG_SERVICES_REV_A'),
          storageUrl: `designs/DES-ALL-009-DWG-RevA.dwg`,
          fileName: 'Lusail_Boulevard_Underground_Services_CAD_RevA.dwg',
          uploadedBy: 'Eng. Hisham Al-Kuwari',
          uploadedAt: '2026-09-01T11:00:00Z',
          notes: 'Initial utilities coordination drawing.',
          releaseStatus: 'internal_review',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('DWG_SERVICES_REV_B'),
          storageUrl: `designs/DES-ALL-009-DWG-RevB.dwg`,
          fileName: 'Lusail_Boulevard_Underground_Services_CAD.dwg',
          uploadedBy: 'Civil Defence Certified Engineer',
          uploadedAt: '2026-09-07T14:30:00Z',
          notes: 'Coordination stamp with Kahramaa power ducts confirmed.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [
        {
          id: 'pin-dwg-1',
          pinNumber: 1,
          revisionCode: 'Rev B',
          xPercent: 35,
          yPercent: 60,
          title: 'Kahramaa 11kV Feeder Clearance',
          discipline: 'civil_infrastructure',
          priority: 'urgent',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Eng. Hisham Al-Kuwari',
          comments: [
            {
              id: 'c-dwg-1',
              authorId: 'u-hisham',
              authorName: 'Eng. Hisham Al-Kuwari',
              message: 'Maintained 1.50m safety separation from live 11kV line.',
              visibility: 'client_visible',
              createdAt: '2026-09-07T15:00:00Z',
            },
          ],
          createdAt: '2026-09-07T14:45:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 10. DXF (.dxf) - Converted Derivative View (Drawing Exchange Format)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-010-DXF',
      projectId,
      workspaceId: wsCad,
      title: '[DXF] Stage Fascia CNC Laser Cut & Perforation Patterns',
      description: 'ASCII DXF profile ready for 5-axis waterjet and CNC router cutting at Al Rayyan fabrication workshop.',
      fileExtension: '.dxf',
      fileName: 'Custom_CNC_Aluminium_Stage_Fascia_Cut.dxf',
      mimeType: 'application/dxf',
      category: 'converted_view',
      viewerEngine: 'pdf_plan',
      discipline: 'scenic',
      department: 'Technical Architecture & Engineering',
      assetType: 'fabrication_drawing',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Karim Haddad',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'draft',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Stage'],
      locations: ['Fascia Panels 1-24'],
      tags: ['DXF', 'CNC', 'Laser', 'Fabrication', 'Aluminium'],
      sizeBytes: 12 * 1024 * 1024,
      sampleData: '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1027\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nFASCIA_CUT\n10\n0.0\n20\n0.0\n11\n2400.0\n21\n1200.0\n0\nENDSEC\n0\nEOF',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('DXF_FASCIA_REV_A'),
          storageUrl: `designs/DES-ALL-010-DXF-RevA.dxf`,
          fileName: 'Custom_CNC_Aluminium_Stage_Fascia_Cut.dxf',
          uploadedBy: 'Karim Haddad',
          uploadedAt: '2026-09-09T08:00:00Z',
          notes: 'Toolpaths mapped for 3.0mm anodized architectural aluminium sheet.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [
        {
          id: 'pin-dxf-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 48,
          yPercent: 52,
          title: 'Perforation Pitch & Acoustic Open Area',
          discipline: 'scenic',
          priority: 'medium',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Karim Haddad',
          comments: [
            {
              id: 'c-dxf-1',
              authorId: 'u-karim',
              authorName: 'Karim Haddad',
              message: 'Perforation verified at 42% acoustic transparency.',
              visibility: 'client_visible',
              createdAt: '2026-09-09T09:00:00Z',
            },
          ],
          createdAt: '2026-09-09T08:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 11. IFC (.ifc) - Converted Derivative View (OpenBIM Standard)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-011-IFC',
      projectId,
      workspaceId: wsCad,
      title: '[IFC] 12,000-Capacity Grandstand BIM Model (IFC4 Standard)',
      description: 'OpenBIM IFC4 structural exchange model detailing steel scaffolding columns, load-bearing stringers, and egress stairs.',
      fileExtension: '.ifc',
      fileName: 'Lusail_Plaza_Temporary_Grandstand_BIM.ifc',
      mimeType: 'application/x-step',
      category: 'converted_view',
      viewerEngine: '3d_model',
      discipline: 'structural',
      department: 'Technical Architecture & Engineering',
      assetType: '3d_model',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Eng. Hisham Al-Kuwari',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'client_approved',
      priority: 'urgent',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 4: Public Grandstands'],
      locations: ['Sectors A to D'],
      tags: ['IFC', 'BIM', 'OpenBIM', 'Structural', 'Grandstand'],
      sizeBytes: 112 * 1024 * 1024,
      sampleData: "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('E3-EOS Grandstand OpenBIM IFC4 Model'),'2;1');\nFILE_NAME('Lusail_Plaza_Temporary_Grandstand_BIM.ifc','2026-09-23',('Structural Lead'),('E3-EOS Engineering'),'','EOS','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n#1=IFCPROJECT('1A2B3C',$,'Lusail 12,000 Grandstand Structure',$,$,$,$,$,$);\n#2=IFCSITE('2A2B3C',$,'Lusail North Zone',$,$,$,$,$,$,$,$,$,$,$);\n#3=IFCBUILDING('3A2B3C',$,'Temporary Grandstand Sector A',$,$,$,$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;",
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('IFC_GRANDSTAND_REV_A'),
          storageUrl: `designs/DES-ALL-011-IFC-RevA.ifc`,
          fileName: 'Lusail_Plaza_Temporary_Grandstand_BIM_RevA.ifc',
          uploadedBy: 'Eng. Hisham Al-Kuwari',
          uploadedAt: '2026-09-03T11:00:00Z',
          notes: 'Preliminary IFC4 export with Layher Allround steel scaffold framework.',
          releaseStatus: 'concept_approved',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('IFC_GRANDSTAND_REV_B'),
          storageUrl: `designs/DES-ALL-011-IFC-RevB.ifc`,
          fileName: 'Lusail_Plaza_Temporary_Grandstand_BIM.ifc',
          uploadedBy: 'Civil Defence Certified PE',
          uploadedAt: '2026-09-10T15:00:00Z',
          notes: 'Added wind cross-bracing and independent VIP wheelchair platforms.',
          releaseStatus: 'client_approved',
        },
      ],
      savedViewpoints: [
        { id: 'vp-ifc-iso', name: 'Grandstand Full Isometric', yaw: 45, pitch: -30, zoomLevel: 95, authorName: 'Eng. Hisham Al-Kuwari', createdAt: '2026-09-10T16:00:00Z' },
        { id: 'vp-ifc-top', name: 'Grandstand Egress Plan', yaw: 0, pitch: -89, zoomLevel: 100, authorName: 'Eng. Hisham Al-Kuwari', createdAt: '2026-09-10T16:00:00Z' },
      ],
      pins: [
        {
          id: 'pin-ifc-1',
          pinNumber: 1,
          revisionCode: 'Rev B',
          xPercent: 62,
          yPercent: 44,
          threeDCoordinates: { x: 15, y: -25, z: 20 },
          title: 'Diagonal Cross-Bracing Node',
          discipline: 'structural',
          priority: 'urgent',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Eng. Hisham Al-Kuwari',
          comments: [
            {
              id: 'c-ifc-1',
              authorId: 'u-hisham',
              authorName: 'Eng. Hisham Al-Kuwari',
              message: 'Node verified for dynamic lateral surge load.',
              visibility: 'client_visible',
              createdAt: '2026-09-10T16:30:00Z',
            },
          ],
          createdAt: '2026-09-10T16:15:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 12. RVT (.rvt) - Converted Derivative View (Autodesk Revit BIM)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-012-RVT',
      projectId,
      workspaceId: wsCad,
      title: '[RVT] Royal Protocol Hospitality Majlis BIM Project (Revit 2026)',
      description: 'Autodesk Revit architectural model including MEP conduits, chilled-water HVAC plenums, and acoustic partitions.',
      fileExtension: '.rvt',
      fileName: 'Royal_Hospitality_Compound_Master.rvt',
      mimeType: 'application/octet-stream',
      category: 'converted_view',
      viewerEngine: '3d_model',
      discipline: 'architecture',
      department: 'Technical Architecture & Engineering',
      assetType: '3d_model',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Nadia Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'internal_review',
      priority: 'high',
      approvalPurpose: 'concept',
      confidentiality: 'strict_confidential',
      clientVisibility: true,
      zones: ['Zone 3: VIP Royal Compound'],
      locations: ['Majlis Buildings 1-3'],
      tags: ['RVT', 'Revit', 'BIM', 'Architecture', 'HVAC'],
      sizeBytes: 165 * 1024 * 1024,
      sampleData: 'REVIT-2026-NATIVE-BIM-COMPOUND-BINARY-STREAM-E3-EOS',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('RVT_MAJLIS_REV_A'),
          storageUrl: `designs/DES-ALL-012-RVT-RevA.rvt`,
          fileName: 'Royal_Hospitality_Compound_Master.rvt',
          uploadedBy: 'Nadia Mansour',
          uploadedAt: '2026-09-06T12:00:00Z',
          notes: 'Master architectural scheme with HVAC plenums and acoustic partitions.',
          releaseStatus: 'internal_review',
        },
      ],
      savedViewpoints: [
        { id: 'vp-rvt-front', name: 'Majlis Façade Elevation', yaw: 0, pitch: 0, zoomLevel: 100, authorName: 'Nadia Mansour', createdAt: '2026-09-06T13:00:00Z' },
      ],
      pins: [
        {
          id: 'pin-rvt-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 45,
          yPercent: 38,
          threeDCoordinates: { x: -10, y: -25, z: 5 },
          title: 'Concealed HVAC Acoustic Baffle',
          discipline: 'architecture',
          priority: 'high',
          status: 'open',
          visibility: 'client_visible',
          assigneeName: 'Nadia Mansour',
          comments: [
            {
              id: 'c-rvt-1',
              authorId: 'u-nadia',
              authorName: 'Nadia Mansour',
              message: 'Sound pressure level must not exceed NC-25 within Majlis.',
              visibility: 'client_visible',
              createdAt: '2026-09-06T13:30:00Z',
            },
          ],
          createdAt: '2026-09-06T13:00:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 13. AI (.ai) - Converted Derivative View (Adobe Illustrator)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-013-AI',
      projectId,
      workspaceId: wsBranding,
      title: '[AI] Boulevard Lamppost Banner Suite & Typographic Badges',
      description: 'Adobe Illustrator master package with spot UV layers, gold foil die-cuts, and bilingual Arabic/English typography.',
      fileExtension: '.ai',
      fileName: 'Grand_Boulevard_Lamppost_Banners_12x3m.ai',
      mimeType: 'application/postscript',
      category: 'converted_view',
      viewerEngine: 'pdf_plan',
      discipline: 'graphic_creative',
      department: 'Creative Direction & Branding',
      assetType: 'branding_collateral',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Nadia Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'approved_for_production',
      priority: 'medium',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Boulevard'],
      locations: ['Lampposts LP-01 to LP-48'],
      tags: ['AI', 'Illustrator', 'Branding', 'Graphics', 'Foil'],
      sizeBytes: 85 * 1024 * 1024,
      sampleData: '%!PS-Adobe-3.0\n%%Creator: Adobe Illustrator 28.0\n%%Title: Grand_Boulevard_Lamppost_Banners_12x3m.ai\n%%EndComments\n',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('AI_BANNERS_REV_A'),
          storageUrl: `designs/DES-ALL-013-AI-RevA.ai`,
          fileName: 'Grand_Boulevard_Lamppost_Banners_12x3m.ai',
          uploadedBy: 'Nadia Mansour',
          uploadedAt: '2026-09-07T11:00:00Z',
          notes: 'Color profile ISO Coated v2 (ECI) with spot gold foil layer.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [
        {
          id: 'pin-ai-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 50,
          yPercent: 30,
          title: 'Embossed Gold Foil Registration',
          discipline: 'graphic_creative',
          priority: 'medium',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Nadia Mansour',
          comments: [
            {
              id: 'c-ai-1',
              authorId: 'u-nadia',
              authorName: 'Nadia Mansour',
              message: 'Registration marks confirmed with print house.',
              visibility: 'client_visible',
              createdAt: '2026-09-07T12:00:00Z',
            },
          ],
          createdAt: '2026-09-07T11:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 14. PSD (.psd) - Converted Derivative View (Adobe Photoshop Key Visual)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-014-PSD',
      projectId,
      workspaceId: wsBranding,
      title: '[PSD] Ceremonial Night Finale Atmosphere & Haze Master Composite',
      description: 'Layered Photoshop composite combining 3D stage renders, volumetric searchlight beams, drone fireworks, and audience crowd textures.',
      fileExtension: '.psd',
      fileName: 'Opening_Ceremony_Stage_Atmosphere_Master.psd',
      mimeType: 'image/vnd.adobe.photoshop',
      category: 'converted_view',
      viewerEngine: '2d_image',
      discipline: 'scenic',
      department: 'Creative Direction & Branding',
      assetType: 'visual_render',
      projectPhase: 'Stage 03: Concept Scheme',
      ownerName: 'Nadia Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'client_approved',
      priority: 'high',
      approvalPurpose: 'concept',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Stage'],
      locations: ['Stage Skyward Axis'],
      tags: ['PSD', 'Photoshop', 'Composite', 'Lighting', 'Visual'],
      sizeBytes: 320 * 1024 * 1024,
      sampleData: '8BPS-PHOTOSHOP-LAYERED-DOCUMENT-HEADER-E3-EOS-ATMOSPHERE-COMPOSITE',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('PSD_COMPOSITE_REV_A'),
          storageUrl: `designs/DES-ALL-014-PSD-RevA.psd`,
          fileName: 'Opening_Ceremony_Stage_Atmosphere_Master.psd',
          uploadedBy: 'Nadia Mansour',
          uploadedAt: '2026-09-04T16:00:00Z',
          notes: 'Master 16-bit ProPhoto RGB art composite.',
          releaseStatus: 'client_approved',
        },
      ],
      pins: [
        {
          id: 'pin-psd-1',
          pinNumber: 1,
          revisionCode: 'Rev A',
          xPercent: 72,
          yPercent: 22,
          title: 'Skyward Searchlight Beam Convergence',
          discipline: 'lighting',
          priority: 'medium',
          status: 'resolved',
          visibility: 'client_visible',
          assigneeName: 'Sami Jarrah',
          comments: [
            {
              id: 'c-psd-1',
              authorId: 'u-sami',
              authorName: 'Sami Jarrah',
              message: 'Convergence matches the 4,000W xenon architectural searchlight layout.',
              visibility: 'client_visible',
              createdAt: '2026-09-04T17:00:00Z',
            },
          ],
          createdAt: '2026-09-04T16:30:00Z',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // 15. CALC (.calc) - Download Only (Engineering Calculations)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-015-CALC',
      projectId,
      workspaceId: wsSpecs,
      title: '[CALC] 75 km/h Gust Dynamic Wind Load & Overturning Moment Analysis',
      description: 'Certified structural engineer spreadsheet calculating ballast deadweights, soil bearing pressure, and factor of safety (1.85).',
      fileExtension: '.calc',
      fileName: 'Gantry_Dynamic_Wind_Load_75kmh_PE_Certified.calc',
      mimeType: 'application/vnd.sun.xml.calc',
      category: 'download_only',
      viewerEngine: 'download_fallback',
      discipline: 'structural',
      department: 'Commercial & Structural Governance',
      assetType: 'engineering_calculation',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Eng. Hisham Al-Kuwari',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'approved_for_production',
      priority: 'urgent',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['Zone 1: Ceremonial Boulevard'],
      locations: ['Main Arch Axis A-1'],
      tags: ['CALC', 'WindLoad', 'Structural', 'Engineering', 'CivilDefence'],
      sizeBytes: 4 * 1024 * 1024,
      sampleData: 'E3-EOS STRUCTURAL CALCULATION SHEET: WIND LOAD & DYNAMIC OVERTURNING MOMENT\nProject: PRJ-TEST-ALL-FORMATS\nStandard: Eurocode 1 (EN 1991-1-4) & Qatar Construction Specifications (QCS 2014)\nBasic Wind Velocity (Vb,0): 28.0 m/s\nPeak Gust Wind Speed (Vp): 75.0 km/h (20.8 m/s)\nTerrain Category: II (Open terrain with low vegetation)\nStructural Drag Coefficient (Cf): 1.35\nTotal Frontal Projected Surface Area (Af): 142.5 m²\nCalculated Dynamic Wind Force (Fw): 87.4 kN\nOverturning Moment at Base (Mot): 437.0 kNm\nRestoring Deadweight Moment Required (Mr): 808.5 kNm (Factor of Safety = 1.85)\nMinimum Concrete Ballast Required per Column: 4 x 4,500 kg (18,000 kg total)\nCertification: Certified by Eng. Hisham Al-Kuwari (PE #QA-8942)\nCivil Defence Reference: QCDD-STR-2026-9921\n',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('CALC_WIND_REV_A'),
          storageUrl: `designs/DES-ALL-015-CALC-RevA.calc`,
          fileName: 'Gantry_Dynamic_Wind_Load_75kmh_PE_Certified_RevA.calc',
          uploadedBy: 'Eng. Hisham Al-Kuwari',
          uploadedAt: '2026-09-02T14:00:00Z',
          notes: 'Preliminary wind calculation based on 60 km/h nominal wind.',
          releaseStatus: 'internal_review',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('CALC_WIND_REV_B'),
          storageUrl: `designs/DES-ALL-015-CALC.calc`,
          fileName: 'Gantry_Dynamic_Wind_Load_75kmh_PE_Certified.calc',
          uploadedBy: 'Eng. Hisham Al-Kuwari',
          uploadedAt: '2026-09-08T16:00:00Z',
          notes: 'Upgraded to 75 km/h gust threshold per Civil Defence mandatory mandate.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [],
    },

    // -------------------------------------------------------------------------
    // 16. XLSX (.xlsx) - Download Only (Master Production BOQ)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-016-XLSX',
      projectId,
      workspaceId: wsSpecs,
      title: '[XLSX] Master Production BOQ, Hardware Line Items & Unit Costs',
      description: 'Excel workbook containing 248 lines of truss sections, motor hoists, shackles, power distribution, and crew rate cards.',
      fileExtension: '.xlsx',
      fileName: 'Production_Rigging_and_Staging_Master_BOQ_RevB.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      category: 'download_only',
      viewerEngine: 'download_fallback',
      discipline: 'procurement',
      department: 'Commercial & Structural Governance',
      assetType: 'boq_specification',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Zaid Mansour',
      currentRevisionCode: 'Rev B',
      currentVersionNumber: 2,
      currentStatus: 'approved_for_production',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['All Zones'],
      locations: ['Warehouse & Site'],
      tags: ['XLSX', 'BOQ', 'Excel', 'Procurement', 'Costs', 'Hardware'],
      sizeBytes: 6 * 1024 * 1024,
      sampleData: 'Item No,Discipline,Description,Quantity,Unit,Unit Price (QAR),Total Price (QAR),Supplier,Status\nBOQ-STG-001,Staging,Prolyte StageDex TopDeck 2x1m Heavy Duty Platform,120,PCS,450.00,54000.00,Global Staging Ltd,Delivered\nBOQ-STG-002,Staging,Telescopic Leg 80-140cm with Spindle,480,PCS,125.00,60000.00,Global Staging Ltd,Delivered\nBOQ-RIG-001,Rigging,Eurotruss FD34 3m Square Truss Section,64,PCS,850.00,54400.00,Rigging Solutions QA,In Warehouse\nBOQ-RIG-002,Rigging,CM Lodestar 1-Ton Electric Chain Hoist D8+,16,PCS,4200.00,67200.00,Rigging Solutions QA,Certified\nBOQ-AV-001,Audio-Visual,Unilumin 3.9mm Outdoor LED Panel 500x500mm,480,PCS,1100.00,528000.00,AV Matrix Gulf,Tested\nBOQ-PWR-001,Power,400kVA Ultra-Silent Sync Generator Twin Pack,2,SETS,85000.00,170000.00,Energy Power Qatar,Mobilized\n',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('XLSX_BOQ_REV_A'),
          storageUrl: `designs/DES-ALL-016-XLSX-RevA.xlsx`,
          fileName: 'Production_Rigging_and_Staging_Master_BOQ_RevA.xlsx',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-03T09:00:00Z',
          notes: 'Preliminary budget line item quantities.',
          releaseStatus: 'internal_review',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('XLSX_BOQ_REV_B'),
          storageUrl: `designs/DES-ALL-016-XLSX.xlsx`,
          fileName: 'Production_Rigging_and_Staging_Master_BOQ_RevB.xlsx',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-10T14:00:00Z',
          notes: 'Committed unit supplier pricing and freight margins updated.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [],
    },

    // -------------------------------------------------------------------------
    // 17. MPP (.mpp) - Download Only (Microsoft Project Schedule)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-017-MPP',
      projectId,
      workspaceId: wsSpecs,
      title: '[MPP] 14-Day 24/7 Bump-In Gantt Schedule & Crane Allocation',
      description: 'Microsoft Project native file detailing crane pick windows, road closure curfews (22:00–04:00), and acoustic limits.',
      fileExtension: '.mpp',
      fileName: 'Boulevard_BumpIn_Rigging_Sequence_Gantt.mpp',
      mimeType: 'application/vnd.ms-project',
      category: 'download_only',
      viewerEngine: 'download_fallback',
      discipline: 'operations',
      department: 'Commercial & Structural Governance',
      assetType: 'schedule_baseline',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Zaid Mansour',
      currentRevisionCode: 'Rev A',
      currentVersionNumber: 1,
      currentStatus: 'approved_for_production',
      priority: 'high',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['All Zones'],
      locations: ['Boulevard Gantry G1-G6'],
      tags: ['MPP', 'MSProject', 'Gantt', 'Schedule', 'Logistics', 'BumpIn'],
      sizeBytes: 8 * 1024 * 1024,
      sampleData: 'MICROSOFT PROJECT SCHEDULE EXPORT: BOULEVARD BUMP-IN SEQUENCE\nTask ID,Task Name,Duration,Start Date,Finish Date,Predecessors,Assigned Crew,Acoustic Limit\n1,Site Possession & Geotechnical Survey,1 day,2026-11-01,2026-11-01,-,Survey Team,Daytime (85 dBA)\n2,Road Closure & Traffic Diversion,0.5 days,2026-11-01,2026-11-01,1,Traffic Control,Daytime (85 dBA)\n3,Ground Ballast Placement (18T),2 days,2026-11-02,2026-11-03,2,Rigging Crew A,Night Limiting (55 dBA)\n4,Main Arch Truss Assembly on Ground,3 days,2026-11-03,2026-11-05,3,Steel Riggers,Night Limiting (55 dBA)\n5,Dual Crane Tandem Pick & Vertical Lift,1 day,2026-11-06,2026-11-06,4,Crane Specialist,Daytime (85 dBA)\n6,Tie-In Guy Wires & Anchor Tensioning,1 day,2026-11-07,2026-11-07,5,PE Inspector,Daytime (85 dBA)\n7,Civil Defence & Structural PE Sign-Off,1 day,2026-11-08,2026-11-08,6,Civil Defence,Inspection\n',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('MPP_SCHEDULE_REV_A'),
          storageUrl: `designs/DES-ALL-017-MPP-RevA.mpp`,
          fileName: 'Boulevard_BumpIn_Rigging_Sequence_Gantt.mpp',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-05T17:00:00Z',
          notes: 'Master baseline bump-in schedule aligned with Ministry of Interior road permit.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [],
    },

    // -------------------------------------------------------------------------
    // 18. ZIP (.zip) - Download Only (Production Release Archive)
    // -------------------------------------------------------------------------
    {
      id: 'DES-ALL-018-ZIP',
      projectId,
      workspaceId: wsSpecs,
      title: '[ZIP] Master Stage 04 Production Release Sealed Archive',
      description: 'Complete zipped transmission package including source DWG, IFC, calculations, PE sign-off stamp, and Civil Defence permit.',
      fileExtension: '.zip',
      fileName: 'PRJ-TEST-ALL-FORMATS_Stage04_Approved_Package.zip',
      mimeType: 'application/zip',
      category: 'download_only',
      viewerEngine: 'download_fallback',
      discipline: 'staging',
      department: 'Commercial & Structural Governance',
      assetType: 'production_archive',
      projectPhase: 'Stage 04: Detailed Design',
      ownerName: 'Zaid Mansour',
      currentRevisionCode: 'Rev C',
      currentVersionNumber: 3,
      currentStatus: 'approved_for_production',
      priority: 'urgent',
      approvalPurpose: 'approved_for_fabrication',
      confidentiality: 'internal',
      clientVisibility: true,
      zones: ['All Zones'],
      locations: ['Master Release Archive'],
      tags: ['ZIP', 'Archive', 'Production', 'Sealed', 'Release'],
      sizeBytes: 240 * 1024 * 1024,
      sampleData: 'PK\x03\x04-E3-EOS-PRODUCTION-ARCHIVE-PRJ-TEST-ALL-FORMATS-STAGE-04-RELEASE-ZIP-PACKAGE',
      revisions: [
        {
          revisionCode: 'Rev A',
          versionNumber: 1,
          contentHash: safeSha256('ZIP_PACKAGE_REV_A'),
          storageUrl: `designs/DES-ALL-018-ZIP-RevA.zip`,
          fileName: 'PRJ-TEST-ALL-FORMATS_Stage04_RevA.zip',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-02T18:00:00Z',
          notes: 'Initial concept archive.',
          releaseStatus: 'internal_review',
        },
        {
          revisionCode: 'Rev B',
          versionNumber: 2,
          contentHash: safeSha256('ZIP_PACKAGE_REV_B'),
          storageUrl: `designs/DES-ALL-018-ZIP-RevB.zip`,
          fileName: 'PRJ-TEST-ALL-FORMATS_Stage04_RevB.zip',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-07T19:00:00Z',
          notes: 'Detailed engineering submission package.',
          releaseStatus: 'client_review',
        },
        {
          revisionCode: 'Rev C',
          versionNumber: 3,
          contentHash: safeSha256('ZIP_PACKAGE_REV_C'),
          storageUrl: `designs/DES-ALL-018-ZIP.zip`,
          fileName: 'PRJ-TEST-ALL-FORMATS_Stage04_Approved_Package.zip',
          uploadedBy: 'Zaid Mansour',
          uploadedAt: '2026-09-12T18:00:00Z',
          notes: 'Sealed final release package with Civil Defence approval stamp.',
          releaseStatus: 'approved_for_production',
        },
      ],
      pins: [],
    },
  ];
}
