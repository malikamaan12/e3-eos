import { describe, it, expect } from 'vitest';
import { TOKENS } from './foundations/tokens.js';
import { TYPOGRAPHY, getFontFamily } from './foundations/typography.js';
import { INTERNAL_PRIMARY_NAV } from './shells/InternalShell.js';
import { PROJECT_MODULE_GROUPS } from './templates/ProjectWorkspaceTemplate.js';

describe('E3-EOS Design System — Master Plan Verification', () => {
  describe('Layer 1: Foundations & Semantic Tokens', () => {
    it('should define approved E3 brand semantic color tokens', () => {
      expect(TOKENS.brand.primary).toBe('#090d16');
      expect(TOKENS.brand.secondary).toBe('#1e293b');
      expect(TOKENS.brand.accent).toBe('#d97706');
      expect(TOKENS.brand.onPrimary).toBe('#ffffff');
    });

    it('should adhere to the 4px base spacing scale', () => {
      expect(TOKENS.spacing[0]).toBe('0px');
      expect(TOKENS.spacing[1]).toBe('4px');
      expect(TOKENS.spacing[2]).toBe('8px');
      expect(TOKENS.spacing[4]).toBe('16px');
      expect(TOKENS.spacing[8]).toBe('32px');
      expect(TOKENS.spacing[12]).toBe('48px');
      expect(TOKENS.spacing[16]).toBe('64px');
      expect(TOKENS.spacing[20]).toBe('80px');
    });

    it('should enforce standardized control heights including field primary minimum 52px', () => {
      expect(TOKENS.controlHeight.compact).toBe('32px');
      expect(TOKENS.controlHeight.standard).toBe('40px');
      expect(TOKENS.controlHeight.comfortable).toBe('48px');
      expect(TOKENS.controlHeight.fieldPrimary).toBe('52px');
    });

    it('should enforce functional motion durations', () => {
      expect(TOKENS.motion.fast).toContain('120ms');
      expect(TOKENS.motion.base).toContain('180ms');
      expect(TOKENS.motion.panel).toContain('240ms');
      expect(TOKENS.motion.emphasis).toContain('320ms');
    });

    it('should enforce tabular numerals on data tables and numeric KPIs', () => {
      expect(TYPOGRAPHY.dataTable.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.kpiNumericLg.fontVariantNumeric).toBe('tabular-nums');
      expect(TYPOGRAPHY.kpiNumericMd.fontVariantNumeric).toBe('tabular-nums');
    });

    it('should provide bilingual typography with Arabic partner support', () => {
      expect(getFontFamily(false)).toContain('Inter');
      expect(getFontFamily(true)).toContain('Tahoma');
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
