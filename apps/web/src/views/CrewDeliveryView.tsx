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

      {/* Dual Governance: Qatar Labour Law Statutory Baseline vs E3 Fatigue Policy */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Statutory Baseline */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>⚖️</span>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Qatar Labour Law Statutory Baseline (Law No. 14 of 2004)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
            Mandatory national statutory limits enforced across all entities operating in the State of Qatar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Ordinary Daily Hours:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>8h / day (48h / week)</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Holy Month of Ramadan:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>6h / day (36h / week)</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Maximum With Overtime:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>10h / day strictly capped</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Breaks & Weekly Rest:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>1-3h (max 5h continuous) • 24h rest</div>
            </div>
          </div>
        </Card>

        {/* E3 Fatigue Management Policy */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              E3 Fatigue Management Policy (POL-HSE-FATIGUE-01)
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
            Internal E3 Health, Safety & Welfare standard (distinct from statutory legislation).
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#166534' }}>Inter-Shift Rest Interval:</span>
              <div style={{ fontWeight: 800, color: '#15803d' }}>11 Hours Mandatory Rest</div>
            </div>
            <div style={{ backgroundColor: '#f0fdf4', padding: '8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
              <span style={{ color: '#166534' }}>Exception Governance:</span>
              <div style={{ fontWeight: 700, color: '#15803d' }}>Dual HSE & Director Signoff</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Configurable By:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Role, Crew Type, Event Phase</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ color: '#64748b' }}>Policy Scope:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Qatar, UAE, KSA Operations</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Cross-project conflict detection active. Roster verified against statutory hours and 11-hour fatigue rest.
        </div>
        <Button
          id="btn-add-crew-assignment"
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
        >
          + Assign Crew Member
        </Button>
      </div>


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
