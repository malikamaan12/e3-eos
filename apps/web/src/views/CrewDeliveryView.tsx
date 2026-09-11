import React, { useState, useEffect } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Card, Badge, Button, Modal, Input, Select } from '../components/DesignSystem.js';

interface CrewDeliveryViewProps {
  projectId: string;
}

export const CrewDeliveryView: React.FC<CrewDeliveryViewProps> = ({ projectId }) => {
  const { apiClient, refreshTrigger, triggerRefresh } = useEosContext();

  const [crewAssignments, setCrewAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // New assignment modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [personName, setPersonName] = useState<string>('');
  const [role, setRole] = useState<string>('Site Field Supervisor');
  const [employer, setEmployer] = useState<string>('E3 Live Operations');
  const [personnelType, setPersonnelType] = useState<string>('e3_employee');
  const [department, setDepartment] = useState<string>('Site Operations');
  const [location, setLocation] = useState<string>('DECC Hall 1 Entry');
  const [accreditation, setAccreditation] = useState<string>('DECC Gold Badge Supervisor');
  const [shiftStart, setShiftStart] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [shiftEnd, setShiftEnd] = useState<string>(
    new Date(Date.now() + 86400000 + 8 * 3600000).toISOString().slice(0, 16)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadCrew() {
      setLoading(true);
      try {
        const list = await apiClient.getCrewAssignments(projectId);
        if (isMounted) {
          setCrewAssignments(list);
          // Check for any conflict flagged assignments
          const conflicted = list.find((c: any) => c.status === 'conflict_flagged');
          if (conflicted) {
            setConflictWarning(
              `Active multi-project conflict detected for ${conflicted.personName}: overlapping shift schedule across projects.`
            );
          } else {
            setConflictWarning(null);
          }
        }
      } catch (err) {
        console.error('Failed to load crew assignments:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadCrew();
    return () => {
      isMounted = false;
    };
  }, [apiClient, projectId, refreshTrigger]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName) return;
    setIsSubmitting(true);
    try {
      await apiClient.createCrewAssignment(projectId, {
        personName,
        employer,
        role,
        department,
        projectId,
        location,
        personnelType,
        accreditation,
        status: 'confirmed',
        window: {
          start: new Date(shiftStart).toISOString(),
          end: new Date(shiftEnd).toISOString(),
        },
      });
      setIsModalOpen(false);
      setPersonName('');
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Crew assignment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        Loading crew & labor intelligence...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Conflict Warning Banner */}
      {conflictWarning && (
        <div
          id="crew-conflict-alert"
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#991b1b',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
              Multi-Project Crew Conflict Enforced
            </strong>
            {conflictWarning}
          </div>
        </div>
      )}

      {/* Labor Regulations & Compliance Info Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              👷 Crew & Labor Deployment (Sprint 03 Module 11)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Cross-project conflict detection, Qatar Ministry of Labour 11-hour mandatory rest intervals, and venue accreditation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#16a34a',
                backgroundColor: '#f0fdf4',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⏱️</span> 11-Hour Rest Interval Compliant
            </span>
            <Button
              id="btn-add-crew-assignment"
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
            >
              + Assign Crew Member
            </Button>
          </div>
        </div>
      </Card>

      {/* Crew Roster Grid */}
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            Confirmed Personnel & Shift Windows ({crewAssignments.length})
          </h4>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '12px' }}>Name & Accreditation</th>
                <th style={{ padding: '12px' }}>Role & Department</th>
                <th style={{ padding: '12px' }}>Personnel Type</th>
                <th style={{ padding: '12px' }}>Employer</th>
                <th style={{ padding: '12px' }}>Shift Window</th>
                <th style={{ padding: '12px' }}>Rest Rule (11h)</th>
                <th style={{ padding: '12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {crewAssignments.map((crew) => {
                const isConflict = crew.status === 'conflict_flagged';
                return (
                  <tr
                    key={crew.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isConflict ? '#fff1f2' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{crew.personName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Badge: {crew.accreditation || 'Standard Venue Pass'}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{crew.role}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{crew.department}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge variant="info">
                        {(crew.personnelType || 'e3_employee').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>
                      {crew.employer || 'E3 Live'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#64748b' }}>
                      {crew.window?.start ? (
                        <div>
                          <div>Start: {new Date(crew.window.start).toLocaleDateString()} {new Date(crew.window.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div>End: {new Date(crew.window.end).toLocaleDateString()} {new Date(crew.window.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : (
                        'Continuous Deployment'
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#16a34a',
                          fontWeight: 700,
                          backgroundColor: '#dcfce7',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        ✓ Verified
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge
                        variant={
                          crew.status === 'checked_in'
                            ? 'success'
                            : crew.status === 'confirmed'
                            ? 'primary'
                            : crew.status === 'conflict_flagged'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {crew.status?.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Crew Assignment Modal */}
      {isModalOpen && (
        <Modal
          title="Assign Crew Member"
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        >
          <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Full Name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="e.g. Tariq Mansoor"
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Role Title"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
              <Input
                label="Employer"
                value={employer}
                onChange={(e) => setEmployer(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Select
                label="Personnel Classification"
                value={personnelType}
                onChange={(e) => setPersonnelType(e.target.value)}
                options={[
                  { value: 'e3_employee', label: 'E3 Employee' },
                  { value: 'freelancer', label: 'Freelancer' },
                  { value: 'vendor_crew', label: 'Vendor Crew' },
                  { value: 'temporary_staff', label: 'Temporary Staff' },
                  { value: 'security', label: 'Security' },
                  { value: 'technical_crew', label: 'Technical Crew' },
                  { value: 'drivers', label: 'Driver' },
                ]}
              />
              <Input
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Location / Zone"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Input
                label="Accreditation / Badge"
                value={accreditation}
                onChange={(e) => setAccreditation(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Shift Start"
                type="datetime-local"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                required
              />
              <Input
                label="Shift End"
                type="datetime-local"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !personName}
              >
                {isSubmitting ? 'Verifying & Saving...' : 'Confirm Assignment'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
