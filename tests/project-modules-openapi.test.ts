import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Prepared during implementation. Run with the consolidated project-module batch.
const contract = readFileSync(new URL('../packages/contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8');
function flowSection(kind: 'CONTRACTS' | 'SCHEMAS', indentation: number): Record<string, any> {
  const start = contract.indexOf(`# BEGIN P01 IMPLEMENTED PROJECT MODULE ${kind}`);
  const end = contract.indexOf(`# END P01 IMPLEMENTED PROJECT MODULE ${kind}`);
  if (start < 0 || end <= start) throw new Error(`Missing project-module ${kind}`);
  const section = contract.slice(start, end);
  const headers = [...section.matchAll(new RegExp(`^ {${indentation}}([^\\n]+):\\n`, 'gm'))];
  const names = headers.map(header => header[1]);
  if (new Set(names).size !== names.length) throw new Error(`Duplicate project-module ${kind} name`);
  return Object.fromEntries(headers.map((header, index) => [header[1], JSON.parse(section.slice(
    header.index! + header[0].length, headers[index + 1]?.index ?? section.length,
  ).trim())]));
}
const paths = flowSection('CONTRACTS', 2);
const schemas = flowSection('SCHEMAS', 4);
const auth = [{ eosBearer: [] }, { eosSession: [] }];
function walk(value: any, visit: (value: Record<string, any>) => void) {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value)) visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}
function requestSchema(route: string) { return paths[route].post.requestBody.content['application/json'].schema.$ref; }

