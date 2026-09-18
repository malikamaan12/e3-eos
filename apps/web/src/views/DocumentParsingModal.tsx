import React, { useState, useRef } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';
import { DocumentIntelligenceWorkspace } from './DocumentIntelligenceWorkspace.js';

interface DocumentParsingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCandidateApproved?: () => void;
  onCandidatesApproved?: () => void;
}

const SAMPLE_TENDER_TEXT = `SECTION 4.2: KINETIC SCENIC LIGHTING ARCHITECTURE
Clause 4.2.1: The contractor shall engineer, fabricate, and install a continuous 360-degree motorized kinetic LED arch spanning the Lusail Boulevard central court (approx. 45 meters span).
The installation must be fully commissioned and certified by Civil Defense no later than 2026-11-15.
Dual certified secondary safety steels rated for 150% dynamic load must be inspected by a certified structural engineer.
Contractor responsibility: Complete mechanical rigging, dynamic winch control systems, and DMX integration.
Estimated Quantity: 1 complete architectural installation.

SECTION 5.1: AUDIO DISTRIBUTION & DELAY TOWERS
Clause 5.1.3: Audio coverage along the 1.2km boulevard corridor requires 12 synchronized weatherproof line-array delay towers with cardioid sub-bass arrays.
Delivery and site positioning to commence by 2026-11-01 under coordination with Ministry of Interior traffic management.
Acoustic spill into adjacent residential zones must not exceed 65 dBA at boundary lines.
Quantity: 12 tower units.

SECTION 8.4: VIP PROTOCOL CANOPY & SHADING
Clause 8.4.2: Temporary tensile fabric canopy structure for the Main Amiri Pavilion.
Ambiguity Notice: Tender drawings indicate tensile canopy fabric to be provided by Venue Authorities, while specification notes require contractor supply of fire-retardant B1 fabric.
Target Handover Date: 2026-11-20.`;

/**
 * Extracts readable text from any document format in the browser without external binaries.
 */
async function extractTextFromUploadedFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  // Plain text, markdown, CSV, TSV, JSON, XML, HTML, RTF
  if (['txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'html', 'htm', 'rtf'].includes(extension)) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read text document'));
      reader.readAsText(file);
    });
  }

  // Word (.docx)
  if (extension === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8');
      const rawString = decoder.decode(uint8);
      const wtRegex = /<w:t[^>]*>(.*?)<\/w:t>/g;
      const extractedWords: string[] = [];
      let match;
      while ((match = wtRegex.exec(rawString)) !== null) {
        if (match[1]) extractedWords.push(match[1]);
      }
      if (extractedWords.length > 0) {
        return extractedWords.join(' ').replace(/\s{2,}/g, ' ');
      }
    } catch {
      // Fallback below
    }
  }

  // PDF (.pdf)
  if (extension === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('latin1');
      const rawString = decoder.decode(uint8);

      const textBlocks: string[] = [];
      const btEtRegex = /BT[\s\S]*?ET/g;
      let match;
      while ((match = btEtRegex.exec(rawString)) !== null) {
        const block = match[0];
        const stringMatches = block.match(/\(([^()]+)\)\s*(?:Tj|'|")/g);
        if (stringMatches) {
          const line = stringMatches
            .map((m) => m.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, ''))
            .join(' ');
          if (line.trim()) textBlocks.push(line);
        } else {
          const tjMatches = block.match(/\[(.*?)\]\s*TJ/g);
          if (tjMatches) {
            tjMatches.forEach((tj) => {
              const innerStrings = tj.match(/\(([^()]+)\)/g);
              if (innerStrings) {
                const text = innerStrings.map((s) => s.slice(1, -1)).join('');
                if (text.trim()) textBlocks.push(text);
              }
            });
          }
        }
      }

      if (textBlocks.length > 0) {
        return textBlocks.join('\n');
      }

      // Filter readable ASCII lines
      const cleaned = rawString
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .split('\n')
        .map((l) => l.trim())
        .filter(
          (l) =>
            l.length > 15 &&
            !l.startsWith('%PDF') &&
            !l.includes('endobj') &&
            !l.includes('xref') &&
            !l.includes('stream')
        );
      if (cleaned.length > 0) {
        return cleaned.join('\n');
      }
    } catch {
      // Fallback
    }
  }

  // Generic fallback: read as text
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => resolve(`[Uploaded document: ${file.name}]`);
    reader.readAsText(file);
  });
}

