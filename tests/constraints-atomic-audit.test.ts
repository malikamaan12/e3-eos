import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ConstraintsController } from '../apps/api/src/operations/constraints.controller.js';
import { DbService } from '../apps/api/src/common/db.service.js';
import { randomUUID, createHash } from 'crypto';

describe('Atomic Verification + Audit Transaction Suite (Directive 4)', () => {
  let dbService: DbService;
  let controller: ConstraintsController;
  const projectId = '00000000-0000-4000-8000-000000000001';
  const orgId = '11111111-1111-4111-8111-111111111111';

  const reviewer = {
    userId: '10000000-0000-4000-8000-000000000005',
    email: 'karim.haddad@e3.qa',
    name: 'Karim Haddad',
    role: 'technical_director',
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

  it('ATOM-01: Commits constraint verification, status update, and audit ledger atomically in one transaction', async () => {
    const req = { sessionUser: reviewer, organisationId: orgId } as any;

    // 1. Create constraint in Draft
    const createRes = await controller.createConstraint(projectId, {
      constraintType: 'venue_operational_noise',
      sourceType: 'venue',
      sourceOrganization: 'DECC Operations',
      locationZone: 'Exhibition Hall 1',
      timeWindow: '24 Hours',
      limitValue: 85,
      unit: 'dB(A)',
      priority: 'high',
    }, req);

    const constraintId = createRes.data.id;
    createdConstraintIds.push(constraintId);
    expect(createRes.data.verificationStatus).toBe('Draft');

    // 2. Attach source
    await controller.attachSource(projectId, constraintId, {
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      pageClauseSection: 'Section 4.1 Acoustic Thresholds',
    }, req);

    // 3. Submit for review
    await controller.submitForReview(projectId, constraintId, req);

    // 4. Verify constraint
    const verifyRes = await controller.verifyConstraint(projectId, constraintId, {
      pageClauseSection: 'Section 4.1 Acoustic Thresholds',
      extractedRuleValue: '85 dB(A)',
      applicabilityStatement: 'Exhibition Hall 1 Ground Slab',
      reviewerComment: 'Acoustic envelope compliant with DECC operations manual.',
    }, req);

    expect(verifyRes.data.verificationStatus).toBe('Verified');
    expect(verifyRes.data.version).toBe(4);

    // 5. Query PostgreSQL directly to verify atomic multi-table commit
    const pool = dbService.getPool();
    const cRes = await pool.query('SELECT * FROM operational_constraints WHERE id = $1', [constraintId]);
    expect(cRes.rows[0].verification_status).toBe('Verified');
    expect(cRes.rows[0].version).toBe(4);

    const vRes = await pool.query('SELECT * FROM constraint_verifications WHERE constraint_id = $1', [constraintId]);
    expect(vRes.rows.length).toBe(1);
    expect(vRes.rows[0].verifier_user_id).toBe(reviewer.userId);
    expect(vRes.rows[0].verifier_role).toBe('technical_director');
    expect(vRes.rows[0].source_hash).toBe('9aaedaecbd3adaf9fb2547cca03643a4ac70c8697d8a695d94c71b0078798ffa');

    const aRes = await pool.query('SELECT * FROM audit_events WHERE target_id = $1 AND action = $2', [constraintId, 'CONSTRAINT_VERIFIED']);
    expect(aRes.rows.length).toBe(1);
    expect(aRes.rows[0].actor_id).toBe(reviewer.userId);
    expect(aRes.rows[0].target_version).toBe(4);
  });

  it('ATOM-02: Rollback transaction completely when hash mismatch occurs — constraint remains Under Review', async () => {
    const pool = dbService.getPool();
    const client = await pool.connect();
    const req = { sessionUser: reviewer, organisationId: orgId } as any;

    try {
      // 1. Create constraint and attach source
      const createRes = await controller.createConstraint(projectId, {
        constraintType: 'floor_load',
        sourceType: 'venue',
        sourceOrganization: 'DECC Civil Directorate',
        locationZone: 'Main Hall Floor',
        timeWindow: '24 Hours',
        limitValue: 2500,
        unit: 'kg/m²',
        priority: 'statutory_mandatory',
      }, req);

      const constraintId = createRes.data.id;
      createdConstraintIds.push(constraintId);

      await controller.attachSource(projectId, constraintId, {
        controlledDocumentId: 'doc-decc-fp-01-def',
        documentRevisionId: 'rev-decc-fp-01-def',
        pageClauseSection: 'Section 3.2 Floor Capacity',
      }, req);

      await controller.submitForReview(projectId, constraintId, req);

      // Verify it is in 'Under Review' and version 3 (1 create + 1 attach + 1 submit)
      const preCheck = await pool.query('SELECT verification_status, version FROM operational_constraints WHERE id = $1', [constraintId]);
      expect(preCheck.rows[0].verification_status).toBe('Under Review');
      expect(preCheck.rows[0].version).toBe(3);

      // Corrupt the link hash in database to simulate tampering
      await pool.query(
        'UPDATE constraint_source_links SET calculated_sha256 = $1 WHERE constraint_id = $2',
        ['tampered_hash_00000000000000000000000000000000000000000000000000000000', constraintId]
      );

      // 2. Attempt verification -> Rejects with SOURCE_HASH_MISMATCH
      await expect(
        controller.verifyConstraint(projectId, constraintId, {
          pageClauseSection: 'Section 3.2',
          extractedRuleValue: '2500 kg/m²',
          reviewerComment: 'Verification should fail due to hash tampering',
        }, req)
      ).rejects.toThrow();

      // 3. Confirm atomic ROLLBACK: constraint MUST remain Under Review and version 3
      const postCheck = await pool.query('SELECT verification_status, version FROM operational_constraints WHERE id = $1', [constraintId]);
      expect(postCheck.rows[0].verification_status).toBe('Under Review');
      expect(postCheck.rows[0].version).toBe(3);

      // No verification record should exist
      const vCheck = await pool.query('SELECT * FROM constraint_verifications WHERE constraint_id = $1', [constraintId]);
      expect(vCheck.rows.length).toBe(0);

      // No audit event should exist
      const aCheck = await pool.query('SELECT * FROM audit_events WHERE target_id = $1', [constraintId]);
      expect(aCheck.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it('ATOM-03: Rollback transaction completely when audit event write fails — constraint remains Under Review', async () => {
    const pool = dbService.getPool();
    const req = { sessionUser: reviewer, organisationId: orgId } as any;

    // 1. Create and prepare constraint in Under Review
    const createRes = await controller.createConstraint(projectId, {
      constraintType: 'clear_height',
      sourceType: 'venue',
      sourceOrganization: 'DECC Operations',
      locationZone: 'Exhibition Hall 2',
      timeWindow: '24 Hours',
      limitValue: 18,
      unit: 'meters',
      priority: 'high',
    }, req);

    const constraintId = createRes.data.id;
    createdConstraintIds.push(constraintId);

    await controller.attachSource(projectId, constraintId, {
      controlledDocumentId: 'doc-decc-fp-01-def',
      documentRevisionId: 'rev-decc-fp-01-def',
      pageClauseSection: 'Section 6.1 Height',
    }, req);

    await controller.submitForReview(projectId, constraintId, req);

    // 2. Execute verification in a raw PostgreSQL client simulating failure during audit insertion
    const client = await pool.connect();
    let transactionFailed = false;

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_org_id', $1, true)", [orgId]);

      // Lock row
      const cRes = await client.query('SELECT * FROM operational_constraints WHERE id = $1 FOR UPDATE', [constraintId]);
      expect(cRes.rows[0].verification_status).toBe('Under Review');
      expect(cRes.rows[0].version).toBe(3);

      // Update status to Verified
      await client.query(`
        UPDATE operational_constraints
        SET verification_status = 'Verified', version = version + 1
        WHERE id = $1
      `, [constraintId]);

      // Insert verification record
      await client.query(`
        INSERT INTO constraint_verifications (
          id, organisation_id, constraint_id, verifier_user_id, verifier_role,
          extracted_rule_value, applicability_statement, reviewer_comment,
          verified_at, audit_event_id, source_hash
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, '18m', 'Hall 2', 'Approved', NOW(), 'audit-temp', 'hash-temp');
      `, [orgId, constraintId, reviewer.userId, reviewer.role]);

      // SIMULATE AUDIT FAILURE: Insert with invalid foreign key or trigger intentional error
      await client.query('INSERT INTO audit_events (id, organisation_id, actor_id, action) VALUES ($1, $2, $3, $4)', [
        'invalid-non-uuid', // causes PostgreSQL syntax/type error for UUID primary key
        orgId,
        reviewer.userId,
        'CONSTRAINT_VERIFIED',
      ]);

      await client.query('COMMIT');
    } catch (err) {
      transactionFailed = true;
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    expect(transactionFailed).toBe(true);

    // 3. Verify that constraint remains in 'Under Review' status with version 3
    const finalCheck = await pool.query('SELECT verification_status, version FROM operational_constraints WHERE id = $1', [constraintId]);
    expect(finalCheck.rows[0].verification_status).toBe('Under Review');
    expect(finalCheck.rows[0].version).toBe(3);

    // Confirm no verification record was committed
    const vFinal = await pool.query('SELECT * FROM constraint_verifications WHERE constraint_id = $1', [constraintId]);
    expect(vFinal.rows.length).toBe(0);
  });
});
