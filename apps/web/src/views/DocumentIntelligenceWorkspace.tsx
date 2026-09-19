import React, { useState, useMemo } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Input, Modal, Textarea } from '../components/DesignSystem.js';
import { formatQuantityAndUnit } from '@e3-eos/domain';

export interface DocumentIntelligenceWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  parsingJob: any;
  onJobUpdated?: (job: any) => void;
  onRequirementCreated?: () => void;
}

const QUEUE_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  all: { label: 'All Candidates', icon: '📋', desc: 'All extracted candidate items' },
  master_scope_requirements: { label: 'Master Scope Requirements', icon: '🎯', desc: 'Core contractual scope items' },
  location_zone_allocations: { label: 'Zone & Location Allocations', icon: '📍', desc: 'Spatial allocations per zone' },
  boq_commercial_lines: { label: 'BOQ & Commercial Lines', icon: '💰', desc: 'Priced schedule and rate lines' },
  deliverables: { label: 'Deliverables & Submissions', icon: '📦', desc: 'Physical and documented handover deliverables' },
  design_requirements: { label: 'Design & Engineering Briefs', icon: '📐', desc: 'CAD, renders, and structural calculations' },
  submission_requirements: { label: 'Submission Obligations', icon: '📑', desc: 'Tender submissions and formal packages' },
  dates_and_milestones: { label: 'Dates & Key Milestones', icon: '📅', desc: 'Delivery targets and deadlines' },
  client_responsibilities: { label: 'Client-Supplied Items', icon: '🏛️', desc: 'Client obligations and free-issue items' },
  contractor_responsibilities: { label: 'Contractor Responsibilities', icon: '🏗️', desc: 'Direct E3 performance obligations' },
  venue_authority_responsibilities: { label: 'Venue & Authority Scope', icon: '🏟️', desc: 'Civil defence, venue operator, or police tasks' },
  permits_and_compliance: { label: 'Permits & HSE Compliance', icon: '🛡️', desc: 'QCDD fire approvals, ballast sign-offs' },
  assumptions: { label: 'Tender Assumptions', icon: '💡', desc: 'Stated technical and operational assumptions' },
  exclusions: { label: 'Scope Exclusions', icon: '⛔', desc: 'Specifically excluded contractor items' },
  clarifications: { label: 'Clarifications & RFIs', icon: '❓', desc: 'Ambiguities and missing information' },
  missing_documents: { label: 'Missing Referenced Docs', icon: '⚠️', desc: 'Unresolved cross-referenced appendices' },
  duplicates: { label: 'Potential Duplicates', icon: '🔄', desc: 'Items matching existing EOS requirements' },
  conflicts: { label: 'Specification Conflicts', icon: '⚡', desc: 'Conflicting values (e.g. wind rating, qty mismatch)' },
  information_only: { label: 'Information Only', icon: 'ℹ️', desc: 'Descriptive context without direct obligation' },
};

