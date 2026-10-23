/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivityLevel, SexForEquations, WeighIn, WorkoutExerciseLog } from '../types';

/**
 * Mifflin-St Jeor Basal Metabolic Rate (BMR) Formula
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: SexForEquations
): number {
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = sex === 'male' ? base + 5 : base - 161;
  return Math.round(bmr);
}

/**
 * Activity Multipliers based on standard physical activity levels
 */
export function getActivityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case 'sedentary':
      return 1.2;
    case 'light':
      return 1.375;
    case 'moderate':
      return 1.55;
    case 'heavy':
      return 1.725;
    case 'athlete':
      return 1.9;
    default:
      return 1.2;
  }
}

/**
 * Total Daily Energy Expenditure (TDEE) estimation
 */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: SexForEquations,
  activityLevel: ActivityLevel
): number {
  const bmr = calculateMifflinStJeor(weightKg, heightCm, ageYears, sex);
  const multiplier = getActivityMultiplier(activityLevel);
  return Math.round(bmr * multiplier);
}

/**
 * Calculate calories derived from macronutrients:
 * Protein: 4 kcal/g
 * Carbohydrates: 4 kcal/g
 * Fat: 9 kcal/g
 */
export function calculateMacroCalories(
  proteinG: number,
  carbsG: number,
  fatG: number
): {
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  totalKcal: number;
} {
  const p = Math.max(0, proteinG);
  const c = Math.max(0, carbsG);
  const f = Math.max(0, fatG);
  const proteinKcal = Math.round(p * 4);
  const carbsKcal = Math.round(c * 4);
  const fatKcal = Math.round(f * 9);
  const totalKcal = proteinKcal + carbsKcal + fatKcal;
  return { proteinKcal, carbsKcal, fatKcal, totalKcal };
}

/**
 * Epley formula for estimated 1 Rep Max:
 * 1RM = weight × (1 + reps / 30)
 * Note: valid for reps typically between 1 and 10-12
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return weightKg;
  const estimated1RM = weightKg * (1 + reps / 30);
  return Number(estimated1RM.toFixed(1));
}

/**
 * Effective Volume for a set: weight * reps (excluding warmup sets)
 */
export function calculateSetVolume(
  weightKg: number,
  repetitions: number,
  isWarmup: boolean
): number {
  if (isWarmup || weightKg <= 0 || repetitions <= 0) return 0;
  return Math.round(weightKg * repetitions);
}

/**
 * Total Workout Effective Volume
 */
export function calculateWorkoutTotalVolume(exercises: WorkoutExerciseLog[]): number {
  let total = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (!set.is_warmup && set.completed && set.weight_kg > 0 && set.repetitions > 0) {
        total += set.weight_kg * set.repetitions;
      }
    }
  }
  return total;
}

/**
 * U.S. Navy Body Fat Formula
 * For Men: %BF = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
 * For Women: %BF = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
 * All measurements in cm.
 */
export function calculateUSNavyBodyFat(
  sex: SexForEquations,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  hipCm?: number
): number | null {
  if (heightCm <= 0 || waistCm <= 0 || neckCm <= 0) return null;

  // Standard U.S. Navy / DoD equations use circumference and height in inches:
  const heightIn = heightCm / 2.54;
  const waistIn = waistCm / 2.54;
  const neckIn = neckCm / 2.54;

  if (sex === 'male') {
    const diffIn = waistIn - neckIn;
    if (diffIn <= 0) return null;
    const logDiff = Math.log10(diffIn);
    const logHeight = Math.log10(heightIn);
    const bf = 86.010 * logDiff - 70.041 * logHeight + 36.76;
    return Number(Math.max(3, Math.min(60, bf)).toFixed(1));
  } else {
    if (!hipCm || hipCm <= 0) return null;
    const hipIn = hipCm / 2.54;
    const sumIn = waistIn + hipIn - neckIn;
    if (sumIn <= 0) return null;
    const logSum = Math.log10(sumIn);
    const logHeight = Math.log10(heightIn);
    const bf = 163.205 * logSum - 97.684 * logHeight - 78.387;
    return Number(Math.max(8, Math.min(65, bf)).toFixed(1));
  }
}

