import { describe, it, expect } from 'vitest';
import {
  TOKENS,
  DARK_THEME_TOKENS,
  LIGHT_THEME_TOKENS,
  SEMANTIC_STATUS_TOKENS,
} from './foundations/tokens.js';
import { TYPOGRAPHY, FONT_FAMILY, getFontFamily } from './foundations/typography.js';
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  eosMotion,
  getMotionDuration,
} from './foundations/motion.js';
import { INTERNAL_PRIMARY_NAV } from './shells/InternalShell.js';
import { PROJECT_MODULE_GROUPS } from './templates/ProjectWorkspaceTemplate.js';
import {
  EosButton,
  EosStatusBadge,
  EosFormField,
  EosTabs,
  EosSegmentedControl,
  EosDialog,
  EosDrawer,
  EosToast,
  EosInlineAlert,
  EosDataTable,
  EosLifecycleTracker,
  EosApprovalPanel,
  EosSkeleton,
} from './index.js';

describe('E3-EOS Design System — Master Plan & Global UI Component Rules Verification', () => {
  describe('Layer 1: Foundations & Semantic Tokens (specs/12_GLOBAL_UI_COMPONENT_RULES.md)', () => {
    it('should define approved E3 brand semantic color tokens', () => {
      expect(TOKENS.brand.primary).toBe('#090d16');
      expect(TOKENS.brand.secondary).toBe('#1e293b');
      expect(TOKENS.brand.accent).toBe('#d97706');
      expect(TOKENS.brand.onPrimary).toBe('#ffffff');
    });

    it('should adhere to Section 2.1 Dark theme tokens', () => {
      expect(DARK_THEME_TOKENS['--canvas']).toBe('#090D16');
      expect(DARK_THEME_TOKENS['--surface-1']).toBe('#0F1624');
      expect(DARK_THEME_TOKENS['--surface-2']).toBe('#151E2E');
      expect(DARK_THEME_TOKENS['--surface-3']).toBe('#1B2638');
      expect(DARK_THEME_TOKENS['--surface-inset']).toBe('#0B111D');
      expect(DARK_THEME_TOKENS['--border-subtle']).toBe('#1D2939');
      expect(DARK_THEME_TOKENS['--border-default']).toBe('#2A374B');
      expect(DARK_THEME_TOKENS['--text-primary']).toBe('#F8FAFC');
      expect(DARK_THEME_TOKENS['--accent']).toBe('#D97706');
      expect(DARK_THEME_TOKENS['--accent-hover']).toBe('#F59E0B');
      expect(DARK_THEME_TOKENS['--accent-pressed']).toBe('#B45309');
      expect(DARK_THEME_TOKENS['--focus-ring']).toBe('#F59E0B');
    });

    it('should adhere to Section 2.2 Light theme tokens', () => {
      expect(LIGHT_THEME_TOKENS['--canvas']).toBe('#F4F6F8');
      expect(LIGHT_THEME_TOKENS['--surface-1']).toBe('#FFFFFF');
      expect(LIGHT_THEME_TOKENS['--surface-inset']).toBe('#EEF2F6');
      expect(LIGHT_THEME_TOKENS['--text-primary']).toBe('#101828');
      expect(LIGHT_THEME_TOKENS['--accent']).toBe('#B45309');
      expect(LIGHT_THEME_TOKENS['--focus-ring']).toBe('#D97706');
    });

    it('should adhere to Section 2.3 Semantic status tokens', () => {
      expect(SEMANTIC_STATUS_TOKENS.info.fg).toBe('#3B82F6');
      expect(SEMANTIC_STATUS_TOKENS.success.fg).toBe('#22C55E');
      expect(SEMANTIC_STATUS_TOKENS.warning.fg).toBe('#F59E0B');
      expect(SEMANTIC_STATUS_TOKENS.risk.fg).toBe('#F97316');
      expect(SEMANTIC_STATUS_TOKENS.critical.fg).toBe('#EF4444');
      expect(SEMANTIC_STATUS_TOKENS.neutral.fg).toBe('#94A3B8');
      expect(SEMANTIC_STATUS_TOKENS.aiSuggestion.fg).toBe('#8B5CF6');
    });

    it('should adhere to the 4px base spacing scale (Section 2.5)', () => {
      expect(TOKENS.spacing[0]).toBe('0px');
      expect(TOKENS.spacing[1]).toBe('4px');
      expect(TOKENS.spacing[2]).toBe('8px');
      expect(TOKENS.spacing[4]).toBe('16px');
      expect(TOKENS.spacing[8]).toBe('32px');
      expect(TOKENS.spacing[12]).toBe('48px');
      expect(TOKENS.spacing[16]).toBe('64px');
      expect(TOKENS.spacing[20]).toBe('80px');
    });

    it('should adhere to Section 2.6 Radius tokens', () => {
      expect(TOKENS.radius.xs).toBe('4px');
      expect(TOKENS.radius.sm).toBe('6px');
      expect(TOKENS.radius.md).toBe('8px');
      expect(TOKENS.radius.lg).toBe('12px');
      expect(TOKENS.radius.xl).toBe('16px');
      expect(TOKENS.radius.pill).toBe('999px');
    });

    it('should enforce standardized control heights including field primary minimum 52px', () => {
      expect(TOKENS.controlHeight.compact).toBe('32px');
      expect(TOKENS.controlHeight.standard).toBe('40px');
      expect(TOKENS.controlHeight.comfortable).toBe('48px');
      expect(TOKENS.controlHeight.fieldPrimary).toBe('52px');
    });

    it('should enforce functional motion durations (Section 4.1)', () => {
      expect(MOTION_DURATIONS.instant).toBe(80);
      expect(MOTION_DURATIONS.fast).toBe(120);
      expect(MOTION_DURATIONS.base).toBe(180);
      expect(MOTION_DURATIONS.panel).toBe(240);
      expect(MOTION_DURATIONS.modal).toBe(200);
      expect(MOTION_DURATIONS.page).toBe(220);
    });

    it('should export standardized Framer Motion variants (Section 27)', () => {
      expect(eosMotion.page.transition.duration).toBe(0.22);
      expect(eosMotion.tab.transition.duration).toBe(0.16);
      expect(eosMotion.modal.transition.duration).toBe(0.2);
      expect(eosMotion.drawerLtr.transition.duration).toBe(0.24);
      expect(eosMotion.drawerRtl.transition.duration).toBe(0.24);
      expect(eosMotion.toast.transition.duration).toBe(0.18);
    });

    it('should enforce tabular numerals on data tables and numeric KPIs', () => {
      expect(TYPOGRAPHY.dataTable.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.kpiNumericLg.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.kpiNumericMd.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.table.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.kpi.fontVariantNumeric).toBe('tabular-nums');
    });

    it('should provide bilingual typography with Arabic partner support (Section 2.4)', () => {
      expect(getFontFamily(false)).toContain('Inter');
      expect(getFontFamily(true)).toContain('Tahoma');
      expect(FONT_FAMILY.arabic).toContain('Noto Sans Arabic');
      expect(FONT_FAMILY.canonicalStack).toBe('Inter, "Noto Sans Arabic", system-ui, sans-serif');
    });
  });

  describe('Layer 2 & 3: Standardized Eos Primitives & Composites (Section 26 & 31)', () => {
    it('should export all canonical Eos components', () => {
      expect(EosButton).toBeDefined();
      expect(EosStatusBadge).toBeDefined();
      expect(EosFormField).toBeDefined();
      expect(EosTabs).toBeDefined();
      expect(EosSegmentedControl).toBeDefined();
      expect(EosDialog).toBeDefined();
      expect(EosDrawer).toBeDefined();
      expect(EosToast).toBeDefined();
      expect(EosInlineAlert).toBeDefined();
      expect(EosDataTable).toBeDefined();
      expect(EosLifecycleTracker).toBeDefined();
      expect(EosApprovalPanel).toBeDefined();
      expect(EosSkeleton).toBeDefined();
    });
  });

  describe('Layer 4: Application Shells & Navigation Governance', () => {
    it('should enforce exactly 8 fixed primary destinations in Internal Workspace Shell', () => {
      expect(INTERNAL_PRIMARY_NAV).toHaveLength(8);
      const ids = INTERNAL_PRIMARY_NAV.map((n) => n.id);
      expect(ids).toEqual([
        'home',
        'my-work',
        'projects',
        'approvals',
        'calendar',
        'portfolio',
        'reports',
        'admin',
      ]);
    });

    it('should provide bilingual English and Arabic labels for all 8 primary navigation destinations', () => {
      INTERNAL_PRIMARY_NAV.forEach((nav) => {
        expect(nav.labelEn).toBeDefined();
        expect(nav.labelAr).toBeDefined();
        expect(nav.icon).toBeDefined();
        expect(nav.path).toBeDefined();
      });
    });

    it('should define the 11 standardized project module navigation groups', () => {
      expect(PROJECT_MODULE_GROUPS).toHaveLength(11);
      const moduleIds = PROJECT_MODULE_GROUPS.map((m) => m.id);
      expect(moduleIds).toContain('overview');
      expect(moduleIds).toContain('requirements');
      expect(moduleIds).toContain('timeline');
      expect(moduleIds).toContain('design');
      expect(moduleIds).toContain('commercial');
      expect(moduleIds).toContain('documents');
      expect(moduleIds).toContain('operations');
      expect(moduleIds).toContain('live');
      expect(moduleIds).toContain('client-portal');
      expect(moduleIds).toContain('closeout');
      expect(moduleIds).toContain('audit');
    });
  });
});
