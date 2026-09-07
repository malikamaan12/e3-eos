/**
 * Mandatory View State Contract per specs/01_PRODUCT_MODULES_AND_UX.md:
 * All actionable views in E3-EOS must support:
 * 1. loading
 * 2. empty
 * 3. validation_error
 * 4. permission_denied (with "why blocked", policy source, exception route)
 * 5. offline (with pending mutation queue and contingency disclosure)
 * 6. stale_data (with source feed and freshness disclosure)
 * 7. ready (authoritative data presentation)
 */

export type ViewStateType =
  | 'loading'
  | 'empty'
  | 'validation_error'
  | 'permission_denied'
  | 'offline'
  | 'stale_data'
  | 'ready';

export interface LoadingViewState {
  type: 'loading';
  message: string;
  isInitialLoad: boolean;
}

export interface EmptyViewState {
  type: 'empty';
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
}

export interface ValidationErrorItem {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationErrorViewState {
  type: 'validation_error';
  title: string;
  summary: string;
  errors: ValidationErrorItem[];
}

export interface PermissionDeniedViewState {
  type: 'permission_denied';
  title: string;
  whyBlocked: string;
  policySource: string;
  requiredRoles: string[];
  exceptionRoute?: string;
}

export interface OfflineViewState {
  type: 'offline';
  title: string;
  message: string;
  pendingQueueLength: number;
  lastSyncedAt?: string;
  contingencyDisclosure: string;
}

export interface StaleDataViewState<T = any> {
  type: 'stale_data';
  title: string;
  sourceFeed: string;
  freshnessTimestamp: string;
  staleReason: string;
  data: T;
}

export interface ReadyViewState<T = any> {
  type: 'ready';
  data: T;
  lastUpdatedAt: string;
  isAuthoritative: boolean;
}

export type ViewState<T = any> =
  | LoadingViewState
  | EmptyViewState
  | ValidationErrorViewState
  | PermissionDeniedViewState
  | OfflineViewState
  | StaleDataViewState<T>
  | ReadyViewState<T>;

export class ViewStateFactory {
  static loading(message = 'Loading workspace data...', isInitialLoad = true): LoadingViewState {
    return { type: 'loading', message, isInitialLoad };
  }

  static empty(title: string, message: string, actionLabel?: string, actionRoute?: string): EmptyViewState {
    return { type: 'empty', title, message, actionLabel, actionRoute };
  }

  static validationError(title: string, summary: string, errors: ValidationErrorItem[]): ValidationErrorViewState {
    return { type: 'validation_error', title, summary, errors };
  }

  static permissionDenied(
    whyBlocked: string,
    policySource: string,
    requiredRoles: string[] = [],
    exceptionRoute?: string
  ): PermissionDeniedViewState {
    return {
      type: 'permission_denied',
      title: 'Action Prohibited by Policy',
      whyBlocked,
      policySource,
      requiredRoles,
      exceptionRoute,
    };
  }

  static offline(
    pendingQueueLength: number,
    lastSyncedAt?: string,
    contingency = 'Device offline. Actions queued locally. Authoritative site release requires supervisor review.'
  ): OfflineViewState {
    return {
      type: 'offline',
      title: 'Offline Field Operation',
      message: 'Network disconnected. Local mutations stored securely.',
      pendingQueueLength,
      lastSyncedAt,
      contingencyDisclosure: contingency,
    };
  }

  static staleData<T>(
    data: T,
    sourceFeed: string,
    freshnessTimestamp: string,
    staleReason = 'Feed exceeds 24-hour freshness window'
  ): StaleDataViewState<T> {
    return {
      type: 'stale_data',
      title: 'Provisional / Stale Feed Disclosed',
      sourceFeed,
      freshnessTimestamp,
      staleReason,
      data,
    };
  }

  static ready<T>(data: T, isAuthoritative = true): ReadyViewState<T> {
    return {
      type: 'ready',
      data,
      lastUpdatedAt: new Date().toISOString(),
      isAuthoritative,
    };
  }
}
