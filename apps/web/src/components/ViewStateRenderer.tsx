import React from 'react';
import { ViewState } from '../view-states.js';
import { Button, Badge } from './DesignSystem.js';

export interface ViewStateRendererProps<T = any> {
  viewState: ViewState<T>;
  children: ((data: T) => React.ReactNode) | React.ReactNode;
  onRequestException?: (policySource: string, reason: string) => void;
  onSyncOfflineQueue?: () => void;
}

export function ViewStateRenderer<T = any>({
  viewState,
  children,
  onRequestException,
  onSyncOfflineQueue,
}: ViewStateRendererProps<T>) {
  switch (viewState.type) {
    case 'loading':
      return (
        <div
          data-testid="view-state-loading"
          style={{
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#475569' }}>
            {viewState.message}
          </span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );

    case 'empty':
      return (
        <div
          data-testid="view-state-empty"
          style={{
            padding: '48px 20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '2px dashed #cbd5e1',
            margin: '16px 0',
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b' }}>{viewState.title}</h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b', maxWidth: '440px', display: 'inline-block' }}>
            {viewState.message}
          </p>
          {viewState.actionLabel && (
            <div>
              <Button size="sm" variant="primary">
                {viewState.actionLabel}
              </Button>
            </div>
          )}
        </div>
      );

    case 'validation_error':
      return (
        <div
          data-testid="view-state-validation-error"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px 20px',
            margin: '16px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>🚫</span>
            <h4 style={{ margin: 0, fontSize: '15px', color: '#991b1b', fontWeight: 600 }}>
              {viewState.title}
            </h4>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#b91c1c' }}>
            {viewState.summary}
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7f1d1d' }}>
            {viewState.errors.map((err, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {err.field && <strong>{err.field}: </strong>}
                {err.message}
                {err.code && (
                  <span style={{ marginLeft: '6px', fontSize: '11px', color: '#991b1b', opacity: 0.8 }}>
                    ({err.code})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );

    case 'permission_denied':
      return (
        <div
          data-testid="view-state-permission-denied"
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '24px',
            margin: '16px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: '#92400e', fontWeight: 600 }}>
                  {viewState.title}
                </h4>
                <Badge variant="warning">{viewState.policySource}</Badge>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#78350f', marginBottom: '2px' }}>
                  Why Blocked:
                </div>
                <div style={{ fontSize: '14px', color: '#92400e' }}>{viewState.whyBlocked}</div>
              </div>

              {viewState.requiredRoles.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#78350f', marginBottom: '4px' }}>
                    Required Roles / Authority:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {viewState.requiredRoles.map((role) => (
                      <Badge key={role} variant="neutral">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewState.exceptionRoute && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onRequestException?.(
                      viewState.policySource,
                      `Scoped exception requested for ${viewState.whyBlocked}`
                    )
                  }
                >
                  Request Scoped Exception ({viewState.policySource})
                </Button>
              )}
            </div>
          </div>
        </div>
      );

    case 'offline':
      return (
        <div data-testid="view-state-offline">
          <div
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5',
              borderLeft: '4px solid #f97316',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span style={{ fontSize: '16px' }}>📡</span>
                <span style={{ fontWeight: 600, color: '#c2410c', fontSize: '14px' }}>
                  {viewState.title} ({viewState.pendingQueueLength} pending mutations)
                </span>
                <Badge variant="warning">Offline Mode</Badge>
              </div>
              <div style={{ fontSize: '12px', color: '#9a3412' }}>
                {viewState.contingencyDisclosure}
              </div>
            </div>
            {viewState.pendingQueueLength > 0 && onSyncOfflineQueue && (
              <Button size="sm" variant="secondary" onClick={onSyncOfflineQueue}>
                Retry Sync ({viewState.pendingQueueLength})
              </Button>
            )}
          </div>
          {typeof children === 'function' ? children(undefined as any) : children}
        </div>
      );

    case 'stale_data':
      return (
        <div data-testid="view-state-stale-data">
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderLeft: '4px solid #64748b',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span style={{ fontWeight: 600, color: '#334155' }}>⚠️ {viewState.title}: </span>
              <span style={{ color: '#64748b' }}>
                Source: {viewState.sourceFeed} | Last synced: {new Date(viewState.freshnessTimestamp).toLocaleTimeString()}
              </span>
            </div>
            <Badge variant="neutral">Stale Feed ({viewState.staleReason})</Badge>
          </div>
          {typeof children === 'function' ? children(viewState.data) : children}
        </div>
      );

    case 'ready':
      return (
        <div data-testid="view-state-ready">
          {typeof children === 'function' ? children(viewState.data) : children}
        </div>
      );

    default:
      return <div>{typeof children === 'function' ? children(undefined as any) : children}</div>;
  }
}
