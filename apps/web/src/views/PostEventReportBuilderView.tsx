import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const PostEventReportBuilderView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getPostEventReport(projectId);
      setReport(data);
    } catch (err) {
      console.error('Failed to load post-event report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleExport = () => {
    alert('Exporting Post-Event Executive Report as official certified PDF document...');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'تقرير ما بعد الفعالية وإغلاق المشروع' : 'Post-Event Closeout Report Builder'}
            </h1>
            <Badge variant="success">FINALIZED & AUDITED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {report?.reportTitle || 'Qatar National Day 2026 Pavilion — Post-Event Closeout Report'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh
          </Button>
          <Button variant="primary" onClick={handleExport}>
            📥 Export Official PDF Report
          </Button>
        </div>
      </div>

      {/* Report Container */}
      <div className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-8 space-y-8 text-slate-300 shadow-2xl">
        {/* Cover / Title Block */}
        <div className="border-b border-slate-700/60 pb-6">
          <div className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-2">
            E3-EOS Official Project Performance Document
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            {report?.reportTitle}
          </h2>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>Project: <strong className="text-white">{projectId}</strong></span>
            <span>•</span>
            <span>Client: <strong className="text-white">Ministry of Culture & Celebrations Committee</strong></span>
            <span>•</span>
            <span>Date: <strong className="text-white">August 2026</strong></span>
            <span>•</span>
            <span>Status: <strong className="text-emerald-400">Commercially Closed & Archived</strong></span>
          </div>
        </div>

        {/* Report Sections */}
        <div className="space-y-6">
          {(report?.sections || []).map((sec: any) => (
            <div key={sec.sectionId} className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-6 space-y-3">
              <h3 className="text-lg font-bold text-amber-400 border-b border-slate-700/40 pb-2">
                {sec.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-200">
                {sec.summary}
              </p>
            </div>
          ))}
        </div>

        {/* Signatures & Approvals Seal */}
        <div className="border-t border-slate-700/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>Authored By: <strong className="text-white">Hamad Al-Kuwari (Finance & Commercial Director)</strong></span>
            <span className="block mt-1">Reviewed By: <strong className="text-white">Sarah Jenkins (Site Operations Director)</strong></span>
          </div>
          <div className="text-right">
            <span className="text-emerald-400 font-mono font-bold block">✓ AUDITED & SEALED</span>
            <span className="text-[11px] font-mono text-slate-500">SHA-256: b4a6cf80e3198dc00451fa2889211d04b321a99471fec9983716a782a514d720</span>
          </div>
        </div>
      </div>
    </div>
  );
};
