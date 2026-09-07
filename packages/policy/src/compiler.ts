import { createHash } from 'crypto';
import { PolicyRule, PolicySnapshot } from './types.js';

export const COMPILER_VERSION = '1.0.0';

export class PolicyCompiler {
  /**
   * Generates a canonical, deterministically sorted JSON string for stable SHA-256 hashing.
   */
  static canonicalJson(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map((item) => PolicyCompiler.canonicalJson(item)).join(',')}]`;
    }
    const sortedKeys = Object.keys(obj).sort();
    const pairs = sortedKeys.map(
      (key) => `${JSON.stringify(key)}:${PolicyCompiler.canonicalJson(obj[key])}`
    );
    return `{${pairs.join(',')}}`;
  }

  /**
   * Computes SHA-256 hash of canonical representation.
   */
  static computeContentHash(data: any): string {
    const canonical = PolicyCompiler.canonicalJson(data);
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Validates rule syntax and invariants.
   */
  static validateRule(rule: PolicyRule): void {
    if (!rule.ruleId || typeof rule.ruleId !== 'string') {
      throw new Error('Rule must have a non-empty string ruleId');
    }
    if (!rule.trigger || typeof rule.trigger !== 'string') {
      throw new Error(`Rule ${rule.ruleId} must specify a valid trigger`);
    }
    if (!rule.condition || typeof rule.condition !== 'object') {
      throw new Error(`Rule ${rule.ruleId} must have a valid condition expression`);
    }
    if (!rule.sourceRef) {
      throw new Error(`Rule ${rule.ruleId} must have a sourceRef for provenance`);
    }
  }

  /**
   * Compiles rules into an immutable PolicySnapshot.
   */
  static compile(id: string, scope: Record<string, any>, rules: PolicyRule[]): PolicySnapshot {
    for (const rule of rules) {
      PolicyCompiler.validateRule(rule);
    }

    // Sort rules deterministically by ruleId and version
    const sortedRules = [...rules].sort((a, b) => {
      const cmp = a.ruleId.localeCompare(b.ruleId);
      return cmp !== 0 ? cmp : a.version - b.version;
    });

    const snapshotPayload = {
      id,
      scope,
      rules: sortedRules,
      compilerVersion: COMPILER_VERSION,
    };

    const contentHash = PolicyCompiler.computeContentHash(snapshotPayload);

    return {
      ...snapshotPayload,
      contentHash,
      compiledAt: new Date().toISOString(),
    };
  }

  /**
   * Detects if a candidate snapshot weakens a rule protecting a pending transaction
   * requested by the same author (AT-005: Anti-self-downgrade protection).
   */
  static detectSelfDowngrade(
    activeSnapshot: PolicySnapshot,
    candidateSnapshot: PolicySnapshot,
    actorId: string,
    pendingTransactions: Array<{ id: string; ownerId: string; trigger: string; ruleId: string }>
  ): { isBlocked: boolean; reason?: string } {
    for (const tx of pendingTransactions) {
      if (tx.ownerId === actorId) {
        // Find existing rule in active snapshot
        const activeRule = activeSnapshot.rules.find((r) => r.ruleId === tx.ruleId);
        const candidateRule = candidateSnapshot.rules.find((r) => r.ruleId === tx.ruleId);

        // If candidate removes or relaxes the rule that governs this pending transaction
        if (activeRule && (!candidateRule || candidateRule.whenFalse === 'warn')) {
          return {
            isBlocked: true,
            reason: `Self-downgrade detected: Actor ${actorId} cannot weaken rule ${tx.ruleId} governing their pending transaction ${tx.id}`,
          };
        }
      }
    }
    return { isBlocked: false };
  }
}
