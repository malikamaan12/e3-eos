import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button } from '../components/DesignSystem.js';
import { isSyntheticDemo } from '../services/api-client.js';

export const PerformanceKnowledgeView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId, currentProject } = useEosContext();
  const isDemo = isSyntheticDemo(selectedProjectId);
  const projectId = selectedProjectId || (isDemo ? 'PRJ-QND-2026' : '');

  const [activeTab, setActiveTab] = useState<'kpis' | 'vendors' | 'lessons' | 'feedback'>('kpis');
  const [kpis, setKpis] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kp, vn, ls, fb] = await Promise.all([
        apiClient.getProjectKpis(projectId),
        apiClient.getVendorEvaluations(projectId),
        apiClient.getLessonsLearned(projectId),
        apiClient.getClientFeedback(projectId),
      ]);
      setKpis(kp);
      setVendors(vn);
      setLessons(ls);
      setFeedback(fb);
    } catch (err) {
      console.error('Failed to load performance knowledge data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'الأداء المؤسسي وبنك المعرفة والدروس المستفادة' : 'Performance, Vendor Evaluation & Knowledge Base'}
            </h1>
            <Badge variant="success">CLOSEOUT COMPLETE</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Project KPIs, multi-factor vendor scorecards, structured post-event lessons learned, and verified client feedback.
          </p>
        </div>

        <Button variant="secondary" onClick={() => loadData()}>
          ↻ Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/60 gap-4">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'kpis'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Project KPIs & SLAs ({kpis.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'vendors'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Vendor Performance Scorecards ({vendors.length})
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lessons'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Lessons Learned Knowledge Base ({lessons.length})
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'feedback'
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Client Feedback & CSAT ({feedback.length})
        </button>
      </div>

      {/* TAB 1: KPIs */}
      {activeTab === 'kpis' && (
        <Card title="Project Performance KPIs & Service Level Adherence">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
                <tr>
                  <th className="p-3">KPI Code</th>
                  <th className="p-3">Metric Name</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Actual Achieved</th>
                  <th className="p-3">Measurement Method</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {kpis.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No KPIs recorded for this project closeout.
                    </td>
                  </tr>
                ) : (
                  kpis.map((kpi) => (
                    <tr key={kpi.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-medium text-white">{kpi.kpiCode}</td>
                      <td className="p-3 font-semibold text-white">{kpi.name}</td>
                      <td className="p-3 font-mono text-slate-400">{kpi.targetValue} {kpi.unit}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{kpi.actualValue} {kpi.unit}</td>
                      <td className="p-3 text-xs text-slate-300">{kpi.measurementMethod}</td>
                      <td className="p-3">
                        <Badge variant="success">✓ {kpi.status.toUpperCase()}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: Vendor Scorecards */}
      {activeTab === 'vendors' && (
        vendors.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800">
            No vendor performance evaluations recorded for this project.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendors.map((v) => (
              <Card key={v.id} title={v.vendorName}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                    <div>
                      <span className="text-xs text-slate-400">Composite Rating:</span>
                      <div className="text-2xl font-bold font-mono text-emerald-400">{Number(v.averageScore || 0).toFixed(1)} / 100</div>
                    </div>
                    <Badge variant="success">GRADE A — RECOMMENDED</Badge>
                  </div>

                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400 block">Price</span>
                      <span className="font-mono font-bold text-white">{v.priceScore}%</span>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400 block">Quality</span>
                      <span className="font-mono font-bold text-white">{v.qualityScore}%</span>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400 block">Delivery</span>
                      <span className="font-mono font-bold text-white">{v.deliveryScore}%</span>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400 block">Response</span>
                      <span className="font-mono font-bold text-white">{v.responsivenessScore}%</span>
                    </div>
                    <div className="bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400 block">HSE</span>
                      <span className="font-mono font-bold text-white">{v.hseScore}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-900/60 p-3 rounded border border-slate-700/40">
                    "{v.narrativeComments}"
                  </p>

                  <div className="text-xs text-slate-400">
                    Evaluated By: <strong className="text-white">{v.evaluatorName}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* TAB 3: Lessons Learned */}
      {activeTab === 'lessons' && (
        lessons.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800">
            No lessons learned logged for this project.
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((ll) => (
              <Card key={ll.id} title={`${ll.category.toUpperCase()}: ${ll.observation}`}>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-800/60 p-3 rounded">
                      <strong className="text-amber-400 block mb-1">Root Cause:</strong>
                      <span className="text-slate-300">{ll.rootCause}</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded">
                      <strong className="text-red-400 block mb-1">Operational / Cost Impact:</strong>
                      <span className="text-slate-300">{ll.impact}</span>
                    </div>
                    <div className="bg-slate-800/60 p-3 rounded">
                      <strong className="text-emerald-400 block mb-1">Standard Practice Recommendation:</strong>
                      <span className="text-slate-300">{ll.recommendation}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                    <div className="flex gap-2">
                      <Badge variant="info">REUSABLE ACROSS PROJECTS</Badge>
                      {(ll.applicableProjectTypes || []).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                          {t}
                        </span>
                      ))}
                    </div>
                    <span>Logged by: <strong className="text-white">{ll.loggedBy}</strong></span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* TAB 4: Client Feedback */}
      {activeTab === 'feedback' && (
        feedback.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800">
            No client feedback surveys recorded for this project.
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((fb) => (
              <Card key={fb.id} title={fb.clientRepresentative}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-amber-400">★★★★★</span>
                      <span className="text-white font-bold text-lg">{Number(fb.overallRating || 0).toFixed(1)} / 5.0</span>
                    </div>
                    <Badge variant="success">NET PROMOTER SCORE: {fb.npsScore} / 10</Badge>
                  </div>

                  <blockquote className="p-4 bg-slate-800/60 border-l-4 border-amber-500 rounded-r text-sm text-slate-200 italic leading-relaxed">
                    "{fb.feedbackComments}"
                  </blockquote>

                  <div className="text-xs text-slate-400 flex justify-between">
                    <span>Method: <strong className="text-white">{fb.surveyMethod.replace('_', ' ').toUpperCase()}</strong></span>
                    <span>Submitted: <strong className="text-white">{new Date(fb.submittedAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};
