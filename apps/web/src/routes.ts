export interface AppRoute {
  path: string;
  audience: 'internal' | 'client' | 'supplier' | 'admin';
  title: string;
  description: string;
  supportsRtl: boolean;
}

export const EOS_ROUTES: AppRoute[] = [
  {
    path: '/login',
    audience: 'internal',
    title: 'E3-EOS Identity Sign In',
    description: 'Invitation-only secure local or OAuth authentication',
    supportsRtl: true,
  },
  {
    path: '/admin/bootstrap',
    audience: 'admin',
    title: 'Platform Governance & Bootstrap',
    description: 'Protected bootstrap status and policy compiler review',
    supportsRtl: true,
  },
  {
    path: '/my-work',
    audience: 'internal',
    title: 'Personal Work Queue',
    description: 'Assigned tasks, deadlines, and pending approval decisions',
    supportsRtl: true,
  },
  {
    path: '/projects',
    audience: 'internal',
    title: 'Portfolio & Projects',
    description: 'Project onboarding, intake forms, and lifecycle workflows',
    supportsRtl: true,
  },
  {
    path: '/portal/projects',
    audience: 'client',
    title: 'Client Collaboration Portal',
    description: 'Published approved proposals, moodboards, and milestones',
    supportsRtl: true,
  },
  {
    path: '/forbidden',
    audience: 'internal',
    title: 'Access Denied',
    description: '403 Forbidden audience or scope restriction',
    supportsRtl: true,
  },
];
