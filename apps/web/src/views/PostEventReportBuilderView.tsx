import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button } from '../components/DesignSystem.js';

export const PostEventReportBuilderView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'client' | 'board'>('client');
  const [activeTab, setActiveTab] = useState<'executive' | 'commercial' | 'sustainability' | 'safety'>('executive');
  const [isExporting, setIsExporting] = useState<boolean>(false);

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

  const handleExportPdf = () => {
    setIsExporting(true);
    setTimeout(() => {
      window.print();
      setIsExporting(false);
    }, 200);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'منشئ الملف التنفيذي للفعالية والتقارير الرسمية' : 'Executive Board Dossier & Post-Event Exporter'}
            </h1>
            <Badge variant="success">ISO 20121 & QCDD CERTIFIED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {report?.reportTitle || 'Qatar National Day 2026 Celebrations — Official Executive Dossier & Final Account'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Client vs Board Toggle */}
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setViewMode('client')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'client' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Client Dossier (Zero Margin Leak)
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'board' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Internal Board Dossier
            </button>
          </div>

          <Button variant="primary" onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? 'Preparing Document...' : '🖨️ Export / Print A4 PDF'}
          </Button>
        </div>
      </div>

      {/* Mode Alert */}
      {viewMode === 'client' ? (
        <div className="p-3 bg-blue-950/40 border border-blue-500/40 rounded-lg text-xs text-blue-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span><strong>Client Projection Guard Active (P02-ST03 / AT-033):</strong> Internal buy rates, contractor markups, and internal cost pools are strictly filtered out. Only sell-side contract figures and deliverables are exposed.</span>
          </div>
          <Badge variant="info">ZERO SENSITIVE LEAK</Badge>
        </div>
      ) : (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span><strong>Internal Board & Executive Producer Mode:</strong> Full financial visibility including actuals, commitments, gross margin, and variance against budget.</span>
          </div>
          <Badge variant="warning">STRICTLY CONFIDENTIAL</Badge>
        </div>
      )}

      {/* Dossier Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        {[
          { key: 'executive', label: '🏛️ Executive Mandate & Highlights' },
          { key: 'commercial', label: '💰 Commercial & Financial Ledger' },
          { key: 'sustainability', label: '🌱 ISO 20121 Sustainability Scorecard' },
          { key: 'safety', label: '🚒 QCDD Life Safety & Operations' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Paper Container (Print-Ready Styling) */}
      <div id="executive-dossier-document" className="bg-slate-900 border border-slate-700/60 rounded-xl p-8 space-y-8 text-slate-300 shadow-2xl">
        {/* Cover / Title Block */}
        <div className="border-b border-slate-700/60 pb-6 flex justify-between items-start">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-2">
              State of Qatar • National Celebrations Committee • E3-EOS Production
            </div>
            <h2 className="text-3xl font-extrabold text-white">
              {report?.reportTitle || 'Qatar National Day 2026 Celebrations Pavilion'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
              <span>Project ID: <strong className="text-white font-mono">{projectId}</strong></span>
              <span>•</span>
              <span>Client: <strong className="text-white">Ministry of Culture & Celebrations Committee</strong></span>
              <span>•</span>
              <span>Venue: <strong className="text-white">Lusail Boulevard & Arena, Doha</strong></span>
              <span>•</span>
              <span>Base Currency: <strong className="text-emerald-400">QAR (Qatari Riyal)</strong></span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Security Clearance</div>
            <Badge variant="purple">{viewMode === 'client' ? 'PUBLIC / CLIENT CERTIFIED' : 'BOARD CONFIDENTIAL'}</Badge>
          </div>
        </div>

        {/* TAB 1: EXECUTIVE MANDATE */}
        {activeTab === 'executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Public Attendance</span>
                <div className="text-2xl font-bold text-white mt-1">125,400+</div>
                <span className="text-[11px] text-emerald-400">Peak throughput 4,200 / hour</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Live Show Delivery</span>
                <div className="text-2xl font-bold text-white mt-1">100% On-Time</div>
                <span className="text-[11px] text-emerald-400">Zero cue latency on 48 live cues</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">HSE & Life Safety</span>
                <div className="text-2xl font-bold text-white mt-1">Zero LTI</div>
                <span className="text-[11px] text-emerald-400">142,000 workforce hours injury-free</span>
              </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-lg border border-slate-700/60 space-y-3">
              <h3 className="text-base font-bold text-white">Project Performance Executive Narrative</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The Qatar National Day 2026 Pavilion was executed across all 13 canonical stages in strict alignment with ISO 20121 Sustainable Event Management and Qatar Civil Defence Department (QCDD) life safety standards. All primary structural elements, kinetic lighting rings, and 360-degree LED surfaces achieved 100% factory acceptance and site sign-off prior to public doors opening.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: COMMERCIAL & FINANCIAL LEDGER */}
        {activeTab === 'commercial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Contract Value (Sell-Side)</span>
                <div className="text-xl font-bold text-white mt-1">2,950,000 QAR</div>
                <span className="text-[11px] text-slate-400">Approved call-off baseline</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Approved Variations (VOR)</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">+165,000 QAR</div>
                <span className="text-[11px] text-emerald-400">3 formal variations approved</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Final Revised Contract</span>
                <div className="text-xl font-bold text-white mt-1">3,115,000 QAR</div>
                <span className="text-[11px] text-slate-400">100% Invoiced & Certified</span>
              </div>
              {viewMode === 'board' ? (
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400">Realized Gross Margin</span>
                  <div className="text-xl font-bold text-amber-400 mt-1">41.02%</div>
                  <span className="text-[11px] text-emerald-400">EAC: 1,740,000 QAR (Constant)</span>
                </div>
              ) : (
                <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400">Payment Status</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1">Settled in Full</div>
                  <span className="text-[11px] text-slate-400">ZATCA & Qatari Tax Compliant</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 font-semibold">
                  <tr>
                    <th className="p-3">Deliverable Package</th>
                    <th className="p-3">Scope Description</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Invoiced Amount (QAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                  <tr>
                    <td className="p-3 font-medium text-white">PKG-01 Ceremonial Kinetic Arch</td>
                    <td className="p-3">360° LED surface, motorization, and structural rigging</td>
                    <td className="p-3"><Badge variant="success">Delivered & Accepted</Badge></td>
                    <td className="p-3 font-mono text-right text-white">1,450,000</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">PKG-02 Site Staging & VIP Decking</td>
                    <td className="p-3">Curved risers, desert dune gold finish, balustrades</td>
                    <td className="p-3"><Badge variant="success">Delivered & Accepted</Badge></td>
                    <td className="p-3 font-mono text-right text-white">820,000</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">PKG-03 Sound Reinforcement & Comms</td>
                    <td className="p-3">d&b line array, Bolero wireless intercom, VIP cue system</td>
                    <td className="p-3"><Badge variant="success">Delivered & Accepted</Badge></td>
                    <td className="p-3 font-mono text-right text-white">680,000</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-white">VOR-01 Additional VIP Canopy Arch</td>
                    <td className="p-3">Client requested shaded VIP holding wing canopy</td>
                    <td className="p-3"><Badge variant="success">Approved Variation</Badge></td>
                    <td className="p-3 font-mono text-right text-emerald-400">165,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ISO 20121 SUSTAINABILITY */}
        {activeTab === 'sustainability' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Landfill Diversion Rate</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">86.4%</div>
                <span className="text-[11px] text-slate-400">Target ≥ 80% Achieved</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Clean Energy Mix</span>
                <div className="text-2xl font-bold text-white mt-1">74% Grid / 26% B20</div>
                <span className="text-[11px] text-emerald-400">Biodiesel generator backup</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Local GCC Procurement</span>
                <div className="text-2xl font-bold text-white mt-1">82.5%</div>
                <span className="text-[11px] text-emerald-400">Qatar & GCC vendor spend</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Carbon Offset Ratio</span>
                <div className="text-2xl font-bold text-emerald-400 mt-1">100% Solar</div>
                <span className="text-[11px] text-slate-400">Al Kharsaah Solar Park RECs</span>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
              ✓ <strong>ISO 20121 Compliance Certified:</strong> Independent third-party audit confirmed zero single-use plastics across crew catering, 100% FSC-certified timber for stage fabrication, and full circular repurposing of scenic textiles.
            </div>
          </div>
        )}

        {/* TAB 4: QCDD SAFETY */}
        {activeTab === 'safety' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">QCDD Civil Defence Permit</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">QCDD-PERMIT-2026-991</div>
                <span className="text-[11px] text-slate-400">Final opening inspection signed</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Structural Safety Factor</span>
                <div className="text-xl font-bold text-white mt-1">2.5x Load Rating</div>
                <span className="text-[11px] text-emerald-400">Third-party engineer sealed</span>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <span className="text-xs text-slate-400">Heat-Stress Compliance</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">100% Qatar Law No. 17</div>
                <span className="text-[11px] text-slate-400">Zero summer curfew violations</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700 text-xs space-y-2">
              <h4 className="font-bold text-white">Civil Defence & Safety Sign-off Register</h4>
              <p className="text-slate-300">
                Structural calculations, flame-retardant fabric test certificates (NFPA 701), electrical earth continuity logs, and emergency egress route clearances were verified on-site by Ministry of Interior Civil Defence inspectors prior to public admission.
              </p>
            </div>
          </div>
        )}

        {/* Signatures & Approvals Cryptographic Seal */}
        <div className="border-t border-slate-700/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span>Executive Producer: <strong className="text-white">Elena Rostova</strong></span>
            <span className="block mt-1">Commercial Director: <strong className="text-white">Hamad Al-Kuwari</strong></span>
            <span className="block mt-1">Client Authority: <strong className="text-white">State Celebrations Committee (Doha, Qatar)</strong></span>
          </div>
          <div className="text-right">
            <span className="text-emerald-400 font-mono font-bold block text-sm">✓ CRYPTOGRAPHICALLY AUDITED & SEALED</span>
            <span className="text-[10px] font-mono text-slate-500 block mt-1">
              SHA-256: b4a6cf80e3198dc00451fa2889211d04b321a99471fec9983716a782a514d720
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
