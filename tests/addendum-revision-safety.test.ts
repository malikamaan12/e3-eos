import { beforeEach, describe, expect, it } from 'vitest';
import { HttpException } from '@nestjs/common';
import type { Request } from 'express';
import type { DocumentDeltaItem } from '@e3-eos/domain';
import {
  ScopeController,
  allocationRepository,
  designVariantRepository,
  documentComparisonRepository,
  parsingJobRepository,
  requirementAuditLog,
  requirementRepository,
  revisionRepository,
  type StoredDocumentComparison,
  type StoredParsingJob,
  type StoredRequirement,
} from '../apps/api/src/scope/scope.controller.js';

describe('Controlled addendum revision safety', () => {
  const projectId = 'project-a';
  const organisationId = 'org-a';
  const request = { organisationId, actorId: 'reviewer-a' } as unknown as Request;
  let controller: ScopeController;

  const requirement = (id = 'req-a', project = projectId): StoredRequirement => ({
    id, projectId: project, organisationId, title: 'Radio equipment',
    originalWording: 'Supply 12 radios.', interpretation: 'Reviewed radio equipment scope.',
    quantity: 12, unit: 'radios', status: 'approved', recordVersion: 3,
    createdAt: '2026-09-01T00:00:00.000Z',
  });
  const comparison = (delta: Partial<DocumentDeltaItem> = {}, project = projectId): StoredDocumentComparison => ({
    comparisonId: `cmp-${project}`, projectId: project, organisationId,
    newJobId: `job-${project}`, newDocumentName: 'Amendment.pdf', priorDocumentName: 'Baseline.pdf',
    totalDeltas: 1, quantityChangeCount: 1, modifiedRequirementsCount: 0, newRequirementsCount: 0,
    deltas: [{
      id: 'delta-a', changeType: 'changed_quantity', title: 'Revised radio quantity',
      affectedRequirementId: 'req-a', previousQuantity: 12, newQuantity: 9, quantityDelta: -3,
      previousWording: 'Supply 12 radios.', newWording: 'Supply 9 radios.', reviewStatus: 'pending',
      ...delta,
    }],
  });
  const snapshot = () => structuredClone({
    requirements: [...requirementRepository], revisions: [...revisionRepository],
    comparisons: [...documentComparisonRepository], allocations: [...allocationRepository],
    variants: [...designVariantRepository], audit: requirementAuditLog,
  });
  const rejectWithoutMutation = (code: string, body: Record<string, unknown> = {}) => {
    const before = snapshot();
    let error: HttpException | undefined;
    try {
      controller.applyAddendumRevision(projectId, { deltaId: 'delta-a', reason: 'Approved source amendment', ...body }, request);
    } catch (caught) {
      error = caught as HttpException;
    }
    expect(error).toBeInstanceOf(HttpException);
    expect(error?.getResponse()).toMatchObject({ code });
    expect(snapshot()).toEqual(before);
  };

  beforeEach(() => {
    controller = new ScopeController();
    for (const repository of [requirementRepository, revisionRepository, documentComparisonRepository, allocationRepository, designVariantRepository, parsingJobRepository]) repository.clear();
    requirementAuditLog.length = 0;
    requirementRepository.set('req-a', requirement());
    documentComparisonRepository.set('cmp-project-a', comparison());
  });

  it('rejects a foreign-project comparison even when its delta ID is known', () => {
    documentComparisonRepository.clear();
    documentComparisonRepository.set('cmp-project-b', comparison({}, 'project-b'));
    rejectWithoutMutation('NOT_FOUND');
  });

  it('rejects a foreign-organisation comparison', () => {
    documentComparisonRepository.get('cmp-project-a')!.organisationId = 'org-b';
    rejectWithoutMutation('NOT_FOUND');
  });

  it('rejects ambiguous legacy delta IDs instead of selecting the first comparison', () => {
    const duplicate = comparison();
    duplicate.comparisonId = 'cmp-duplicate';
    documentComparisonRepository.set(duplicate.comparisonId, duplicate);
    rejectWithoutMutation('AMBIGUOUS_DELTA');
  });

  it('does not resolve an unknown delta or target through a similarly named counter', () => {
    requirementRepository.set('counter-fallback', { ...requirement('counter-fallback'), title: 'Information counter' });
    rejectWithoutMutation('NOT_FOUND', { deltaId: 'unknown' });
    rejectWithoutMutation('NOT_FOUND', { targetRequirementId: 'unknown' });
  });

  it('requires an explicit or comparison-linked target', () => {
    documentComparisonRepository.get('cmp-project-a')!.deltas[0].affectedRequirementId = undefined;
    rejectWithoutMutation('TARGET_REQUIRED');
  });

  it('rejects a known requirement from another project', () => {
    requirementRepository.set('req-b', requirement('req-b', 'project-b'));
    rejectWithoutMutation('NOT_FOUND', { targetRequirementId: 'req-b' });
  });

  it('rejects a target that differs from the reviewed proposal', () => {
    requirementRepository.set('req-other', requirement('req-other'));
    rejectWithoutMutation('TARGET_MISMATCH', { targetRequirementId: 'req-other' });
  });

  it('rejects unresolved quantities and stale compared baselines before writing', () => {
    const delta = documentComparisonRepository.get('cmp-project-a')!.deltas[0];
    delta.newQuantity = undefined;
    rejectWithoutMutation('UNRESOLVED_QUANTITY');
    delta.newQuantity = 9;
    delta.previousQuantity = 10;
    rejectWithoutMutation('STALE_BASELINE');
  });

  it('rejects unresolved allocation data without a partial revision', () => {
    documentComparisonRepository.get('cmp-project-a')!.deltas[0].affectedAllocations = [{ zone: '', quantity: 3 }];
    rejectWithoutMutation('UNRESOLVED_ALLOCATION');
  });

  it('applies an exact project-scoped revision with real quantities and preserves its baseline', () => {
    const delta = documentComparisonRepository.get('cmp-project-a')!.deltas[0];
    delta.affectedAllocations = [{ zone: 'Broadcast room', quantity: 9 }];
    delta.proposedDesignVariant = 'Radio charging cabinet';
    const result = controller.applyAddendumRevision(projectId, { deltaId: delta.id, targetRequirementId: 'req-a', reason: 'Accepted client addendum' }, request);
    const revision = result.data.payload.revision;
    expect(requirementRepository.get('req-a')).toMatchObject({ quantity: 9, originalWording: 'Supply 9 radios.', interpretation: 'Reviewed radio equipment scope.', recordVersion: 4 });
    expect(revision.previousValues).toEqual({ quantity: 12, originalWording: 'Supply 12 radios.' });
    expect(revision.newValues).toMatchObject({ quantity: 9, quantityDelta: -3, proposedDesignVariant: 'Radio charging cabinet' });
    expect(revision.impact).toMatchObject({ sourceComparisonId: 'cmp-project-a', sourceDeltaId: delta.id });
    expect([...allocationRepository.values()]).toMatchObject([{ quantity: 9, zone: 'Broadcast room', location: '', unit: 'radios', status: 'unassigned' }]);
    expect(designVariantRepository.size).toBe(0);
    rejectWithoutMutation('DELTA_ALREADY_REVIEWED');
  });

  it('preserves an explicit zero quantity without replacing it with an example amount', () => {
    Object.assign(documentComparisonRepository.get('cmp-project-a')!.deltas[0], { newQuantity: 0, newWording: 'Supply 0 radios.' });
    const result = controller.applyAddendumRevision(projectId, { deltaId: 'delta-a' }, request);
    expect(result.data.payload.revision.newValues).toMatchObject({ quantity: 0, quantityDelta: -12 });
    expect(requirementRepository.get('req-a')!.quantity).toBe(0);
  });

  it('keeps unknown quantities unknown for a wording-only amendment', () => {
    requirementRepository.get('req-a')!.quantity = undefined;
    const delta = documentComparisonRepository.get('cmp-project-a')!.deltas[0];
    Object.assign(delta, { changeType: 'changed_specification', previousQuantity: undefined, newQuantity: undefined, quantityDelta: undefined, newWording: 'Use encrypted radio channels.' });
    const result = controller.applyAddendumRevision(projectId, { deltaId: delta.id }, request);
    expect(result.data.payload.revision.previousValues.quantity).toBeUndefined();
    expect(result.data.payload.revision.newValues.quantity).toBeUndefined();
    expect(result.data.payload.revision.newValues.quantityDelta).toBeUndefined();
    expect(requirementRepository.get('req-a')!.quantity).toBeUndefined();
  });

  it('binds comparisons to exact source jobs and rejects a foreign baseline job', () => {
    const job: StoredParsingJob = {
      id: 'job-a', projectId, organisationId, sourceDocumentName: 'Addendum.pdf', documentType: 'addendum',
      status: 'review_ready', totalExtracted: 1, approvedCount: 0, rejectedCount: 0, clarificationCount: 0,
      createdAt: '2026-09-01T00:00:00.000Z', candidates: [{
        id: 'candidate-a', jobId: 'job-a', title: 'Radio equipment',
        description: 'Radio equipment quantity revised to 9.', quantity: 9,
        originalWording: 'Supply 9 radios.',
      } as StoredParsingJob['candidates'][number]],
    };
    parsingJobRepository.set(job.id, job);
    parsingJobRepository.set('job-b', { ...job, id: 'job-b', projectId: 'project-b' });
    const before = snapshot();
    let error: HttpException | undefined;
    try {
      controller.compareDocuments(projectId, { newJobId: job.id, priorJobId: 'job-b' });
    } catch (caught) {
      error = caught as HttpException;
    }
    expect(error?.getResponse()).toMatchObject({ code: 'NOT_FOUND', title: 'Prior parsing job not found' });
    expect(snapshot()).toEqual(before);
    const first = controller.compareDocuments(projectId, { newJobId: job.id }).data.payload;
    const second = controller.compareDocuments(projectId, { newJobId: job.id }).data.payload;
    expect(first).toMatchObject({ projectId, organisationId, newJobId: job.id });
    expect(first.comparisonId).not.toBe(second.comparisonId);
    expect(first.deltas).toHaveLength(1);
    expect(first.deltas[0].id).not.toBe(second.deltas[0].id);
  });
});
