import type { Request } from 'express';
import { DbService } from '../common/db.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';

export function portfolioDistribution(rows: Array<Record<string, any>>, field: string) {
  const counts = new Map<string, number>();
  for (const row of rows) { const key = typeof row[field] === 'string' && row[field] ? row[field] : 'unknown'; counts.set(key, (counts.get(key) || 0) + 1); }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, count]) => ({ key, count }));
}

export class PortfolioSummaryService {
  constructor(private readonly db: DbService) {}

  async summary(req: Request) {
    return new ProjectAccessService(this.db).withVisibleProjects(req, { audiences: ['internal'], permissions: ['projects.manage', 'portfolio.read'] }, async (tx, access, rows) => {
      const reportCounts = await tx.query(`SELECT project_id,count(DISTINCT root_report_id)::int AS report_count,count(*)::int AS version_count
        FROM project_report_snapshots WHERE organisation_id=$1 AND project_id=ANY($2::uuid[]) GROUP BY project_id`, [access.organisationId, rows.map((row) => row.id)]);
      const counts = new Map(reportCounts.rows.map((row) => [row.project_id, row]));
      const projects = rows.map((row) => ({ id: row.id, projectCode: row.project_code, title: row.title, maturity: row.maturity,
        outcome: row.outcome, rowVersion: row.row_version, updatedAt: new Date(row.updated_at).toISOString(), accessLevel: row.access_level,
        reportCount: counts.get(row.id)?.report_count || 0 }));
      const asOf = (await tx.query('SELECT clock_timestamp() AS as_of')).rows[0].as_of;
      return { data: {
        asOf: new Date(asOf).toISOString(), definitionVersion: 'portfolio-project-records.v1',
        projectCount: projects.length, editorProjectCount: projects.filter((row) => row.accessLevel === 'editor').length,
        viewerProjectCount: projects.filter((row) => row.accessLevel === 'viewer').length,
        reportCount: reportCounts.rows.reduce((total, row) => total + row.report_count, 0),
        reportVersionCount: reportCounts.rows.reduce((total, row) => total + row.version_count, 0),
        maturityDistribution: portfolioDistribution(rows, 'maturity'), outcomeDistribution: portfolioDistribution(rows, 'outcome'), projects,
        limitations: [
          'Counts include only projects with an active explicit grant for the current membership.',
          'Maturity and outcome are separate recorded project states; neither proves acceptance, readiness or settlement.',
          'Report totals count controlled internal draft series and saved versions. Legacy generated examples and client publications are excluded.',
          'Authoritative revenue, cost, margin, capacity and attendance measures are not connected to this summary.',
        ],
      } };
    });
  }
}
