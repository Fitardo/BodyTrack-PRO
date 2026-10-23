/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatWelcomeGreeting,
  validateOnboardingCompletion,
  getUnitLabel,
  getGoalLabel,
} from './onboardingValidation';

test('formatWelcomeGreeting greets the user by name and defaults to Santiago Quinteros when empty', () => {
  const customGreeting = formatWelcomeGreeting('Santiago Quinteros');
  assert.equal(customGreeting.displayName, 'Santiago Quinteros');
  assert.equal(customGreeting.welcomeMessage, '¡Bienvenido, Santiago Quinteros!');
  assert.ok(customGreeting.welcomeSubtitle.includes('Santiago Quinteros'));

  const fallbackGreeting = formatWelcomeGreeting('   ');
  assert.equal(fallbackGreeting.displayName, 'Santiago Quinteros');
  assert.equal(fallbackGreeting.welcomeMessage, '¡Bienvenido, Santiago Quinteros!');
});

test('validateOnboardingCompletion blocks completion when both unit of measure and primary goal are missing', () => {
  const res = validateOnboardingCompletion({
    userName: 'Santiago',
    unitOfMeasure: '',
    primaryGoal: '',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });

  assert.equal(res.canFinish, false);
  assert.equal(res.canProceedSelection, false);
  assert.equal(res.isUnitSelected, false);
  assert.equal(res.isGoalSelected, false);
  assert.ok(res.errors.unitOfMeasure);
  assert.ok(res.errors.primaryGoal);
  assert.ok(
    res.summaryMessage?.includes('unidad de medida y un objetivo principal'),
    'Summary message must mention both unit of measure and primary goal'
  );
});

test('validateOnboardingCompletion blocks completion when unit of measure is missing even if primary goal is selected', () => {
  const res = validateOnboardingCompletion({
    userName: 'Santiago',
    unitOfMeasure: null,
    primaryGoal: 'recomp',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });

  assert.equal(res.canFinish, false);
  assert.equal(res.isUnitSelected, false);
  assert.equal(res.isGoalSelected, true);
  assert.ok(res.errors.unitOfMeasure);
  assert.equal(res.errors.primaryGoal, undefined);
  assert.ok(res.summaryMessage?.includes('unidad de medida'));
});

test('validateOnboardingCompletion blocks completion when primary goal is missing even if unit of measure is selected', () => {
  const res = validateOnboardingCompletion({
    userName: 'Santiago',
    unitOfMeasure: 'metric',
    primaryGoal: '',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });

  assert.equal(res.canFinish, false);
  assert.equal(res.isUnitSelected, true);
  assert.equal(res.isGoalSelected, false);
  assert.equal(res.errors.unitOfMeasure, undefined);
  assert.ok(res.errors.primaryGoal);
  assert.ok(res.summaryMessage?.includes('objetivo principal'));
});

test('validateOnboardingCompletion allows completion only when unit of measure, primary goal, and terms are all selected', () => {
  const res = validateOnboardingCompletion({
    userName: 'Santiago Quinteros',
    unitOfMeasure: 'metric',
    primaryGoal: 'recomp',
    acceptedTerms: true,
    acceptedPrivacy: true,
  });

  assert.equal(res.canFinish, true);
  assert.equal(res.canProceedSelection, true);
  assert.equal(res.isUnitSelected, true);
  assert.equal(res.isGoalSelected, true);
  assert.equal(res.areTermsAccepted, true);
  assert.equal(res.summaryMessage, null);
  assert.equal(res.welcomeMessage, '¡Bienvenido, Santiago Quinteros!');
});

test('getUnitLabel and getGoalLabel return descriptive Spanish names', () => {
  assert.equal(getUnitLabel('metric'), 'Sistema Métrico (kg / cm)');
  assert.equal(getUnitLabel('imperial'), 'Sistema Imperial (lb / in)');
  assert.equal(getUnitLabel(''), 'Sin seleccionar');

  assert.equal(getGoalLabel('recomp'), 'Recomposición Corporal');
  assert.equal(getGoalLabel('fat_loss'), 'Pérdida de Grasa (Definición)');
  assert.equal(getGoalLabel(null), 'Sin seleccionar');
});
