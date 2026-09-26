import { describe, it, expect, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { ConstraintsController } from '../apps/api/src/operations/constraints.controller.js';
import { DocumentsController } from '../apps/api/src/documents/documents.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';

// Direct compatibility fixtures are not evidence of an authorised HTTP workflow.
beforeEach(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('ENVIRONMENT', 'test'); vi.stubEnv('EOS_ENABLE_LOCAL_SYNTHETIC_AUTH', 'true'); });
afterEach(() => vi.unstubAllEnvs());

describe('Multi-Instance Cloud Run Durability Suite (Directive 8)', () => {
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';
  let createdConstraintId: string;

  const technicalDirector = {
    userId: '10000000-0000-4000-8000-000000000014',
    email: 'techdirector@e3.qa',
    name: 'Eng. Tariq Al-Mansoor (Technical Director)',
    role: 'technical_director',
    organisationId: orgId,
    isSuperAdmin: false,
  };

  afterAll(async () => {
    if (createdConstraintId) {
      const db = new DbService();
      try {
        const pool = db.getPool();
        await pool.query('DELETE FROM audit_events WHERE target_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM constraint_verifications WHERE constraint_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM constraint_source_links WHERE constraint_id = $1', [createdConstraintId]);
        await pool.query('DELETE FROM operational_constraints WHERE id = $1', [createdConstraintId]);
      } catch {}
    }
  });

  it('DUR-01: Proves multi-instance state durability across process restarts and independent instances', async () => {
    // -------------------------------------------------------------
    // INSTANCE 1: Simulating Cloud Run Container Instance #1 (Doha)
    // -------------------------------------------------------------
    let instance1Db: DbService | null = new DbService();
    let instance1Controller: ConstraintsController | null = new ConstraintsController(instance1Db);

    const req1 = { sessionUser: technicalDirector, organisationId: orgId } as any;

    const createRes = await instance1Controller.createConstraint(projectId, {
      constraintType: 'environmental_boundary_noise',
      sourceType: 'statutory',
      sourceOrganization: 'Ministry of Environment and Climate Change (MECC)',
      locationZone: 'Lusail Commercial District Perimeter',
      timeWindow: '22:00 - 04:00',
      limitValue: 55,
      unit: 'dB(A) Leq',
      priority: 'statutory_mandatory',
    }, req1);

    createdConstraintId = createRes.data.id;
    expect(createRes.data.verificationStatus).toBe('Draft');

    // Attach controlled statutory document (DOC-MECC-ENV-2005)
    await instance1Controller.attachSource(projectId, createdConstraintId, {
      controlledDocumentId: 'doc-mecc-env-01-def',
      documentRevisionId: 'rev-mecc-env-01-def',
      pageClauseSection: 'Cabinet Decision No. 4 of 2005 Annex 3/5 (Night Noise Limit)',
    }, req1);

    // Submit for formal review
    const submitRes = await instance1Controller.submitForReview(projectId, createdConstraintId, req1);
    expect(submitRes.data.verificationStatus).toBe('Under Review');
    expect(submitRes.data.version).toBe(3);

    // Simulate complete process crash / container recycling:
    // All in-memory references on Instance 1 are destroyed
    instance1Db = null;
    instance1Controller = null;

    // -------------------------------------------------------------
    // INSTANCE 2: Simulating Cloud Run Container Instance #2 (Doha)
    // Fresh container boot with zero pre-existing memory state
    // -------------------------------------------------------------
    let instance2Db: DbService | null = new DbService();
    let instance2Controller: ConstraintsController | null = new ConstraintsController(instance2Db);

    // Instance 2 lists constraints directly from PostgreSQL
    const listRes = await instance2Controller.listConstraints(projectId, req1);
    const targetConstraint = listRes.data.find((c) => c.id === createdConstraintId);

    expect(targetConstraint).toBeDefined();
    expect(targetConstraint?.verificationStatus).toBe('Under Review');
    expect(targetConstraint?.controlledDocumentId).toBe('doc-mecc-env-01-def');
    expect(targetConstraint?.sourceDocumentHash).toBe('884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827');

    // Instance 2 verifies the constraint authoritative
    const req2 = { sessionUser: technicalDirector, organisationId: orgId } as any;
    const verifyRes = await instance2Controller.verifyConstraint(projectId, createdConstraintId, {
      pageClauseSection: 'Annex 3/5',
      extractedRuleValue: '55 dB(A) Night Boundary Limit',
      applicabilityStatement: 'Commercial / Exhibition Zone Perimeter',
      reviewerComment: 'Statutory verification against Qatar Environmental Law No. 30 of 2002.',
    }, req2);

    expect(verifyRes.data.verificationStatus).toBe('Verified');
    expect(verifyRes.data.version).toBe(4);
    expect(verifyRes.data.verifiedBy).toBe(technicalDirector.name);

    // Destroy Instance 2 completely
    instance2Db = null;
    instance2Controller = null;

    // -------------------------------------------------------------
    // INSTANCE 3: Simulating Cloud Run Container Instance #3
    // Cold read to prove persistence of Verified state and audit trail
    // -------------------------------------------------------------
    const instance3Db = new DbService();
    const instance3Controller = new ConstraintsController(instance3Db);
    const instance3DocsController = new DocumentsController(instance3Db);

    // Verify documents are durably persisted in PostgreSQL
    const docsRes = await instance3DocsController.listDocuments(projectId, req1);
    expect(docsRes.data.length).toBeGreaterThan(0);
    const statutoryDoc = docsRes.data.find((d) => d.documentNumber === 'DOC-MECC-ENV-2005');
    expect(statutoryDoc).toBeDefined();

    // Verify constraint is durably Verified in PostgreSQL
    const finalConstraints = await instance3Controller.listConstraints(projectId, req1);
    const verifiedConstraint = finalConstraints.data.find((c) => c.id === createdConstraintId);

    expect(verifiedConstraint).toBeDefined();
    expect(verifiedConstraint?.verificationStatus).toBe('Verified');
    expect(verifiedConstraint?.verifiedBy).toBe(technicalDirector.name);
    expect(verifiedConstraint?.verificationRecord?.systemCalculatedSha256).toBe('884136ab8abb69eea2b6adf2e73a986846c97b5781c2eb19f0910fb119521827');
    expect(verifiedConstraint?.verificationRecord?.reviewerRole).toBe('technical_director');

    // Check PostgreSQL audit ledger
    const pool = instance3Db.getPool();
    const auditRes = await pool.query(
      'SELECT * FROM audit_events WHERE target_id = $1 AND action = $2',
      [createdConstraintId, 'CONSTRAINT_VERIFIED']
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].actor_id).toBe(technicalDirector.userId);
    expect(auditRes.rows[0].target_version).toBe(4);
  });
});
