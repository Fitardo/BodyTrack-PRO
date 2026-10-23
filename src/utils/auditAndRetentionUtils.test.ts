import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANTHROPOMETRIC_BOUNDS,
  clampMetric,
  stepMetric,
  validateManualDateInput,
  evaluateCalorieTargetSafety,
  calculateFlexibleFoodMacros,
  findFoodByBarcode,
  generateMacroDeficitSuggestions,
  getPreviousExercisePerformance,
  auditPPLRoutinesCoherence,
  calculateWeeklyDashboardSummary,
  getStreakGamificationState,
  calculateStreakHistoryAndDailyGoal,
  calculateMonthlyConsistencyChartData,
  evaluateDeficitHealth,
  calculateFourWeekBodyEvolutionData,
  evaluateMealPushNotifications,
} from './auditAndRetentionUtils';
import {
  DEFAULT_FOODS,
  DEFAULT_EXERCISES,
  DEFAULT_ROUTINES,
  SEED_WORKOUT_SESSION,
  SEED_WEIGH_INS,
  SEED_BODY_MEASUREMENTS,
} from './seedData';

test('slider and stepper bounds allow full realistic ranges (100-230 cm height, 30-250 kg weight)', () => {
  assert.equal(
    clampMetric(115, ANTHROPOMETRIC_BOUNDS.heightCm.min, ANTHROPOMETRIC_BOUNDS.heightCm.max, 0),
    115
  );
  assert.equal(
    clampMetric(210, ANTHROPOMETRIC_BOUNDS.heightCm.min, ANTHROPOMETRIC_BOUNDS.heightCm.max, 0),
    210
  );
  assert.equal(
    stepMetric(75, -10, ANTHROPOMETRIC_BOUNDS.weightKg.min, ANTHROPOMETRIC_BOUNDS.weightKg.max, 1),
    65.0
  );
  assert.equal(
    stepMetric(75, 45, ANTHROPOMETRIC_BOUNDS.weightKg.min, ANTHROPOMETRIC_BOUNDS.weightKg.max, 1),
    120.0
  );
});

test('manual date validation handles ISO and DD/MM/YYYY formats and rejects invalid months/days', () => {
  const validIso = validateManualDateInput('2026-10-22');
  assert.equal(validIso.valid, true);
  assert.equal(validIso.normalizedDate, '2026-10-22');

  const validSlash = validateManualDateInput('05/03/2026');
  assert.equal(validSlash.valid, true);
  assert.equal(validSlash.normalizedDate, '2026-03-05');

  const invalidMonth = validateManualDateInput('2026-13-10');
  assert.equal(invalidMonth.valid, false);

  const invalidFeb = validateManualDateInput('2026-02-30');
  assert.equal(invalidFeb.valid, false);
});

test('calorie safety evaluation detects aggressive cuts and safe estimates', () => {
  const aggressive = evaluateCalorieTargetSafety(1400, 1820, 2700, 'male', '2026-10-22');
  assert.equal(aggressive.isAggressiveCut, true);
  assert.equal(aggressive.alertLevel, 'danger');
  assert.equal(aggressive.belowBmr, true);

  const safe = evaluateCalorieTargetSafety(2350, 1820, 2700, 'male', '2026-10-22');
  assert.equal(safe.isAggressiveCut, false);
  assert.equal(safe.alertLevel, 'safe');
});

test('flexible unit conversion converts g, ml, and porción accurately', () => {
  const chicken = DEFAULT_FOODS[1]; // 100g cooked chicken: 31g P, 0g C, 3.6g F
  const byGrams = calculateFlexibleFoodMacros(chicken, 200, 'g');
  assert.equal(byGrams.protein_g, 62.0);

  const byPortion = calculateFlexibleFoodMacros(chicken, 1.5, 'porción');
  assert.equal(byPortion.gramsEquivalent, 150);
  assert.equal(byPortion.protein_g, 46.5);
});

test('barcode lookup finds verified product from barcode database', () => {
  const product = findFoodByBarcode('7790895000997', DEFAULT_FOODS);
  assert.ok(product);
  assert.equal(product.source, 'verified');
  assert.equal(product.protein_g, 16.5);
});

test('macro deficit suggestion engine generates actionable protein suggestions', () => {
  const suggestions = generateMacroDeficitSuggestions(
    { protein_g: 180, carbohydrates_g: 250, fat_g: 70 },
    { protein_g: 165, carbohydrates_g: 245, fat_g: 68 }
  );
  assert.equal(suggestions[0].macro, 'protein');
  assert.equal(suggestions[0].deficitGrams, 15);
  assert.ok(suggestions[0].headline.includes('15g de proteína'));
});

