import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { PortfolioSummaryService, portfolioDistribution } from './portfolio-summary.service.js';

afterEach(() => vi.restoreAllMocks());
describe('Granted portfolio summary', () => {
  it('keeps maturity and outcome distinct, retaining unclassified records', () => {
    const rows = [{ maturity: 'developing', outcome: 'lost' }, { maturity: 'developing', outcome: 'undetermined' }, { maturity: null, outcome: 'delivered' }];
    expect(portfolioDistribution(rows, 'maturity')).toEqual([{ key: 'developing', count: 2 }, { key: 'unknown', count: 1 }]);
    expect(portfolioDistribution(rows, 'outcome')).toHaveLength(3);
  });
  it('aggregates reports only for the currently granted project IDs and emits no financial estimates', async () => {
    const rows = [{ id: '22222222-2222-4222-8222-222222222222', project_code: 'P1', title: 'Granted', maturity: 'draft', outcome: 'undetermined', row_version: 1, updated_at: '2026-09-26T00:00:00Z', access_level: 'viewer' }];
    const query = vi.fn(async (sql: string) => sql.includes('clock_timestamp') ? { rows: [{ as_of: '2026-09-26T12:00:00Z' }] } : { rows: [{ project_id: rows[0].id, report_count: 2, version_count: 5 }] });
    const scope = vi.spyOn(ProjectAccessService.prototype, 'withVisibleProjects').mockImplementation(async (_req, _options, callback) => callback({ query } as any, { organisationId: 'org' } as any, rows));
    const result = await new PortfolioSummaryService({} as any).summary({ headers: { 'x-audience': 'internal' } } as any);
    expect(scope.mock.calls[0][1]).toMatchObject({ audiences: ['internal'], permissions: ['projects.manage', 'portfolio.read'] });
    expect(query.mock.calls[0]).toEqual([expect.stringContaining('project_id=ANY($2::uuid[])'), ['org', [rows[0].id]]]);
    expect(result.data).toMatchObject({ projectCount: 1, viewerProjectCount: 1, editorProjectCount: 0, reportCount: 2, reportVersionCount: 5 });
    expect(result.data.projects[0].reportCount).toBe(2);
    expect(result.data).not.toHaveProperty('revenue');
    expect(result.data).not.toHaveProperty('margin');
  });
});
