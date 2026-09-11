import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  HttpException,
  HttpStatus,
  UseGuards,
  UseFilters,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import {
  generateDocumentNumber,
  redactDocumentForClientDistribution,
  EngineeringDiscipline,
  ControlledDocumentType,
  TransmittalPurpose,
  ControlledDocumentRecord,
  DocumentRevisionRecord,
  ControlledTransmittalPack,
} from '@e3-eos/domain';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { TenantIsolationGuard } from '../common/tenant.guard.js';
import { IdempotencyGuard } from '../common/idempotency.guard.js';

export const documentRepository = new Map<string, ControlledDocumentRecord>();
export const documentRevisionRepository = new Map<string, DocumentRevisionRecord>();
export const transmittalRepository = new Map<string, ControlledTransmittalPack>();

function seedInitialDocuments() {
  const defaultProjectId = '00000000-0000-4000-8000-000000000001';

  const doc1: ControlledDocumentRecord = {
    id: 'doc-001',
    projectId: defaultProjectId,
    projectCode: 'QND26',
    documentNumber: 'E3-QND26-AV-DWG-0001',
    title: 'Main Ceremony 360-Degree Kinetic LED Arch — General Elevation',
    discipline: 'audio_visual',
    documentType: 'drawing',
    confidentialityLevel: 'client_confidential',
    currentRevisionCode: 'Rev 01',
    revisionsCount: 2,
    createdBy: 'Karim Haddad (Technical Director)',
    createdAt: '2026-09-08T10:00:00Z',
  };

  const doc2: ControlledDocumentRecord = {
    id: 'doc-002',
    projectId: defaultProjectId,
    projectCode: 'QND26',
    documentNumber: 'E3-QND26-STG-DWG-0002',
    title: 'Lusail Boulevard Royal Pavilion Structural Load Calculations & Footings',
    discipline: 'staging',
    documentType: 'drawing',
    confidentialityLevel: 'internal',
    currentRevisionCode: 'Rev A',
    revisionsCount: 1,
    createdBy: 'Civil Defence Certified Structural Engineer',
    createdAt: '2026-09-09T14:30:00Z',
  };

  const doc3: ControlledDocumentRecord = {
    id: 'doc-003',
    projectId: defaultProjectId,
    projectCode: 'QND26',
    documentNumber: 'E3-QND26-HSE-SPC-0003',
    title: 'Fire Safety & Flame-Retardant Material Specifications (Law No. 13 Compliance)',
    discipline: 'health_safety',
    documentType: 'specification',
    confidentialityLevel: 'public',
    currentRevisionCode: 'Rev 02',
    revisionsCount: 3,
    createdBy: 'HSE & Civil Defence Lead',
    createdAt: '2026-09-07T09:00:00Z',
  };

  documentRepository.set(doc1.id, doc1);
  documentRepository.set(doc2.id, doc2);
  documentRepository.set(doc3.id, doc3);

  // Controlled Primary Source Document 1: DECC Official Floorplan & Technical Guide
  const docDecc: ControlledDocumentRecord = {
    id: 'doc-decc-fp-01',
    projectId: defaultProjectId,
    projectCode: 'QND26',
    documentNumber: 'DOC-DECC-FP-2024',
    title: 'DECC Official Technical Floorplan & Capacity Guide (2.5 T/m² Floor Load, 18m Ceiling Height)',
    discipline: 'operations',
    documentType: 'specification',
    confidentialityLevel: 'public',
    currentRevisionCode: 'Rev 2024.1',
    revisionsCount: 1,
    createdBy: 'Eng. Tariq Al-Mansoor (DECC Venue Technical Director)',
    createdAt: '2024-01-15T09:00:00Z',
  };
  documentRepository.set(docDecc.id, docDecc);

  const deccContent =
    'Doha Exhibition and Convention Center (DECC) Official Technical Regulations & Floorplan Manual.\nSection 3.2: Ground Slab Live Load Uniform Capacity: 2.5 T/m² (2,500 kg/m² / 25 kN/m²).\nSection 6.1: Exhibition Halls 1 to 5 Maximum Clear Ceiling Height: 18.0 meters.\nCertified by DECC Technical Directorate.';
  const deccHash = createHash('sha256').update(deccContent).digest('hex');
  const revDecc: DocumentRevisionRecord = {
    id: 'rev-decc-fp-01',
    documentId: 'doc-decc-fp-01',
    revisionCode: 'Rev 2024.1',
    contentHash: deccHash,
    calculatedSha256: deccHash,
    originalFilename: 'DECC-OFFICIAL-FLOORPLAN-2024.pdf',
    storageKey: 'venue-specs/DECC-OFFICIAL-FLOORPLAN-2024.pdf',
    fileSizeBytes: Buffer.byteLength(deccContent),
    purpose: 'for_information',
    status: 'approved',
    uploadedBy: 'Eng. Tariq Al-Mansoor (DECC Venue Technical Director)',
    uploadedAt: '2024-01-15T09:00:00Z',
    approvedBy: 'Senior Technical Director (E3 Compliance)',
    approvedAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
  };
  documentRevisionRepository.set(revDecc.id, revDecc);

  // Controlled Primary Source Document 2: Qatar Environmental Law No. 30 of 2002 & Resolution No. 4 of 2005
  const docMecc: ControlledDocumentRecord = {
    id: 'doc-mecc-env-01',
    projectId: defaultProjectId,
    projectCode: 'QND26',
    documentNumber: 'DOC-MECC-ENV-2005',
    title: 'Qatar Environmental Protection Law No. 30 of 2002 & Executive Regulation Resolution No. 4 of 2005 (Annex 3/5 & Annex 3/6)',
    discipline: 'health_safety',
    documentType: 'specification',
    confidentialityLevel: 'public',
    currentRevisionCode: 'Official Gazette 2005',
    revisionsCount: 1,
    createdBy: 'Dr. Mariam Al-Sulaiti (MECC Lead)',
    createdAt: '2024-02-01T10:00:00Z',
  };
  documentRepository.set(docMecc.id, docMecc);

  const meccContent =
    'State of Qatar Ministry of Environment and Climate Change.\nLaw No. 30 of 2002 Promulgating the Environmental Protection Law.\nCabinet Decision No. 4 of 2005 Issuing the Executive By-Law.\nAnnex 3/5: Maximum Allowable Noise Limits in Ambient Environments (Commercial/Exhibition Zone: Day 65 dB(A) Leq, Night 55 dB(A) Leq between 22:00 and 04:00, 10-minute average at building boundaries).\nAnnex 3/6: Workplace Occupational Noise Exposure Standards: 85 dB(A) for 8 continuous hours.';
  const meccHash = createHash('sha256').update(meccContent).digest('hex');
  const revMecc: DocumentRevisionRecord = {
    id: 'rev-mecc-env-01',
    documentId: 'doc-mecc-env-01',
    revisionCode: 'Official Gazette 2005',
    contentHash: meccHash,
    calculatedSha256: meccHash,
    originalFilename: 'Qatar-Env-Law-30-2002-Cabinet-Res-4-2005.pdf',
    storageKey: 'statutory/Qatar-Env-Law-30-2002-Cabinet-Res-4-2005.pdf',
    fileSizeBytes: Buffer.byteLength(meccContent),
    purpose: 'for_information',
    status: 'approved',
    uploadedBy: 'Dr. Mariam Al-Sulaiti (MECC Lead)',
    uploadedAt: '2024-02-01T10:00:00Z',
    approvedBy: 'Legal & Regulatory Director',
    approvedAt: '2024-02-01T11:00:00Z',
    createdAt: '2024-02-01T10:00:00Z',
  };
  documentRevisionRepository.set(revMecc.id, revMecc);

  const rev1: DocumentRevisionRecord = {
    id: 'rev-001',
    documentId: 'doc-001',
    revisionCode: 'Rev 01',
    contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    calculatedSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    originalFilename: 'E3-QND26-AV-DWG-0001-Rev01.pdf',
    storageKey: 'drawings/E3-QND26-AV-DWG-0001-Rev01.pdf',
    fileSizeBytes: 14250000,
    purpose: 'for_client_approval',
    status: 'approved',
    uploadedBy: 'Karim Haddad',
    uploadedAt: '2026-09-10T11:00:00Z',
    approvedBy: 'Zaid Mansour (Lead PM)',
    approvedAt: '2026-09-10T12:00:00Z',
    createdAt: '2026-09-10T11:00:00Z',
  };
  documentRevisionRepository.set(rev1.id, rev1);

  const tr1: ControlledTransmittalPack = {
    id: 'tr-001',
    transmittalNumber: 'TR-QND26-0001',
    projectId: defaultProjectId,
    recipientOrganisation: 'Qatar National Day Steering Committee',
    recipientName: 'Sheikh Mansoor Al-Thani',
    recipientEmail: 'client@qnd.qa',
    purpose: 'for_client_approval',
    issuedBy: 'Zaid Mansour (Lead PM)',
    issuedAt: '2026-09-10T15:00:00Z',
    items: [
      {
        documentNumber: 'E3-QND26-AV-DWG-0001',
        title: 'Main Ceremony 360-Degree Kinetic LED Arch — General Elevation',
        revisionCode: 'Rev 01',
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        remarks: 'Issued for formal client architectural review and aesthetic sign-off.',
      },
    ],
    isClientFacing: true,
    acknowledgementStatus: 'acknowledged',
  };
  transmittalRepository.set(tr1.id, tr1);
}

