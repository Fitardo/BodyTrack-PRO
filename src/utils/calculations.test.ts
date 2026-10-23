/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMifflinStJeor,
  getActivityMultiplier,
  calculateTDEE,
  calculateMacroCalories,
  calculateEpley1RM,
  calculateSetVolume,
  calculateWorkoutTotalVolume,
  calculateUSNavyBodyFat,
  calculateBodyComposition,
  calculateWeeklyAverage,
  calculateMoving7DayAverages,
  calculateRetrospectiveTDEE,
  generateWeeklyRecommendation,
  checkDoubleProgression,
  calculateLoggingStreak,
} from './calculations';
import { WeighIn, WorkoutExerciseLog } from '../types';

test('Mifflin-St Jeor BMR calculates correctly for male 24yo 175cm 85kg', () => {
  // 10*85 + 6.25*175 - 5*24 + 5 = 850 + 1093.75 - 120 + 5 = 1828.75 -> 1829
  const bmr = calculateMifflinStJeor(85, 175, 24, 'male');
  assert.equal(bmr, 1829);
});

test('Mifflin-St Jeor BMR calculates correctly for female', () => {
  // 10*65 + 6.25*165 - 5*28 - 161 = 650 + 1031.25 - 140 - 161 = 1380.25 -> 1380
  const bmr = calculateMifflinStJeor(65, 165, 28, 'female');
  assert.equal(bmr, 1380);
});

test('Activity multipliers return standard physiological factors', () => {
  assert.equal(getActivityMultiplier('sedentary'), 1.2);
  assert.equal(getActivityMultiplier('light'), 1.375);
  assert.equal(getActivityMultiplier('moderate'), 1.55);
  assert.equal(getActivityMultiplier('heavy'), 1.725);
  assert.equal(getActivityMultiplier('athlete'), 1.9);
});

test('TDEE calculates based on BMR and activity level', () => {
  // 1829 * 1.2 = 2194.8 -> 2195
  const tdee = calculateTDEE(85, 175, 24, 'male', 'sedentary');
  assert.equal(tdee, 2195);
});

test('Macro calories calculate correctly (4-4-9 factor)', () => {
  // User targets: 180g P, 263g C, 70g F
  // P: 180*4 = 720
  // C: 263*4 = 1052
  // F: 70*9 = 630
  // Total: 2402 kcal
  const macros = calculateMacroCalories(180, 263, 70);
  assert.equal(macros.proteinKcal, 720);
  assert.equal(macros.carbsKcal, 1052);
  assert.equal(macros.fatKcal, 630);
  assert.equal(macros.totalKcal, 2402);
});

test('Epley 1RM formula estimation', () => {
  // 80kg x 8 reps = 80 * (1 + 8/30) = 80 * 1.2666... = 101.3
  const oneRm = calculateEpley1RM(80, 8);
  assert.equal(oneRm, 101.3);

  // 1 rep should equal current weight exactly
  assert.equal(calculateEpley1RM(100, 1), 100);
});

test('Set volume ignores warmup sets', () => {
  const effectiveVol = calculateSetVolume(100, 5, false);
  assert.equal(effectiveVol, 500);

  const warmupVol = calculateSetVolume(100, 5, true);
  assert.equal(warmupVol, 0);
});

test('calculateWorkoutTotalVolume excludes warmups and incomplete sets', () => {
  const workoutEx: WorkoutExerciseLog[] = [
    {
      id: 'we-1',
      exercise_id: 'ex-1',
      exercise_name_snapshot: 'Press banca',
      primary_muscle: 'pecho',
      order: 1,
      sets: [
        { id: 's1', set_number: 1, weight_kg: 50, repetitions: 10, is_warmup: true, completed: true },
        { id: 's2', set_number: 2, weight_kg: 80, repetitions: 8, is_warmup: false, completed: true },
        { id: 's3', set_number: 3, weight_kg: 80, repetitions: 7, is_warmup: false, completed: true },
        { id: 's4', set_number: 4, weight_kg: 80, repetitions: 6, is_warmup: false, completed: false }, // not completed
      ],
    },
  ];
  // 80*8 = 640 + 80*7 = 560 -> 1200 kg
  const totalVol = calculateWorkoutTotalVolume(workoutEx);
  assert.equal(totalVol, 1200);
});

test('U.S. Navy Body Fat formula for male with inch conversion', () => {
  // Height 175cm, waist 87cm, neck 39cm
  const bf = calculateUSNavyBodyFat('male', 175, 87, 39);
  assert.ok(bf !== null);
  assert.equal(bf, 17.8);
});

