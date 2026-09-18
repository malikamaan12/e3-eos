import {
  DEFAULT_DUMMY_PASSWORD,
  LOCAL_TEAM_ACCOUNTS,
  CANONICAL_DUMMY_ACCOUNTS,
  FALLBACK_TEST_ACCOUNTS,
} from '@e3-eos/domain';

export { DEFAULT_DUMMY_PASSWORD };

export interface CanonicalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  organisationId: string;
  title: string;
  titleAr: string;
  password: string;
  phone?: string;
  department?: string;
  position?: string;
  authorityCeilingQar?: number;
}

/**
 * All 33 local team member accounts configured for temporary UAT & testing.
 */
export const ALL_LOCAL_TEAM_USERS: CanonicalUser[] = LOCAL_TEAM_ACCOUNTS.map((m) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  isSuperAdmin: m.isSuperAdmin,
  organisationId: m.organisationId,
  title: m.title,
  titleAr: m.titleAr,
  password: m.password,
  phone: m.phone,
  department: m.department,
  position: m.position,
  authorityCeilingQar: m.authorityCeilingQar,
}));

/**
 * The 13 canonical leads mapped directly to the local team members.
 */
export const CANONICAL_LEAD_USERS: CanonicalUser[] = CANONICAL_DUMMY_ACCOUNTS.map((m) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  isSuperAdmin: m.isSuperAdmin,
  organisationId: m.organisationId,
  title: m.title,
  titleAr: m.titleAr,
  password: m.password,
  phone: m.phone,
  department: m.department,
  position: m.position,
  authorityCeilingQar: m.authorityCeilingQar,
}));

/**
 * Fallback accounts preserving @e3.qa email addresses for test suite backward compatibility.
 */
export const FALLBACK_USERS: CanonicalUser[] = FALLBACK_TEST_ACCOUNTS.map((m) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  isSuperAdmin: m.isSuperAdmin,
  organisationId: m.organisationId,
  title: m.title,
  titleAr: m.titleAr,
  password: m.password,
  authorityCeilingQar: m.authorityCeilingQar,
}));

/**
 * Complete list of canonical and local team users available to the web app.
 * All 33 local team accounts appear first, followed by backward-compatibility fallback accounts.
 */
export const CANONICAL_E3_USERS: CanonicalUser[] = [
  ...ALL_LOCAL_TEAM_USERS,
  ...FALLBACK_USERS,
];
