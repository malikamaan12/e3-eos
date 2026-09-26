import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contract = readFileSync(new URL('../packages/contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8');

// The new sections use YAML 1.2 JSON flow mappings. Parse those mappings with the
// built-in JSON parser, avoiding a new toolchain dependency just for this contract.
function flowSection(kind: string, indentation: number): Record<string, any> {
  const start = contract.indexOf(`# BEGIN P00 IMPLEMENTED MEMBERSHIP ${kind}`);
  const end = contract.indexOf(`# END P00 IMPLEMENTED MEMBERSHIP ${kind}`);
  if (start < 0 || end <= start) throw new Error(`Missing ${kind} contract section`);
  const section = contract.slice(start, end);
  const headers = [...section.matchAll(new RegExp(`^ {${indentation}}([^\\n]+):\\n`, 'gm'))];
  return Object.fromEntries(headers.map((header, index) => {
    const beginning = header.index! + header[0].length;
    const ending = headers[index + 1]?.index ?? section.length;
    return [header[1], JSON.parse(section.slice(beginning, ending).trim())];
  }));
}

const paths = flowSection('CONTRACTS', 2);
const schemas = flowSection('SCHEMAS', 4);

describe('Versioned P00 membership OpenAPI contracts', () => {
  it('keeps the served and repository mirror identical and documents actual session credentials', () => {
    expect(readFileSync(new URL('../contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8')).toBe(contract);
    expect(contract).toContain('  version: 1.8.0');
    expect(contract).toContain('      name: eos_session');
    expect(contract).not.toContain('__Host-eos-session');
    expect(contract).toContain('    eosBearer:\n      type: http\n      scheme: bearer');
    for (const [route, path] of Object.entries(paths)) {
      for (const operation of Object.values(path) as any[]) {
        expect(operation.security).toEqual(['/auth/accept-invite', '/auth/invitations/inspect'].includes(route)
          ? [] : [{ eosBearer: [] }, { eosSession: [] }]);
      }
    }
  });

  it('documents the real revocation request, receipt and error behavior', () => {
    const operation = paths['/memberships/{id}/revoke'].post;
    const key = operation.parameters.find((parameter: any) => parameter.name === 'Idempotency-Key');
    expect(key).toMatchObject({ in: 'header', required: true, schema: { minLength: 1, maxLength: 200 } });
    expect(operation.requestBody).toMatchObject({ required: true });
    expect(schemas.MembershipRevocationRequest.required).toEqual(['reason']);
    expect(schemas.MembershipRevocationRequest.properties.reason).toMatchObject({ minLength: 1, maxLength: 2000 });
    expect(Object.keys(operation.responses).sort()).toEqual(['201', '400', '401', '403', '404', '409', '503']);
    expect(operation.responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/MembershipRevocationResult');
    expect(schemas.MembershipRevocationResult.required).toEqual(['data']);
    expect(schemas.MembershipRevocationResult.properties.data.required).toEqual([
      'id', 'organisationId', 'userId', 'status', 'isRevoked', 'revokedBy', 'revokedAt', 'auditEventId', 'eventId',
    ]);
    expect(operation.responses['403'].content['application/json'].schema.$ref).toBe('#/components/schemas/CommandOriginRejection');
  });

  it('exposes membership identifiers, revocation states, verified capabilities and bounded durable audit metadata', () => {
    expect(paths['/admin/users'].get.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/AdminUsersResult');
    expect(schemas.AdminMembership.required).toContain('membershipId');
    expect(schemas.AdminMembership.required).toContain('isRevoked');
    expect(schemas.AdminMembership.required).toContain('rowVersion');
    expect(schemas.AdminMembership.properties.rowVersion).toMatchObject({ type: 'integer', minimum: 1 });
    expect(schemas.AdminAccessCapabilities.properties.canInvite.type).toBe('boolean');
    expect(schemas.AdminAccessCapabilities.properties.canCancelInvitations.type).toBe('boolean');
    expect(schemas.AdminAccessCapabilities.required).toContain('allowedInvitationRoles');
    for (const capability of ['canAssignProjectAccess', 'canChangeRoles', 'canRestoreMemberships']) {
      expect(schemas.AdminAccessCapabilities.properties[capability].type).toBe('boolean');
      expect(schemas.AdminAccessCapabilities.properties[capability]).not.toHaveProperty('const');
      expect(schemas.AdminAccessCapabilities.required).toContain(capability);
    }
    expect(schemas.AdminAccessCapabilities.required).toContain('allowedMembershipRoles');
    expect(schemas.AdminAccessCapabilities.properties.disabledReasons).not.toHaveProperty('required');
    expect(paths['/audit-events'].get.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/OrganisationAuditEventsResult');
    expect(schemas.OrganisationAuditEventsResult.properties.data.maxItems).toBe(100);
    expect(schemas.OrganisationAuditEvent.properties).not.toHaveProperty('reason');
    expect(schemas.OrganisationAuditEvent.properties).not.toHaveProperty('payload');
  });

  it('does not advertise successful results for disabled legacy admin and user-wide access mutations', () => {
    const operations = [paths['/admin/users'].post,
      paths['/admin/project-access'].get, paths['/admin/project-access'].post,
      paths['/admin/users/{id}/role'].post, paths['/admin/users/{id}/status'].post];
    for (const operation of operations) {
      expect(operation['x-eos-status']).toBe('unavailable');
      expect(operation.responses).toHaveProperty('503');
      expect(Object.keys(operation.responses).some((status) => status.startsWith('2'))).toBe(false);
    }
  });

  it('documents controlled invitations with stable command keys and bounded nonprivileged roles', () => {
    for (const route of ['/invitations', '/invitations/{id}/cancel', '/auth/accept-invite']) {
      const operation = paths[route].post;
      expect(operation.parameters.find((parameter: any) => parameter.name === 'Idempotency-Key'))
        .toMatchObject({ in: 'header', required: true, schema: { minLength: 1, maxLength: 200 } });
      expect(operation.responses).toHaveProperty('201');
      expect(operation.responses).toHaveProperty('409');
      expect(operation.responses).toHaveProperty('503');
    }
    expect(schemas.InvitationRole.enum).not.toContain('super_admin');
    expect(schemas.InvitationRole.enum).not.toContain('executive');
    expect(schemas.InvitationRole.enum).toContain('client_user');
    expect(schemas.InvitationCreateRequest.required).toEqual(['email', 'name', 'role', 'reason']);
    expect(schemas.InvitationCreateRequest.properties.reason).toMatchObject({ minLength: 1, maxLength: 2000 });
    expect(schemas.InvitationCreateResult.properties.data).toBeDefined();
    expect(schemas.OrganisationInvitation.properties).not.toHaveProperty('token');
    expect(schemas.OrganisationInvitation.properties).not.toHaveProperty('tokenHash');
    expect(schemas.OrganisationInvitation.properties.deliveryStatus.enum).not.toContain('sent');
  });

  it('documents token-body inspection and acceptance without claiming token-only existing-account access', () => {
    expect(paths['/auth/invitations/inspect'].post.requestBody.content['application/json'].schema.$ref)
      .toBe('#/components/schemas/InvitationInspectRequest');
    expect(schemas.InvitationInspectRequest.required).toContain('token');
    expect(schemas.InvitationAcceptRequest.required).toContain('token');
    expect(schemas.InvitationAcceptRequest.properties.password.description).toMatch(/72/);
    expect(paths['/auth/accept-invite'].post.description).toMatch(/existing.*session|session.*existing/i);
    expect(paths['/auth/accept-invite'].post.responses).toHaveProperty('410');
    expect(schemas.InvitationAcceptResult.required).toEqual(expect.arrayContaining(['success', 'membershipId', 'organisationId', 'auditEventId', 'eventId']));
  });

  it('documents versioned membership role/restoration commands and their durable session/access effects', () => {
    for (const [route, schema] of [['/memberships/{id}/role', 'MembershipRoleChangeRequest'], ['/memberships/{id}/restore', 'MembershipRestoreRequest']]) {
      const operation = paths[route].post;
      expect(operation.requestBody.content['application/json'].schema.$ref).toBe(`#/components/schemas/${schema}`);
      expect(operation.parameters.find((parameter: any) => parameter.name === 'Idempotency-Key'))
        .toMatchObject({ in: 'header', required: true, schema: { minLength: 1, maxLength: 200 } });
      expect(schemas[schema].required).toEqual(expect.arrayContaining(['reason', 'expectedVersion']));
      expect(schemas[schema].properties.expectedVersion).toMatchObject({ type: 'integer', minimum: 1 });
      expect(Object.keys(operation.responses).sort()).toEqual(['201', '400', '401', '403', '404', '409', '503']);
      expect(operation.responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/MembershipChangeResult');
      expect(operation.description).toContain('all devices and across organisations');
    }
    expect(schemas.MembershipRoleChangeRequest.required).toContain('role');
    expect(schemas.MembershipRole.enum).not.toContain('super_admin');
    expect(schemas.MembershipRole.enum).not.toContain('executive');
    const result = schemas.MembershipChangeResult.properties.data;
    expect(result.required).toEqual(expect.arrayContaining(['rowVersion', 'auditEventId', 'eventId', 'requiresFreshSignIn', 'invalidatedSessionCount', 'revokedProjectGrantCount']));
    expect(result.properties.requiresFreshSignIn.const).toBe(true);
    expect(paths['/memberships/{id}/restore'].post.description).toContain('No old project grant is reactivated');
  });

  it('documents explicit project grants separately from ownership and versions every existing-grant mutation', () => {
    expect(paths['/project-access'].get.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/ProjectAccessListResult');
    expect(paths['/project-access/projects'].get.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/ProjectAccessProjectsResult');
    expect(paths['/project-access'].get.parameters.find((parameter: any) => parameter.name === 'projectId'))
      .toMatchObject({ in: 'query', required: false, schema: { format: 'uuid' } });
    expect(schemas.ProjectAccessCreateRequest.required).toEqual(['projectId', 'membershipId', 'accessLevel', 'reason']);
    expect(schemas.ProjectAccessCreateRequest.properties).not.toHaveProperty('userId');
    expect(schemas.ProjectAccessLevel.enum).toEqual(['viewer', 'editor']);
    for (const [route, schema] of [['/project-access/{id}/change', 'ProjectAccessChangeRequest'], ['/project-access/{id}/revoke', 'ProjectAccessRevokeRequest']]) {
      expect(schemas[schema].required).toEqual(expect.arrayContaining(['reason', 'expectedVersion']));
      expect(schemas[schema].properties.expectedVersion).toMatchObject({ type: 'integer', minimum: 1 });
      expect(paths[route].post.requestBody.content['application/json'].schema.$ref).toBe(`#/components/schemas/${schema}`);
    }
    for (const route of ['/project-access', '/project-access/{id}/change', '/project-access/{id}/revoke']) {
      const operation = paths[route].post;
      expect(operation.parameters.find((parameter: any) => parameter.name === 'Idempotency-Key'))
        .toMatchObject({ in: 'header', required: true, schema: { minLength: 1, maxLength: 200 } });
      expect(operation.responses['201'].content['application/json'].schema.$ref).toBe('#/components/schemas/ProjectAccessCommandResult');
      expect(Object.keys(operation.responses).sort()).toEqual(['201', '400', '401', '403', '404', '409', '503']);
      expect(operation.description).toContain('never stand in for a project grant');
    }
    expect(schemas.ProjectAccessGrant.required).toEqual(expect.arrayContaining(['membershipId', 'rowVersion', 'isRevoked', 'membershipRevoked', 'effectiveAccess']));
    expect(schemas.ProjectAccessCommandResult.properties.data.required).toEqual(expect.arrayContaining(['auditEventId', 'eventId']));
    expect(schemas.ProjectAccessGrant.properties.effectiveAccess.description).toContain('current role permission');
  });

  it('resolves every new schema reference and uses unique operation identifiers', () => {
    const references: string[] = [];
    const visit = (value: any) => {
      if (!value || typeof value !== 'object') return;
      if (value.$ref) references.push(value.$ref);
      Object.values(value).forEach(visit);
    };
    visit(paths);
    visit(schemas);
    references.forEach((reference) => {
      expect(reference).toMatch(/^#\/components\/schemas\//);
      const name = reference.split('/').at(-1)!;
      expect(Boolean(schemas[name]) || contract.includes(`    ${name}:\n`)).toBe(true);
    });
    const operationIds = Object.values(paths).flatMap((path) => Object.values(path).map((operation: any) => operation.operationId));
    expect(new Set(operationIds).size).toBe(operationIds.length);
  });
});
