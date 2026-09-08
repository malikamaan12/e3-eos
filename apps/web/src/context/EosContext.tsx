import React, { createContext, useContext, useState } from 'react';
import {
  SYNTHETIC_ORGANISATIONS,
  SYNTHETIC_USERS,
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

export interface EosContextValue {
  currentUser: SyntheticUser;
  currentOrg: SyntheticOrganisation;
  currentLanguage: SupportedLocale;
  direction: 'ltr' | 'rtl';
  isOffline: boolean;
  activeWorkspace: WorkspaceType;
  selectedProjectId: string;
  projects: SyntheticProject[];
  pendingMutations: PendingOfflineMutation[];
  setCurrentUser: (user: SyntheticUser) => void;
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

  const [currentUser, setCurrentUser] = useState<SyntheticUser>(SYNTHETIC_USERS.superAdmin);
  const [currentOrg, setCurrentOrg] = useState<SyntheticOrganisation>(SYNTHETIC_ORGANISATIONS.e3Internal);
  const [currentLanguage, setLanguageState] = useState<SupportedLocale>(getInitialLanguage);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceType>(getInitialWorkspace);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(SYNTHETIC_PROJECTS.sampleExhibition.id);
  const [pendingMutations, setPendingMutations] = useState<PendingOfflineMutation[]>([]);

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
