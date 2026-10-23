/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspaceDataset, validateAuthScreenInput } from './workspaceMode';

describe('buildWorkspaceDataset', () => {
  it('creates a completely empty dataset when mode is zero ("Empezar de 0") and requires onboarding', () => {
    const dataset = buildWorkspaceDataset('zero', 'Santiago Quinteros');
    assert.equal(dataset.mode, 'zero');
    assert.equal(dataset.onboardingRequired, true);
    assert.equal(dataset.profile.name, 'Santiago Quinteros');
    assert.equal(dataset.weighIns.length, 0);
    assert.equal(dataset.measurements.length, 0);
    assert.equal(dataset.foodLogs.length, 0);
    assert.equal(dataset.workoutSessions.length, 0);
    assert.equal(dataset.activityLogs.length, 0);
    assert.equal(dataset.recoveryLogs.length, 0);
    assert.equal(dataset.weeklyReviews.length, 0);
    assert.deepEqual(dataset.habitsByDate, {});
  });

  it('creates a populated demo dataset when mode is demo ("Datos de Prueba")', () => {
    const dataset = buildWorkspaceDataset('demo', 'Evaluador Demo');
    assert.equal(dataset.mode, 'demo');
    assert.equal(dataset.onboardingRequired, false);
    assert.equal(dataset.profile.name, 'Evaluador Demo');
    assert.ok(dataset.weighIns.length >= 20, 'Should include 22 days of demo weigh-ins');
    assert.ok(dataset.measurements.length >= 3, 'Should include demo body measurements');
    assert.ok(dataset.foodLogs.length > 0, 'Should include demo food logs');
    assert.ok(dataset.workoutSessions.length > 0, 'Should include demo workout sessions');
  });
});

describe('validateAuthScreenInput', () => {
  it('validates login and sign up inputs accurately', () => {
    const invalidEmail = validateAuthScreenInput({
      authTab: 'login',
      email: 'invalido',
      password: 'Password123!',
    });
    assert.equal(invalidEmail.valid, false);

    const missingNameOnSignUp = validateAuthScreenInput({
      authTab: 'register',
      email: 'nuevo@bodytrack.pro',
      password: 'Password123!',
      name: '',
    });
    assert.equal(missingNameOnSignUp.valid, false);

    const validSignUp = validateAuthScreenInput({
      authTab: 'register',
      email: 'Santiago@BodyTrack.pro',
      password: 'Password123!',
      name: 'Santiago Quinteros',
    });
    assert.equal(validSignUp.valid, true);
    assert.equal(validSignUp.normalizedEmail, 'santiago@bodytrack.pro');
    assert.equal(validSignUp.normalizedName, 'Santiago Quinteros');
  });
});