/**
 * Body Composition Breakdown
 */
export function calculateBodyComposition(
  weightKg: number,
  bodyFatPercent: number
): { fatMassKg: number; leanMassKg: number } {
  if (weightKg <= 0 || bodyFatPercent <= 0) {
    return { fatMassKg: 0, leanMassKg: 0 };
  }
  const fatMassKg = Number(((weightKg * bodyFatPercent) / 100).toFixed(1));
  const leanMassKg = Number((weightKg - fatMassKg).toFixed(1));
  return { fatMassKg, leanMassKg };
}

/**
 * Filter weigh-ins within a date range [startDate, endDate] inclusive
 */
export function filterWeighInsByDateRange(
  weighIns: WeighIn[],
  startDate: string,
  endDate: string
): WeighIn[] {
  return weighIns.filter((w) => {
    const dateStr = w.measured_at.split('T')[0];
    return dateStr >= startDate && dateStr <= endDate;
  });
}

/**
 * Calculate weekly average and rate of change
 */
export function calculateWeeklyAverage(weighIns: WeighIn[]): {
  average: number | null;
  count: number;
  min: number | null;
  max: number | null;
} {
  if (!weighIns || weighIns.length === 0) {
    return { average: null, count: 0, min: null, max: null };
  }
  const weights = weighIns.map((w) => w.weight_kg);
  const sum = weights.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / weights.length).toFixed(2));
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  return { average, count: weights.length, min, max };
}

/**
 * 7-day Rolling Average for a sorted series of weigh-ins
 */
export function calculateMoving7DayAverages(
  weighIns: WeighIn[]
): Array<{ date: string; weight: number; movingAvg7d: number | null }> {
  // Sort chronologically ascending
  const sorted = [...weighIns].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );

  return sorted.map((item, index) => {
    const itemDate = new Date(item.measured_at);
    // Find all weigh-ins in the 7 days ending on itemDate
    const sevenDaysPrior = new Date(itemDate);
    sevenDaysPrior.setDate(sevenDaysPrior.getDate() - 6);

    const windowItems = sorted.filter((w) => {
      const d = new Date(w.measured_at);
      return d >= sevenDaysPrior && d <= itemDate;
    });

    if (windowItems.length >= 3) {
      const sum = windowItems.reduce((acc, curr) => acc + curr.weight_kg, 0);
      return {
        date: item.measured_at.split('T')[0],
        weight: item.weight_kg,
        movingAvg7d: Number((sum / windowItems.length).toFixed(2)),
      };
    }

    return {
      date: item.measured_at.split('T')[0],
      weight: item.weight_kg,
      movingAvg7d: null,
    };
  });
}

/**
 * Retrospective TDEE estimation based on energy balance:
 * 1 kg of body mass deficit/surplus ≈ ~7,700 kcal
 * Formula: Observed TDEE = Daily Average Intake - (Delta Weight in kg * 7700 / Days)
 * Example: ate 2400 kcal/day, lost 0.5 kg over 14 days:
 * Delta = -0.5 kg => -0.5 * 7700 / 14 = -275 kcal/day
 * Observed TDEE = 2400 - (-275) = 2675 kcal/day
 */
export function calculateRetrospectiveTDEE(
  avgDailyIntakeKcal: number,
  deltaWeightKg: number,
  daysInPeriod: number
): number | null {
  if (daysInPeriod < 7 || avgDailyIntakeKcal <= 0) return null;
  const dailyCalorieBalance = (deltaWeightKg * 7700) / daysInPeriod;
  const observedTDEE = avgDailyIntakeKcal - dailyCalorieBalance;
  return Math.round(observedTDEE);
}

export interface RecommendationInput {
  currentWeekAvgWeight: number | null;
  previousWeekAvgWeight: number | null;
  currentWeekCount: number;
  previousWeekCount: number;
  daysNutritionLogged: number;
  currentDailyCaloriesTarget: number;
  targetWeightKg?: number;
  baselineWeightKg: number;
  performanceTrend?: 'improving' | 'stable' | 'decreasing';
}

