import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Modal, Input, Textarea } from '../components/DesignSystem.js';
import { DocumentIntelligenceWorkspace } from './DocumentIntelligenceWorkspace.js';

interface DocumentParsingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCandidateApproved?: () => void;
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

export const DocumentParsingModal: React.FC<DocumentParsingModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onCandidateApproved,
}) => {
  const { apiClient, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [documentName, setDocumentName] = useState<string>(
    'Lusail_Boulevard_Tender_Specifications_Vol2.pdf'
  );
  const [documentType, setDocumentType] = useState<string>('tender_spec');
  const [rawText, setRawText] = useState<string>(SAMPLE_TENDER_TEXT);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingJob, setParsingJob] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<'upload' | 'review'>('upload');
  const [showIntelligenceWorkspace, setShowIntelligenceWorkspace] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartParsing = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    try {
      const job = await apiClient.parseScopeDocument(projectId, {
        documentName,
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

      // Update local state
      const updatedCandidates = parsingJob.candidates.map((c: any) =>
        c.id === candidateId ? { ...c, reviewStatus: action === 'mark_as_clarification' ? 'marked_as_clarification' : action } : c
      );

      setParsingJob({
        ...parsingJob,
        candidates: updatedCandidates,
        approvedCount: res.jobSummary?.approvedCount ?? parsingJob.approvedCount,
        rejectedCount: res.jobSummary?.rejectedCount ?? parsingJob.rejectedCount,
        clarificationCount: res.jobSummary?.clarificationCount ?? parsingJob.clarificationCount,
      });

      if (action === 'approve' && onCandidateApproved) {
        onCandidateApproved();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to execute candidate action');
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
              1. Document Text Input
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
              <span>•</span>
              <span className="text-amber-400 font-semibold">
                📝 {parsingJob.clarificationCount} RFIs Raised
              </span>
              <span>•</span>
              <span className="text-slate-400">
                Total: {parsingJob.totalExtracted}
              </span>
            </div>
          )}
        </div>

        {/* STEP 1: UPLOAD / TEXT */}
        {activeStep === 'upload' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Source Tender Document Name
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-400">
                  Raw Tender Text / RFP Clauses (OCR / PDF Export)
                </label>
                <button
                  type="button"
                  onClick={() => setRawText(SAMPLE_TENDER_TEXT)}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Reset with Sample Qatar RFP
                </button>
              </div>
              <Textarea
                value={rawText}
                onChange={(e: any) => setRawText(e.target.value)}
                rows={12}
                placeholder="Paste tender document paragraphs here..."
                className="bg-slate-950 border-slate-700 text-slate-200 font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-400">
                Preserves exact source citations (page, section, clause) and verbatim quotes.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartParsing}
                disabled={isParsing || !rawText.trim()}
                className="bg-amber-500 text-slate-950 font-semibold text-xs"
              >
                {isParsing ? 'Extracting Scope Candidates...' : 'Parse & Extract Candidates →'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW CANDIDATES */}
        {activeStep === 'review' && parsingJob && (
          <div className="space-y-4">
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
                            {cand.candidateCode}
                          </span>
                          <span className="font-bold text-sm text-slate-100">{cand.title}</span>
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
                                : 'primary'
                            }
                            size="sm"
                          >
                            {cand.reviewStatus}
                          </Badge>
                        </div>

                        {/* Source Citation */}
                        <div className="text-xs text-amber-400/90 font-mono mt-1">
                          📍 {cand.sourceReference || 'Tender Document'}
                        </div>
                      </div>

                      {/* Candidate Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isApproved && !isRejected && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleCandidateAction(cand.id, 'approve')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs py-1"
                            >
                              ✓ Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCandidateAction(cand.id, 'mark_as_clarification')}
                              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs py-1"
                            >
                              📝 RFI
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCandidateAction(cand.id, 'reject')}
                              className="border-slate-700 text-slate-400 hover:text-rose-400 text-xs py-1"
                            >
                              ✗ Reject
                            </Button>
                          </>
                        )}
                        {isApproved && (
                          <span className="text-xs text-emerald-400 font-semibold px-2 py-1 bg-emerald-950/40 rounded">
                            Created in Scope Register
                          </span>
                        )}
                        {isClarification && (
                          <span className="text-xs text-amber-400 font-semibold px-2 py-1 bg-amber-950/40 rounded">
                            RFI Submitted to Client
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verbatim Quote */}
                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-serif text-slate-300 italic">
                      "{cand.sourceQuote}"
                    </div>

                    {/* Extracted Attributes Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-500">Dates: </span>
                        <span className="text-slate-200 font-mono">{cand.extractedDates || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Quantities: </span>
                        <span className="text-slate-200">{cand.extractedQuantities || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Responsibility: </span>
                        <span className="text-slate-200 capitalize">{cand.extractedResponsibilities || 'E3 internal'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Discipline: </span>
                        <span className="text-slate-200 capitalize">{cand.suggestedDiscipline || 'General'}</span>
                      </div>
                    </div>

                    {/* Conflict / Ambiguity warning */}
                    {cand.conflictNotes && (
                      <div className="mt-2.5 p-2.5 rounded bg-rose-950/20 border border-rose-800/40 text-xs text-rose-300 flex items-start gap-2">
                        <span>⚠️</span>
                        <span>{cand.conflictNotes}</span>
                      </div>
                    )}
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
        onRequirementCreated={onCandidateApproved}
      />
    )}
    </>
  );
};
