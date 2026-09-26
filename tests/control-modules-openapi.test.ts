import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = readFileSync(new URL('../packages/contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8');
function section(kind: 'CONTRACTS' | 'SCHEMAS', indentation: number): Record<string, any> {
  const start = contract.indexOf(`# BEGIN P01 P04 CONTROL REGISTER ${kind}`), end = contract.indexOf(`# END P01 P04 CONTROL REGISTER ${kind}`);
  if (start < 0 || end <= start) throw new Error(`Missing control ${kind}`);
  const source = contract.slice(start, end), headers = [...source.matchAll(new RegExp(`^ {${indentation}}([^\\n]+):\\n`, 'gm'))];
  if (new Set(headers.map(header => header[1])).size !== headers.length) throw new Error('Duplicate control contract key');
  return Object.fromEntries(headers.map((header, index) => [header[1], JSON.parse(source.slice(header.index! + header[0].length, headers[index + 1]?.index ?? source.length).trim())]));
}
const paths = section('CONTRACTS', 2), schemas = section('SCHEMAS', 4);
const requirement = '/projects/{projectId}/scope-register/requirements', clarification = '/projects/{projectId}/scope-register/clarifications', observation = '/projects/{projectId}/field-observations';
function walk(value: any, visit: (value: Record<string, any>) => void) {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value)) visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}
function request(route: string) { return schemas[paths[route].post.requestBody.content['application/json'].schema.$ref.split('/').at(-1)]; }

