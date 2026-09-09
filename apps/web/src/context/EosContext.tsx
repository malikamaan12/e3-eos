import React, { createContext, useContext, useState } from 'react';
import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_PROJECTS,
  SyntheticOrganisation,
  SyntheticUser,
  SyntheticProject,
} from '@e3-eos/test-fixtures';
import { WorkspaceType } from '../routes.js';
import { SupportedLocale } from '../localization.js';

export interface PendingOfflineMutation {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export type { CanonicalUser } from './canonical-users.js';
import { CANONICAL_E3_USERS } from './canonical-users.js';
import { EosApiClient } from '../services/api-client.js';
export { CANONICAL_E3_USERS };

export interface EosContextValue {
  currentUser: SyntheticUser & { role?: string; isSuperAdmin?: boolean; mfaEnabled?: boolean };
  currentOrg: SyntheticOrganisation;
  currentLanguage: SupportedLocale;
  direction: 'ltr' | 'rtl';
  isOffline: boolean;
  activeWorkspace: WorkspaceType;
  currentPath: string;
  selectedProjectId: string;
  projects: SyntheticProject[];
  pendingMutations: PendingOfflineMutation[];
  isNewProjectModalOpen: boolean;
  isTaskModalOpen: boolean;
  isApprovalModalOpen: boolean;
  isAuditDrawerOpen: boolean;
  refreshTrigger: number;
  apiClient: EosApiClient;
  isImpersonating: boolean;
  impersonatedBy: string | null;
  notifications: Array<{ id: string; title: string; message: string; type: string; link?: string; isRead: boolean; createdAt: string }>;
  unreadNotificationCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  exitImpersonation: () => Promise<void>;
  triggerRefresh: () => void;
  navigate: (path: string) => void;
  login: (email: string, password?: string, mfaCode?: string) => Promise<any>;
  logout: () => Promise<void>;
  switchPersona: (email: string) => Promise<void>;
  setIsNewProjectModalOpen: (open: boolean) => void;
  setIsTaskModalOpen: (open: boolean) => void;
  setIsApprovalModalOpen: (open: boolean) => void;
  setIsAuditDrawerOpen: (open: boolean) => void;
  setCurrentUser: (user: SyntheticUser & { role?: string; isSuperAdmin?: boolean }) => void;
  setCurrentOrg: (org: SyntheticOrganisation) => void;
  setLanguage: (lang: SupportedLocale) => void;
  toggleLanguage: () => void;
  setIsOffline: (offline: boolean) => void;
  toggleOffline: () => void;
  setActiveWorkspace: (ws: WorkspaceType) => void;
  setSelectedProjectId: (id: string) => void;
  queueMutation: (action: string, entity: string, payload: Record<string, unknown>) => void;
  clearPendingMutations: () => void;
}

const EosContext = createContext<EosContextValue | undefined>(undefined);

export const EosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialPath = (): string => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname && window.location.pathname !== '/') {
        return window.location.pathname;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        if (hash === 'personal') return '/my-work';
        if (hash === 'project') return '/projects';
        if (hash === 'admin') return '/admin/users';
        if (hash === 'leadership') return '/';
        return `/${hash}`;
      }
      return '/';
    }
    return '/';
  };

  const getInitialLanguage = (): SupportedLocale => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang') as SupportedLocale;
      if (langParam === 'ar' || langParam === 'en') return langParam;
    }
    return 'en';
  };

  const [currentPath, setCurrentPathState] = useState<string>(getInitialPath);
  const [currentUser, setCurrentUserState] = useState<SyntheticUser & { role?: string; isSuperAdmin?: boolean; mfaEnabled?: boolean }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eos_user_email');
      if (saved) {
        const found = CANONICAL_E3_USERS.find((u) => u.email.toLowerCase() === saved.toLowerCase());
        if (found) return found as any;
      }
    }
    return CANONICAL_E3_USERS[0];
  });
  const [currentOrg, setCurrentOrg] = useState<SyntheticOrganisation>(() => {
    return SYNTHETIC_ORGANISATIONS.e3Internal;
  });
  const [currentLanguage, setLanguageState] = useState<SupportedLocale>(getInitialLanguage);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>('leadership');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('f1111111-1111-4111-8111-111111111111');
  const [pendingMutations, setPendingMutations] = useState<PendingOfflineMutation[]>([]);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [impersonatedBy, setImpersonatedBy] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; type: string; link?: string; isRead: boolean; createdAt: string }>>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  // Persistent API client instance
  const [apiClient] = useState<EosApiClient>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('eos_user_email') : null;
    const initialUser = saved
      ? CANONICAL_E3_USERS.find((u) => u.email.toLowerCase() === saved.toLowerCase()) || CANONICAL_E3_USERS[0]
      : CANONICAL_E3_USERS[0];
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('eos_session_token') || undefined : undefined;
    const client = new EosApiClient({
      baseUrl: '/api/v1',
      organisationId: initialUser.organisationId,
      userId: initialUser.id,
      userRoles: [initialUser.role],
    });
    if (savedToken) {
      client.setSessionToken(savedToken);
    }
    return client;
  });

  const refreshNotifications = async () => {
    try {
      const data = await apiClient.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadNotificationCount(data.unreadCount || 0);
    } catch {}
  };

  const markNotificationRead = async (id: string) => {
    await apiClient.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
  };

  const markAllNotificationsRead = async () => {
    await apiClient.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotificationCount(0);
  };

  React.useEffect(() => {
    refreshNotifications();
  }, [currentUser, refreshTrigger]);

  const navigate = (path: string) => {
    setCurrentPathState(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    // Update selectedProjectId if navigating to a project
    if (path.startsWith('/projects/') && path !== '/projects/new') {
      const parts = path.split('/');
      if (parts[2]) {
        setSelectedProjectId(parts[2]);
      }
    }
  };

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePop = () => {
      setCurrentPathState(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const login = async (email: string, password?: string, mfaCode?: string) => {
    try {
      const res = await apiClient.authLogin(email, password, mfaCode);
      if (res.mfaRequired) {
        return res;
      }
      if (res.user && res.activeMembership) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('eos_user_email', email);
        }
        const matching = CANONICAL_E3_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const userObj = matching || {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          role: res.activeMembership.role,
          isSuperAdmin: res.user.isSuperAdmin,
          organisationId: res.activeMembership.organisationId,
          mfaEnabled: res.user.mfaEnabled,
        };
        setCurrentUserState(userObj as any);
        apiClient.setContext(res.activeMembership.organisationId, res.user.id, [res.activeMembership.role]);
        if (typeof window !== 'undefined' && res.sessionToken) {
          localStorage.setItem('eos_session_token', res.sessionToken);
        }
      }
      return res;
    } catch (e) {
      // If backend login fails, throw so the login form displays error
      throw e;
    }
  };

  const switchPersona = async (email: string) => {
    setIsImpersonating(true);
    setImpersonatedBy('Tareq Al-Kuwari (Root Super Admin)');
    await login(email, 'Password123!');
    triggerRefresh();
  };

  const exitImpersonation = async () => {
    setIsImpersonating(false);
    setImpersonatedBy(null);
    await login('superadmin@e3.qa', 'Password123!');
    triggerRefresh();
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('eos_user_email');
      localStorage.removeItem('eos_session_token');
    }
    apiClient.setSessionToken(undefined);
    setIsImpersonating(false);
    setImpersonatedBy(null);
    navigate('/login');
  };

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const setActiveWorkspace = (ws: WorkspaceType) => {
    setActiveWorkspaceState(ws);
    if (ws === 'leadership') navigate('/');
    else if (ws === 'personal') navigate('/my-work');
    else if (ws === 'project') navigate('/projects');
    else if (ws === 'admin') navigate('/admin/users');
    else navigate(`/${ws}`);
  };

  const direction: 'ltr' | 'rtl' = currentLanguage === 'ar' ? 'rtl' : 'ltr';

  const setLanguage = (lang: SupportedLocale) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const toggleOffline = () => {
    setIsOffline((prev) => !prev);
  };

  const queueMutation = (action: string, entity: string, payload: Record<string, unknown>) => {
    const mutation: PendingOfflineMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      payload,
      status: 'pending',
    };
    setPendingMutations((prev) => [...prev, mutation]);
  };

  const clearPendingMutations = () => {
    setPendingMutations([]);
  };

  const projects = Object.values(SYNTHETIC_PROJECTS);

  return (
    <EosContext.Provider
      value={{
        currentUser,
        currentOrg,
        currentLanguage,
        direction,
        isOffline,
        activeWorkspace,
        currentPath,
        selectedProjectId,
        projects,
        pendingMutations,
        isNewProjectModalOpen,
        isTaskModalOpen,
        isApprovalModalOpen,
        isAuditDrawerOpen,
        refreshTrigger,
        apiClient,
        triggerRefresh,
        navigate,
        login,
        logout,
        switchPersona,
        setIsNewProjectModalOpen,
        setIsTaskModalOpen,
        setIsApprovalModalOpen,
        setIsAuditDrawerOpen,
        setCurrentUser: setCurrentUserState,
        setCurrentOrg,
        setLanguage,
        toggleLanguage,
        setIsOffline,
        toggleOffline,
        setActiveWorkspace,
        setSelectedProjectId,
        queueMutation,
        clearPendingMutations,
      }}
    >
      <div dir={direction} data-locale={currentLanguage} style={{ height: '100%' }}>
        {children}
      </div>
    </EosContext.Provider>
  );
};

export function useEosContext(): EosContextValue {
  const context = useContext(EosContext);
  if (!context) {
    throw new Error('useEosContext must be used within an EosProvider');
  }
  return context;
}
