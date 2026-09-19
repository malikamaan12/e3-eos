/**
 * E3-EOS Design System — Motion & Animation Foundations
 * Conforms strictly to E3-EOS Global UI Component Rules (Sections 4 & 27).
 */

// 4.1 Duration Tokens
export const MOTION_DURATIONS = {
  instant: 80,
  fast: 120,
  base: 180,
  panel: 240,
  modal: 200,
  page: 220,
} as const;

// 4.2 Easing Curves
export const MOTION_EASINGS = {
  standard: [0.2, 0, 0, 1] as const,
  enter: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  standardCss: 'cubic-bezier(0.2, 0, 0, 1)',
  enterCss: 'cubic-bezier(0, 0, 0.2, 1)',
  exitCss: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

// 27. Global Framer Motion Pattern
export const eosMotion = {
  page: {
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.22, ease: [0.2, 0, 0, 1] },
  },
  tab: {
    initial: { opacity: 0, y: 2 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.16, ease: [0.2, 0, 0, 1] },
  },
  modal: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
    transition: { duration: 0.2, ease: [0.2, 0, 0, 1] },
  },
  drawerLtr: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
    transition: { duration: 0.24, ease: [0.2, 0, 0, 1] },
  },
  drawerRtl: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.24, ease: [0.2, 0, 0, 1] },
  },
  dropdown: {
    initial: { opacity: 0, y: -4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.14, ease: [0.2, 0, 0, 1] },
  },
  toast: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: 16 },
    transition: { duration: 0.18, ease: [0.2, 0, 0, 1] },
  },
} as const;

// 4.5 Reduced Motion utility
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns safe transition duration respecting reduced motion
 */
export function getMotionDuration(ms: number): number {
  if (getPrefersReducedMotion()) {
    return Math.min(ms, 80);
  }
  return ms;
}