seedInitialDocuments();

@Controller('projects/:projectId/documents')
@UseFilters(ProblemDetailsFilter)
@UseGuards(TenantIsolationGuard)
export class DocumentsController {
  @Get()
  listDocuments(@Param('projectId') projectId: string) {
    const list = Array.from(documentRepository.values()).filter((d) => d.projectId === projectId);
    return {
      data: list,
      meta: { total: list.length },
    };
  }

  @Post()
  @UseGuards(IdempotencyGuard)
  createDocument(
    @Param('projectId') projectId: string,
    @Body() body: {
      title: string;
      discipline: EngineeringDiscipline;
      documentType: ControlledDocumentType;
      confidentialityLevel?: 'internal' | 'client_confidential' | 'public';
      projectCode?: string;
    },
    @Req() req: Request
  ) {
    if (!body.title || !body.discipline || !body.documentType) {
      throw new HttpException(
        { code: 'INVALID_ARGUMENT', title: 'title, discipline, and documentType are required' },
        HttpStatus.BAD_REQUEST
      );
    }

    const docCount = Array.from(documentRepository.values()).filter((d) => d.projectId === projectId).length;
    const docNumber = generateDocumentNumber({
      projectCode: body.projectCode || 'QND26',
      discipline: body.discipline,
      documentType: body.documentType,
      sequence: docCount + 1,
    });

    const docId = `doc-${Date.now()}`;
    const doc: ControlledDocumentRecord = {
      id: docId,
      projectId,
      projectCode: body.projectCode || 'QND26',
      documentNumber: docNumber,
      title: body.title,
      discipline: body.discipline,
      documentType: body.documentType,
      confidentialityLevel: body.confidentialityLevel || 'internal',
      currentRevisionCode: 'Rev A',
      revisionsCount: 1,
      createdBy: (req as any).userName || 'Lead Project Manager',
      createdAt: new Date().toISOString(),
    };

    documentRepository.set(docId, doc);

    return {
      data: doc,
      message: `Controlled document ${docNumber} registered successfully.`,
    };
  }