export const DocumentIntelligenceWorkspace: React.FC<DocumentIntelligenceWorkspaceProps> = ({
  isOpen,
  onClose,
  projectId,
  parsingJob,
  onJobUpdated,
  onRequirementCreated,
}) => {
  const { apiClient, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [activeQueue, setActiveQueue] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'candidates' | 'addenda_compare'>('candidates');

  // Addenda Comparison State
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [addendumText, setAddendumText] = useState<string>(
    'Information counter quantity is revised to 24. Four additional premium counters shall be installed in the VIP Zone.'
  );

  // Inline Edit State
  const [editingCandidate, setEditingCandidate] = useState<any>(null);

  // Pre-Publication Preview & Controlled Commit State
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [allowOverride, setAllowOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [isUnpublishing, setIsUnpublishing] = useState<boolean>(false);

  const candidates = parsingJob?.candidates || [];
  const blocks = parsingJob?.blocks || [];

  // Selected candidate object
  const currentCandidate = useMemo(() => {
    if (selectedCandidateId) {
      return candidates.find((c: any) => c.id === selectedCandidateId) || candidates[0];
    }
    return candidates[0] || null;
  }, [candidates, selectedCandidateId]);

  // Sync page with selected candidate
  React.useEffect(() => {
    if (currentCandidate?.sourceProvenance?.pageNumber) {
      setSelectedPage(currentCandidate.sourceProvenance.pageNumber);
    }
  }, [currentCandidate]);

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) => {
      if (activeQueue !== 'all' && c.queueType !== activeQueue) return false;
      if (statusFilter !== 'all' && c.reviewStatus !== statusFilter) return false;
      if (confidenceFilter !== 'all') {
        const score = c.confidenceScore ?? c.confidence?.overall ?? 0.8;
        if (confidenceFilter === 'high' && score < 0.85) return false;
        if (confidenceFilter === 'medium' && (score < 0.7 || score >= 0.85)) return false;
        if (confidenceFilter === 'low' && score >= 0.7) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (c.title || '').toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesCode = (c.candidateCode || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCode) return false;
      }
      return true;
    });
  }, [candidates, activeQueue, statusFilter, confidenceFilter, searchQuery]);

  // Queue counts calculated dynamically
  const queueCounts = useMemo(() => {
    const counts: Record<string, number> = { all: candidates.length };
    for (const c of candidates) {
      counts[c.queueType] = (counts[c.queueType] || 0) + 1;
    }
    return counts;
  }, [candidates]);

  if (!isOpen || !parsingJob) return null;

  // Single Candidate Action
  const handleReviewAction = async (candidateId: string, action: string, extra?: any) => {
    try {
      const res = await apiClient.reviewScopeParsingCandidate(projectId, parsingJob.id, {
        candidateId,
        action,
        ...extra,
      });

      const updatedCandidates = candidates.map((c: any) =>
        c.id === candidateId ? { ...c, reviewStatus: res.candidate?.reviewStatus || action } : c
      );

      const updatedJob = {
        ...parsingJob,
        candidates: updatedCandidates,
        approvedCount: res.jobSummary?.approvedCount ?? parsingJob.approvedCount,
        rejectedCount: res.jobSummary?.rejectedCount ?? parsingJob.rejectedCount,
        clarificationCount: res.jobSummary?.clarificationCount ?? parsingJob.clarificationCount,
      };

      if (onJobUpdated) onJobUpdated(updatedJob);
      if (action.includes('accept') || action === 'approve') {
        if (onRequirementCreated) onRequirementCreated();
      }
      setEditingCandidate(null);
    } catch (err: any) {
      alert(err.message || 'Action execution failed');
    }
  };

  // Bulk Review Action
  const handleBulkReview = async (action: 'approve' | 'reject' | 'mark_info_only') => {
    if (selectedCandidateIds.length === 0) return;
    try {
      const res = await apiClient.bulkReviewScopeCandidates(projectId, parsingJob.id, {
        candidateIds: selectedCandidateIds,
        action,
      });

      const statusMap: Record<string, string> = {
        approve: 'accepted',
        reject: 'rejected',
        mark_info_only: 'info_only',
      };

      const updatedCandidates = candidates.map((c: any) =>
        selectedCandidateIds.includes(c.id) ? { ...c, reviewStatus: statusMap[action] } : c
      );

      const updatedJob = {
        ...parsingJob,
        candidates: updatedCandidates,
        approvedCount: res.jobSummary?.approvedCount ?? parsingJob.approvedCount,
        rejectedCount: res.jobSummary?.rejectedCount ?? parsingJob.rejectedCount,
      };

      if (onJobUpdated) onJobUpdated(updatedJob);
      setSelectedCandidateIds([]);
      if (action === 'approve' && onRequirementCreated) {
        onRequirementCreated();
      }
    } catch (err: any) {
      alert(err.message || 'Bulk action failed. Check safety guards (low-confidence candidates require individual review).');
    }
  };

  // Run Addenda Version Comparison
  const handleRunComparison = async () => {
    setIsComparing(true);
    try {
      // Create second parsing job for addendum text
      const addendumJob = await apiClient.parseScopeDocument(projectId, {
        documentName: 'Addendum_No_01_Revisions.pdf',
        documentType: 'technical_addendum',
        rawText: addendumText,
      });

      const res = await apiClient.compareScopeDocuments(projectId, {
        priorJobId: parsingJob.id,
        newJobId: addendumJob.id,
        priorDocumentName: parsingJob.sourceDocumentName,
        newDocumentName: 'Addendum_No_01_Revisions.pdf',
      });

      setComparisonResult(res.payload || res);
      setActiveTab('addenda_compare');
    } catch (err: any) {
      alert(err.message || 'Failed to compare addendum versions');
    } finally {
      setIsComparing(false);
    }
  };

  // Apply Addendum Revision
  const handleApplyAddendumRevision = async (deltaId: string) => {
    try {
      const res = await apiClient.applyAddendumRevision(projectId, {
        deltaId,
        reason: 'Client Addendum No. 1 quantity and specification revision approved by project director',
        confirmAllocations: true,
      });
      alert(`✓ Addendum revision applied successfully! Revision #${res.payload?.revision?.revisionNumber || 1} created.`);
      if (onRequirementCreated) onRequirementCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to apply addendum revision');
    }
  };

  // Open Pre-Publication Preview
  const handleOpenPublishPreview = async () => {
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    setPublishResult(null);
    try {
      const preview = await apiClient.previewScopePublish(projectId, {
        jobId: parsingJob.id,
        candidateIds: selectedCandidateIds.length > 0 ? selectedCandidateIds : undefined,
      });
      setPreviewData(preview);
    } catch (err: any) {
      alert(err.message || 'Failed to calculate publish preview');
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm Atomic Controlled Publication
  const handleConfirmPublish = async () => {
    if (!previewData) return;
    if (previewData.blockingIssues?.length > 0 && !allowOverride) {
      alert('Publication is blocked by unresolved critical issues. An authorized override with justification is required.');
      return;
    }
    setIsPublishing(true);
    try {
      const idempotencyKey = `pub-${parsingJob.id}-${Date.now()}`;
      const targetVersions: Record<string, number> = {};
      if (previewData.items) {
        for (const item of previewData.items) {
          if (item.targetRequirementId && item.currentRequirementVersion) {
            targetVersions[item.targetRequirementId] = item.currentRequirementVersion;
          }
        }
      }

      const res = await apiClient.publishScopeImport(projectId, {
        jobId: parsingJob.id,
        idempotencyKey,
        candidateIds: selectedCandidateIds.length > 0 ? selectedCandidateIds : undefined,
        allowUnresolvedOverride: allowOverride,
        overrideReason: overrideReason || undefined,
        targetRequirementVersions: Object.keys(targetVersions).length > 0 ? targetVersions : undefined,
      });

      setPublishResult(res.payload || res);
      if (onRequirementCreated) onRequirementCreated();
    } catch (err: any) {
      alert(err.message || 'Publication failed');
    } finally {
      setIsPublishing(false);
    }
  };

  // Rollback / Unpublish Batch
  const handleUnpublish = async (batchId: string) => {
    if (!confirm('Are you sure you want to unpublish this batch? This will safely delete untouched draft requirements.')) return;
    setIsUnpublishing(true);
    try {
      await apiClient.unpublishScopeImport(projectId, batchId, {
        reason: 'User rolled back import batch from Document Intelligence workspace',
      });
      alert('Import batch unpublished successfully.');
      setPublishResult(null);
      setIsPreviewOpen(false);
      if (onRequirementCreated) onRequirementCreated();
    } catch (err: any) {
      alert(err.message || 'Failed to unpublish import batch. Active downstream records or approvals may block deletion.');
    } finally {
      setIsUnpublishing(false);
    }
  };

  // Reprocess Job with Preserved Decision Memory
  const handleReprocessJob = async () => {
    if (!confirm('Reprocess this document with the latest parser? All previously recorded reviewer decisions (such as Keep Separate, Edits, and Classifications) will be preserved from decision memory.')) return;
    try {
      const updatedJob = await apiClient.reprocessScopeJob(projectId, parsingJob.id);
      alert('Document reprocessed successfully with decision memory applied.');
      if (onJobUpdated) onJobUpdated(updatedJob);
    } catch (err: any) {
      alert(err.message || 'Failed to reprocess parsing job');
    }
  };

  const pagesInDoc = useMemo(() => {
    const pages = new Set<number>();
    for (const b of blocks) pages.add(b.pageNumber || 1);
    for (const c of candidates) pages.add(c.sourceProvenance?.pageNumber || c.sourcePage || 1);
    return Array.from(pages).sort((a, b) => a - b);
  }, [blocks, candidates]);

  const currentPageBlocks = useMemo(() => {
    return blocks.filter((b: any) => b.pageNumber === selectedPage);
  }, [blocks, selectedPage]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Intelligence Review Workspace — RFP, Tender & BOQ Extraction"
      size="full"
    >
      <div className="flex flex-col h-[85vh] text-slate-100 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Workspace Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-400">📄 {parsingJob.sourceDocumentName}</span>
            <Badge variant="outline" className="text-slate-400 border-slate-700">
              {parsingJob.parserVersion || 'v3.0.0-neural-structured'}
            </Badge>
            <span className="text-slate-400">|</span>
            <span className="text-emerald-400 font-medium">✓ {parsingJob.approvedCount || 0} Approved</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400 font-medium">❓ {parsingJob.clarificationCount || 0} RFIs</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400 font-medium">✕ {parsingJob.rejectedCount || 0} Rejected</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Total: {candidates.length} candidates</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('candidates')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeTab === 'candidates' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Candidate Review ({candidates.length})
              </button>
              <button
                onClick={() => setActiveTab('addenda_compare')}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  activeTab === 'addenda_compare' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Addenda Comparison {comparisonResult ? `(${comparisonResult.totalDeltas} Deltas)` : ''}
              </button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleReprocessJob}
              className="text-slate-300 border-slate-700 hover:bg-slate-800 text-[11px] py-1 px-2.5 flex items-center gap-1.5"
              title="Reprocess with updated parser while preserving decision memory"
            >
              <span>🔄</span>
              <span>Reprocess</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenPublishPreview}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1 px-3 flex items-center gap-1.5 shadow-sm"
            >
              <span>🚀</span>
              <span>Publish Preview & Commit</span>
            </Button>
          </div>
        </div>

        {activeTab === 'candidates' ? (
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* ================= LEFT PANEL: DOCUMENT SOURCE VIEWER ================= */}
            <div className="col-span-5 flex flex-col border-r border-slate-800 bg-slate-950/70 overflow-hidden">
              {/* Document Header & Navigation */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Page:</span>
                  <select
                    value={selectedPage}
                    onChange={(e) => setSelectedPage(parseInt(e.target.value, 10))}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs"
                  >
                    {pagesInDoc.map((p) => (
                      <option key={p} value={p}>
                        Page {p}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-500">of {pagesInDoc.length || 1}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoomLevel(Math.max(70, zoomLevel - 15))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300"
                    title="Zoom Out"
                  >
                    🔍-
                  </button>
                  <span className="text-[10px] text-slate-400 w-10 text-center">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
                    className="p-1 hover:bg-slate-800 rounded text-slate-300"
                    title="Zoom In"
                  >
                    🔍+
                  </button>
                </div>
              </div>

              {/* Source Document Text Blocks */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs leading-relaxed">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                  Source Provenance View: {parsingJob.sourceDocumentName} — Page {selectedPage}
                </div>

                {currentPageBlocks.length > 0 ? (
                  currentPageBlocks.map((blk: any) => {
                    const isCandidateSource = currentCandidate?.sourceProvenance?.boundingBox?.y === blk.boundingBox?.y ||
                      (currentCandidate?.originalWording && blk.rawText.includes(currentCandidate.originalWording.slice(0, 40)));

                    return (
                      <div
                        key={blk.id}
                        className={`p-3 rounded border transition-all ${
                          isCandidateSource
                            ? 'bg-amber-500/15 border-amber-500 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-slate-900/50 border-slate-800/80 text-slate-300'
                        }`}
                        style={{ fontSize: `${Math.round(11 * (zoomLevel / 100))}px` }}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>{blk.sectionNumber || `Block #${blk.sequenceIndex}`}</span>
                          <span className="text-slate-600">
                            OCR: {Math.round((blk.ocrConfidence || 0.98) * 100)}% | Type: {blk.blockType}
                          </span>
                        </div>
                        <p className={isCandidateSource ? 'text-amber-100 font-semibold' : ''}>
                          {blk.rawText}
                        </p>
                        {isCandidateSource && (
                          <div className="mt-2 text-[10px] flex items-center gap-1.5 text-amber-400 font-sans">
                            <span>📍 Highlighted source for:</span>
                            <span className="font-bold underline">{currentCandidate?.candidateCode} ({currentCandidate?.title})</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-slate-900 rounded border border-slate-800 text-slate-300">
                    <p className="font-sans text-xs mb-2 font-semibold text-amber-400">Verbatim Tender Text:</p>
                    <pre className="whitespace-pre-wrap font-mono text-slate-300 text-[11px] leading-relaxed">
                      {currentCandidate?.originalWording || parsingJob.extractedText || 'No raw block text available for this page.'}
                    </pre>
                  </div>
                )}
              </div>

              {/* Source Document Footer Status */}
              <div className="px-3 py-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Provenance: Exact Section/Clause bounding-box preserved</span>
                <span>Deterministic Text Stream</span>
              </div>
            </div>

            {/* ================= RIGHT PANEL: STRUCTURED CANDIDATE REVIEW ================= */}
            <div className="col-span-7 flex flex-col bg-slate-900/40 overflow-hidden">
              {/* 19 Review Queues Filter Header */}
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max pb-1">
                  {Object.entries(QUEUE_LABELS).map(([qKey, meta]) => {
                    const count = queueCounts[qKey] || 0;
                    if (count === 0 && qKey !== 'all' && qKey !== 'master_scope_requirements' && qKey !== 'boq_commercial_lines') {
                      return null;
                    }
                    const isSelected = activeQueue === qKey;
                    return (
                      <button
                        key={qKey}
                        onClick={() => setActiveQueue(qKey)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white'
                        }`}
                        title={meta.desc}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                        <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isSelected ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Secondary Filter & Search Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <Input
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate titles, clauses, text..."
                    className="bg-slate-900 border-slate-700 text-slate-200 text-xs py-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value="all">Status: All</option>
                    <option value="unreviewed">Unreviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="converted_to_clarification">Converted to RFI</option>
                  </select>

                  <select
                    value={confidenceFilter}
                    onChange={(e) => setConfidenceFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value="all">Confidence: All</option>
                    <option value="high">High (&gt;85%)</option>
                    <option value="medium">Medium (70-85%)</option>
                    <option value="low">Low (&lt;70%)</option>
                  </select>
                </div>

                {/* Bulk Actions with Safety Check */}
                {selectedCandidateIds.length > 0 && (
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-700">
                    <span className="text-[10px] text-amber-300 font-semibold">{selectedCandidateIds.length} selected:</span>
                    <Button
                      size="sm"
                      onClick={() => handleBulkReview('approve')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5"
                    >
                      ✓ Bulk Accept
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleBulkReview('reject')}
                      className="bg-rose-700 hover:bg-rose-600 text-white text-[10px] px-2 py-0.5"
                    >
                      ✕ Bulk Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Candidates List and Detailed Card Split */}
              <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* Candidate Selector List */}
                <div className="col-span-5 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800/60 bg-slate-950/40">
                  {filteredCandidates.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No extraction candidates match your filter.
                    </div>
                  ) : (
                    filteredCandidates.map((c: any) => {
                      const isSelected = c.id === currentCandidate?.id;
                      const isChecked = selectedCandidateIds.includes(c.id);
                      const confidencePct = Math.round((c.confidenceScore ?? c.confidence?.overall ?? 0.8) * 100);

                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCandidateId(c.id)}
                          className={`p-3 cursor-pointer transition flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-amber-500/10 border-l-4 border-amber-500'
                              : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCandidateIds([...selectedCandidateIds, c.id]);
                              } else {
                                setSelectedCandidateIds(selectedCandidateIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="mt-1 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] text-amber-400 font-semibold">
                                {c.candidateCode}
                              </span>
                              <Badge
                                variant={
                                  c.reviewStatus === 'accepted'
                                    ? 'success'
                                    : c.reviewStatus === 'rejected'
                                    ? 'danger'
                                    : c.reviewStatus === 'converted_to_clarification'
                                    ? 'warning'
                                    : 'secondary'
                                }
                                className="text-[9px] uppercase px-1.5 py-0"
                              >
                                {c.reviewStatus}
                              </Badge>
                            </div>
                            <h4 className="text-xs font-semibold text-slate-200 truncate">{c.title}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{c.description}</p>

                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                              {c.quantity !== undefined && (
                                <span className="text-emerald-400 font-semibold font-mono">
                                  Qty: {c.quantityComparator && c.quantityComparator !== 'exact' ? `${c.quantityComparator} ` : ''}{c.quantity} {c.unit || ''}
                                </span>
                              )}
                              {c.quantityBasis && c.quantityBasis !== 'total' && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/80">
                                  {c.quantityBasis.replace('_', ' ')}
                                </span>
                              )}
                              {c.blockingIssues && c.blockingIssues.length > 0 && (
                                <span className="px-1 py-0.2 rounded text-[9px] bg-rose-950/60 text-rose-300 border border-rose-800/80 font-bold">
                                  ⛔ {c.blockingIssues.length} Blocker{c.blockingIssues.length > 1 ? 's' : ''}
                                </span>
                              )}
                              <span>•</span>
                              <span>P.{c.sourcePage || c.sourceProvenance?.pageNumber || 1}</span>
                              <span>•</span>
                              <span className={confidencePct >= 85 ? 'text-emerald-400' : confidencePct >= 70 ? 'text-amber-400' : 'text-rose-400'}>
                                {confidencePct}% Conf
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Candidate Detailed Review & Attribution Card */}
                <div className="col-span-7 p-4 overflow-y-auto space-y-4 bg-slate-900/20">
                  {currentCandidate ? (
                    <>
                      {/* Candidate Header */}
                      <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {currentCandidate.candidateCode}
                            </span>
                            <Badge variant="outline" className="text-slate-300 border-slate-700 text-[10px]">
                              {QUEUE_LABELS[currentCandidate.queueType]?.label || currentCandidate.queueType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">Confidence:</span>
                            <span className="font-bold text-emerald-400 text-xs">
                              {Math.round((currentCandidate.confidenceScore ?? currentCandidate.confidence?.overall ?? 0.85) * 100)}%
                            </span>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-white">{currentCandidate.title}</h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{currentCandidate.description}</p>

                        <div className="p-2 bg-slate-950 rounded border border-slate-800 text-[11px] font-mono text-slate-300">
                          <span className="text-slate-500 font-sans block text-[10px] uppercase font-bold mb-0.5">
                            Verbatim Source Quote:
                          </span>
                          "{currentCandidate.originalWording || currentCandidate.sourceQuote}"
                        </div>
                      </div>

                      {/* Explicit vs Inferred Field Attributions */}
                      <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3">
                        <h4 className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span>Field Provenance & Origin Attribution</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            Strict Invariant: Inferred fields are clearly distinguished
                          </span>
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Quantity */}
                          <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Quantity & Unit</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                currentCandidate.quantity !== undefined ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {currentCandidate.fieldAttributions?.quantity?.origin || (currentCandidate.quantity ? 'explicit' : 'missing')}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-100">
                              {currentCandidate.quantity !== undefined
                                ? formatQuantityAndUnit(currentCandidate.quantity, currentCandidate.unit, currentCandidate.title, currentCandidate.description)
                                : 'Missing / Stated without numeric count'}
                            </div>
                          </div>

                          {/* Accountable Department */}
                          <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Accountable Department</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300">
                                {currentCandidate.fieldAttributions?.suggestedDepartment?.origin || 'system_suggestion'}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-100">
                              {currentCandidate.suggestedDepartment || 'Technical Direction'}
                            </div>
                            <div className="text-[10px] text-purple-400/80 mt-0.5">
                              Suggested role: {currentCandidate.suggestedOwnerRole || 'Technical Lead'}
                            </div>
                          </div>

                          {/* Unallocated Quantity */}
                          <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Unallocated Scope</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300">
                                {currentCandidate.unallocatedQuantity !== undefined ? 'explicit' : 'not_applicable'}
                              </span>
                            </div>
                            <div className="font-semibold text-amber-300 font-mono">
                              {currentCandidate.unallocatedQuantity !== undefined
                                ? `${currentCandidate.unallocatedQuantity} of ${currentCandidate.quantity} unallocated`
                                : 'None'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {currentCandidate.unallocatedQuantity > 0 ? 'No assumed zone split (RFI generated)' : 'Fully allocated'}
                            </div>
                          </div>

                          {/* Responsible Party */}
                          <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Responsible Party</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-500/20 text-blue-300">
                                {currentCandidate.fieldAttributions?.responsibleParty?.origin || 'inferred'}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-100">
                              {currentCandidate.responsibleParty || currentCandidate.extractedResponsibilities || 'Contractor (E3)'}
                            </div>
                          </div>

                          {/* Quantity Comparator & Basis */}
                          <div className="p-2 bg-slate-950/80 rounded border border-slate-800">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Comparator & Basis</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300">
                                {currentCandidate.quantityComparator || 'exact'}
                              </span>
                            </div>
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span className="capitalize">{currentCandidate.quantityComparator || 'exact'}</span>
                              <span className="text-slate-500 font-normal">•</span>
                              <span className="capitalize text-amber-300">{currentCandidate.quantityBasis?.replace('_', ' ') || 'Total'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Publication Blocker Alert */}
                        {currentCandidate.blockingIssues && currentCandidate.blockingIssues.length > 0 && (
                          <div className="p-3 bg-rose-950/50 rounded-lg border border-rose-500 space-y-1.5 text-xs">
                            <span className="font-bold text-rose-300 flex items-center gap-1.5">
                              <span>⛔</span> Critical Publication Blocker ({currentCandidate.blockingIssues.length}):
                            </span>
                            <ul className="list-disc list-inside text-rose-200 space-y-0.5">
                              {currentCandidate.blockingIssues.map((b: string, idx: number) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                            <div className="text-[10px] text-rose-400 pt-1 border-t border-rose-900/60">
                              Precondition: Automated publication is blocked until this issue is resolved or an authorized justification override is submitted.
                            </div>
                          </div>
                        )}

                        {/* Design & Delivery Requirements Flags */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                          <span className="text-slate-400 font-medium">Requirements flags:</span>
                          {currentCandidate.designRequired && (
                            <Badge variant="outline" className="text-cyan-300 border-cyan-800 bg-cyan-950/30">
                              📐 Design Required
                            </Badge>
                          )}
                          {currentCandidate.clientApprovalRequired && (
                            <Badge variant="outline" className="text-amber-300 border-amber-800 bg-amber-950/30">
                              ✍️ Client Approval Required
                            </Badge>
                          )}
                          {currentCandidate.fabricationRequired && (
                            <Badge variant="outline" className="text-emerald-300 border-emerald-800 bg-emerald-950/30">
                              🔨 Fabrication Required
                            </Badge>
                          )}
                          {currentCandidate.installationRequired && (
                            <Badge variant="outline" className="text-indigo-300 border-indigo-800 bg-indigo-950/30">
                              🏗️ Installation Required
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Clarification Alert / RFI Prompt */}
                      {currentCandidate.suggestedClarifications && (
                        <div className="p-3 bg-amber-950/40 rounded-lg border border-amber-500/50 space-y-1.5">
                          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                            <span>📝</span>
                            <span>Proposed Clarification / RFI to Client:</span>
                          </div>
                          <p className="text-xs text-amber-200 leading-relaxed">
                            {currentCandidate.suggestedClarifications}
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() => handleReviewAction(currentCandidate.id, 'convert_to_clarification')}
                              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs py-1 px-3"
                            >
                              Raise Formal RFI Now
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Conflict / Duplicate Alerts */}
                      {currentCandidate.conflictNotes && (
                        <div className="p-3 bg-rose-950/40 rounded-lg border border-rose-500/50 space-y-1 text-xs">
                          <span className="font-bold text-rose-400 flex items-center gap-1.5">
                            <span>⚡</span> Conflict Warning:
                          </span>
                          <p className="text-rose-200">{currentCandidate.conflictNotes}</p>
                        </div>
                      )}

                      {currentCandidate.potentialDuplicateOf && (
                        <div className="p-3 bg-sky-950/40 rounded-lg border border-sky-500/50 space-y-1.5 text-xs">
                          <span className="font-bold text-sky-400 flex items-center gap-1.5">
                            <span>🔄</span> Potential Match Detected:
                          </span>
                          <p className="text-sky-200">{currentCandidate.potentialDuplicateOf.reason}</p>
                          {currentCandidate.queueType === 'boq_commercial_lines' && (
                            <div className="pt-1">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleReviewAction(currentCandidate.id, 'accept', {
                                    targetRequirementId: currentCandidate.potentialDuplicateOf.requirementId,
                                  })
                                }
                                className="bg-sky-600 hover:bg-sky-500 text-white text-xs py-1 px-3"
                              >
                                Link as BOQ Reference (No Duplicate Master Req)
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Confidence Score Matrix Breakdown */}
                      {currentCandidate.confidence && (
                        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 space-y-2 text-xs">
                          <span className="font-semibold text-slate-400 block">6-Point Confidence Score Matrix</span>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Source Extraction</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.sourceExtraction || 0.95) * 100)}%
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Requirement ID</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.requirementIdentification || 0.9) * 100)}%
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Classification</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.classification || 0.85) * 100)}%
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Quantity Precision</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.quantity || 0.9) * 100)}%
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Location Detail</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.location || 0.75) * 100)}%
                              </span>
                            </div>
                            <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                              <span className="text-slate-500 block">Responsibility</span>
                              <span className="font-bold text-slate-200">
                                {Math.round((currentCandidate.confidence.responsibility || 0.9) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Review Action Controls */}
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              onClick={() => handleReviewAction(currentCandidate.id, 'accept')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 shadow-sm"
                            >
                              ✓ Accept into Scope
                            </Button>

                            <Button
                              onClick={() => setEditingCandidate({ ...currentCandidate })}
                              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-2"
                            >
                              ✏️ Edit & Accept
                            </Button>

                            <Button
                              onClick={() => handleReviewAction(currentCandidate.id, 'convert_to_clarification')}
                              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs px-3 py-2"
                            >
                              ❓ Convert to RFI
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleReviewAction(currentCandidate.id, 'keep_separate', { reviewerNotes: 'Confirmed distinct contractual scope obligation' })}
                              className="border-amber-700 text-amber-300 hover:bg-amber-950/40 text-xs px-2.5 py-2"
                              title="Store persistent decision in decision memory to never auto-merge this item across future runs"
                            >
                              🛡️ Keep Separate
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleReviewAction(currentCandidate.id, 'split')}
                              className="border-purple-700 text-purple-300 hover:bg-purple-950/40 text-xs px-2.5 py-2"
                              title="Split compound obligation into design, fabrication, and handover components"
                            >
                              ✂️ Split
                            </Button>

                            {currentCandidate.potentialDuplicateOf && (
                              <Button
                                onClick={() => handleReviewAction(currentCandidate.id, 'attach_evidence', { targetRequirementId: currentCandidate.potentialDuplicateOf.requirementId })}
                                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-2.5 py-2"
                                title="Attach candidate as citation/evidence link to existing requirement"
                              >
                                📎 Attach Evidence
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleReviewAction(currentCandidate.id, 'mark_info_only')}
                              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-2.5 py-2"
                            >
                              Info Only
                            </Button>

                            <Button
                              variant="danger"
                              onClick={() => handleReviewAction(currentCandidate.id, 'reject')}
                              className="bg-rose-700 hover:bg-rose-600 text-white text-xs px-3 py-2"
                            >
                              ✕ Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Select a candidate on the left to inspect structured fields and source citations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ADDENDA VERSION COMPARISON TAB ================= */
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-950">
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <span>📄</span>
                  <span>Addenda & Document-Version Comparison Engine</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Upload or paste a revision bulletin, scope amendment, or client addendum. The engine detects quantity deltas,
                  new requirements, zone allocation shifts, and specification changes against your approved project baseline.
                </p>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400">
                    Addendum Text / Revision Clauses
                  </label>
                  <Textarea
                    value={addendumText}
                    onChange={(e: any) => setAddendumText(e.target.value)}
                    rows={4}
                    className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-xs"
                    placeholder="Paste addendum clauses here..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleRunComparison}
                    disabled={isComparing}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2"
                  >
                    {isComparing ? 'Comparing Document Versions...' : '⚡ Compare Against Existing Scope'}
                  </Button>
                </div>
              </div>

              {/* Comparison Results */}
              {comparisonResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-800 text-xs">
                    <span className="font-bold text-white">
                      Detected Changes ({comparisonResult.totalDeltas} Deltas Found)
                    </span>
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="text-emerald-400 font-semibold font-mono">
                        +{comparisonResult.quantityChangeCount} Quantity Deltas
                      </span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold font-mono">
                        {comparisonResult.newRequirementsCount} New Reqs
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {comparisonResult.deltas?.map((delta: any) => (
                      <div
                        key={delta.id}
                        className="p-4 bg-slate-900/90 rounded-lg border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
                              {delta.changeType}
                            </span>
                            <h4 className="text-xs font-bold text-white">{delta.title}</h4>
                          </div>
                          <Badge
                            variant={delta.reviewStatus === 'approved' ? 'success' : 'warning'}
                            className="text-[10px]"
                          >
                            {delta.reviewStatus}
                          </Badge>
                        </div>

                        {/* Side-by-side Diff */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-slate-950 rounded border border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Previous Baseline (Preserved)
                            </span>
                            <p className="text-slate-300 text-xs">{delta.previousWording}</p>
                            {delta.previousQuantity !== undefined && (
                              <div className="mt-2 text-xs font-mono text-slate-400">
                                Quantity: <span className="font-bold text-slate-200">{delta.previousQuantity} Nos</span>
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-amber-950/20 rounded border border-amber-500/40">
                            <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                              New Addendum Clause
                            </span>
                            <p className="text-amber-100 text-xs">{delta.newWording}</p>
                            {delta.newQuantity !== undefined && (
                              <div className="mt-2 text-xs font-mono text-emerald-400 font-bold">
                                Revised Quantity: {delta.newQuantity} Nos (Delta: +{delta.quantityDelta})
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Impact Assessment */}
                        <div className="p-3 bg-slate-950 rounded border border-slate-800/80 space-y-1 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Cross-Departmental Impact Analysis:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Design Impact:</span>
                              <span className="text-cyan-300">{delta.designImpact || 'Standard'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">BOQ / Commercial:</span>
                              <span className="text-emerald-300">{delta.boqImpact || 'Commercial variation'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Production Batch:</span>
                              <span className="text-purple-300">{delta.productionImpact || 'Capacity check'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Allocations:</span>
                              <span className="text-amber-300">
                                {delta.affectedAllocations?.map((a: any) => `${a.zone}: ${a.quantity}`).join(', ') || 'VIP Zone: 4'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-500">
                            Governed Rule: Approved requirements are never silently overwritten without revision signoff.
                          </span>
                          <Button
                            onClick={() => handleApplyAddendumRevision(delta.id)}
                            disabled={delta.reviewStatus === 'approved'}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5"
                          >
                            {delta.reviewStatus === 'approved' ? '✓ Revision Applied' : 'Approve & Apply Requirement Revision'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit & Accept Modal Sub-dialog */}
        {editingCandidate && (
          <Modal
            isOpen={Boolean(editingCandidate)}
            onClose={() => setEditingCandidate(null)}
            title={`Edit & Accept Candidate: ${editingCandidate.candidateCode}`}
          >
            <div className="space-y-3 text-xs text-slate-200">
              <div>
                <label className="block text-slate-400 mb-1">Requirement Title</label>
                <Input
                  value={editingCandidate.title}
                  onChange={(e: any) => setEditingCandidate({ ...editingCandidate, title: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <Textarea
                  value={editingCandidate.description}
                  onChange={(e: any) => setEditingCandidate({ ...editingCandidate, description: e.target.value })}
                  rows={3}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <Input
                    type="number"
                    value={editingCandidate.quantity ?? ''}
                    onChange={(e: any) => setEditingCandidate({ ...editingCandidate, quantity: parseFloat(e.target.value) || 0 })}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Unit</label>
                  <Input
                    value={editingCandidate.unit || 'Nos'}
                    onChange={(e: any) => setEditingCandidate({ ...editingCandidate, unit: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button variant="outline" onClick={() => setEditingCandidate(null)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    handleReviewAction(editingCandidate.id, 'accept_with_changes', {
                      edits: {
                        title: editingCandidate.title,
                        description: editingCandidate.description,
                        quantity: editingCandidate.quantity,
                        unit: editingCandidate.unit,
                      },
                    })
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Save & Accept into Scope
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Pre-Publication Preview & Controlled Commit Modal */}
        {isPreviewOpen && (
          <Modal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title={`Pre-Publication Verification & Register Commit — ${parsingJob.sourceDocumentName}`}
            size="lg"
          >
            <div className="space-y-4 text-xs text-slate-200 font-sans max-h-[75vh] overflow-y-auto">
              {previewLoading ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="animate-spin text-2xl mb-2">⏳</div>
                  Calculating atomic publish preview and checking downstream invariants...
                </div>
              ) : previewData ? (
                <>
                  {/* Summary Breakdown Cards */}
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">New Reqs</span>
                      <span className="text-base font-bold text-emerald-400">{previewData.summary?.newRequirements || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Evidence Links</span>
                      <span className="text-base font-bold text-sky-400">{previewData.summary?.attachedEvidenceLinks || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Revisions</span>
                      <span className="text-base font-bold text-amber-400">{previewData.summary?.proposedRevisions || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Allocations</span>
                      <span className="text-base font-bold text-indigo-400">{previewData.summary?.allocationsCreated || 0}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <span className="text-[10px] text-slate-400 block uppercase">Unresolved</span>
                      <span className={`text-base font-bold ${previewData.summary?.unresolvedIssues > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {previewData.summary?.unresolvedIssues || 0}
                      </span>
                    </div>
                  </div>

                  {/* Success Banner if published */}
                  {publishResult && (
                    <div className="p-4 bg-emerald-950/60 rounded-lg border border-emerald-500 text-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5 text-sm">
                          <span>✓</span> Successfully Published to Requirements Register!
                        </span>
                        <span className="font-mono text-xs text-emerald-400">Batch ID: {publishResult.id}</span>
                      </div>
                      <p className="text-xs text-emerald-300">
                        Created {publishResult.publishedRequirementIds?.length || 0} new requirements, {publishResult.publishedAllocationIds?.length || 0} zone allocations, {publishResult.publishedEvidenceLinksCount || 0} evidence links, and {publishResult.publishedRevisionsCount || 0} revisions in the single authoritative register.
                      </p>
                      <div className="pt-2 flex justify-end">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleUnpublish(publishResult.id)}
                          disabled={isUnpublishing}
                          className="text-xs py-1 px-3"
                        >
                          {isUnpublishing ? 'Rolling back...' : '↩️ Rollback / Unpublish Batch'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Blocking Issues Alert */}
                  {previewData.blockingIssues?.length > 0 && !publishResult && (
                    <div className="p-4 bg-rose-950/40 rounded-lg border border-rose-500 space-y-3">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                        <span>⛔</span>
                        <span>Publication Blocked by {previewData.blockingIssues.length} Unresolved Critical Issue(s)</span>
                      </div>
                      <div className="space-y-1 text-xs text-rose-200 pl-2">
                        {previewData.blockingIssues.map((b: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <span className="font-mono text-amber-300 font-bold">{b.candidateCode}:</span>
                            <span>{b.issue}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-rose-900/60 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-semibold text-rose-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowOverride}
                            onChange={(e) => setAllowOverride(e.target.checked)}
                            className="rounded bg-slate-900 border-rose-500 text-rose-600 focus:ring-0"
                          />
                          <span>Authorize publication override (requires logged formal justification)</span>
                        </label>
                        {allowOverride && (
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Override Reason / Authorization Reference (Immutable Audit Log)
                            </label>
                            <Input
                              value={overrideReason}
                              onChange={(e: any) => setOverrideReason(e.target.value)}
                              placeholder="e.g. Lead PM verified 15 counters with Client Rep per RFI-004..."
                              className="bg-slate-900 border-slate-700 text-slate-100 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items Preview Table */}
                  {!publishResult && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Publication Candidates ({previewData.items?.length || 0} items)</span>
                        <span className="text-[11px] text-slate-500">All writes target single authoritative `requirements` table</span>
                      </div>

                      <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase">
                            <tr>
                              <th className="p-2">Code</th>
                              <th className="p-2">Title</th>
                              <th className="p-2">Action</th>
                              <th className="p-2">Qty & Basis</th>
                              <th className="p-2">Allocations</th>
                              <th className="p-2">Issues</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950/60">
                            {previewData.items?.map((item: any) => (
                              <tr key={item.candidateId} className="hover:bg-slate-900/50">
                                <td className="p-2 font-mono text-amber-400 font-semibold text-[11px]">{item.candidateCode}</td>
                                <td className="p-2 font-medium text-slate-200 max-w-xs truncate">{item.title}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.proposedAction === 'create_new' ? 'bg-emerald-500/20 text-emerald-300' :
                                    item.proposedAction === 'attach_evidence' ? 'bg-sky-500/20 text-sky-300' :
                                    item.proposedAction === 'propose_revision' ? 'bg-amber-500/20 text-amber-300' :
                                    'bg-slate-800 text-slate-400'
                                  }`}>
                                    {item.proposedAction}
                                  </span>
                                </td>
                                <td className="p-2 font-mono text-[11px]">
                                  {item.quantity !== undefined ? (
                                    <span>
                                      {item.quantityComparator !== 'exact' ? `${item.quantityComparator} ` : ''}
                                      {item.quantity} {item.unit || ''}
                                      <span className="text-slate-500 text-[10px] ml-1">({item.quantityBasis})</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                                <td className="p-2 text-slate-400 text-[11px]">
                                  {item.allocationsCount > 0 ? `${item.allocationsCount} zones` : 'None'}
                                </td>
                                <td className="p-2">
                                  {item.blockingIssues?.length > 0 ? (
                                    <span className="text-rose-400 font-bold text-[10px]">⛔ Blocker</span>
                                  ) : item.unresolvedIssues?.length > 0 ? (
                                    <span className="text-amber-400 text-[10px]">⚠️ {item.unresolvedIssues.length}</span>
                                  ) : (
                                    <span className="text-emerald-400 text-[10px]">✓ Clean</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <span className="text-[11px] text-slate-500">
                      Invariants: Preserves existing IDs, no parallel registers, optimistic concurrency protected.
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="text-xs">
                        {publishResult ? 'Close' : 'Cancel'}
                      </Button>
                      {!publishResult && (
                        <Button
                          onClick={handleConfirmPublish}
                          disabled={isPublishing || (previewData.blockingIssues?.length > 0 && !allowOverride)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2"
                        >
                          {isPublishing ? 'Publishing...' : `Confirm & Publish (${previewData.items?.length || 0} Items)`}
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-slate-500">No preview data generated.</div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};