export const DocumentParsingModal: React.FC<DocumentParsingModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onCandidateApproved,
  onCandidatesApproved,
}) => {
  const triggerApproved = () => {
    if (onCandidateApproved) onCandidateApproved();
    if (onCandidatesApproved) onCandidatesApproved();
  };
  const { apiClient, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [documentName, setDocumentName] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('tender_spec');
  const [rawText, setRawText] = useState<string>('');
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isExtractingFile, setIsExtractingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingJob, setParsingJob] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<'upload' | 'review'>('upload');
  const [showIntelligenceWorkspace, setShowIntelligenceWorkspace] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setDocumentName(file.name);
    setFileSize(sizeStr);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setDocumentType('tender_spec');
    else if (ext === 'docx' || ext === 'doc') setDocumentType('client_rfp');
    else if (ext === 'csv' || ext === 'tsv') setDocumentType('boq_schedule');

    setIsExtractingFile(true);
    try {
      const extracted = await extractTextFromUploadedFile(file);
      setRawText(extracted);
    } catch (err: any) {
      alert(err.message || 'Failed to extract text from file');
    } finally {
      setIsExtractingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setDocumentName('');
    setFileSize(null);
    setRawText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLoadSampleRfp = () => {
    setDocumentName('Lusail_Boulevard_Tender_Specifications_Vol2.pdf');
    setDocumentType('tender_spec');
    setRawText(SAMPLE_TENDER_TEXT);
    setFileSize('18 KB');
  };

  const handleStartParsing = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const job = await apiClient.parseScopeDocument(projectId, {
        documentName: documentName || 'Uploaded_Scope_Document.pdf',
        documentType,
        rawText,
      });
      setParsingJob(job);
      setActiveStep('review');
    } catch (err: any) {
      alert(err.message || 'Failed to parse tender document');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCandidateAction = async (
    candidateId: string,
    action: 'approve' | 'reject' | 'merge' | 'mark_as_clarification',
    extra?: any
  ) => {
    if (!parsingJob) return;
    try {
      const res = await apiClient.reviewScopeParsingCandidate(projectId, parsingJob.id, {
        candidateId,
        action,
        ...extra,
      });

      const updatedCandidates = parsingJob.candidates.map((c: any) =>
        c.id === candidateId
          ? { ...c, reviewStatus: action === 'mark_as_clarification' ? 'marked_as_clarification' : action }
          : c
      );

      setParsingJob({
        ...parsingJob,
        candidates: updatedCandidates,
        approvedCount: res.jobSummary?.approvedCount ?? (parsingJob.approvedCount || 0) + (action === 'approve' ? 1 : 0),
        rejectedCount: res.jobSummary?.rejectedCount ?? parsingJob.rejectedCount,
        clarificationCount: res.jobSummary?.clarificationCount ?? parsingJob.clarificationCount,
      });

      if (action === 'approve') {
        triggerApproved();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute candidate action');
    }
  };

  const handleApproveAll = async () => {
    if (!parsingJob || !parsingJob.candidates) return;
    const pendingIds = parsingJob.candidates
      .filter((c: any) => c.reviewStatus !== 'approved' && c.reviewStatus !== 'rejected')
      .map((c: any) => c.id);

    if (pendingIds.length === 0) return;

    try {
      await apiClient.bulkReviewScopeCandidates(projectId, parsingJob.id, {
        candidateIds: pendingIds,
        action: 'approve',
      });

      const updated = parsingJob.candidates.map((c: any) => ({
        ...c,
        reviewStatus: 'approved',
      }));

      setParsingJob({
        ...parsingJob,
        candidates: updated,
        approvedCount: parsingJob.candidates.length,
      });

      triggerApproved();
      alert(`Approved and created ${pendingIds.length} scope requirements in project register!`);
    } catch (err: any) {
      alert(err.message || 'Failed to bulk approve candidates');
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Tender & RFP Document Parsing Engine">
        <div className="space-y-4 text-slate-100 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveStep('upload')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeStep === 'upload'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Upload Document or Paste Content
              </button>
              <button
                onClick={() => setActiveStep('review')}
                disabled={!parsingJob}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeStep === 'review'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
                }`}
              >
                2. Candidate Extraction Review ({parsingJob?.candidates?.length || 0})
              </button>
            </div>
            {parsingJob && (
              <div className="flex items-center gap-2 text-xs">
                <Button
                  size="sm"
                  onClick={() => setShowIntelligenceWorkspace(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-1 px-2.5 shadow-sm"
                >
                  ⚡ Open Split-View Workspace (19 Queues)
                </Button>
                <span className="text-emerald-400 font-semibold">
                  ✓ {parsingJob.approvedCount} Approved
                </span>
              </div>
            )}
          </div>

          {/* STEP 1: UPLOAD & TEXT INPUT */}
          {activeStep === 'upload' && (
            <div className="space-y-4">
              {/* Document File Drag & Drop Zone */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.docx,.doc,.txt,.md,.rtf,.csv,.tsv,.json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-amber-400 bg-amber-500/10'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70'
                }`}
              >
                <span className="text-3xl mb-2">📑</span>
                <div className="font-semibold text-sm text-slate-200">
                  {isDragging ? 'Drop your RFP / Tender document here' : 'Click to Upload or Drag & Drop Any Document'}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Supports any format: PDF (.pdf), Word (.docx, .doc), Text (.txt, .md), CSV, RTF, or JSON.
                </p>
              </div>

              {/* Uploaded File Chip */}
              {documentName && (
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-sm">✓</span>
                    <span className="font-semibold text-slate-200">{documentName}</span>
                    {fileSize && <span className="text-slate-400">({fileSize})</span>}
                    {isExtractingFile && (
                      <span className="text-amber-400 font-semibold animate-pulse">
                        Extracting document text...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1"
                  >
                    ✕ Remove File
                  </button>
                </div>
              )}

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Source Tender / RFP Document Name
                  </label>
                  <Input
                    value={documentName}
                    onChange={(e: any) => setDocumentName(e.target.value)}
                    placeholder="e.g. Lusail_Boulevard_RFP_Section4.pdf"
                    className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Document Classification
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                  >
                    <option value="tender_spec">Tender Technical Specifications</option>
                    <option value="client_rfp">Client RFP / Scope of Work</option>
                    <option value="technical_addendum">Addendum / Bulletin</option>
                    <option value="boq_schedule">Commercial BOQ Schedule</option>
                  </select>
                </div>
              </div>

              {/* Document Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-400">
                    Extracted Tender Text & Clauses
                  </label>
                  <div className="flex items-center gap-3">
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Clear Text
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLoadSampleRfp}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                    >
                      📋 Load Demo Qatar National Day RFP
                    </button>
                  </div>
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e: any) => setRawText(e.target.value)}
                  rows={10}
                  placeholder="Upload a document above, or paste tender clauses, technical specifications, or RFP excerpts here..."
                  className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-slate-400">
                  Deterministic domain parsing extracts clauses, deliverables, departments, milestones, and responsibilities.
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartParsing}
                  disabled={isParsing || isExtractingFile || !rawText.trim()}
                  className="bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  {isParsing ? 'Parsing Document...' : 'Parse & Extract Candidates →'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW CANDIDATES */}
          {activeStep === 'review' && parsingJob && (
            <div className="space-y-4">
              {/* Header Action Toolbar */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    {parsingJob.candidates?.length || 0} Candidates Extracted
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-400 font-semibold">
                    {parsingJob.approvedCount || 0} Approved & Created
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleApproveAll}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    ✓ Approve All Candidates
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pe-1">
                {parsingJob.candidates.map((cand: any) => {
                  const isApproved = cand.reviewStatus === 'approved';
                  const isRejected = cand.reviewStatus === 'rejected';
                  const isClarification = cand.reviewStatus === 'marked_as_clarification';
                  const isConfidenceHigh = (cand.confidenceScore || 0) >= 0.8;

                  return (
                    <div
                      key={cand.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isApproved
                          ? 'bg-emerald-950/20 border-emerald-800/50'
                          : isRejected
                          ? 'bg-slate-900/50 border-slate-800 opacity-60'
                          : isClarification
                          ? 'bg-amber-950/20 border-amber-800/50'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded">
                              {cand.candidateCode || cand.sourceClause || 'CLAUSE'}
                            </span>
                            <span className="font-bold text-sm text-slate-100">
                              {cand.suggestedTitle || cand.title}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                isConfidenceHigh
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {Math.round((cand.confidenceScore || 0) * 100)}% Confidence
                            </span>
                            <Badge
                              variant={
                                isApproved
                                  ? 'success'
                                  : isRejected
                                  ? 'neutral'
                                  : isClarification
                                  ? 'warning'
                                  : 'info'
                              }
                              size="sm"
                            >
                              {isApproved ? 'Approved & Created' : cand.reviewStatus || 'Unreviewed'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                            {cand.scopeDescription || cand.description || cand.originalWording}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isApproved}
                            onClick={() => handleCandidateAction(cand.id, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-1 px-3"
                          >
                            {isApproved ? '✓ Created' : 'Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isApproved || isClarification}
                            onClick={() => handleCandidateAction(cand.id, 'mark_as_clarification')}
                            className="text-xs py-1 px-2.5 text-amber-300 hover:bg-amber-500/20"
                          >
                            RFI
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isApproved || isRejected}
                            onClick={() => handleCandidateAction(cand.id, 'reject')}
                            className="text-xs py-1 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>

                      {/* Source Citation & Details */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Source: </span>
                          <span className="text-slate-300 font-mono">
                            {cand.sourceClause || cand.sourceSection || 'Section'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Department: </span>
                          <span className="text-slate-200 capitalize">
                            {cand.suggestedDepartment || 'Technical'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Due Date: </span>
                          <span className="text-slate-200">
                            {cand.extractedDates || 'Unspecified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Quantity: </span>
                          <span className="text-slate-200">
                            {cand.extractedQuantities || '1'} {cand.extractedUnit || ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setActiveStep('upload')}>
                  ← Back to Upload
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onClose}
                  className="bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  Done Reviewing Candidates
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {showIntelligenceWorkspace && parsingJob && (
        <DocumentIntelligenceWorkspace
          isOpen={showIntelligenceWorkspace}
          onClose={() => setShowIntelligenceWorkspace(false)}
          projectId={projectId}
          parsingJob={parsingJob}
          onJobUpdated={(updated) => setParsingJob(updated)}
          onRequirementCreated={triggerApproved}
        />
      )}
    </>
  );
};