test('previous exercise overload lookup returns best set from completed sessions', () => {
  const prev = getPreviousExercisePerformance('ex-1', [SEED_WORKOUT_SESSION]);
  assert.ok(prev);
  assert.equal(prev.bestWeightKg, 80);
  assert.equal(prev.bestReps, 8);
});

test('PPL routine audit verifies A/B coherence across Push, Pull, Legs', () => {
  const audit = auditPPLRoutinesCoherence(DEFAULT_ROUTINES, DEFAULT_EXERCISES);
  assert.equal(audit.isCoherent, true);
  assert.equal(audit.abVariantComparisons.length, 3);
});

test('streak gamification and weekly dashboard summary compute expected metrics', () => {
  const streakInfo = getStreakGamificationState(8);
  assert.equal(streakInfo.streakDays, 8);
  assert.equal(streakInfo.nextMilestoneDays, 14);

  const summary = calculateWeeklyDashboardSummary(
    '2026-10-22',
    [],
    [{ id: 'w1', measured_at: '2026-10-22', weight_kg: 84.3, fasting: true }],
    [SEED_WORKOUT_SESSION],
    {
      id: 'nt1',
      effective_from: '2026-10-01',
      calories_kcal: 2400,
      protein_g: 180,
      carbohydrates_g: 260,
      fat_g: 70,
      fiber_g: 35,
      water_ml: 3000,
    }
  );
  assert.equal(summary.completedWorkoutsCount, 1);
  assert.ok(summary.totalWeeklyVolumeKg > 0);
});

test('calculateStreakHistoryAndDailyGoal computes consecutive registration history and gamified Meta Diaria indicator', () => {
  const result = calculateStreakHistoryAndDailyGoal({
    currentDate: '2026-10-22',
    weighIns: [
      { id: 'w-20', measured_at: '2026-10-20', weight_kg: 82.0, fasting: true },
      { id: 'w-21', measured_at: '2026-10-21', weight_kg: 81.8, fasting: true },
      { id: 'w-22', measured_at: '2026-10-22', weight_kg: 81.6, fasting: true },
    ],
    foodLogs: [
      {
        id: 'f-21',
        consumed_at: '2026-10-21',
        meal_type: 'almuerzo',
        food_id: 'food-2',
        food_name: 'Pollo',
        quantity: 200,
        unit: 'g',
        calories_kcal: 330,
        protein_g: 62,
        carbohydrates_g: 0,
        fat_g: 7,
      },
      {
        id: 'f-22',
        consumed_at: '2026-10-22',
        meal_type: 'desayuno',
        food_id: 'food-5',
        food_name: 'Avena',
        quantity: 100,
        unit: 'g',
        calories_kcal: 375,
        protein_g: 13,
        carbohydrates_g: 62,
        fat_g: 7,
      },
    ],
    workoutSessions: [SEED_WORKOUT_SESSION], // started_at: '2026-10-21'
    activityLogs: [{ activity_date: '2026-10-22', steps: 8400 }],
    historyDays: 14,
  });

  assert.equal(result.currentStreak, 3);
  assert.equal(result.bestStreak, 3);
  assert.equal(result.consecutiveHistory.length, 14);
  assert.equal(result.todayDailyGoal.isDailyGoalMet, true);
  assert.equal(result.todayDailyGoal.isPerfectCrown, true);
  assert.equal(result.todayDailyGoal.completedQuestsCount, 3);
  assert.equal(result.todayDailyGoal.completionPercent, 100);
  assert.equal(result.todayDailyGoal.quests.length, 3);
});