export interface RecommendationResult {
  action: 'mantener' | 'reducir_deficit' | 'aumentar_ingesta' | 'datos_insuficientes';
  suggestedCaloriesChange: number;
  newSuggestedTarget: number;
  rateOfLossPercent: number | null;
  weightDeltaKg: number | null;
  confidence: 'alta' | 'moderada' | 'baja';
  reason: string;
}

/**
 * Evidence-based Weekly Review & Caloric Adjustment Engine
 * Conservative recomposition rate of loss: 0.25% - 0.75% bodyweight/week.
 * Requires consistent data (minimum 3-4 weigh-ins per week and nutrition logs).
 */
export function generateWeeklyRecommendation(
  input: RecommendationInput
): RecommendationResult {
  const {
    currentWeekAvgWeight,
    previousWeekAvgWeight,
    currentWeekCount,
    previousWeekCount,
    daysNutritionLogged,
    currentDailyCaloriesTarget,
    baselineWeightKg,
    performanceTrend = 'stable',
  } = input;

  // Check data sufficiency
  if (
    currentWeekAvgWeight === null ||
    previousWeekAvgWeight === null ||
    currentWeekCount < 3 ||
    previousWeekCount < 3
  ) {
    return {
      action: 'datos_insuficientes',
      suggestedCaloriesChange: 0,
      newSuggestedTarget: currentDailyCaloriesTarget,
      rateOfLossPercent: null,
      weightDeltaKg: null,
      confidence: 'baja',
      reason:
        'Se requieren al menos 3-4 pesajes en cada semana para evaluar tendencias reales y evitar reaccionar a fluctuaciones normales de agua y glucógeno.',
    };
  }

  const weightDeltaKg = Number((currentWeekAvgWeight - previousWeekAvgWeight).toFixed(2));
  // Rate of change as % of body weight
  const rateOfLossPercent = Number(
    ((-weightDeltaKg / previousWeekAvgWeight) * 100).toFixed(2)
  );

  const confidence: 'alta' | 'moderada' | 'baja' =
    currentWeekCount >= 5 && previousWeekCount >= 5 && daysNutritionLogged >= 5
      ? 'alta'
      : currentWeekCount >= 4 && daysNutritionLogged >= 3
      ? 'moderada'
      : 'baja';

  // If nutrition logs are incomplete (< 4 days)
  if (daysNutritionLogged < 4) {
    return {
      action: 'mantener',
      suggestedCaloriesChange: 0,
      newSuggestedTarget: currentDailyCaloriesTarget,
      rateOfLossPercent,
      weightDeltaKg,
      confidence: 'baja',
      reason: `El peso varió ${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg, pero solo se registraron ${daysNutritionLogged} días de nutrición. Se recomienda mantener las calorías actuales y priorizar la consistencia del registro antes de aplicar ajustes.`,
    };
  }

  // Case 1: Rate of loss too fast (> 1.0% body weight/week) or performance dropping
  if (rateOfLossPercent > 1.0 || (rateOfLossPercent > 0.8 && performanceTrend === 'decreasing')) {
    const increase = 150;
    return {
      action: 'aumentar_ingesta',
      suggestedCaloriesChange: increase,
      newSuggestedTarget: currentDailyCaloriesTarget + increase,
      rateOfLossPercent,
      weightDeltaKg,
      confidence,
      reason: `La tasa de pérdida semanal (-${rateOfLossPercent}%) es superior al ritmo recomendado (0.25-0.75%) para preservar masa muscular. Se sugiere aumentar ligeramente la ingesta (+150 kcal/día) para proteger la fuerza y recuperación.`,
    };
  }

  // Case 2: Optimal recomposition loss rate (0.25% - 0.75% per week)
  if (rateOfLossPercent >= 0.25 && rateOfLossPercent <= 0.85) {
    return {
      action: 'mantener',
      suggestedCaloriesChange: 0,
      newSuggestedTarget: currentDailyCaloriesTarget,
      rateOfLossPercent,
      weightDeltaKg,
      confidence,
      reason: `Excelente ritmo de recomposición: descenso de ${Math.abs(weightDeltaKg)} kg (-${rateOfLossPercent}% semanal), dentro del rango óptimo. Mantén el plan actual sin cambios.`,
    };
  }

  // Case 3: Stagnation / No loss (< 0.15% loss or slight increase) with high adherence
  if (rateOfLossPercent < 0.15) {
    const reduction = -150;
    return {
      action: 'reducir_deficit',
      suggestedCaloriesChange: reduction,
      newSuggestedTarget: Math.max(1600, currentDailyCaloriesTarget + reduction),
      rateOfLossPercent,
      weightDeltaKg,
      confidence,
      reason: `El peso promedio varió ${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg. Con una adherencia nutricional adecuada, se sugiere un ajuste moderado de -150 kcal/día (o aumentar ~1.500 pasos diarios) para reactivar el déficit calórico de manera controlada.`,
    };
  }

  // Default: Keep steady
  return {
    action: 'mantener',
    suggestedCaloriesChange: 0,
    newSuggestedTarget: currentDailyCaloriesTarget,
    rateOfLossPercent,
    weightDeltaKg,
    confidence,
    reason: `La evolución se encuentra dentro de los parámetros esperados (${weightDeltaKg > 0 ? '+' : ''}${weightDeltaKg} kg). Se recomienda continuar una semana más antes de reevaluar.`,
  };
}