test('U.S. Navy Body Fat formula for female with hip circumference', () => {
  // Height 165cm, waist 70cm, hips 96cm, neck 32cm
  const bf = calculateUSNavyBodyFat('female', 165, 70, 32, 96);
  assert.ok(bf !== null);
  assert.equal(bf, 25.6);
});

test('U.S. Navy returns null for invalid inputs', () => {
  assert.equal(calculateUSNavyBodyFat('male', 0, 87, 39), null);
  assert.equal(calculateUSNavyBodyFat('male', 175, 30, 40), null); // waist <= neck
  assert.equal(calculateUSNavyBodyFat('female', 165, 70, 32, 0), null); // missing hips
});

test('Body composition breaks down fat and lean mass', () => {
  const { fatMassKg, leanMassKg } = calculateBodyComposition(85, 20);
  assert.equal(fatMassKg, 17);
  assert.equal(leanMassKg, 68);
});

test('Weekly average handles empty and populated lists', () => {
  const empty = calculateWeeklyAverage([]);
  assert.equal(empty.average, null);
  assert.equal(empty.count, 0);

  const weighIns: WeighIn[] = [
    { id: '1', measured_at: '2026-10-15', weight_kg: 85.0, fasting: true },
    { id: '2', measured_at: '2026-10-16', weight_kg: 84.8, fasting: true },
    { id: '3', measured_at: '2026-10-17', weight_kg: 85.2, fasting: true },
  ];
  const stats = calculateWeeklyAverage(weighIns);
  assert.equal(stats.count, 3);
  assert.equal(stats.average, 85.0);
  assert.equal(stats.min, 84.8);
  assert.equal(stats.max, 85.2);
});

test('Retrospective TDEE calculation from energy balance and boundaries', () => {
  // Ate 2400 kcal/day, lost 0.5 kg over 14 days
  // Delta -0.5 kg * 7700 / 14 = -275 kcal/day
  // TDEE = 2400 - (-275) = 2675 kcal
  const tdee = calculateRetrospectiveTDEE(2400, -0.5, 14);
  assert.equal(tdee, 2675);

  // Period < 7 days returns null (too short to infer metabolic rate)
  assert.equal(calculateRetrospectiveTDEE(2400, -0.5, 5), null);
});

test('calculateLoggingStreak tracks consecutive days correctly', () => {
  const weighIns: WeighIn[] = [
    { id: '1', measured_at: '2026-10-20', weight_kg: 85.0, fasting: true },
    { id: '2', measured_at: '2026-10-21', weight_kg: 84.9, fasting: true },
    { id: '3', measured_at: '2026-10-22', weight_kg: 84.8, fasting: true },
  ];
  const foodLogs = [
    { consumed_at: '2026-10-20' },
    { consumed_at: '2026-10-21' },
    { consumed_at: '2026-10-22' },
  ];
  const streak = calculateLoggingStreak(weighIns, foodLogs, '2026-10-22');
  assert.equal(streak, 3);

  // Empty logs
  assert.equal(calculateLoggingStreak([], [], '2026-10-22'), 0);
});

test('Weekly recommendation engine recognizes insufficient data', () => {
  const result = generateWeeklyRecommendation({
    currentWeekAvgWeight: 84.5,
    previousWeekAvgWeight: 85.0,
    currentWeekCount: 2, // only 2 weigh ins!
    previousWeekCount: 5,
    daysNutritionLogged: 5,
    currentDailyCaloriesTarget: 2400,
    baselineWeightKg: 85,
  });
  assert.equal(result.action, 'datos_insuficientes');
  assert.equal(result.confidence, 'baja');
});

test('Weekly recommendation engine recognizes optimal recomposition loss', () => {
  // Previous week: 85.0 kg, current week: 84.6 kg -> -0.4 kg (-0.47% loss)
  const result = generateWeeklyRecommendation({
    currentWeekAvgWeight: 84.6,
    previousWeekAvgWeight: 85.0,
    currentWeekCount: 5,
    previousWeekCount: 5,
    daysNutritionLogged: 6,
    currentDailyCaloriesTarget: 2400,
    baselineWeightKg: 85,
    performanceTrend: 'stable',
  });
  assert.equal(result.action, 'mantener');
  assert.equal(result.confidence, 'alta');
  assert.equal(result.suggestedCaloriesChange, 0);
});

test('Double progression rule suggests weight increase when rep ceiling hit', () => {
  const sets = [
    { weight_kg: 70, repetitions: 12, is_warmup: false, completed: true },
    { weight_kg: 70, repetitions: 12, is_warmup: false, completed: true },
    { weight_kg: 70, repetitions: 12, is_warmup: false, completed: true },
  ];
  const progression = checkDoubleProgression(sets, 12, 2.5);
  assert.equal(progression.shouldProgress, true);
  assert.equal(progression.nextWeightKg, 72.5);
});