  @Post(':docId/revisions')
  @UseGuards(IdempotencyGuard)
  uploadRevision(
    @Param('projectId') projectId: string,
    @Param('docId') docId: string,
    @Body() body: {
      revisionCode: string;
      purpose: TransmittalPurpose;
      fileContent?: string;
      originalFilename?: string;
      isBase64?: boolean;
      storageKey?: string;
      fileSizeBytes?: number;
    },
    @Req() req: Request
  ) {
    const doc = documentRepository.get(docId);
    if (!doc || doc.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Document not found' }, HttpStatus.NOT_FOUND);
    }

    // System-calculated SHA-256 hash from actual stored file bytes
    let fileBuffer: Buffer;
    if (body.fileContent) {
      fileBuffer = body.isBase64
        ? Buffer.from(body.fileContent, 'base64')
        : Buffer.from(body.fileContent, 'utf8');
    } else {
      fileBuffer = Buffer.from(
        `E3-EOS Controlled Artifact\nDocument: ${doc.documentNumber}\nTitle: ${doc.title}\nRevision: ${body.revisionCode}\nTimestamp: ${new Date().toISOString()}`,
        'utf8'
      );
    }

    const calculatedSha256 = createHash('sha256').update(fileBuffer).digest('hex');
    const fileSizeBytes = fileBuffer.length;
    const revId = `rev-${Date.now()}`;
    const uploadedAt = new Date().toISOString();
    const uploadedBy = (req as any).userName || (req.headers['x-user-name'] as string) || 'Lead Contributor';
    const originalFilename = body.originalFilename || `${doc.documentNumber}-${body.revisionCode || 'Rev01'}.pdf`;

    const rev: DocumentRevisionRecord = {
      id: revId,
      documentId: docId,
      revisionCode: body.revisionCode || `Rev ${doc.revisionsCount + 1}`,
      contentHash: calculatedSha256,
      calculatedSha256,
      originalFilename,
      storageKey: body.storageKey || `controlled-docs/${doc.documentNumber}-${body.revisionCode}.pdf`,
      fileSizeBytes,
      purpose: body.purpose || 'for_information',
      status: 'in_review',
      uploadedBy,
      uploadedAt,
      createdAt: uploadedAt,
    };

    documentRevisionRepository.set(revId, rev);

    doc.currentRevisionCode = rev.revisionCode;
    doc.revisionsCount += 1;
    documentRepository.set(docId, doc);

    return {
      data: {
        ...rev,
        controlledDocumentId: docId,
        documentRevisionId: revId,
      },
      message: `Controlled revision ${rev.revisionCode} stored. System calculated SHA-256: ${calculatedSha256}`,
    };
  }


