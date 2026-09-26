import { describe, it, expect } from 'vitest';
import { generateSeedManifest, seedMembershipAudience } from './seed.js';

it('assigns internal team roles to the internal audience even when they belong to an organisation', () => {
  expect(seedMembershipAudience('super_admin')).toBe('internal');
  expect(seedMembershipAudience('project_manager')).toBe('internal');
  expect(seedMembershipAudience('client_user')).toBe('client');
});

describe('Database Synthetic Seed Manifest', () => {
  it('should generate a complete, traceable seed manifest with 13 stages and 312 activities per project', () => {
    const manifest = generateSeedManifest();

    expect(manifest.seededAt).toBeDefined();
    expect(manifest.organisationsCount).toBeGreaterThan(0);
    expect(manifest.usersCount).toBeGreaterThan(0);
    expect(manifest.projectsCount).toBeGreaterThan(0);

    // Each project receives exactly 13 canonical stages
    expect(manifest.stageInstancesCount).toBe(manifest.projectsCount * 13);
    expect(manifest.entities.stageInstances).toHaveLength(manifest.stageInstancesCount);

    // Each project receives exactly 312 canonical stage activities
    expect(manifest.stageActivitiesCount).toBe(manifest.projectsCount * 312);
    expect(manifest.entities.stageActivities).toHaveLength(manifest.stageActivitiesCount);

    // Verify stage 1 instance starts in progress
    const firstStage = manifest.entities.stageInstances.find((s) => s.stageNumber === 1);
    expect(firstStage).toBeDefined();
    expect(firstStage?.stageName).toBe('Project Onboarding');
    expect(firstStage?.status).toBe('in_progress');
    expect(firstStage?.progressPercent).toBe(15);

    // Verify canonical activity codes span S01 through S13
    const s01Activity = manifest.entities.stageActivities.find((a) => a.activityCode === 'S01-01');
    expect(s01Activity).toBeDefined();
    expect(s01Activity?.title).toBe('Capture title and project overview');
    expect(s01Activity?.accountableRole).toBe('Intake owner');

    const s13Activity = manifest.entities.stageActivities.find((a) => a.activityCode === 'S13-24');
    expect(s13Activity).toBeDefined();
    expect(s13Activity?.title).toBe('Close, continue periodic reporting or reopen with reason');
    expect(s13Activity?.accountableRole).toBe('Authorised owner');
  });
});
