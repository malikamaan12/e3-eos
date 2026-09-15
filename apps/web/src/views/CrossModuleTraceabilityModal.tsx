import React, { useState } from 'react';
import { Modal, Badge, Button } from '../components/DesignSystem.js';

interface CrossModuleTraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const CrossModuleTraceabilityModal: React.FC<CrossModuleTraceabilityModalProps> = ({
  isOpen,
  onClose,
  projectId,
}) => {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(0);

  const lineageNodes = [
    {
      stage: '1. Requirement',
      code: 'REQ-FEE-001',
      title: 'Hall 1 Registration Counters',
      entityType: 'Requirement',
      status: 'verified',
      summary: 'Provide 30 branded registration counters for Hall 1 entry portal with integrated cable routing.',
      details: [
        { label: 'Scope Item', value: '30 Units' },
        { label: 'Required On-Site', value: '2026-10-15' },
        { label: 'Origin Spec', value: 'Qatar Tourism RFP Schedule 4' },
      ],
      icon: '🎯',
    },
    {
      stage: '2. Design',
      code: 'DES-FEE-REG-001 Rev 02',
      title: 'Approved Fabrication CAD & 3D Render',
      entityType: 'Design Package',
      status: 'approved',
      summary: 'HDF Melamine & Aluminium Frame with illuminated burgundy acrylic logo panel.',
      details: [
        { label: 'Revision', value: 'Rev 02 (Final For Construction)' },
        { label: 'Reviewer', value: 'Karim Haddad (Technical Director)' },
        { label: 'Status', value: 'Approved (Release Gate Condition Met)' },
      ],
      icon: '🎨',
    },
    {
      stage: '3. Commercial / BOQ',
      code: 'BOQ-REG-001',
      title: 'Client BOQ Line & Budget Baseline',
      entityType: 'BOQ Line',
      status: 'approved',
      summary: 'Commercial line item under Staging & Fabrication with QAR 70,000 approved budget.',
      details: [
        { label: 'Baseline Budget', value: 'QAR 70,000' },
        { label: 'Target Margin', value: '28.5%' },
        { label: 'Authority Policy', value: 'POL-COMM-02 (Financial Controller)' },
      ],
      icon: '💰',
    },
    {
      stage: '4. Source Decision',
      code: 'DEC-SRC-FEE-001',
      title: 'Dual Fulfillment Allocation',
      entityType: 'Procurement Decision',
      status: 'completed',
      summary: '8 units sourced from E3 Doha Central Warehouse; 22 units procured via external joinery fabrication.',
      details: [
        { label: 'Internal Inventory Allocation', value: '8 Units (AST-CNT-001)' },
        { label: 'External Production Required', value: '22 Units' },
        { label: 'Decision Justification', value: 'Preserves QAR 24,000 cash outlay by reusing existing assets' },
      ],
      icon: '⚖️',
    },
    {
      stage: '5. RFQ & Bid Matrix',
      code: 'RFQ-FEE-2026-001',
      title: 'Competitive 3-Way Joinery Tender',
      entityType: 'RFQ Tender',
      status: 'evaluated',
      summary: '3 vendors invited (ABC Joinery, Qatar Scenic, Gulf Exhibits). Technical & commercial matrix scored.',
      details: [
        { label: 'Winning Bidder', value: 'ABC Joinery LLC (Score: 94/100)' },
        { label: 'Lowest Compliant Rate', value: 'QAR 3,000 / unit' },
        { label: 'Lead Time', value: '10 Calendar Days' },
      ],
      icon: '📊',
    },
    {
      stage: '6. PO & Committed Cost',
      code: 'PO-QND26-0045',
      title: 'Committed Commercial Order',
      entityType: 'Purchase Order',
      status: 'released',
      summary: 'Commercial commitment of QAR 66,000 awarded. EAC automatically updated with remaining commitments.',
      details: [
        { label: 'PO Value', value: 'QAR 66,000' },
        { label: 'EAC Impact', value: '+QAR 66,000 Remaining Commitments' },
        { label: 'Variance to Budget', value: '+QAR 4,000 Favorable Cost Savings' },
      ],
      icon: '✍️',
    },
    {
      stage: '7. Production & QC',
      code: 'PKG-FEE-REG-01',
      title: 'Joinery Workshop Fabrication',
      entityType: 'Production Package',
      status: 'passed',
      summary: '22 units fabricated by ABC Joinery. Factory Acceptance Testing (FAT) inspected and passed by QA/QC Lead.',
      details: [
        { label: 'Fabricated Qty', value: '22 / 22 Completed' },
        { label: 'QC Inspection', value: 'Passed (Fahad Al-Sulaiti)' },
        { label: 'Minor Snag', value: 'Edge trim on Counter #14 rectified before dispatch' },
      ],
      icon: '🏭',
    },
    {
      stage: '8. Asset Allocation',
      code: 'AST-CNT-001',
      title: 'E3 Warehouse Asset Lock',
      entityType: 'Asset Allocation',
      status: 'confirmed',
      summary: '8 units reserved from Doha Central Depot with non-overlapping temporal exclusivity lock.',
      details: [
        { label: 'Depot Location', value: 'Doha Central Logistics Depot (Bay 03-A)' },
        { label: 'Exclusivity Window', value: '14 Days Locked' },
        { label: 'Conflict Engine', value: '0 Overlaps across 4 concurrent projects' },
      ],
      icon: '📦',
    },
    {
      stage: '9. Packing List Consolidation',
      code: 'PL-FEE-001',
      title: 'Multi-Source Delivery Consolidation',
      entityType: 'Packing List',
      status: 'dispatched',
      summary: 'Consolidated 8 internal assets + 22 external fabricated units = 30 total counters on 15 pallets.',
      details: [
        { label: 'Total Units Packed', value: '30 Units' },
        { label: 'Pallet Count', value: '15 Wrapped Pallets' },
        { label: 'Dispatch Gate', value: 'Released without Snag Blockers' },
      ],
      icon: '📋',
    },
    {
      stage: '10. Logistics & Fleet',
      code: 'TRUCK-07',
      title: '7-Ton Flatbed Transport',
      entityType: 'Transport Plan',
      status: 'arrived',
      summary: 'Al-Attiyah Fleet Logistics dispatched to DECC loading dock within approved morning access slot.',
      details: [
        { label: 'Driver', value: 'Hamad Al-Khelaifi' },
        { label: 'Access Window', value: 'DECC Slot A (Dock 03)' },
        { label: 'Transit Time', value: '45 mins from Doha Industrial Depot' },
      ],
      icon: '🚚',
    },
    {
      stage: '11. Site Proof of Delivery',
      code: 'POD-PL-FEE-001',
      title: 'Electronic Delivery Sign-Off',
      entityType: 'Proof of Delivery',
      status: 'verified',
      summary: 'Received, offloaded, and verified on site with photo proof and zero damage discrepancies.',
      details: [
        { label: 'Signed By', value: 'Omar Farooq (Site Field Supervisor)' },
        { label: 'Delivery Discrepancies', value: 'None (0 Count Deficit)' },
        { label: 'Offloading Rig', value: 'Forklift 02 + 4x Hand Pallet Jacks' },
      ],
      icon: '📱',
    },
    {
      stage: '12. Installation & Acceptance',
      code: 'INST-FEE-001',
      title: 'Hall 1 Entry Positioning & Acceptance',
      entityType: 'Installation Item',
      status: 'accepted',
      summary: 'All 30 units positioned, laser-aligned, cable drops energized, and accepted by Site Supervisor.',
      details: [
        { label: 'Linear Progression', value: 'Positioned → Installed → Tested → Accepted' },
        { label: 'Accepted Count', value: '30 / 30 Counters' },
        { label: 'Client Sign-off', value: 'Counters approved for badge print dry run' },
      ],
      icon: '🏗️',
    },
    {
      stage: '13. Operational Readiness Gate',
      code: 'GATE-FEE-2026',
      title: '10-Dimension Opening Authorization',
      entityType: 'Readiness Gate',
      status: 'READY',
      summary: '10 of 10 operational dimensions passed (100% Score). Authorized for public show opening.',
      details: [
        { label: 'Readiness Status', value: 'READY (100%)' },
        { label: 'Critical Blockers', value: '0 Open Blockers' },
        { label: 'Show Opening', value: 'AUTHORIZED' },
      ],
      icon: '🟢',
    },
  ];

  const selectedNode = lineageNodes[selectedNodeIndex];

  return (
    <Modal
      title="🔗 End-to-End Physical Delivery Lineage"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Unified Project Intelligence Chain (AT-013):</strong> Every physical deliverable maintains unbroken bidirectional provenance from contract requirement down to operational readiness sign-off.
          </div>
          <Badge variant="accent">AT-013 VERIFIED</Badge>
        </div>

        {/* Stepper Timeline Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            borderBottom: '2px solid #e2e8f0',
          }}
        >
          {lineageNodes.map((node, index) => {
            const isSelected = index === selectedNodeIndex;
            return (
              <button
                key={node.code}
                onClick={() => setSelectedNodeIndex(index)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#475569',
                  fontSize: '12px',
                  fontWeight: isSelected ? 800 : 600,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{node.icon}</span>
                <span>{node.stage}</span>
              </button>
            );
          })}
        </div>

        {/* Active Node Detail Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>{selectedNode.icon}</span>
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  {selectedNode.stage} • {selectedNode.entityType}
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedNode.title}
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
                {selectedNode.code}
              </span>
              <Badge variant="success">{selectedNode.status.toUpperCase()}</Badge>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '16px' }}>
            {selectedNode.summary}
          </div>

          <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {selectedNode.details.map((d) => (
              <div key={d.label}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{d.label}</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, marginTop: '2px' }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Previous / Next Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="sm"
            variant="secondary"
            disabled={selectedNodeIndex === 0}
            onClick={() => setSelectedNodeIndex((prev) => Math.max(0, prev - 1))}
          >
            ← Previous Stage
          </Button>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Step {selectedNodeIndex + 1} of {lineageNodes.length}
          </span>
          <Button
            size="sm"
            variant="secondary"
            disabled={selectedNodeIndex === lineageNodes.length - 1}
            onClick={() => setSelectedNodeIndex((prev) => Math.min(lineageNodes.length - 1, prev + 1))}
          >
            Next Stage →
          </Button>
        </div>
      </div>
    </Modal>
  );
};