test('calculateMonthlyConsistencyChartData computes 30-day daily bars, 4-week grouped bars, and commitment KPIs from streak utility', () => {
  const chartData = calculateMonthlyConsistencyChartData({
    currentDate: '2026-10-22',
    weighIns: [
      { id: 'w-20', measured_at: '2026-10-20', weight_kg: 82.0, fasting: true },
      { id: 'w-21', measured_at: '2026-10-21', weight_kg: 81.8, fasting: true },
      { id: 'w-22', measured_at: '2026-10-22', weight_kg: 81.6, fasting: true },
    ],
    foodLogs: [
      {
        id: 'f-21',
        consumed_at: '2026-10-21',
        meal_type: 'almuerzo',
        food_id: 'food-2',
        food_name: 'Pollo',
        quantity: 200,
        unit: 'g',
        calories_kcal: 330,
        protein_g: 62,
        carbohydrates_g: 0,
        fat_g: 7,
      },
      {
        id: 'f-22',
        consumed_at: '2026-10-22',
        meal_type: 'desayuno',
        food_id: 'food-5',
        food_name: 'Avena',
        quantity: 100,
        unit: 'g',
        calories_kcal: 375,
        protein_g: 13,
        carbohydrates_g: 62,
        fat_g: 7,
      },
    ],
    workoutSessions: [
      { ...SEED_WORKOUT_SESSION, id: 'ws-21', started_at: '2026-10-21T18:00:00Z' },
      SEED_WORKOUT_SESSION,
    ],
    activityLogs: [{ activity_date: '2026-10-22', steps: 8400 }],
    days: 30,
  });

  assert.equal(chartData.dailyBars.length, 30);
  assert.equal(chartData.weeklyBars.length, 4);
  assert.equal(chartData.summary.windowDays, 30);
  assert.equal(chartData.summary.pesajesDaysCount, 3);
  assert.equal(chartData.summary.comidasDaysCount, 2);
  assert.equal(chartData.summary.entrenamientosDaysCount, 2);
  assert.equal(chartData.summary.activeDaysCount, 3);
  assert.equal(chartData.summary.dailyGoalsMetCount, 2);
  assert.equal(chartData.summary.perfectCrownDaysCount, 2);
  assert.equal(chartData.summary.currentStreak, 3);

  const todayBar = chartData.dailyBars[chartData.dailyBars.length - 1];
  assert.equal(todayBar.date, '2026-10-22');
  assert.equal(todayBar.pesajes, 1);
  assert.equal(todayBar.comidas, 1);
  assert.equal(todayBar.entrenamientos, 1);
  assert.equal(todayBar.totalCompleted, 3);
});

test('evaluateDeficitHealth triggers orange_alert only when exceeding caloric target for MORE than 2 consecutive days (> 2)', () => {
  const makeFoodLog = (id: string, date: string, kcal: number) => ({
    id,
    consumed_at: date,
    meal_type: 'almuerzo' as const,
    food_id: 'food-2',
    food_name_snapshot: 'Comida',
    quantity: 300,
    unit: 'g' as const,
    preparation_state: 'cooked' as const,
    calories_kcal: kcal,
    protein_g: 150,
    carbohydrates_g: 200,
    fat_g: 60,
    fiber_g: 25,
  });

  // Case 1: Optimal adherence (0 consecutive days over 2400 kcal)
  const optimalHealth = evaluateDeficitHealth({
    currentDate: '2026-10-22',
    targetCaloriesKcal: 2400,
    foodLogs: [
      makeFoodLog('f1', '2026-10-20', 2350),
      makeFoodLog('f2', '2026-10-21', 2390),
      makeFoodLog('f3', '2026-10-22', 2320),
    ],
  });
  assert.equal(optimalHealth.status, 'optimal');
  assert.equal(optimalHealth.isOrangeAlert, false);
  assert.equal(optimalHealth.consecutiveExceededDays, 0);

  // Case 2: Exactly 2 consecutive days over target (caution, NOT > 2 days orange alert)
  const twoDaysHealth = evaluateDeficitHealth({
    currentDate: '2026-10-22',
    targetCaloriesKcal: 2400,
    foodLogs: [
      makeFoodLog('f1', '2026-10-20', 2300),
      makeFoodLog('f2', '2026-10-21', 2600), // +200
      makeFoodLog('f3', '2026-10-22', 2550), // +150
    ],
  });
  assert.equal(twoDaysHealth.status, 'caution');
  assert.equal(twoDaysHealth.isOrangeAlert, false);
  assert.equal(twoDaysHealth.consecutiveExceededDays, 2);
  assert.equal(twoDaysHealth.accumulatedSurplusKcalInStreak, 350);

  // Case 3: 3 consecutive days (> 2 days) over target -> triggers orange_alert!
  const threeDaysOrangeHealth = evaluateDeficitHealth({
    currentDate: '2026-10-22',
    targetCaloriesKcal: 2400,
    foodLogs: [
      makeFoodLog('f0', '2026-10-19', 2350),
      makeFoodLog('f1', '2026-10-20', 2680), // +280
      makeFoodLog('f2', '2026-10-21', 2740), // +340
      makeFoodLog('f3', '2026-10-22', 2620), // +220
    ],
  });
  assert.equal(threeDaysOrangeHealth.status, 'orange_alert');
  assert.equal(threeDaysOrangeHealth.isOrangeAlert, true);
  assert.equal(threeDaysOrangeHealth.consecutiveExceededDays, 3);
  assert.equal(threeDaysOrangeHealth.accumulatedSurplusKcalInStreak, 840);
  assert.equal(
    threeDaysOrangeHealth.dailyBreakdown.filter((d) => d.isPartOfOrangeStreak).length,
    3
  );

  // Case 4: Streak resets to 0 when the user logs within target on the latest day
  const resetAfterThreeDays = evaluateDeficitHealth({
    currentDate: '2026-10-22',
    targetCaloriesKcal: 2400,
    foodLogs: [
      makeFoodLog('f1', '2026-10-19', 2680),
      makeFoodLog('f2', '2026-10-20', 2740),
      makeFoodLog('f3', '2026-10-21', 2620),
      makeFoodLog('f4', '2026-10-22', 2310), // Within target -> breaks streak!
    ],
  });
  assert.equal(resetAfterThreeDays.status, 'optimal');
  assert.equal(resetAfterThreeDays.isOrangeAlert, false);
  assert.equal(resetAfterThreeDays.consecutiveExceededDays, 0);
  assert.equal(resetAfterThreeDays.maxConsecutiveExceededInWindow, 3);
});

