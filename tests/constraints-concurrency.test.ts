import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConstraintsController } from '../apps/api/src/operations/constraints.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';

describe('Concurrency Control & Row Locking Suite (Directive 9)', () => {
  let dbService: DbService;
  let controller: ConstraintsController;
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';

  const technicalDirector = {
    userId: '10000000-0000-4000-8000-000000000014',
    email: 'techdirector@e3.qa',
    name: 'Eng. Tariq Al-Mansoor (Technical Director)',
    role: 'technical_director',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  const structuralEngineer = {
    userId: '10000000-0000-4000-8000-000000000015',
    email: 'structural@e3.qa',
    name: 'Eng. Bilal Qasim (Structural Engineer)',
    role: 'structural_engineer',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  const createdConstraintIds: string[] = [];

  beforeAll(() => {
    dbService = new DbService();
    controller = new ConstraintsController(dbService);
  });

  afterAll(async () => {
    const pool = dbService.getPool();
    for (const cid of createdConstraintIds) {
      try {
        await pool.query('DELETE FROM audit_events WHERE target_id = $1', [cid]);
        await pool.query('DELETE FROM constraint_verifications WHERE constraint_id = $1', [cid]);
        await pool.query('DELETE FROM constraint_source_links WHERE constraint_id = $1', [cid]);
        await pool.query('DELETE FROM operational_constraints WHERE id = $1', [cid]);
      } catch {}
    }
  });

  it('CONC-01: Serializes concurrent verification requests via SELECT ... FOR UPDATE row locks', async () => {
    const reqSetup = { sessionUser: technicalDirector, organisationId: orgId } as any;

    // 1. Create constraint and transition to Under Review
    const createRes = await controller.createConstraint(projectId, {
      constraintType: 'floor_load',
      sourceType: 'venue',
      sourceOrganization: 'DECC Civil Directorate',
      locationZone: 'Exhibition Hall 3 Ground Slab',
      timeWindow: '24 Hours',
      limitValue: 2500,
      unit: 'kg/m²',
      priority: 'statutory_mandatory',
    }, reqSetup);

    const constraintId = createRes.data.id;
    createdConstraintIds.push(constraintId);

    await controller.attachSource(projectId, constraintId, {
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      pageClauseSection: 'Section 3.2 Ground Slab Live Load',
    }, reqSetup);

    await controller.submitForReview(projectId, constraintId, reqSetup);

    // 2. Launch two concurrent verification attempts simultaneously
    const reqA = { sessionUser: technicalDirector, organisationId: orgId } as any;
    const reqB = { sessionUser: structuralEngineer, organisationId: orgId } as any;

    const [resultA, resultB] = await Promise.allSettled([
      controller.verifyConstraint(projectId, constraintId, {
        pageClauseSection: 'Section 3.2',
        extractedRuleValue: '2500 kg/m²',
        applicabilityStatement: 'Ground Slab',
        reviewerComment: 'Verified by Technical Director concurrently',
      }, reqA),
      controller.verifyConstraint(projectId, constraintId, {
        pageClauseSection: 'Section 3.2',
        extractedRuleValue: '2500 kg/m²',
        applicabilityStatement: 'Ground Slab',
        reviewerComment: 'Verified by Structural Engineer concurrently',
      }, reqB),
    ]);

    // 3. Exactly ONE request must succeed; the other must be rejected due to row lock & status change
    const fulfilled = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const rejected = [resultA, resultB].filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Assert the rejected error indicates state transition conflict
    const rejectionReason: any = (rejected[0] as PromiseRejectedResult).reason;
    const responsePayload = rejectionReason.response || rejectionReason.getResponse?.() || {};
    expect(JSON.stringify(responsePayload)).toMatch(/Under Review|INVALID_STATE_TRANSITION/i);
    expect(rejectionReason.status || rejectionReason.getStatus?.()).toBe(400);

    // 4. Verify DB integrity: exactly 1 verification record, version = 4, exactly 1 audit event
    const pool = dbService.getPool();
    const cRes = await pool.query('SELECT verification_status, version FROM operational_constraints WHERE id = $1', [constraintId]);
    expect(cRes.rows[0].verification_status).toBe('Verified');
    expect(cRes.rows[0].version).toBe(4);

    const vRes = await pool.query('SELECT * FROM constraint_verifications WHERE constraint_id = $1', [constraintId]);
    expect(vRes.rows.length).toBe(1);

    const aRes = await pool.query('SELECT * FROM audit_events WHERE target_id = $1 AND action = $2', [constraintId, 'CONSTRAINT_VERIFIED']);
    expect(aRes.rows.length).toBe(1);
    expect(aRes.rows[0].target_version).toBe(4);
  });
});