describe('Project module OpenAPI contracts', () => {
  it('keeps the runtime mirrors identical and every flow mapping/reference well formed', () => {
    expect(readFileSync(new URL('../contracts/CORE_COMMANDS.openapi.yaml', import.meta.url), 'utf8')).toBe(contract);
    expect(contract).toContain('  version: 1.8.0');
    expect(Object.keys(paths).length).toBeGreaterThan(20);
    expect(Object.keys(schemas).length).toBeGreaterThan(20);
    const declaredSchemas = new Set([...contract.matchAll(/^    ([A-Za-z0-9_]+):$/gm)].map(match => match[1]));
    walk({ paths, schemas }, node => {
      if (node.$ref) {
        expect(node.$ref).toMatch(/^#\/components\/schemas\/[A-Za-z0-9_]+$/);
        expect(declaredSchemas.has(node.$ref.slice('#/components/schemas/'.length))).toBe(true);
      }
      if (node.required && node.properties) {
        for (const key of node.required) expect(node.properties).toHaveProperty(key);
      }
    });
  });

  it('documents every implemented route with exact nested identifiers and session credentials', () => {
    const implemented: Record<string, string[]> = {
      '/projects/{projectId}/work-packages': ['get', 'post'],
      '/projects/{projectId}/tasks': ['get', 'post'],
      '/projects/{projectId}/tasks/{taskId}/complete': ['post'],
      '/projects/{projectId}/documents': ['get', 'post'],
      '/projects/{projectId}/documents/{docId}': ['get'],
      '/projects/{projectId}/documents/{docId}/revisions': ['get', 'post'],
      '/projects/{projectId}/reports': ['get', 'post'],
      '/projects/{projectId}/reports/{id}': ['get'],
      '/projects/{projectId}/reports/{id}/revisions': ['post'],
      '/portfolio/summary': ['get'],
    };
    for (const [route, methods] of Object.entries(implemented)) {
      expect(Object.keys(paths[route]).sort()).toEqual([...methods].sort());
      const routeVariables = [...route.matchAll(/\{([^}]+)\}/g)].map(match => match[1]);
      // Prevent an older duplicate YAML key from silently replacing this operation.
      expect(contract.split('\n').filter(line => line === `  ${route}:`)).toHaveLength(1);
      for (const method of methods) {
        const operation = paths[route][method];
        expect(operation.security).toEqual(auth);
        expect(operation.parameters.filter((parameter: any) => parameter.in === 'path').map((parameter: any) => parameter.name)).toEqual(routeVariables);
        for (const parameter of operation.parameters.filter((item: any) => item.in === 'path')) expect(parameter.required).toBe(true);
        expect(operation.parameters.find((parameter: any) => parameter.name === 'x-organisation-id')).toMatchObject({ required: false, in: 'header' });
        expect(operation.responses).toHaveProperty(method === 'get' ? '200' : '201');
        for (const status of ['401', '403', '404', '503']) expect(operation.responses).toHaveProperty(status);
      }
    }
    expect(paths['/projects/{projectId}/documents/{docId}'].get.parameters.find((parameter: any) => parameter.name === 'docId').schema).not.toHaveProperty('format');
    expect(paths['/projects/{projectId}/reports/{id}'].get.parameters.find((parameter: any) => parameter.name === 'id').schema.format).toBe('uuid');
  });

  it('binds each prepared command to stable keys, reason and an atomic receipt', () => {
    const commandResults: string[] = [];
    for (const path of Object.values(paths)) {
      const operation = path.post;
      if (!operation || operation['x-eos-status'] === 'unavailable') continue;
      expect(operation.parameters.find((parameter: any) => parameter.name === 'Idempotency-Key'))
        .toMatchObject({ required: true, in: 'header', schema: { minLength: 1, maxLength: 200 } });
      expect(operation.parameters.find((parameter: any) => parameter.name === 'Origin').description).toMatch(/cookie-authenticated/);
      expect(operation.responses).toHaveProperty('409');
      const requestName = operation.requestBody.content['application/json'].schema.$ref.split('/').at(-1);
      expect(schemas[requestName].required).toContain('reason');
      expect(schemas[requestName].additionalProperties).toBe(false);
      expect(schemas[requestName].properties.reason).toMatchObject({ minLength: 1, maxLength: 2000 });
      commandResults.push(operation.responses['201'].content['application/json'].schema.$ref.split('/').at(-1));
    }
    for (const name of commandResults) {
      const receipt = schemas[name].properties.data.allOf.find((entry: any) => entry.properties?.auditEventId);
      expect(receipt.required).toEqual(expect.arrayContaining(['id', 'auditEventId', 'eventId']));
      expect(schemas[name].properties.meta.required).toEqual(expect.arrayContaining(['requestId', 'dataAsOf']));
    }
  });

  it('preserves task completion preconditions and distinguishes completion from acceptance', () => {
    expect(requestSchema('/projects/{projectId}/work-packages')).toBe('#/components/schemas/WorkPackageCreateRequest');
    expect(requestSchema('/projects/{projectId}/tasks')).toBe('#/components/schemas/WorkTaskCreateRequest');
    expect(schemas.WorkPackageCreateRequest.required).toEqual(['name', 'ownerId', 'reason']);
    expect(schemas.WorkTaskCreateRequest.required).toEqual(['packageId', 'title', 'reason']);
    expect(schemas.WorkTaskCompleteRequest.required).toEqual(['expectedVersion', 'reason']);
    expect(schemas.WorkTaskCompleteRequest.properties.expectedVersion).toMatchObject({ type: 'integer', minimum: 1 });
    const operation = paths['/projects/{projectId}/tasks/{taskId}/complete'].post;
    expect(operation.responses['412'].description).toContain('WORK_VERSION_CONFLICT');
    expect(operation.responses['428'].description).toContain('WORK_PRECONDITION_REQUIRED');
    expect(operation.description).toMatch(/only their own assigned tasks/);
    expect(operation.description).toMatch(/does not approve package output/);
    expect(operation.description).toMatch(/human text note/);
  });

  it('exposes document metadata without accepting or certifying file content', () => {
    expect(requestSchema('/projects/{projectId}/documents')).toBe('#/components/schemas/DocumentRegisterRequest');
    expect(requestSchema('/projects/{projectId}/documents/{docId}/revisions')).toBe('#/components/schemas/DocumentRevisionMetadataRequest');
    expect(schemas.DocumentRevisionMetadataRequest.required).toEqual(['revisionCode', 'changeSummary', 'expectedVersion', 'reason']);
    const forbidden = ['fileContent', 'storageKey', 'storageObjectPath', 'fileSizeBytes', 'contentHash', 'calculatedSha256', 'approvalState', 'quarantineScanState'];
    for (const field of forbidden) {
      expect(schemas.DocumentRegisterRequest.properties).not.toHaveProperty(field);
      expect(schemas.DocumentRevisionMetadataRequest.properties).not.toHaveProperty(field);
    }
    expect(schemas.DocumentRegisterRequest.properties.confidentialityLevel.enum).not.toContain('public');
    expect(schemas.DocumentRegisterRecord.properties.currentRevisionCode.type).toBe('null');
    expect(schemas.DocumentRegisterRecord.properties.fileState.enum).toEqual(['missing', 'unverified']);
    expect(schemas.DocumentRevisionMetadataRecord.properties.approvalState.enum).not.toContain('approved');
    expect(schemas.DocumentRevisionMetadataRecord.properties.quarantineScanState.enum).not.toContain('passed');
    expect(schemas.DocumentRevisionMetadataRecord.properties).not.toHaveProperty('storageKey');
    expect(schemas.DocumentRevisionMetadataRecord.properties).not.toHaveProperty('contentHash');
    for (const capability of ['canUploadFiles', 'canApprove', 'canPublish', 'canDownload']) expect(schemas.DocumentRegisterCapabilities.properties[capability].const).toBe(false);
    expect(schemas.DocumentRegisterListResult.properties.data.maxItems).toBe(500);
    expect(schemas.DocumentRevisionListResult.properties.data.maxItems).toBe(500);
    expect(paths['/projects/{projectId}/documents/{docId}/revisions'].post.description).toMatch(/before receipt replay/);
  });

  it('limits report snapshots and portfolio metrics to their actual internal source facts', () => {
    expect(requestSchema('/projects/{projectId}/reports')).toBe('#/components/schemas/ProjectReportCreateRequest');
    expect(requestSchema('/projects/{projectId}/reports/{id}/revisions')).toBe('#/components/schemas/ProjectReportRevisionRequest');
    expect(schemas.ProjectReportRevisionRequest.required).toEqual(['expectedVersion', 'reason']);
    expect(schemas.ProjectReportCreateRequest.properties.targetAudience.const).toBe('internal_command');
    expect(schemas.ProjectReportSummary.properties.status.const).toBe('draft');
    expect(schemas.ProjectReportSummary.properties.contentHash.pattern).toBe('^[a-f0-9]{64}$');
    expect(schemas.ProjectRecordSnapshot.required).toEqual(expect.arrayContaining(['definitionVersion', 'asOf', 'project', 'stages', 'activityCounts', 'sourceManifest', 'limitations']));
    expect(paths['/projects/{projectId}/reports'].post.description).toMatch(/period.*label/);
    expect(paths['/projects/{projectId}/reports/{id}/revisions'].post.description).toMatch(/Earlier snapshots are not overwritten/);
    const portfolio = schemas.PortfolioProjectSummaryResult.properties.data;
    expect(portfolio.required).toEqual(expect.arrayContaining(['asOf', 'definitionVersion', 'projectCount', 'reportCount', 'reportVersionCount', 'limitations']));
    for (const unsupported of ['revenue', 'cost', 'margin', 'capacity', 'attendance']) expect(portfolio.properties).not.toHaveProperty(unsupported);
    expect(paths['/portfolio/summary'].get.description).toMatch(/Only active explicit project grants/);
  });

  it('never advertises a success response for an unavailable legacy workflow', () => {
    const unavailableRoutes = [
      '/projects/{projectId}/gantt', '/projects/{projectId}/work-packages/{pkgId}/acceptances',
      '/projects/{projectId}/protective-actions',
      '/projects/{projectId}/reports/{id}/publish', '/projects/{projectId}/closure-decisions', '/projects/{projectId}/lessons',
      '/projects/{projectId}/documents/transmittals', '/projects/{projectId}/documents/required-slots',
      '/projects/{projectId}/documents/working-copies', '/projects/{projectId}/documents/{docId}/comments',
      '/projects/{projectId}/packs', '/vault',
    ];
    for (const route of unavailableRoutes) {
      expect(paths[route]).toBeDefined();
      expect(contract.split('\n').filter(line => line === `  ${route}:`)).toHaveLength(1);
      for (const operation of Object.values(paths[route]) as any[]) {
        expect(operation['x-eos-status']).toBe('unavailable');
        expect(operation.security).toEqual(auth);
        expect(operation.responses).toHaveProperty('503');
        expect(Object.keys(operation.responses).some(status => /^2\d\d$/.test(status))).toBe(false);
        expect(operation.description).toMatch(/never an HTTP fallback/);
      }
    }
  });
});