describe('Control register OpenAPI 1.8.0', () => {
  it('keeps runtime mirrors identical and resolves every declared schema reference', () => {
    expect(readFileSync(new URL('../contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8')).toBe(contract);
    expect(contract).toContain('  version: 1.8.0');
    const declared = new Set([...contract.matchAll(/^    ([A-Za-z0-9_]+):$/gm)].map(match => match[1]));
    walk({ paths, schemas }, node => {
      if (node.$ref) expect(declared.has(node.$ref.split('/').at(-1))).toBe(true);
      if (node.required && node.properties) for (const key of node.required) expect(node.properties).toHaveProperty(key);
    });
    const allPaths = [...contract.matchAll(/^  (\/[^\n]+):$/gm)].map(match => match[1]);
    expect(new Set(allPaths).size).toBe(allPaths.length);
  });

  it('declares exact nested routes, live credentials, action permissions and scoped identifiers', () => {
    const implemented: Record<string, string[]> = {
      [requirement]: ['get', 'post'], [requirement + '/{id}']: ['get'], [requirement + '/{id}/revisions']: ['get', 'post'],
      [clarification]: ['get', 'post'], [clarification + '/{id}']: ['get'], [clarification + '/{id}/respond']: ['post'], [clarification + '/{id}/reopen']: ['post'],
      [observation]: ['get', 'post'], [observation + '/{id}']: ['get'],
    };
    for (const [route, methods] of Object.entries(implemented)) {
      expect(Object.keys(paths[route]).sort()).toEqual([...methods].sort());
      for (const method of methods) {
        const op = paths[route][method];
        expect(op.security).toEqual([{ eosBearer: [] }, { eosSession: [] }]);
        expect(op.parameters.filter((p: any) => p.in === 'path').map((p: any) => p.name)).toEqual([...route.matchAll(/\{([^}]+)\}/g)].map(match => match[1]));
        expect(op['x-eos-any-permissions']).toEqual(route.includes('field-observations') ? ['projects.manage', 'operations.manage', 'field.inspect'] : ['projects.manage', 'design.version', 'operations.manage']);
        expect(op.description).toContain('Identity and audience headers cannot change the verified actor');
        for (const code of ['400', '401', '403', '404', '503', method === 'get' ? '200' : '201']) expect(op.responses).toHaveProperty(code);
        if (method === 'get') expect(op.responses['200'].headers['Cache-Control'].schema.const).toBe('no-store');
      }
    }
  });

  it('requires stable transport keys and strict metadata for every real write', () => {
    for (const route of Object.keys(paths)) {
      const op = paths[route].post;
      if (!op || op['x-eos-status'] === 'unavailable') continue;
      expect(op.parameters.find((p: any) => p.name === 'Idempotency-Key')).toMatchObject({ required: true, in: 'header', schema: { minLength: 1, maxLength: 200 } });
      expect(op.parameters.find((p: any) => p.name === 'Origin').description).toContain('cookie-authenticated');
      expect(request(route).additionalProperties).toBe(false);
      expect(request(route).required).toContain('reason');
      expect(request(route).properties.reason).toMatchObject({ minLength: 1, maxLength: 2000 });
      expect(op.responses).toHaveProperty('409');
      expect(op.description).toContain('Receipt replay never bypasses current authority');
    }
  });

  it('keeps unknown and zero quantities distinct without accepting claimed dates or approvals', () => {
    const draft = request(requirement);
    expect(draft.required).toEqual(['title', 'originalWording', 'sourceType', 'reason']);
    expect(draft.properties.originalWording.description).toContain('Stored exactly');
    expect(draft.properties.quantity.anyOf[0].type).toBe('string');
    expect(draft.properties.quantity.anyOf).toContainEqual({ type: 'null' });
    const decimal = new RegExp(draft.properties.quantity.anyOf[0].pattern);
    for (const valid of ['0', '12.34', '999999999999999999.000001']) expect(decimal.test(valid)).toBe(true);
    for (const invalid of ['-1', '1e6', '1.1234567', '1,000']) expect(decimal.test(invalid)).toBe(false);
    for (const forbidden of ['isApproved', 'status', 'dueDate', 'startDate', 'operationalScopePublished', 'isVerified', 'sourceEvidenceSpans']) expect(draft.properties).not.toHaveProperty(forbidden);
    expect(schemas.RequirementIntakeRecord.properties.sourceVerification.const).toBe('unverified');
    expect(schemas.RequirementIntakeRecord.properties.operationalScopePublished.const).toBe(false);
    expect(schemas.RequirementIntakeCapabilities.properties.canApprove.const).toBe(false);
    expect(schemas.RequirementIntakeCapabilities.properties.canPublish.const).toBe(false);
  });

  it('requires optimistic revision versions while preserving source integrity limitations and immutable history', () => {
    const revision = request(requirement + '/{id}/revisions');
    expect(revision.required).toEqual(expect.arrayContaining(['title', 'originalWording', 'sourceType', 'expectedVersion', 'reason']));
    expect(revision.properties.expectedVersion).toMatchObject({ type: 'integer', minimum: 1 });
    expect(paths[requirement + '/{id}/revisions'].post.description).toContain('Earlier revisions are not overwritten');
    expect(paths[requirement + '/{id}/revisions'].post.description).toContain('REQUIREMENT_VERSION_CONFLICT');
    expect(schemas.RequirementIntakeRevision.properties.snapshotIntegrityVerified.description).toContain('does not verify external source truth');
    expect(schemas.RequirementIntakeSnapshot.properties.isApproved.const).toBe(false);
    expect(schemas.RequirementIntakeSnapshot.properties.startDate.type).toBe('null');
    expect(schemas.RequirementIntakeRevisionListResult.properties.data.maxItems).toBe(500);
    expect(schemas.RequirementIntakeRecord.properties.provenanceState.enum).toContain('legacy_unverified');
  });

  it('pins clarification source versions and keeps answers distinct from scope approval or external issue', () => {
    expect(request(clarification).required).toEqual(['question', 'sourceAttribution', 'ownerId', 'reason']);
    expect(request(clarification).required).not.toContain('dueAt');
    expect(paths[clarification].post.description).toContain('exact manually recorded revision');
    expect(schemas.ClarificationRecord.properties.requirementRevisionId).toBeDefined();
    expect(schemas.ClarificationRecord.properties.deliveryState.const).toBe('not_issued');
    expect(schemas.ClarificationRecord.properties.scopeApprovalState.const).toBe('not_approved');
    expect(schemas.ClarificationAttributedResponse.properties.verificationState.const).toBe('attributed_unverified');
    expect(request(clarification + '/{id}/respond').required).toEqual(['expectedVersion', 'response', 'respondentAttribution', 'sourceAttribution', 'reason']);
    expect(request(clarification + '/{id}/reopen').required).toEqual(['expectedVersion', 'reason']);
    expect(paths[clarification + '/{id}/reopen'].post.description).toContain('immutable earlier responses and state history remain');
    expect(schemas.ClarificationRecordDetail.properties.responses.maxItems).toBe(500);
    expect(schemas.ClarificationRecordListResult.properties.data.maxItems).toBe(200);
  });

  it('documents operation identity separately from transport retries and rechecks assignment before returning receipts', () => {
    const capture = request(observation), op = paths[observation].post;
    expect(capture.required).toEqual(['clientOperationId', 'deviceId', 'capturedAt', 'note', 'reason']);
    expect(capture.dependentRequired).toEqual({ baseVersion: ['taskId'] });
    expect(capture.required).not.toContain('taskId');
    expect(capture.required).not.toContain('baseVersion');
    expect(capture.properties.baseVersion).toMatchObject({ minimum: 1, maximum: 2147483647 });
    for (const forbidden of ['actorId', 'organisationId', 'status', 'files', 'isCompleted', 'incidentDetails']) expect(capture.properties).not.toHaveProperty(forbidden);
    expect(op.description).toContain('new HTTP key returns the exact original receipt');
    expect(op.description).toContain('only a transport-key alias');
    expect(op.description).toContain('Current authority and linked-task assignment are checked before receipt replay');
    expect(op.description).toContain('FIELD_OPERATION_CONFLICT');
    expect(paths[observation].get.description).toContain('only their own observations');
  });

  it('acknowledges stale notes as observations without authoritative task updates or file claims', () => {
    const receipt = schemas.FieldObservationReceipt;
    expect(receipt.required).toEqual(expect.arrayContaining(['id', 'actorId', 'clientOperationId', 'payloadHash', 'note', 'reason', 'receivedAt', 'auditEventId', 'eventId']));
    expect(receipt.properties.status.enum).toEqual(['accepted', 'accepted_as_observation_with_conflict']);
    expect(receipt.properties.authorityEffect.const).toBe('observation_only');
    expect(receipt.properties.clientTimestampClaimed.const).toBe(true);
    expect(receipt.properties.deviceIdClaimed.const).toBe(true);
    expect(receipt.properties.contractVersion.const).toBe('field-observation.v1');
    expect(schemas.FieldObservationCommandResult.properties.data.$ref).toBe('#/components/schemas/FieldObservationReceipt');
    expect(schemas.FieldObservationListResult.properties.data.maxItems).toBe(200);
    expect(paths[observation].post.description).toContain('it does not overwrite a task');
    expect(paths[observation].post.description).toContain('no authoritative completion');
    expect(paths[observation].post.description).toContain('uploaded files');
  });

  it('removes success contracts from unavailable legacy field and scope entrypoints', () => {
    for (const route of ['/field/sync', '/field/qualifications', '/field/media/upload-intents', '/field/media/{id}/complete', '/field/storage-contingency', '/projects/{projectId}/requirements', '/projects/{projectId}/clarifications']) {
      for (const op of Object.values(paths[route]) as any[]) {
        expect(op['x-eos-status']).toBe('unavailable');
        expect(op.responses).toHaveProperty('503');
        expect(Object.keys(op.responses).some(code => /^2\d\d$/.test(code))).toBe(false);
        expect(op.description).toContain('never an HTTP fallback');
      }
    }
    expect(contract.split('\n').filter(line => line === '  /field/sync:')).toHaveLength(1);
  });
});
