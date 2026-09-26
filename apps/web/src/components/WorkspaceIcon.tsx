import React from 'react';

export function WorkspaceIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    '/': <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
    '/projects': <path d="M3 6h7l2 3h9v11H3Zm0 0V4h7l2 2h8v3" />,
    '/my-work': <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3h6v2M9 11h6M9 16h4" /></>,
    '/approvals': <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    '/calendar': <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3m-10 4h3" /></>,
    '/reports': <path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4" />,
    '/admin': <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2" /></>,
  };
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>{paths[name] || paths['/' + name.split('/')[1]] || <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}</svg>;
}
