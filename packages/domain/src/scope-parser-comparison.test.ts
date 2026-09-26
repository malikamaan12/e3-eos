import { describe, expect, it } from 'vitest';
import { compareDocumentVersions, type ExtractedScopeCandidate } from './scope-parser.js';
import type { ScopeRequirement } from './requirements.js';

describe('Document comparison quantities remain source-backed', () => {
  const candidate = (values: Partial<ExtractedScopeCandidate> = {}): ExtractedScopeCandidate => ({
    id: 'candidate-radio', jobId: 'job-amendment', title: 'Radio equipment',
    description: 'Radio specification revised.', originalWording: 'Radio specification revised.',
    ...values,
  } as ExtractedScopeCandidate);
  const compare = (prior: ExtractedScopeCandidate[], next: ExtractedScopeCandidate, requirements: ScopeRequirement[] = []) =>
    compareDocumentVersions({ documentName: 'Baseline.pdf', candidates: prior }, { documentName: 'Amendment.pdf', candidates: [next] }, requirements).deltas[0];

  it('does not invent a chair baseline or take a quantity from an unrelated prior candidate', () => {
    const delta = compare(
      [candidate({ title: 'Lighting rig', quantity: 20 })],
      candidate({ title: 'Chairs', description: 'Chair specification revised.', originalWording: 'Chair specification revised.' }),
    );
    expect(delta.previousQuantity).toBeUndefined();
    expect(delta.newQuantity).toBeUndefined();
    expect(delta.quantityDelta).toBeUndefined();
    expect(delta.previousWording).toBeUndefined();
    expect(delta.affectedAllocations).toBeUndefined();
  });

  it('keeps an unknown controlled baseline unknown even if an older candidate had a quantity', () => {
    const delta = compare([candidate({ quantity: 20 })], candidate({ quantity: 30 }), [
      { id: 'req-radio', title: 'Radio equipment', quantity: undefined } as ScopeRequirement,
    ]);
    expect(delta.previousQuantity).toBeUndefined();
    expect(delta.newQuantity).toBe(30);
    expect(delta.quantityDelta).toBeUndefined();
    expect(delta.boqImpact).toBeUndefined();
    expect(delta.productionImpact).toBeUndefined();
  });

  it.each([
    { baseline: 0, revised: 9, difference: 9 },
    { baseline: 12, revised: 0, difference: -12 },
    { baseline: 20, revised: 24, difference: 4 },
  ])('calculates $baseline → $revised using the actual quantities', ({ baseline, revised, difference }) => {
    const delta = compare([candidate({ quantity: baseline })], candidate({ quantity: revised }));
    expect(delta.previousQuantity).toBe(baseline);
    expect(delta.newQuantity).toBe(revised);
    expect(delta.quantityDelta).toBe(difference);
    expect(delta.changeType).toBe('changed_quantity');
  });

  it('does not assign a default quantity to Zone A when the amended amount is unresolved', () => {
    const delta = compare([], candidate({
      title: 'Zone A chairs', description: 'Zone A chair quantity revised; amount requires clarification.',
      originalWording: 'Zone A chair quantity revised; amount requires clarification.',
    }));
    expect(delta.previousQuantity).toBeUndefined();
    expect(delta.newQuantity).toBeUndefined();
    expect(delta.quantityDelta).toBeUndefined();
    expect(delta.affectedAllocations).toBeUndefined();
  });

  it('does not infer a VIP allocation from a total increase or a zone mention', () => {
    const delta = compare([candidate({ quantity: 10 })], candidate({
      quantity: 14, description: 'Radio total revised to 14. VIP Zone allocation is awaiting confirmation.',
      originalWording: 'Radio total revised to 14. VIP Zone allocation is awaiting confirmation.',
    }));
    expect(delta.quantityDelta).toBe(4);
    expect(delta.affectedAllocations).toBeUndefined();
  });

  it('uses an explicit zone allocation including zero rather than a default or total delta', () => {
    const delta = compare([candidate({ quantity: 10 })], candidate({
      quantity: 14, description: 'Radio total revised to 14. VIP Zone: 0. Zone B: 14.',
      originalWording: 'Radio total revised to 14. VIP Zone: 0. Zone B: 14.',
    }));
    expect(delta.affectedAllocations).toEqual([{ zone: 'VIP Zone', quantity: 0 }, { zone: 'Zone B', quantity: 14 }]);
  });
});
