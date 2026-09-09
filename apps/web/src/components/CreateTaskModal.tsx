import React, { useState } from 'react';
import { useEosContext, CANONICAL_E3_USERS } from '../context/EosContext.js';
import { useEosApi } from '../hooks/useEosApi.js';
import { Button } from './DesignSystem.js';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: any) => void;
  projectId: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
}) => {
  const { currentLanguage, triggerRefresh } = useEosContext();
  const { client } = useEosApi();

  const [title, setTitle] = useState<string>('Finalize CAD Structural Rigging Calculations');
  const [packageId, setPackageId] = useState<string>('e1111111-1111-4111-8111-111111111111');
  const [assigneeId, setAssigneeId] = useState<string>('10000000-0000-4000-8000-000000000007'); // Karim Haddad (Technical Director)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await client.createTask(projectId, {
        packageId,
        title,
        assigneeId,
      });
      onTaskCreated(res.data);
      triggerRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task in PostgreSQL');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '540px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #cbd5e1',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            {currentLanguage === 'ar' ? 'إضافة مهمة جديدة إلى حزمة العمل' : 'Add New Task to Work Package'}
          </h3>
          <button
            onClick={onClose}
            style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '10px', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '6px', color: '#991b1b', marginBottom: '14px', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'حزمة العمل المستهدفة (WBS)' : 'Work Package'}
            </label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              <option value="e1111111-1111-4111-8111-111111111111">WP-01: Scenography & Main Truss Rigging Structures</option>
              <option value="e2222222-2222-4222-8222-222222222222">WP-02: Lighting, Audio & Video Systems</option>
              <option value="e3333333-3333-4333-8333-333333333333">WP-03: Qatar Civil Defence & HSE Licensing</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'عنوان المهمة' : 'Task Title'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              {currentLanguage === 'ar' ? 'المسؤول المكلف' : 'Assigned Owner'}
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
            >
              {CANONICAL_E3_USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div style={{ padding: '10px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', color: '#166534', marginBottom: '16px' }}>
            💾 Persists directly into PostgreSQL <code>task_instances</code> table under project {projectId.slice(0, 8)}...
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button id="btn-submit-task" variant="primary" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (currentLanguage === 'ar' ? 'جارِ الحفظ...' : 'Saving to DB...')
                : (currentLanguage === 'ar' ? 'حفظ المهمة في PostgreSQL' : 'Create Task in PostgreSQL')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
