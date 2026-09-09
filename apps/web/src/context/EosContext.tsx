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
export { CANONICAL_E3_USERS };

export interface EosContextValue {
  currentUser: SyntheticUser & { role?: string };
  currentOrg: SyntheticOrganisation;
  currentLanguage: SupportedLocale;
  direction: 'ltr' | 'rtl';
  isOffline: boolean;
  activeWorkspace: WorkspaceType;
  selectedProjectId: string;
  projects: SyntheticProject[];
  pendingMutations: PendingOfflineMutation[];
  isNewProjectModalOpen: boolean;
  isTaskModalOpen: boolean;
  isApprovalModalOpen: boolean;
  isAuditDrawerOpen: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
  setIsNewProjectModalOpen: (open: boolean) => void;
  setIsTaskModalOpen: (open: boolean) => void;
  setIsApprovalModalOpen: (open: boolean) => void;
  setIsAuditDrawerOpen: (open: boolean) => void;
  setCurrentUser: (user: SyntheticUser & { role?: string }) => void;
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
  const getInitialWorkspace = (): WorkspaceType => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const wsParam = params.get('workspace') as WorkspaceType;
      if (['leadership', 'personal', 'project', 'field', 'client', 'admin', 'supplier'].includes(wsParam)) {
        return wsParam;
      }
      const hash = window.location.hash.replace('#', '') as WorkspaceType;
      if (['leadership', 'personal', 'project', 'field', 'client', 'admin', 'supplier'].includes(hash)) {
        return hash;
      }
    }
    return 'leadership';
  };

  const getInitialLanguage = (): SupportedLocale => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const langParam = params.get('lang') as SupportedLocale;
      if (langParam === 'ar' || langParam === 'en') return langParam;
    }
    return 'en';
  };

  const [currentUser, setCurrentUser] = useState<SyntheticUser & { role?: string }>(CANONICAL_E3_USERS[3]);
  const [currentOrg, setCurrentOrg] = useState<SyntheticOrganisation>(SYNTHETIC_ORGANISATIONS.e3Internal);
  const [currentLanguage, setLanguageState] = useState<SupportedLocale>(getInitialLanguage);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>(getInitialWorkspace);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('f1111111-1111-4111-8111-111111111111');
  const [pendingMutations, setPendingMutations] = useState<PendingOfflineMutation[]>([]);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  const setActiveWorkspace = (ws: WorkspaceType) => {
    setActiveWorkspaceState(ws);
    if (typeof window !== 'undefined') {
      window.location.hash = ws;
    }
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
        selectedProjectId,
        projects,
        pendingMutations,
        isNewProjectModalOpen,
        isTaskModalOpen,
        isApprovalModalOpen,
        isAuditDrawerOpen,
        refreshTrigger,
        triggerRefresh,
        setIsNewProjectModalOpen,
        setIsTaskModalOpen,
        setIsApprovalModalOpen,
        setIsAuditDrawerOpen,
        setCurrentUser,
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
