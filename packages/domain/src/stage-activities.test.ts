import { describe, it, expect } from 'vitest';
import {
  ALL_STAGE_ACTIVITIES,
  getActivitiesForStage,
  getActivityById,
  instantiateProjectActivities,
  calculateStageProgress,
} from './stage-activities.js';

describe('Canonical Stage Activity Library (312 Normative Activities)', () => {
  it('should contain exactly 312 unique activities across 13 stages', () => {
    expect(ALL_STAGE_ACTIVITIES.length).toBe(312);

    const ids = new Set(ALL_STAGE_ACTIVITIES.map((a) => a.id));
    expect(ids.size).toBe(312);
  });

  it('should contain exactly 24 activities for each stage from Stage 01 to Stage 13', () => {
    for (let stageNum = 1; stageNum <= 13; stageNum++) {
      const stageActs = getActivitiesForStage(stageNum);
      expect(stageActs.length).toBe(24);

      const prefix = `S${String(stageNum).padStart(2, '0')}-`;
      for (const act of stageActs) {
        expect(act.id.startsWith(prefix)).toBe(true);
        expect(act.stageCode).toBe(`STAGE-${String(stageNum).padStart(2, '0')}`);
        expect(act.name).toBeTruthy();
        expect(act.proposedOwnerRole).toBeTruthy();
        expect(act.completionOutputOrEvidence).toBeTruthy();
      }
    }
  });

  it('should find specific activity by normative ID', () => {
    const s01_01 = getActivityById('S01-01');
    expect(s01_01).toBeDefined();
    expect(s01_01?.name).toBe('Capture title and project overview');
    expect(s01_01?.proposedOwnerRole).toBe('Intake owner');

    const s10_01 = getActivityById('S10-01');
    expect(s10_01).toBeDefined();
    expect(s10_01?.stageNumber).toBe(10);

    const s13_24 = getActivityById('S13-24');
    expect(s13_24).toBeDefined();
    expect(s13_24?.stageNumber).toBe(13);
  });

  it('should instantiate project activities with default not_started status', () => {
    const instances = instantiateProjectActivities('proj-doha-expo-01', [1, 2]);
    expect(instances.length).toBe(48); // 2 stages * 24 = 48
    expect(instances[0].projectId).toBe('proj-doha-expo-01');
    expect(instances[0].status).toBe('not_started');
  });

  it('should accurately calculate stage progress and completion percent', () => {
    const instances = instantiateProjectActivities('proj-test', [1]);
    expect(calculateStageProgress(instances, 1).percent).toBe(0);

    // Complete 12 out of 24
    for (let i = 0; i < 12; i++) {
      instances[i].status = 'completed';
    }
    expect(calculateStageProgress(instances, 1).percent).toBe(50);
    expect(calculateStageProgress(instances, 1).completed).toBe(12);

    // Complete all 24
    for (let i = 12; i < 24; i++) {
      instances[i].status = 'completed';
    }
    expect(calculateStageProgress(instances, 1).percent).toBe(100);
  });
});
