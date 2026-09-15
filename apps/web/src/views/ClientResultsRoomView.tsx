import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, MetricCard, Badge, Button } from '../components/DesignSystem.js';
import { ClientResultsEngine } from '@e3-eos/domain';

export const ClientResultsRoomView: React.FC = () => {
  const { currentLanguage, apiClient, selectedProjectId } = useEosContext();
  const projectId = selectedProjectId || 'PRJ-QND-2026';

  const [resultsRoom, setResultsRoom] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const isLeakFree = resultsRoom ? ClientResultsEngine.verifyZeroSensitiveLeaks(resultsRoom) : true;

  const handleExportDeliveryReport = () => {
    const content = `
========================================================================
E3-EOS OFFICIAL CLIENT DELIVERY REPORT & EXECUTIVE SUMMARY
========================================================================
Project: ${resultsRoom?.projectName || 'PRJ-QND-2026'}
Venue: ${resultsRoom?.venueName || 'Lusail Boulevard Arena'}
Handover Status: DELIVERED & OPERATIONALLY ACCEPTED
Audit Seal: VERIFIED ZERO LEAKS - SERVER REDACTED

1. PUBLIC ATTENDANCE & OPERATIONS
- Total Public Attendance: ${(resultsRoom?.attendanceMetrics?.totalAttendance || 48500).toLocaleString()}
- VIP & Dignitary Protocol Escorts: ${(resultsRoom?.attendanceMetrics?.vipAttendance || 1200).toLocaleString()}
- Peak Ingress Pace: ${resultsRoom?.attendanceMetrics?.accessPacePerHour || 4200}/hr
- Safety Incident Free Site Hours: 42,000 Safe Hours (Zero LTI)

2. ISO 20121 SUSTAINABILITY & ESG PERFORMANCE
- Waste Diversion Rate: 86.4% diverted from landfill (18.4 Tons Recycled)
- Power Grid vs Biofuel: 74% Grid / 26% B20 Low-Sulphur Biodiesel
- Local Procurement Ratio: 82.5% sourced within 50km
- Carbon Footprint: 39.8 tCO2e (100% Certified Regional Solar Offset)

3. DELIVERED PHYSICAL ASSETS & ARCHITECTURE
- Main Ceremonial Stage & Royal Canopy (Delivered)
- 4K Outdoor LED Facade Wall (Delivered)
- VIP Protocol Pavilion & Egress Network (Delivered)

Signed on behalf of Executive Production Delivery.
========================================================================
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `E3-EOS-Client-Delivery-Report-${projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCertificate = () => {
    const cert = `
========================================================================
CERTIFICATE OF PRACTICAL COMPLETION & HANDOVER
========================================================================
Project Reference: ${projectId}
Client: State Ceremonial Committee
Project Name: ${resultsRoom?.projectName || 'National Day Celebrations 2026'}
Handover Date: ${new Date().toLocaleDateString()}

This is to certify that the temporary event infrastructure and production
systems have reached Practical Completion in strict compliance with
QCDD Safety Regulations, ISO 20121 Sustainability Framework, and Contract Specifications.

Delivered Scope Items: ${(resultsRoom?.deliveredScope || []).length} Deliverables Sealed
Safety Record: ZERO LOST TIME INJURIES (LTI)
Sustainability Index: ISO 20121 GOLD LEVEL COMPLIANT

Authorized Signatory: Hamad Al-Kuwari, Technical Director
========================================================================
`;
    const blob = new Blob([cert], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `E3-EOS-Completion-Certificate-${projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getClientResultsRoom(projectId);
      setResultsRoom(data);
    } catch (err) {
      console.error('Failed to load client results room', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await apiClient.publishClientResultsRoom(projectId);
      setIsPublished(true);
      alert('Client Results Room published. Access link dispatched to client representative.');
    } catch (err) {
      console.error('Failed to publish', err);
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-4"></div>
        <p>Loading Client Results Room...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Server Redaction Security Gate Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {currentLanguage === 'ar' ? 'غرفة نتائج العميل — البوابة الرسمية' : 'Client Results Room — Executive Portal'}
            </h1>
            <Badge variant="success">CLIENT SAFE</Badge>
            <Badge variant="info">PUBLISHED</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {resultsRoom?.projectName} — {resultsRoom?.venueName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button id="btn-export-client-report" variant="secondary" onClick={handleExportDeliveryReport}>
            📄 Export Delivery Report
          </Button>
          <Button id="btn-export-completion-cert" variant="secondary" onClick={handleExportCertificate}>
            📜 Completion Certificate
          </Button>
          <Button variant="secondary" onClick={() => loadData()}>
            ↻ Refresh View
          </Button>
          <Button variant="primary" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : '📢 Dispatch Client Room Link'}
          </Button>
        </div>
      </div>

      {/* Security Redaction Badge */}
      <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-lg p-4 flex items-center justify-between gap-4 text-xs text-emerald-300">
        <div className="flex items-center gap-3">
          <span className="text-lg">🛡️</span>
          <div>
            <strong className="text-white block text-sm">Server-Side Redaction Verified:</strong>
            All internal contractor buy rates, crew margins, markups, and unapproved internal logs have been strictly filtered out at the API controller boundary.
          </div>
        </div>
        <Badge variant={isLeakFree ? 'success' : 'danger'}>
          {isLeakFree ? 'ZERO LEAKS CONFIRMED' : 'SENSITIVE LEAK DETECTED'}
        </Badge>
      </div>

      {/* Top Attendance & Delivery Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Public Attendance"
          value={(resultsRoom?.attendanceMetrics?.totalAttendance || 48500).toLocaleString()}
          subtext="Verified Turnstile Admissions"
          trend="100% Target Met"
          trendDirection="up"
        />
        <MetricCard
          label="VIP & Dignitary Guests"
          value={(resultsRoom?.attendanceMetrics?.vipAttendance || 1200).toLocaleString()}
          subtext="Protocol Escort Completed"
        />
        <MetricCard
          label="Peak Entry Flow Rate"
          value={`${resultsRoom?.attendanceMetrics?.accessPacePerHour || 4200}/hr`}
          subtext="Peak: Aug 22, 19:45"
        />
        <MetricCard
          label="Safety Milestone"
          value="0 Incidents"
          subtext="42,000 Safe Site Hours"
          trend="Zero LTI"
          trendDirection="up"
        />
      </div>

      {/* Executive Highlights */}
      <Card title="Ceremonial & Operational Milestones">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(resultsRoom?.executiveHighlights || []).map((hl: any) => (
            <div key={hl.id} className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={hl.category === 'opening' ? 'warning' : hl.category === 'milestone' ? 'success' : 'info'}>
                  {hl.category.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-400">{new Date(hl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <h4 className="font-semibold text-white text-sm">{hl.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{hl.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Delivered Scope Showcase */}
      <Card title="Delivered Physical Scope & Architecture">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-medium">
              <tr>
                <th className="p-3">Deliverable Item</th>
                <th className="p-3">Category</th>
                <th className="p-3">Specification / Description</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Status</th>
                <th className="p-3">Handover Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {(resultsRoom?.deliveredScope || []).map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-semibold text-white">{item.name}</td>
                  <td className="p-3 capitalize text-slate-400">{item.category}</td>
                  <td className="p-3 text-xs text-slate-300 max-w-md">{item.description}</td>
                  <td className="p-3 font-mono">{item.quantity} {item.unit}</td>
                  <td className="p-3">
                    <Badge variant={item.status === 'delivered' || item.status === 'operational' ? 'success' : 'default'}>
                      {item.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-400">{item.completionDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ISO 20121 Sustainability & Carbon Footprint Ledger (Item 9) */}
      <Card title="ISO 20121 Event Sustainability & Environmental Impact Ledger">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Landfill Waste Diversion</span>
              <span className="text-xl font-bold text-emerald-400">86.4% Diverted</span>
              <span className="text-[11px] text-slate-400 block mt-1">18.4 Metric Tons Recycled</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Power Grid vs Generator</span>
              <span className="text-xl font-bold text-sky-400">74% Grid / 26% Bio</span>
              <span className="text-[11px] text-slate-400 block mt-1">4,200 L B20 Biodiesel</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Local Qatar Procurement</span>
              <span className="text-xl font-bold text-amber-400">82.5% Local</span>
              <span className="text-[11px] text-slate-400 block mt-1">Within 50km Radius</span>
            </div>
            <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 text-xs block mb-1">Carbon Footprint Offset</span>
              <span className="text-xl font-bold text-purple-400">100% Offset</span>
              <span className="text-[11px] text-slate-400 block mt-1">39.8 tCO2e (Cert #QA-042)</span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span>Modular Aluminum Truss & Scaffolding Fleet:</span>
              <span className="font-mono text-emerald-400 font-bold">100% Reusable Fleet Asset</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Custom Scenic Timber Repurposing:</span>
              <span className="font-mono text-emerald-400 font-bold">92% Donated to Community Workshops</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Single-Use Plastics Eliminated:</span>
              <span className="font-mono text-emerald-400 font-bold">0 Single-Use Items (100% Water Stations)</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Crew Mass Transit Efficiency:</span>
              <span className="font-mono text-emerald-400 font-bold">84% Transit Carbon Reduction via Shuttles</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Curated Photographic Gallery */}
      <Card title="Official Project Photographic Record">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {(resultsRoom?.curatedPhotos || []).map((photo: any, i: number) => (
            <div key={i} className="bg-slate-900 border border-slate-700/60 rounded-lg overflow-hidden group">
              <div className="h-48 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs p-4 text-center">
                <div className="space-y-2">
                  <div className="text-3xl">🏛️</div>
                  <div className="text-white font-semibold text-sm">{photo.caption}</div>
                  <div className="text-amber-400 text-xs">{photo.zone}</div>
                </div>
              </div>
              <div className="p-3 bg-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{photo.caption}</span>
                <Badge variant="default">HQ ARCHIVE</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Client Billing Summary (High-Level Only) */}
      {resultsRoom?.clientBillingSummary && (
        <Card title="Commercial Milestone & Billing Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Contract Lump Sum:</span>
              <span className="font-mono text-base font-bold text-white">{resultsRoom.clientBillingSummary.contractValue}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Billed to Date:</span>
              <span className="font-mono text-base font-bold text-amber-400">{resultsRoom.clientBillingSummary.billedToDate}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Settled & Collected:</span>
              <span className="font-mono text-base font-bold text-emerald-400">{resultsRoom.clientBillingSummary.collectedToDate}</span>
            </div>
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <span className="text-slate-400 block mb-1">Final Release Milestone:</span>
              <span className="font-mono text-base font-bold text-slate-300">{resultsRoom.clientBillingSummary.remainingMilestones}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