/**
 * Double Progression Rule:
 * If all sets reach the top of the rep range with proper form and RIR >= 1,
 * suggest an increment in load (e.g. +2.5 kg for compounds, +1 kg for isolations).
 */
export function checkDoubleProgression(
  sets: Array<{ weight_kg: number; repetitions: number; is_warmup: boolean; completed: boolean }>,
  targetRepsMax: number,
  suggestedIncrementKg: number = 2.5
): { shouldProgress: boolean; suggestionMessage: string; nextWeightKg: number } {
  const effectiveSets = sets.filter((s) => !s.is_warmup && s.completed);
  if (effectiveSets.length === 0) {
    return { shouldProgress: false, suggestionMessage: '', nextWeightKg: 0 };
  }

  const allHitMax = effectiveSets.every((s) => s.repetitions >= targetRepsMax);
  const currentWeight = effectiveSets[0].weight_kg;

  if (allHitMax && currentWeight > 0) {
    const nextWeightKg = Number((currentWeight + suggestedIncrementKg).toFixed(1));
    return {
      shouldProgress: true,
      suggestionMessage: `¡Completaste todas las series en ${targetRepsMax} reps! Considera progresar a ${nextWeightKg} kg (+${suggestedIncrementKg} kg) en la próxima sesión.`,
      nextWeightKg,
    };
  }

  return {
    shouldProgress: false,
    suggestionMessage: `Sigue consolidando las repeticiones hasta alcanzar ${targetRepsMax} reps en todas las series efectivas antes de subir la carga.`,
    nextWeightKg: currentWeight,
  };
}

/**
 * Calculate dynamic consecutive logging streak ending on targetDateStr
 */
export function calculateLoggingStreak(
  weighIns: WeighIn[],
  foodLogs: { consumed_at: string }[],
  targetDateStr: string
): number {
  if (!targetDateStr) return 0;

  const loggedDates = new Set<string>();
  weighIns.forEach((w) => {
    const d = w.measured_at.split('T')[0];
    loggedDates.add(d);
  });
  foodLogs.forEach((f) => {
    loggedDates.add(f.consumed_at);
  });

  let streak = 0;
  const current = new Date(`${targetDateStr}T12:00:00Z`);

  // If today isn't logged yet, allow checking from yesterday so morning hasn't reset it
  const todayStr = current.toISOString().split('T')[0];
  if (!loggedDates.has(todayStr)) {
    current.setUTCDate(current.getUTCDate() - 1);
  }

  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (loggedDates.has(dateStr)) {
      streak++;
      current.setUTCDate(current.getUTCDate() - 1);
    } else {
      break;
    }
    if (streak >= 365) break;
  }

  return streak;
}