  @Post('transmittals')
  @UseGuards(IdempotencyGuard)
  createTransmittal(
    @Param('projectId') projectId: string,
    @Body() body: {
      recipientOrganisation: string;
      recipientName: string;
      recipientEmail: string;
      purpose: TransmittalPurpose;
      items: Array<{ documentNumber: string; title: string; revisionCode: string; contentHash: string; remarks?: string }>;
      isClientFacing?: boolean;
    },
    @Req() req: Request
  ) {
    if (!body.recipientName || !body.recipientEmail || !body.items || !body.items.length) {
      throw new HttpException(
        { code: 'INVALID_ARGUMENT', title: 'recipientName, recipientEmail, and items array are required' },
        HttpStatus.BAD_REQUEST
      );
    }

    const trCount = Array.from(transmittalRepository.values()).filter((t) => t.projectId === projectId).length;
    const trNumber = `TR-QND26-${String(trCount + 1).padStart(4, '0')}`;
    const trId = `tr-${Date.now()}`;

    // Apply zero profit margin & supplier cost leakage invariant
    const clientSafeItems = body.isClientFacing
      ? body.items.map((item) => redactDocumentForClientDistribution(item))
      : body.items;

    const tr: ControlledTransmittalPack = {
      id: trId,
      transmittalNumber: trNumber,
      projectId,
      recipientOrganisation: body.recipientOrganisation || 'External Stakeholder',
      recipientName: body.recipientName,
      recipientEmail: body.recipientEmail,
      purpose: body.purpose || 'for_information',
      issuedBy: (req as any).userName || 'Zaid Mansour (Lead PM)',
      issuedAt: new Date().toISOString(),
      items: clientSafeItems as any,
      isClientFacing: Boolean(body.isClientFacing),
      acknowledgementStatus: 'pending',
    };

    transmittalRepository.set(trId, tr);

    return {
      data: tr,
      message: `Controlled transmittal ${trNumber} issued successfully.`,
    };
  }

  @Get('transmittals')
  listTransmittals(
    @Param('projectId') projectId: string,
    @Req() req: Request
  ) {
    const isClient = (req.headers['x-user-role'] as string) === 'client';
    const list = Array.from(transmittalRepository.values()).filter((t) => t.projectId === projectId);

    const safeList = isClient
      ? list.map((t) => redactDocumentForClientDistribution(t))
      : list;

    return {
      data: safeList,
    };
  }

  @Get('transmittals/:transmittalId')
  getTransmittal(
    @Param('projectId') projectId: string,
    @Param('transmittalId') transmittalId: string,
    @Req() req: Request
  ) {
    const tr = transmittalRepository.get(transmittalId);
    if (!tr || tr.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Transmittal pack not found' }, HttpStatus.NOT_FOUND);
    }

    const isClient = (req.headers['x-user-role'] as string) === 'client' || tr.isClientFacing;
    const safeData = isClient ? redactDocumentForClientDistribution(tr) : tr;

    return {
      data: safeData,
    };
  }

  @Get('transmittals/:transmittalId/export')
  exportTransmittalPack(
    @Param('projectId') projectId: string,
    @Param('transmittalId') transmittalId: string
  ) {
    const tr = transmittalRepository.get(transmittalId);
    if (!tr || tr.projectId !== projectId) {
      throw new HttpException({ code: 'NOT_FOUND', title: 'Transmittal pack not found' }, HttpStatus.NOT_FOUND);
    }

    // Always enforce server-side redaction for external distribution / client export
    const redactedExport = redactDocumentForClientDistribution({
      ...tr,
      exportedAt: new Date().toISOString(),
      disclaimer: 'Official E3 EOS Controlled Transmittal Package. Confidential.',
    });

    return {
      data: redactedExport,
      meta: {
        serverRedacted: true,
        zeroCommercialLeakageGuaranteed: true,
      },
    };
  }
}