test('calculateFourWeekBodyEvolutionData computes 4-week weight and body fat % series and weekly buckets', () => {
  const evolution = calculateFourWeekBodyEvolutionData({
    currentDate: '2026-10-22',
    weighIns: SEED_WEIGH_INS,
    measurements: SEED_BODY_MEASUREMENTS,
    targetWeightKg: 78.0,
    windowDays: 28,
  });

  assert.equal(evolution.windowDays, 28);
  assert.equal(evolution.points.length, 28);
  assert.equal(evolution.weeklyBuckets.length, 4);
  assert.equal(evolution.summary.hasWeightData, true);
  assert.equal(evolution.summary.hasBodyFatData, true);
  assert.ok(evolution.summary.weightRecordsCount >= 20);
  assert.ok(evolution.summary.bodyFatRecordsCount >= 4);
  assert.ok(evolution.summary.weightDelta4wKg !== null && evolution.summary.weightDelta4wKg < 0);
  assert.ok(evolution.summary.bodyFatDelta4wPct !== null && evolution.summary.bodyFatDelta4wPct < 0);
  assert.equal(evolution.summary.targetWeightKg, 78.0);
});

test('evaluateMealPushNotifications evaluates desayuno, almuerzo, merienda, and cena push slots accurately', () => {
  const evaluation = evaluateMealPushNotifications({
    currentDate: '2026-10-22',
    config: {
      enabled: true,
      breakfast_enabled: true,
      breakfast_time: '08:00',
      lunch_enabled: true,
      lunch_time: '13:30',
      snack_enabled: true,
      snack_time: '17:30',
      dinner_enabled: true,
      dinner_time: '21:00',
      weigh_in_time: '07:30',
      workout_time: '18:00',
    },
    foodLogs: [
      {
        id: 'f-b',
        consumed_at: '2026-10-22',
        meal_type: 'desayuno',
        food_name_snapshot: 'Avena',
        quantity: 100,
        unit: 'g',
        calories_kcal: 380,
        protein_g: 25,
        carbohydrates_g: 50,
        fat_g: 8,
      },
      {
        id: 'f-l',
        consumed_at: '2026-10-22',
        meal_type: 'almuerzo',
        food_name_snapshot: 'Pollo y arroz',
        quantity: 350,
        unit: 'g',
        calories_kcal: 650,
        protein_g: 60,
        carbohydrates_g: 70,
        fat_g: 12,
      },
    ],
  });

  assert.equal(evaluation.slots.length, 4);
  assert.equal(evaluation.slots[0].mealType, 'desayuno');
  assert.equal(evaluation.slots[0].status, 'logged_today');
  assert.equal(evaluation.slots[1].mealType, 'almuerzo');
  assert.equal(evaluation.slots[1].status, 'logged_today');
  assert.equal(evaluation.slots[2].mealType, 'merienda');
  assert.equal(evaluation.slots[2].status, 'pending_alert');
  assert.equal(evaluation.slots[3].mealType, 'cena');
  assert.equal(evaluation.slots[3].status, 'pending_alert');
  assert.equal(evaluation.loggedMealsCount, 2);
  assert.equal(evaluation.pendingMealsCount, 2);
  assert.equal(evaluation.nextPendingSlot?.mealType, 'merienda');
});




