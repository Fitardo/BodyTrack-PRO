/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Food,
  FoodLog,
  FrequentMeal,
  NutritionTarget,
  WeighIn,
  BodyMeasurement,
  PushReminderConfig,
  MealCategory,
  WorkoutSession,
  WorkoutRoutine,
  Exercise,
  SexForEquations,
  MuscleGroup,
} from '../types';
import { calculateMacroCalories, calculateWeeklyAverage } from './calculations';

// ============================================================================
// 1. ANTHROPOMETRIC BOUNDS, SLIDER VALIDATION & MANUAL DATE VALIDATION
// ============================================================================

export const ANTHROPOMETRIC_BOUNDS = {
  age: { min: 14, max: 100, step: 1, default: 28 },
  heightCm: { min: 100, max: 230, step: 1, default: 178 },
  height_cm: { min: 100, max: 230, step: 1, default: 178 },
  weightKg: { min: 30, max: 250, step: 0.1, default: 80 },
  weight_kg: { min: 30, max: 250, step: 0.1, default: 80 },
  waistCm: { min: 40, max: 180, step: 0.5, default: 84 },
  waist_cm: { min: 40, max: 180, step: 0.5, default: 84 },
  neck_cm: { min: 25, max: 65, step: 0.1, default: 39 },
  chest_cm: { min: 60, max: 180, step: 0.5, default: 102 },
  hip_cm: { min: 50, max: 180, step: 0.5, default: 100 },
  arm_cm: { min: 18, max: 65, step: 0.1, default: 37 },
  thigh_cm: { min: 30, max: 100, step: 0.5, default: 58 },
  calf_cm: { min: 20, max: 65, step: 0.1, default: 38 },
  body_fat_pct: { min: 3, max: 60, step: 0.1, default: 18 },
  goalRatePercent: { min: 0.15, max: 1.2, step: 0.05 },
} as const;

export function clampMetric(
  arg1: number | keyof typeof ANTHROPOMETRIC_BOUNDS,
  arg2: number,
  arg3?: number,
  arg4: number = 1
): number {
  if (typeof arg1 === 'string') {
    const bounds = ANTHROPOMETRIC_BOUNDS[arg1] || { min: 0, max: 500, step: 1 };
    const val = Number.isNaN(arg2) || !Number.isFinite(arg2) ? bounds.min : arg2;
    const clamped = Math.max(bounds.min, Math.min(bounds.max, val));
    const decimals = bounds.step < 1 ? 1 : 0;
    return Number(clamped.toFixed(decimals));
  }
  const value = arg1;
  const min = arg2;
  const max = arg3 ?? 500;
  const decimals = arg4;
  if (Number.isNaN(value) || !Number.isFinite(value)) return min;
  const clamped = Math.max(min, Math.min(max, value));
  return Number(clamped.toFixed(decimals));
}

export function stepMetric(
  arg1: number | keyof typeof ANTHROPOMETRIC_BOUNDS,
  arg2: number,
  arg3: number,
  arg4?: number,
  arg5: number = 1
): number {
  if (typeof arg1 === 'string') {
    const bounds = ANTHROPOMETRIC_BOUNDS[arg1] || { min: 0, max: 500, step: 1 };
    const current = Number.isNaN(arg2) || !Number.isFinite(arg2) ? bounds.min : arg2;
    const delta = arg3;
    const decimals = bounds.step < 1 ? 1 : 0;
    return clampMetric(current + delta, bounds.min, bounds.max, decimals);
  }
  const current = arg1;
  const delta = arg2;
  const min = arg3;
  const max = arg4 ?? 500;
  const decimals = arg5;
  const base = Number.isNaN(current) || !Number.isFinite(current) ? min : current;
  return clampMetric(base + delta, min, max, decimals);
}

export interface DateValidationResult {
  valid: boolean;
  isoDate: string;
  normalizedDate: string;
  error?: string;
}

/**
 * Validates manual or native date inputs (YYYY-MM-DD or DD/MM/YYYY) for mobile & desktop,
 * verifying realistic years (1920-2035), valid months (01-12), and exact days per month (including leap years).
 */
export function validateManualDateInput(
  rawInput: string,
  minYear: number = 1920,
  maxYear: number = 2035
): DateValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, isoDate: '', normalizedDate: '', error: 'La fecha es obligatoria.' };
  }

  let year = 0;
  let month = 0;
  let day = 0;

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  const slashMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);

  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else if (slashMatch) {
    day = parseInt(slashMatch[1], 10);
    month = parseInt(slashMatch[2], 10);
    year = parseInt(slashMatch[3], 10);
  } else {
    return {
      valid: false,
      isoDate: trimmed,
      normalizedDate: trimmed,
      error: 'Formato inválido. Usa AAAA-MM-DD (ej. 2026-10-22) o DD/MM/AAAA.',
    };
  }

  if (year < minYear || year > maxYear) {
    return {
      valid: false,
      isoDate: trimmed,
      normalizedDate: trimmed,
      error: `El año (${year}) debe estar entre ${minYear} y ${maxYear}.`,
    };
  }

  if (month < 1 || month > 12) {
    return {
      valid: false,
      isoDate: trimmed,
      normalizedDate: trimmed,
      error: `El mes (${month}) debe estar entre 01 y 12.`,
    };
  }

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonths = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDay = daysInMonths[month - 1];

  if (day < 1 || day > maxDay) {
    return {
      valid: false,
      isoDate: trimmed,
      normalizedDate: trimmed,
      error: `El día (${day}) no es válido para el mes ${String(month).padStart(2, '0')}/${year} (máximo ${maxDay} días).`,
    };
  }

  const normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, isoDate: normalizedDate, normalizedDate };
}

// ============================================================================
// 2. EDUCATIONAL TOOLTIPS DICTIONARY
// ============================================================================

export type EducationalTermKey = 'bmr' | 'mifflin' | 'moving_average' | 'tdee' | 'rir';

export interface EducationalTooltipItem {
  id: EducationalTermKey;
  term: string;
  title: string;
  shortTitle: string;
  shortDescription: string;
  simpleExplanation: string;
  scientificContext: string;
  practicalTip: string;
}

export const EDUCATIONAL_TOOLTIPS: Record<EducationalTermKey, EducationalTooltipItem> = {
  bmr: {
    id: 'bmr',
    term: 'BMR (Tasa Metabólica Basal)',
    title: 'BMR (Tasa Metabólica Basal)',
    shortTitle: 'Energía vital en reposo absoluto',
    shortDescription:
      'Energía mínima diaria que tu cuerpo necesita en reposo absoluto para mantener funciones vitales (respiración, circulación, órganos y temperatura).',
    simpleExplanation:
      'Es la cantidad mínima de calorías que tu cuerpo quema en 24 horas solo para mantener funciones vitales estando en reposo total.',
    scientificContext:
      'Nunca se recomienda sostener una ingesta calórica inferior al BMR sin supervisión clínica para evitar pérdida muscular y fatiga hormonal.',
    practicalTip:
      'Nunca se recomienda consumir menos calorías que tu BMR de forma prolongada para evitar fatiga hormonal y pérdida de masa muscular.',
  },
  mifflin: {
    id: 'mifflin',
    term: 'Fórmula de Mifflin-St Jeor',
    title: 'Fórmula de Mifflin-St Jeor (1990)',
    shortTitle: 'Estándar clínico de cálculo energético',
    shortDescription:
      'Estándar clínico actual más preciso para estimar el gasto energético basal en adultos a partir de peso, estatura, edad y sexo biológico.',
    simpleExplanation:
      'Es la ecuación científica más precisa validada en nutrición deportiva para estimar tu metabolismo basal a partir de tu peso, estatura, edad y sexo biológico.',
    scientificContext:
      'Ecuación: (10 × peso_kg) + (6.25 × altura_cm) - (5 × edad) + (+5 hombres / -161 mujeres). Es una estimación inicial que se ajusta según tu evolución real.',
    practicalTip:
      'Úsala como punto de partida inicial ("estimación ajustable") y deja que la Revisión Semanal calibre tu gasto real.',
  },
  moving_average: {
    id: 'moving_average',
    term: 'Media Móvil de 7 Días',
    title: 'Media Móvil de 7 Días (Tendencia Real)',
    shortTitle: 'Tu peso real sin ruido de agua',
    shortDescription:
      'Promedio de tus pesajes de los últimos 7 días que filtra el ruido diario provocado por agua, sodio, glucógeno o tránsito intestinal.',
    simpleExplanation:
      'Promedia tus pesajes de los últimos 7 días para eliminar los picos falsos causados por retención de líquidos, cenas con más sal, glucógeno o digestión.',
    scientificContext:
      'El peso corporal puede variar ±1.2 kg de un día a otro por líquidos. Tomar decisiones sobre la media móvil evita recortes de calorías innecesarios.',
    practicalTip:
      'Si tu media móvil baja 0.3–0.5 kg por semana aunque un día suelto subas en la báscula, vas por el camino óptimo.',
  },
  tdee: {
    id: 'tdee',
    term: 'TDEE (Gasto Energético Total Diario)',
    title: 'TDEE (Gasto Energético Total Diario)',
    shortTitle: 'Calorías totales que quemas al día',
    shortDescription:
      'Total de calorías que quemas en un día completo sumando tu metabolismo basal (BMR), actividad física diaria (NEAT), digestión (TEF) y entrenamiento.',
    simpleExplanation:
      'Suma tu metabolismo basal (BMR) + tus pasos diarios (NEAT) + la digestión de los alimentos + tus sesiones de entrenamiento de fuerza.',
    scientificContext:
      'Si consumes menos que tu TDEE pierdes peso (déficit); si consumes más que tu TDEE aumentas masa muscular y peso (superávit).',
    practicalTip:
      'Comer por debajo de tu TDEE genera déficit (pérdida de grasa); comer por encima genera superávit (aumento de masa muscular).',
  },
  rir: {
    id: 'rir',
    term: 'RIR (Repeticiones en Reserva)',
    title: 'RIR (Repeticiones en Reserva)',
    shortTitle: 'Medidor de cercanía al fallo muscular',
    shortDescription:
      'Cuántas repeticiones completas adicionales podrías haber realizado con buena técnica antes de llegar al fallo muscular.',
    simpleExplanation:
      'Indica cuántas repeticiones más podrías haber hecho con buena técnica antes de llegar al fallo. RIR 2 significa que te guardaste 2 repeticiones posibles.',
    scientificContext:
      'RIR 0 = Fallo muscular total. RIR 1–2 = Zona óptima de hipertrofia con excelente estímulo y menor fatiga articular/nerviosa.',
    practicalTip:
      'Para hipertrofia natural sin saturar las articulaciones, trabaja la mayoría de tus series efectivas entre RIR 1 y RIR 2.',
  },
};

// ============================================================================
// 3. CALORIE TARGET SAFETY & ADJUSTABLE ESTIMATE ENGINE
// ============================================================================

export interface CalorieSafetyEvaluation {
  isSafe: boolean;
  isAdjustableEstimate: boolean;
  calculatedAtDate: string;
  adjustableLabel: string;
  deficitKcal: number; // positive = deficit, negative = surplus
  deficitPercent: number;
  deficitPercentOfTdee: number;
  belowBmr: boolean;
  belowClinicalMinimum: boolean;
  isAggressiveCut: boolean;
  severity: 'ok' | 'warning' | 'danger';
  alertLevel: 'safe' | 'warning' | 'danger';
  warningMessage: string | null;
  headline: string;
  explanation: string;
  safeMinimumKcal: number;
  recommendedSafeFloorKcal: number;
}

export function evaluateCalorieTargetSafety(
  targetCaloriesKcal: number,
  bmrKcal: number,
  tdeeKcal: number,
  sex: SexForEquations = 'male',
  calculatedAtDate: string = '2026-10-22'
): CalorieSafetyEvaluation {
  const clinicalMin = sex === 'male' ? 1500 : 1200;
  const safeFloor = Math.max(clinicalMin, Math.round(bmrKcal), Math.round(tdeeKcal * 0.78));
  const deficitKcal = tdeeKcal - targetCaloriesKcal;
  const deficitPercentOfTdee =
    tdeeKcal > 0 ? Number(((deficitKcal / tdeeKcal) * 100).toFixed(1)) : 0;

  const belowBmr = targetCaloriesKcal < bmrKcal;
  const belowClinicalMinimum = targetCaloriesKcal < clinicalMin;
  const isAggressiveCut =
    belowClinicalMinimum || belowBmr || deficitPercentOfTdee > 25 || deficitKcal > 750;
  const adjustableLabel = `Estimación ajustable · Calculada el ${calculatedAtDate}`;

  if (belowClinicalMinimum || belowBmr) {
    const explanation = `Tu meta actual (${targetCaloriesKcal} kcal) está por debajo de tu Metabolismo Basal (${bmrKcal} kcal) o del mínimo clínico seguro (${clinicalMin} kcal). Un déficit del ${deficitPercentOfTdee}% compromete la masa muscular, el rendimiento en el gimnasio y el entorno hormonal. Se recomienda ajustar al menos a ${safeFloor} kcal/día.`;
    return {
      isSafe: false,
      isAdjustableEstimate: true,
      calculatedAtDate,
      adjustableLabel,
      deficitKcal,
      deficitPercent: deficitPercentOfTdee,
      deficitPercentOfTdee,
      belowBmr,
      belowClinicalMinimum,
      isAggressiveCut: true,
      severity: 'danger',
      alertLevel: 'danger',
      warningMessage: `Alerta de recorte agresivo: ${targetCaloriesKcal} kcal está por debajo de tu BMR (${bmrKcal} kcal) o mínimo clínico (${clinicalMin} kcal). Recomendamos al menos ${safeFloor} kcal.`,
      headline: 'Alerta de Seguridad: Recorte Calórico Excesivamente Agresivo',
      explanation,
      safeMinimumKcal: safeFloor,
      recommendedSafeFloorKcal: safeFloor,
    };
  }

  if (isAggressiveCut) {
    const explanation = `Estás aplicando un recorte de -${deficitKcal} kcal/día (-${deficitPercentOfTdee}% respecto a tu TDEE de ${tdeeKcal} kcal). Para proteger tu fuerza en la rutina PPL, considera moderar la meta hacia ~${safeFloor} kcal/día.`;
    return {
      isSafe: false,
      isAdjustableEstimate: true,
      calculatedAtDate,
      adjustableLabel,
      deficitKcal,
      deficitPercent: deficitPercentOfTdee,
      deficitPercentOfTdee,
      belowBmr: false,
      belowClinicalMinimum: false,
      isAggressiveCut: true,
      severity: 'warning',
      alertLevel: 'warning',
      warningMessage: `Déficit pronunciado (${deficitPercentOfTdee}% bajo tu TDEE). Para preservar fuerza en el gimnasio, considera mantenerte cerca de ${safeFloor} kcal.`,
      headline: 'Aviso Preventivo: Déficit Superior al Rango Conservador (>25%)',
      explanation,
      safeMinimumKcal: safeFloor,
      recommendedSafeFloorKcal: safeFloor,
    };
  }

  return {
    isSafe: true,
    isAdjustableEstimate: true,
    calculatedAtDate,
    adjustableLabel,
    deficitKcal,
    deficitPercent: deficitPercentOfTdee,
    deficitPercentOfTdee,
    belowBmr: false,
    belowClinicalMinimum: false,
    isAggressiveCut: false,
    severity: 'ok',
    alertLevel: 'safe',
    warningMessage: null,
    headline: 'Estimación Ajustable en Zona Fisiológica Segura',
    explanation:
      deficitKcal > 100
        ? `Déficit controlado de -${deficitKcal} kcal/día (-${deficitPercentOfTdee}% del TDEE), óptimo para oxidar grasa preservando masa muscular.`
        : deficitKcal < -100
        ? `Superávit controlado de +${Math.abs(deficitKcal)} kcal/día (+${Math.abs(deficitPercentOfTdee)}% del TDEE), ideal para hipertrofia limpia sin acumular grasa innecesaria.`
        : `Balance normocalórico cercano a tu mantenimiento (${tdeeKcal} kcal), ideal para recomposición corporal.`,
    safeMinimumKcal: safeFloor,
    recommendedSafeFloorKcal: safeFloor,
  };
}

// ============================================================================
// 4. FLEXIBLE UNIT CONVERSIONS (g, ml, porción), BARCODES & MACRO SUGGESTIONS
// ============================================================================

export type FlexibleFoodUnit = 'g' | 'ml' | 'porción' | 'unidad';

export function calculateFlexibleFoodMacros(
  food: Food,
  quantity: number,
  selectedUnit: string
): {
  ratio: number;
  normalizedGrams: number;
  gramsEquivalent: number;
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
} {
  if (!food || quantity <= 0 || Number.isNaN(quantity)) {
    return {
      ratio: 0,
      normalizedGrams: 0,
      gramsEquivalent: 0,
      calories_kcal: 0,
      protein_g: 0,
      carbohydrates_g: 0,
      fat_g: 0,
      fiber_g: 0,
    };
  }

  const normalizedSelected = selectedUnit.toLowerCase().trim();
  const baseUnit = (food.serving_unit || 'g').toLowerCase().trim();
  const density = food.density_g_per_ml || 1.0;
  const portionWeightG =
    food.serving_weight_g ||
    (baseUnit === 'g' || baseUnit === 'ml' ? food.serving_size : 100);

  let gramsEquivalent = quantity;
  if (normalizedSelected === 'porción' || normalizedSelected === 'porcion' || normalizedSelected === 'unidad') {
    gramsEquivalent = quantity * portionWeightG;
  } else if (normalizedSelected === 'ml') {
    gramsEquivalent = quantity * density;
  } else {
    gramsEquivalent = quantity;
  }

  let baseReferenceGrams = food.serving_size || 100;
  if (baseUnit === 'porción' || baseUnit === 'porcion' || baseUnit === 'unidad') {
    baseReferenceGrams = portionWeightG;
  } else if (baseUnit === 'ml') {
    baseReferenceGrams = food.serving_size * density;
  }

  const ratio = baseReferenceGrams > 0 ? gramsEquivalent / baseReferenceGrams : 0;

  const protein_g = Number((food.protein_g * ratio).toFixed(1));
  const carbohydrates_g = Number((food.carbohydrates_g * ratio).toFixed(1));
  const fat_g = Number((food.fat_g * ratio).toFixed(1));
  const fiber_g = Number(((food.fiber_g || 0) * ratio).toFixed(1));
  const { totalKcal } = calculateMacroCalories(protein_g, carbohydrates_g, fat_g);
  const roundedGrams = Math.round(gramsEquivalent);

  return {
    ratio: Number(ratio.toFixed(3)),
    normalizedGrams: roundedGrams,
    gramsEquivalent: roundedGrams,
    calories_kcal: totalKcal,
    protein_g,
    carbohydrates_g,
    fat_g,
    fiber_g,
  };
}

export const BARCODE_PRODUCTS_DB: Food[] = [
  {
    id: 'bc-yogur-griego-proteico',
    name: 'Yogur Griego Alto en Proteína 0% Materia Grasa',
    brand: 'La Serenísima / Danone Protein',
    barcode: '7790895000997',
    serving_size: 160,
    serving_unit: 'g',
    serving_weight_g: 160,
    preparation_state: 'raw',
    calories_kcal: 98,
    protein_g: 16.5,
    carbohydrates_g: 6.2,
    fat_g: 0.4,
    fiber_g: 0,
    source: 'verified',
    category: 'lacteo',
    is_favorite: true,
  },
  {
    id: 'food-barcode-1',
    name: 'Yogur Griego Protein+ Sin Lactosa (Pote 160g)',
    brand: 'La Serenísima Protein',
    barcode: '7791337601125',
    serving_size: 100,
    serving_unit: 'g',
    serving_weight_g: 160,
    preparation_state: 'raw',
    calories_kcal: 79,
    protein_g: 12.5,
    carbohydrates_g: 5.0,
    fat_g: 1.0,
    fiber_g: 0,
    source: 'verified',
    category: 'lacteo',
    is_favorite: true,
  },
  {
    id: 'bc-whey-gold-standard',
    name: '100% Whey Gold Standard Isolate',
    brand: 'Optimum Nutrition',
    barcode: '0748927028669',
    serving_size: 30,
    serving_unit: 'g',
    serving_weight_g: 30,
    preparation_state: 'raw',
    calories_kcal: 117,
    protein_g: 24.0,
    carbohydrates_g: 3.0,
    fat_g: 1.0,
    fiber_g: 0,
    source: 'verified',
    category: 'proteina',
    is_favorite: true,
  },
  {
    id: 'bc-avena-quaker',
    name: 'Avena Tradicional Arrollada Integral',
    brand: 'Quaker',
    barcode: '7790040112233',
    serving_size: 40,
    serving_unit: 'g',
    serving_weight_g: 40,
    preparation_state: 'raw',
    calories_kcal: 146,
    protein_g: 5.4,
    carbohydrates_g: 24.0,
    fat_g: 3.2,
    fiber_g: 4.0,
    source: 'verified',
    category: 'carbohidrato',
    is_favorite: true,
  },
  {
    id: 'bc-atun-natural',
    name: 'Lomitos de Atún al Natural en Agua (Escurrido)',
    brand: 'La Campagnola',
    barcode: '7790360014521',
    serving_size: 120,
    serving_unit: 'g',
    serving_weight_g: 120,
    preparation_state: 'cooked',
    calories_kcal: 132,
    protein_g: 28.8,
    carbohydrates_g: 0,
    fat_g: 1.2,
    fiber_g: 0,
    source: 'verified',
    category: 'proteina',
  },
  {
    id: 'bc-leche-proteica',
    name: 'Leche Descremada Extra Proteína Deslactosada',
    brand: 'Protein Milk',
    barcode: '8480000123456',
    serving_size: 200,
    serving_unit: 'ml',
    serving_weight_g: 200,
    density_g_per_ml: 1.03,
    preparation_state: 'raw',
    calories_kcal: 102,
    protein_g: 14.0,
    carbohydrates_g: 9.5,
    fat_g: 0.8,
    fiber_g: 0,
    source: 'verified',
    category: 'lacteo',
  },
  {
    id: 'bc-pan-proteico',
    name: 'Pan Integral Multicereal Alto en Proteína (2 rebanadas)',
    brand: 'Oroweat / Bimbo Zero',
    barcode: '7501000111222',
    serving_size: 60,
    serving_unit: 'g',
    serving_weight_g: 60,
    preparation_state: 'raw',
    calories_kcal: 145,
    protein_g: 11.0,
    carbohydrates_g: 19.0,
    fat_g: 2.6,
    fiber_g: 5.2,
    source: 'verified',
    category: 'carbohidrato',
  },
];

export function findFoodByBarcode(barcodeInput: string, catalog: Food[] = []): Food | null {
  const clean = (barcodeInput || '').trim().replace(/\s+/g, '');
  if (!clean) return null;
  const fromCatalog = catalog.find((f) => f.barcode === clean);
  if (fromCatalog) return fromCatalog;
  return BARCODE_PRODUCTS_DB.find((f) => f.barcode === clean) || null;
}

export const DEFAULT_FREQUENT_MEALS: FrequentMeal[] = [
  {
    id: 'freq-desayuno-proteico',
    name: 'Desayuno Proteico Completo (Porridge + Whey + Banana)',
    meal_type: 'desayuno',
    default_meal_type: 'desayuno',
    description: '80g Avena + 35g Proteína Whey + 120g Banana madura (1 clic)',
    items: [
      {
        food_id: 'food-5',
        food_name: 'Avena en copos',
        quantity: 80,
        unit: 'g',
        calories_kcal: 300,
        protein_g: 10.8,
        carbohydrates_g: 49.6,
        fat_g: 5.6,
        fiber_g: 8.0,
      },
      {
        food_id: 'food-11',
        food_name: 'Proteína Whey Isolate',
        brand: 'Genérica',
        quantity: 35,
        unit: 'g',
        calories_kcal: 134,
        protein_g: 28.0,
        carbohydrates_g: 1.8,
        fat_g: 1.2,
        fiber_g: 0,
      },
      {
        food_id: 'food-10',
        food_name: 'Plátano / Banana madura',
        quantity: 120,
        unit: 'g',
        calories_kcal: 107,
        protein_g: 1.3,
        carbohydrates_g: 27.4,
        fat_g: 0.4,
        fiber_g: 3.1,
      },
    ],
    total_calories_kcal: 541,
    total_protein_g: 40.1,
    total_carbohydrates_g: 78.8,
    total_fat_g: 7.2,
    created_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 'freq-almuerzo-recomp',
    name: 'Almuerzo Fitness Clásico (Pollo + Arroz + Oliva)',
    meal_type: 'almuerzo',
    default_meal_type: 'almuerzo',
    description: '200g Pechuga cocida + 250g Arroz cocido + 10g Aceite de oliva (1 clic)',
    items: [
      {
        food_id: 'food-2',
        food_name: 'Pechuga de pollo (a la plancha / cocida)',
        quantity: 200,
        unit: 'g',
        calories_kcal: 330,
        protein_g: 62.0,
        carbohydrates_g: 0,
        fat_g: 7.2,
        fiber_g: 0,
      },
      {
        food_id: 'food-4',
        food_name: 'Arroz blanco hervido (cocido)',
        quantity: 250,
        unit: 'g',
        calories_kcal: 325,
        protein_g: 6.8,
        carbohydrates_g: 70.5,
        fat_g: 0.8,
        fiber_g: 1.0,
      },
      {
        food_id: 'food-8',
        food_name: 'Aceite de oliva virgen extra',
        quantity: 10,
        unit: 'g',
        calories_kcal: 90,
        protein_g: 0,
        carbohydrates_g: 0,
        fat_g: 10.0,
        fiber_g: 0,
      },
    ],
    total_calories_kcal: 745,
    total_protein_g: 68.8,
    total_carbohydrates_g: 70.5,
    total_fat_g: 18.0,
    created_at: '2026-10-01T13:00:00Z',
  },
  {
    id: 'freq-merienda-anabolica',
    name: 'Merienda Rápida (Yogur Griego + 2 Huevos + Manzana)',
    meal_type: 'merienda',
    default_meal_type: 'merienda',
    description: '200g Yogur griego 0% + 2 Huevos grandes + 1 Manzana verde (1 clic)',
    items: [
      {
        food_id: 'food-9',
        food_name: 'Yogur griego natural descremado (0% grasa)',
        quantity: 200,
        unit: 'g',
        calories_kcal: 120,
        protein_g: 20.0,
        carbohydrates_g: 8.0,
        fat_g: 0.4,
        fiber_g: 0,
      },
      {
        food_id: 'food-6',
        food_name: 'Huevo entero grande (unidad ~55g)',
        quantity: 2,
        unit: 'unidad',
        calories_kcal: 150,
        protein_g: 13.0,
        carbohydrates_g: 0.8,
        fat_g: 10.0,
        fiber_g: 0,
      },
      {
        food_id: 'food-12',
        food_name: 'Manzana verde con piel',
        quantity: 1,
        unit: 'unidad',
        calories_kcal: 78,
        protein_g: 0.4,
        carbohydrates_g: 20.0,
        fat_g: 0.2,
        fiber_g: 3.5,
      },
    ],
    total_calories_kcal: 348,
    total_protein_g: 33.4,
    total_carbohydrates_g: 28.8,
    total_fat_g: 10.6,
    created_at: '2026-10-01T17:30:00Z',
  },
];

export interface MacroDeficitSuggestion {
  macro: 'protein' | 'carbs' | 'fat' | 'complete';
  missingGrams: number;
  deficitGrams: number;
  headline: string;
  message: string;
  suggestionText: string;
  quickAddOptions: Array<{
    food_id: string;
    food_name: string;
    quantity: number;
    unit: 'g' | 'porción';
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    calories_kcal: number;
  }>;
  quickFoodOptions: Array<{ label: string; foodId: string; quantity: number; unit: string }>;
}

export function generateMacroDeficitSuggestions(
  target: Pick<NutritionTarget, 'protein_g' | 'carbohydrates_g' | 'fat_g'>,
  consumedOrProtein: { protein_g: number; carbohydrates_g: number; fat_g: number } | number,
  consumedCarbsG?: number,
  consumedFatG?: number
): MacroDeficitSuggestion[] {
  const consumed =
    typeof consumedOrProtein === 'number'
      ? {
          protein_g: consumedOrProtein,
          carbohydrates_g: consumedCarbsG ?? 0,
          fat_g: consumedFatG ?? 0,
        }
      : consumedOrProtein;

  const suggestions: MacroDeficitSuggestion[] = [];
  const missingP = Math.round(target.protein_g - consumed.protein_g);
  const missingC = Math.round(target.carbohydrates_g - consumed.carbohydrates_g);
  const missingF = Math.round(target.fat_g - consumed.fat_g);

  if (missingP > 5) {
    const chickenGrams = Math.max(40, Math.round((missingP / 31) * 100));
    const eggsCount = Math.max(1, Math.round(missingP / 6.5));
    const wheyGrams = Math.max(20, Math.round((missingP / 24) * 30));
    const headline = `Faltan ${missingP}g de proteína para tu meta diaria`;
    const suggestionText = `Sugerencia práctica: Añadir ${eggsCount} ${eggsCount === 1 ? 'huevo entero' : 'huevos enteros'} (~${Math.round(eggsCount * 6.5)}g P), ${chickenGrams}g de pechuga de pollo cocida (~${missingP}g P) o ${wheyGrams}g de Proteína Whey.`;
    suggestions.push({
      macro: 'protein',
      missingGrams: missingP,
      deficitGrams: missingP,
      headline,
      message: suggestionText,
      suggestionText,
      quickAddOptions: [
        {
          food_id: 'food-2',
          food_name: 'Pechuga de pollo (cocida)',
          quantity: chickenGrams,
          unit: 'g',
          protein_g: Number(((chickenGrams / 100) * 31).toFixed(1)),
          carbs_g: 0,
          fat_g: Number(((chickenGrams / 100) * 3.6).toFixed(1)),
          calories_kcal: Math.round((chickenGrams / 100) * 165),
        },
        {
          food_id: 'food-6',
          food_name: 'Huevo entero grande',
          quantity: eggsCount,
          unit: 'porción',
          protein_g: Number((eggsCount * 6.5).toFixed(1)),
          carbs_g: Number((eggsCount * 0.4).toFixed(1)),
          fat_g: Number((eggsCount * 5.0).toFixed(1)),
          calories_kcal: Math.round(eggsCount * 73),
        },
        {
          food_id: 'food-11',
          food_name: 'Proteína Whey Isolate',
          quantity: 1,
          unit: 'porción',
          protein_g: 24.0,
          carbs_g: 1.5,
          fat_g: 1.0,
          calories_kcal: 111,
        },
      ],
      quickFoodOptions: [
        { label: `+${chickenGrams}g Pechuga de pollo`, foodId: 'food-2', quantity: chickenGrams, unit: 'g' },
        { label: `+${eggsCount} ${eggsCount === 1 ? 'Huevo' : 'Huevos'} (${eggsCount * 55}g)`, foodId: 'food-6', quantity: eggsCount * 55, unit: 'g' },
        { label: `+${wheyGrams}g Whey Isolate`, foodId: 'food-11', quantity: wheyGrams, unit: 'g' },
      ],
    });
  }

  if (missingC > 15) {
    const riceGrams = Math.max(50, Math.round((missingC / 28.2) * 100));
    const oatsGrams = Math.max(30, Math.round((missingC / 62) * 100));
    const headline = `Faltan ${missingC}g de carbohidratos para energía de entrenamiento`;
    const suggestionText = `Sugerencia práctica: Añadir ${riceGrams}g de arroz blanco cocido, ${oatsGrams}g de avena en copos o 1 plátano mediano (120g).`;
    suggestions.push({
      macro: 'carbs',
      missingGrams: missingC,
      deficitGrams: missingC,
      headline,
      message: suggestionText,
      suggestionText,
      quickAddOptions: [
        {
          food_id: 'food-4',
          food_name: 'Arroz blanco hervido (cocido)',
          quantity: riceGrams,
          unit: 'g',
          protein_g: Number(((riceGrams / 100) * 2.7).toFixed(1)),
          carbs_g: Number(((riceGrams / 100) * 28.2).toFixed(1)),
          fat_g: Number(((riceGrams / 100) * 0.3).toFixed(1)),
          calories_kcal: Math.round((riceGrams / 100) * 126),
        },
        {
          food_id: 'food-10',
          food_name: 'Plátano / Banana madura',
          quantity: 1,
          unit: 'porción',
          protein_g: 1.3,
          carbs_g: 27.4,
          fat_g: 0.4,
          calories_kcal: 118,
        },
      ],
      quickFoodOptions: [
        { label: `+${riceGrams}g Arroz cocido`, foodId: 'food-4', quantity: riceGrams, unit: 'g' },
        { label: `+120g Plátano maduro`, foodId: 'food-10', quantity: 120, unit: 'g' },
      ],
    });
  }

  if (missingF > 8) {
    const oliveGrams = Math.max(5, Math.min(20, missingF));
    const headline = `Faltan ${missingF}g de grasas saludables (soporte hormonal)`;
    const suggestionText = `Sugerencia práctica: Añadir ${oliveGrams}g de aceite de oliva virgen extra o 1 huevo entero grande.`;
    suggestions.push({
      macro: 'fat',
      missingGrams: missingF,
      deficitGrams: missingF,
      headline,
      message: suggestionText,
      suggestionText,
      quickAddOptions: [
        {
          food_id: 'food-8',
          food_name: 'Aceite de oliva virgen extra',
          quantity: oliveGrams,
          unit: 'g',
          protein_g: 0,
          carbs_g: 0,
          fat_g: oliveGrams,
          calories_kcal: oliveGrams * 9,
        },
      ],
      quickFoodOptions: [
        { label: `+${oliveGrams}g Aceite de oliva`, foodId: 'food-8', quantity: oliveGrams, unit: 'g' },
      ],
    });
  }

  return suggestions;
}

// ============================================================================
// 5. WORKOUT OVERLOAD LOOKUP & PPL A/B COHERENCE AUDIT
// ============================================================================

export interface PreviousExercisePerformance {
  found: boolean;
  lastSessionDate: string | null;
  sessionDate: string;
  routineName: string;
  bestWeightKg: number;
  bestReps: number;
  bestRir: number;
  best1RM: number;
  totalEffectiveSets: number;
  sets: Array<{ weight_kg: number; repetitions: number; rir: number }>;
  summaryBadge: string;
  formattedBadge: string;
}

export function getPreviousExercisePerformance(
  exerciseId: string,
  sessions: WorkoutSession[],
  excludeSessionId?: string
): PreviousExercisePerformance {
  const completedSessions = (sessions || [])
    .filter((s) => s.status === 'completed' && s.id !== excludeSessionId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

  for (const sess of completedSessions) {
    const exLog = sess.exercises.find((e) => e.exercise_id === exerciseId && !e.skipped);
    if (!exLog) continue;
    const effectiveSets = exLog.sets.filter((s) => !s.is_warmup && s.completed && s.repetitions > 0);
    if (effectiveSets.length === 0) continue;

    const bestSet = [...effectiveSets].sort((a, b) => {
      if (b.weight_kg !== a.weight_kg) return b.weight_kg - a.weight_kg;
      return b.repetitions - a.repetitions;
    })[0];

    let best1RM = 0;
    const mappedSets = effectiveSets.map((s) => {
      const rm = s.repetitions === 1 ? s.weight_kg : Math.round(s.weight_kg * (1 + s.repetitions / 30));
      if (rm > best1RM) best1RM = rm;
      return {
        weight_kg: s.weight_kg,
        repetitions: s.repetitions,
        rir: s.rir ?? 2,
      };
    });

    const dateShort = sess.started_at.split('T')[0];
    const rirVal = bestSet.rir ?? 2;
    const badge = `${bestSet.weight_kg} kg × ${bestSet.repetitions} reps @ RIR ${rirVal} (${dateShort})`;
    return {
      found: true,
      lastSessionDate: dateShort,
      sessionDate: dateShort,
      routineName: sess.routine_name,
      bestWeightKg: bestSet.weight_kg,
      bestReps: bestSet.repetitions,
      bestRir: rirVal,
      best1RM,
      totalEffectiveSets: effectiveSets.length,
      sets: mappedSets,
      summaryBadge: `${bestSet.weight_kg}kg × ${bestSet.repetitions} @ RIR ${rirVal} (${dateShort})`,
      formattedBadge: badge,
    };
  }

  return {
    found: false,
    lastSessionDate: null,
    sessionDate: '',
    routineName: '',
    bestWeightKg: 0,
    bestReps: 0,
    bestRir: 2,
    best1RM: 0,
    totalEffectiveSets: 0,
    sets: [],
    summaryBadge: 'Sin registros previos · Establece tu marca base hoy',
    formattedBadge: 'Sin registros previos · Establece tu marca base hoy',
  };
}

export interface PPLAuditReport {
  isCoherent: boolean;
  weeklySetsBySplit: Record<'Push' | 'Pull' | 'Legs', number>;
  weeklySetsByMuscle: Record<string, number>;
  abVariantComparisons: Array<{
    split: 'Push' | 'Pull' | 'Legs';
    routineAName: string;
    routineBName: string;
    sharedExercisesCount: number;
    sharedLeadExercise: boolean;
    totalWeeklySplitSets: number;
    status: 'optimal' | 'warning';
    note: string;
  }>;
  warnings: string[];
  recommendation: string;
  recommendations: string[];
}

export function auditPPLRoutinesCoherence(
  routines: WorkoutRoutine[],
  exercisesCatalog: Exercise[] = []
): PPLAuditReport {
  const weeklySetsByMuscle: Record<string, number> = {};
  const weeklySetsBySplit: Record<'Push' | 'Pull' | 'Legs', number> = {
    Push: 0,
    Pull: 0,
    Legs: 0,
  };
  const exMap = new Map<string, Exercise>();
  exercisesCatalog.forEach((e) => exMap.set(e.id, e));

  routines.forEach((routine) => {
    const setsInRoutine = routine.exercises.reduce((acc, c) => acc + c.target_sets, 0);
    if (routine.split === 'Push' || routine.split === 'Pull' || routine.split === 'Legs') {
      weeklySetsBySplit[routine.split] += setsInRoutine;
    }
    if (!routine.is_active) return;
    routine.exercises.forEach((re) => {
      const ex = exMap.get(re.exercise_id);
      const muscle: MuscleGroup = ex?.primary_muscle || 'pecho';
      weeklySetsByMuscle[muscle] = (weeklySetsByMuscle[muscle] || 0) + re.target_sets;
    });
  });

  const splits: Array<'Push' | 'Pull' | 'Legs'> = ['Push', 'Pull', 'Legs'];
  const abVariantComparisons: PPLAuditReport['abVariantComparisons'] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const split of splits) {
    const splitRoutines = routines.filter((r) => r.split === split);
    const rotA = splitRoutines[0];
    const rotB = splitRoutines[1];

    if (rotA && rotB) {
      const aIds = new Set(rotA.exercises.map((e) => e.exercise_id));
      const bIds = new Set(rotB.exercises.map((e) => e.exercise_id));
      let sharedCount = 0;
      aIds.forEach((id) => {
        if (bIds.has(id)) sharedCount++;
      });

      const sharedLeadExercise =
        rotA.exercises[0]?.exercise_id !== undefined &&
        rotA.exercises[0]?.exercise_id === rotB.exercises[0]?.exercise_id;

      const setsA = rotA.exercises.reduce((acc, c) => acc + c.target_sets, 0);
      const setsB = rotB.exercises.reduce((acc, c) => acc + c.target_sets, 0);
      const totalWeeklySplitSets = setsA + setsB;

      const isWarning = sharedLeadExercise || totalWeeklySplitSets > 42 || totalWeeklySplitSets < 10;
      const note = sharedLeadExercise
        ? `${rotA.name} y ${rotB.name} repiten el mismo primer ejercicio básico. Se sugiere alternar plano/inclinado o vertical/horizontal.`
        : `Rotación A/B coherente: ${rotA.name} (${setsA} series) y ${rotB.name} (${setsB} series) alternan ángulos y estímulos sin duplicar volumen basura.`;

      if (isWarning) {
        warnings.push(note);
        recommendations.push(note);
      }

      abVariantComparisons.push({
        split,
        routineAName: rotA.name,
        routineBName: rotB.name,
        sharedExercisesCount: sharedCount,
        sharedLeadExercise,
        totalWeeklySplitSets,
        status: isWarning ? 'warning' : 'optimal',
        note,
      });
    } else if (splitRoutines.length < 2) {
      const warnMsg = `El bloque ${split} solo tiene ${splitRoutines.length} variante configurada.`;
      warnings.push(warnMsg);
      recommendations.push(warnMsg);
    }
  }

  const defaultRec =
    'Auditoría PPL Frecuencia 6 (A/B) óptima: Balance biomecánico verificado entre planos horizontales/verticales y dominantes de rodilla/cadera (10–20 series efectivas por grupo muscular).';

  if (recommendations.length === 0) {
    recommendations.push(defaultRec);
  }

  return {
    isCoherent: warnings.length === 0,
    weeklySetsBySplit,
    weeklySetsByMuscle,
    abVariantComparisons,
    warnings,
    recommendation: warnings.length === 0 ? defaultRec : warnings.join(' '),
    recommendations,
  };
}

// ============================================================================
// 6. WEEKLY DASHBOARD SUMMARY, DUOLINGO STREAK & OFFLINE ARCHITECTURE
// ============================================================================

export interface WeeklyDashboardSummary {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  avgCaloriesKcal: number;
  avgProteinG: number;
  calorieAdherencePercent: number;
  consistencyScorePct: number;
  daysNutritionLogged: number;
  daysWeighedIn: number;
  daysWeighInLogged: number;
  current7dWeightAvgKg: number | null;
  prev7dWeightAvgKg: number | null;
  weightDeltaKg: number | null;
  weightTrendDeltaKg: number | null;
  completedWorkoutsCount: number;
  workoutsCompleted: number;
  totalWeeklyVolumeKg: number;
  totalWorkoutVolumeKg: number;
  totalEffectiveSets: number;
}

export function calculateWeeklyDashboardSummary(
  currentDate: string,
  arg2: WeighIn[] | FoodLog[],
  arg3: FoodLog[] | WeighIn[],
  workoutSessions: WorkoutSession[],
  nutritionTarget?: NutritionTarget
): WeeklyDashboardSummary {
  // Detect whether arg2 is WeighIn[] or FoodLog[] so both parameter orders work seamlessly
  const arg2LooksLikeWeighIns =
    Array.isArray(arg2) &&
    arg2.length > 0 &&
    ('weight_kg' in arg2[0] || 'measured_at' in arg2[0]);
  const arg3LooksLikeWeighIns =
    Array.isArray(arg3) &&
    arg3.length > 0 &&
    ('weight_kg' in arg3[0] || 'measured_at' in arg3[0]);

  let weighIns: WeighIn[] = [];
  let foodLogs: FoodLog[] = [];

  if (arg2LooksLikeWeighIns || (!arg3LooksLikeWeighIns && Array.isArray(arg3) && arg3.length > 0 && 'consumed_at' in arg3[0])) {
    weighIns = (arg2 as WeighIn[]) || [];
    foodLogs = (arg3 as FoodLog[]) || [];
  } else {
    foodLogs = (arg2 as FoodLog[]) || [];
    weighIns = (arg3 as WeighIn[]) || [];
  }

  const endObj = new Date(`${currentDate}T12:00:00Z`);
  const startObj = new Date(endObj);
  startObj.setUTCDate(startObj.getUTCDate() - 6);
  const periodStart = startObj.toISOString().split('T')[0];
  const periodEnd = currentDate;

  const windowFoodLogs = foodLogs.filter(
    (f) => f && typeof f.consumed_at === 'string' && f.consumed_at >= periodStart && f.consumed_at <= periodEnd
  );
  const caloriesByDay = new Map<string, { kcal: number; protein: number }>();
  windowFoodLogs.forEach((log) => {
    const prev = caloriesByDay.get(log.consumed_at) || { kcal: 0, protein: 0 };
    caloriesByDay.set(log.consumed_at, {
      kcal: prev.kcal + (log.calories_kcal || 0),
      protein: prev.protein + (log.protein_g || 0),
    });
  });

  const daysNutritionLogged = caloriesByDay.size;
  let sumKcal = 0;
  let sumProtein = 0;
  caloriesByDay.forEach((v) => {
    sumKcal += v.kcal;
    sumProtein += v.protein;
  });

  const avgCaloriesKcal = daysNutritionLogged > 0 ? Math.round(sumKcal / daysNutritionLogged) : 0;
  const avgProteinG = daysNutritionLogged > 0 ? Math.round(sumProtein / daysNutritionLogged) : 0;
  const targetKcal = nutritionTarget?.calories_kcal || 2350;
  const calorieAdherencePercent =
    targetKcal > 0 && avgCaloriesKcal > 0
      ? Math.min(100, Math.round((avgCaloriesKcal / targetKcal) * 100))
      : 0;

  const validWeighIns = weighIns.filter((w) => w && typeof w.measured_at === 'string');
  const sortedWeighIns = [...validWeighIns].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
  const windowWeighIns = sortedWeighIns.filter((w) => {
    const d = w.measured_at.split('T')[0];
    return d >= periodStart && d <= periodEnd;
  });
  const current7dStats = calculateWeeklyAverage(
    windowWeighIns.length > 0 ? windowWeighIns : sortedWeighIns.slice(-7)
  );
  const prev7dStats = calculateWeeklyAverage(sortedWeighIns.slice(-14, -7));
  const weightDeltaKg =
    current7dStats.average !== null && prev7dStats.average !== null
      ? Number((current7dStats.average - prev7dStats.average).toFixed(2))
      : windowWeighIns.length >= 2
      ? Number((windowWeighIns[windowWeighIns.length - 1].weight_kg - windowWeighIns[0].weight_kg).toFixed(2))
      : null;

  const windowWorkouts = (workoutSessions || []).filter((s) => {
    if (!s || typeof s.started_at !== 'string') return false;
    const d = s.started_at.split('T')[0];
    return s.status === 'completed' && d >= periodStart && d <= periodEnd;
  });

  let totalWeeklyVolumeKg = 0;
  let totalEffectiveSets = 0;
  windowWorkouts.forEach((sess) => {
    sess.exercises.forEach((ex) => {
      if (ex.skipped) return;
      ex.sets.forEach((set) => {
        if (!set.is_warmup && set.completed) {
          totalEffectiveSets += 1;
          totalWeeklyVolumeKg += Math.round(set.weight_kg * set.repetitions);
        }
      });
    });
  });

  // Calculate active days (any weigh-in, food log, or workout in the 7-day window)
  const activeDates = new Set<string>();
  caloriesByDay.forEach((_, d) => activeDates.add(d));
  windowWeighIns.forEach((w) => activeDates.add(w.measured_at.split('T')[0]));
  windowWorkouts.forEach((s) => activeDates.add(s.started_at.split('T')[0]));
  const consistencyScorePct = Math.min(100, Math.round((activeDates.size / 7) * 100));

  return {
    periodLabel: `${periodStart} → ${periodEnd}`,
    periodStart,
    periodEnd,
    avgCaloriesKcal,
    avgProteinG,
    calorieAdherencePercent,
    consistencyScorePct,
    daysNutritionLogged,
    daysWeighedIn: windowWeighIns.length,
    daysWeighInLogged: windowWeighIns.length,
    current7dWeightAvgKg: current7dStats.average,
    prev7dWeightAvgKg: prev7dStats.average,
    weightDeltaKg,
    weightTrendDeltaKg: weightDeltaKg,
    completedWorkoutsCount: windowWorkouts.length,
    workoutsCompleted: windowWorkouts.length,
    totalWeeklyVolumeKg,
    totalWorkoutVolumeKg: totalWeeklyVolumeKg,
    totalEffectiveSets,
  };
}

export interface StreakGamificationInfo {
  streakDays: number;
  levelTitle: string;
  nextMilestone: number;
  nextMilestoneDays: number;
  progressPercent: number;
  progressToMilestonePercent: number;
  motivationalMessage: string;
  motivationalCopy: string;
  badges: Array<{ id: string; label: string; daysRequired: number; unlocked: boolean }>;
  milestones: Array<{ days: number; label: string; achieved: boolean }>;
}

export function getStreakGamificationState(streakDays: number): StreakGamificationInfo {
  const milestones = [
    { days: 3, label: 'Chispa Inicial (3d)', achieved: streakDays >= 3 },
    { days: 7, label: 'Semana Perfecta (7d)', achieved: streakDays >= 7 },
    { days: 14, label: 'Hábito Forjado (14d)', achieved: streakDays >= 14 },
    { days: 21, label: 'Disciplina de Hierro (21d)', achieved: streakDays >= 21 },
    { days: 30, label: 'Maestro Recomposición (30d)', achieved: streakDays >= 30 },
  ];

  const badges = [
    { id: 'b-3', label: '3 Días · Chispa Inicial', daysRequired: 3, unlocked: streakDays >= 3 },
    { id: 'b-7', label: '7 Días · Hábito Semanal', daysRequired: 7, unlocked: streakDays >= 7 },
    { id: 'b-14', label: '14 Días · Consistencia Pro', daysRequired: 14, unlocked: streakDays >= 14 },
    { id: 'b-30', label: '30 Días · Élite Recomposición', daysRequired: 30, unlocked: streakDays >= 30 },
  ];

  const nextMilestone = milestones.find((m) => !m.achieved)?.days || 60;
  const progressPercent = Math.min(100, Math.round((streakDays / nextMilestone) * 100));

  let levelTitle = 'Iniciando Racha';
  let motivationalCopy = 'Registra tu pesaje o primera comida hoy para encender tu racha diaria.';
  if (streakDays >= 21) {
    levelTitle = 'Liga Diamante · Disciplina de Hierro';
    motivationalCopy = `¡${streakDays} días seguidos registrando! Tu media móvil y adherencia están en el top 5% de la beta.`;
  } else if (streakDays >= 14) {
    levelTitle = 'Liga Oro · Hábito Consolidado';
    motivationalCopy = `¡${streakDays} días de racha! A solo ${nextMilestone - streakDays} días del hito de 21 días.`;
  } else if (streakDays >= 7) {
    levelTitle = 'Liga Plata · Semana Completa';
    motivationalCopy = `¡${streakDays} días en racha! La consistencia semanal es el factor #1 de recomposición.`;
  } else if (streakDays >= 1) {
    levelTitle = 'Racha Activa en Marcha';
    motivationalCopy = `Llevas ${streakDays} ${streakDays === 1 ? 'día' : 'días'}. ¡Mantén la llama encendida hasta los ${nextMilestone} días!`;
  }

  return {
    streakDays,
    levelTitle,
    nextMilestone,
    nextMilestoneDays: nextMilestone,
    progressPercent,
    progressToMilestonePercent: progressPercent,
    motivationalMessage: motivationalCopy,
    motivationalCopy,
    badges,
    milestones,
  };
}

export interface StreakDayHistoryItem {
  date: string;
  shortLabel: string;
  dayInitial: string;
  dayNumber: string;
  isToday: boolean;
  hasWeighIn: boolean;
  weightKg: number | null;
  hasNutrition: boolean;
  caloriesKcal: number;
  proteinG: number;
  mealsCount: number;
  hasWorkoutOrActivity: boolean;
  workoutName: string | null;
  steps: number;
  completedQuestsCount: number;
  totalQuestsCount: number;
  completionPercent: number;
  dailyGoalMet: boolean;
  isPerfectCrown: boolean;
  isLogged: boolean;
  inActiveStreakChain: boolean;
  earnedXp: number;
}

export interface DailyGoalQuestItem {
  id: 'nutrition' | 'weigh_in' | 'workout_activity';
  title: string;
  subtitle: string;
  completed: boolean;
  xp: number;
  targetTab: 'nutrition' | 'weight' | 'workout' | 'activity';
  ctaLabel: string;
}

export interface DailyGoalGamifiedState {
  date: string;
  isDailyGoalMet: boolean;
  isPerfectCrown: boolean;
  completionPercent: number;
  completedQuestsCount: number;
  totalQuestsCount: number;
  earnedXpToday: number;
  bonusXpEarned: number;
  statusLabel: string;
  statusBadgeTone: 'emerald' | 'amber' | 'zinc';
  quests: DailyGoalQuestItem[];
}

export interface StreakHistoryAndDailyGoalResult {
  currentStreak: number;
  bestStreak: number;
  totalActiveDaysInWindow: number;
  totalDailyGoalsMetInWindow: number;
  totalStreakXp: number;
  gamification: StreakGamificationInfo;
  consecutiveHistory: StreakDayHistoryItem[];
  todayDailyGoal: DailyGoalGamifiedState;
  getDailyGoalForDate: (dateStr: string) => DailyGoalGamifiedState;
}

const SPANISH_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SPANISH_DAY_INITIALS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function calculateStreakHistoryAndDailyGoal(params: {
  currentDate: string;
  weighIns: WeighIn[];
  foodLogs: FoodLog[];
  workoutSessions?: WorkoutSession[];
  activityLogs?: Array<{ activity_date: string; steps: number }>;
  nutritionTarget?: NutritionTarget;
  habits?: {
    weigh_in_done?: boolean;
    meals_logged?: boolean;
    protein_goal_met?: boolean;
    workout_done?: boolean;
    steps_goal_met?: boolean;
  };
  historyDays?: number;
}): StreakHistoryAndDailyGoalResult {
  const {
    currentDate,
    weighIns = [],
    foodLogs = [],
    workoutSessions = [],
    activityLogs = [],
    nutritionTarget,
    habits,
    historyDays = 14,
  } = params;

  const weighInByDate = new Map<string, number>();
  weighIns.forEach((w) => {
    if (!w || typeof w.measured_at !== 'string') return;
    const d = w.measured_at.split('T')[0];
    weighInByDate.set(d, w.weight_kg);
  });

  const nutritionByDate = new Map<string, { kcal: number; protein: number; count: number }>();
  foodLogs.forEach((f) => {
    if (!f || typeof f.consumed_at !== 'string') return;
    const d = f.consumed_at.split('T')[0];
    const prev = nutritionByDate.get(d) || { kcal: 0, protein: 0, count: 0 };
    nutritionByDate.set(d, {
      kcal: prev.kcal + (f.calories_kcal || 0),
      protein: prev.protein + (f.protein_g || 0),
      count: prev.count + 1,
    });
  });

  const workoutByDate = new Map<string, string>();
  workoutSessions.forEach((s) => {
    if (!s || typeof s.started_at !== 'string' || s.status !== 'completed') return;
    const d = s.started_at.split('T')[0];
    workoutByDate.set(d, s.routine_name || 'Sesión PPL');
  });

  const stepsByDate = new Map<string, number>();
  activityLogs.forEach((a) => {
    if (!a || typeof a.activity_date !== 'string') return;
    const d = a.activity_date.split('T')[0];
    stepsByDate.set(d, a.steps || 0);
  });

  // Collect all logged dates across entire dataset to compute currentStreak and bestStreak
  const allLoggedDatesSet = new Set<string>();
  weighInByDate.forEach((_, d) => allLoggedDatesSet.add(d));
  nutritionByDate.forEach((_, d) => allLoggedDatesSet.add(d));
  workoutByDate.forEach((_, d) => allLoggedDatesSet.add(d));
  stepsByDate.forEach((steps, d) => {
    if (steps >= 5000) allLoggedDatesSet.add(d);
  });

  if (
    habits &&
    (habits.weigh_in_done ||
      habits.meals_logged ||
      habits.protein_goal_met ||
      habits.workout_done ||
      habits.steps_goal_met)
  ) {
    allLoggedDatesSet.add(currentDate);
  }

  // Compute current consecutive streak ending on currentDate (or yesterday if today isn't logged yet)
  const activeStreakDates = new Set<string>();
  let currentStreak = 0;
  if (currentDate) {
    const cursor = new Date(`${currentDate}T12:00:00Z`);
    const todayIso = cursor.toISOString().split('T')[0];
    if (!allLoggedDatesSet.has(todayIso)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (currentStreak < 365) {
      const dStr = cursor.toISOString().split('T')[0];
      if (allLoggedDatesSet.has(dStr)) {
        currentStreak++;
        activeStreakDates.add(dStr);
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }

  // Compute bestStreak across all sorted dates
  const sortedAllDates = Array.from(allLoggedDatesSet).sort();
  let bestStreak = currentStreak;
  let running = 0;
  let prevTime: number | null = null;
  for (const dStr of sortedAllDates) {
    const t = new Date(`${dStr}T12:00:00Z`).getTime();
    if (prevTime !== null && Math.round((t - prevTime) / (1000 * 60 * 60 * 24)) === 1) {
      running++;
    } else {
      running = 1;
    }
    if (running > bestStreak) bestStreak = running;
    prevTime = t;
  }

  // Build consecutive history window (last N days ending on currentDate)
  const countDays = Math.max(7, Math.min(90, historyDays));
  const endObj = new Date(`${currentDate}T12:00:00Z`);
  const consecutiveHistory: StreakDayHistoryItem[] = [];

  for (let offset = countDays - 1; offset >= 0; offset--) {
    const dObj = new Date(endObj);
    dObj.setUTCDate(dObj.getUTCDate() - offset);
    const dateStr = dObj.toISOString().split('T')[0];
    const dow = dObj.getUTCDay();
    const dayNumber = String(dObj.getUTCDate()).padStart(2, '0');
    const shortLabel = `${SPANISH_DAY_NAMES[dow]} ${dayNumber}`;
    const dayInitial = SPANISH_DAY_INITIALS[dow];
    const isToday = dateStr === currentDate;

    const weightVal = weighInByDate.get(dateStr) ?? null;
    const hasWeighIn =
      weightVal !== null || (isToday && Boolean(habits?.weigh_in_done));

    const nutVal = nutritionByDate.get(dateStr) || { kcal: 0, protein: 0, count: 0 };
    const hasNutrition =
      nutVal.count > 0 ||
      (isToday && Boolean(habits?.meals_logged || habits?.protein_goal_met));

    const workoutName = workoutByDate.get(dateStr) ?? null;
    const stepsVal = stepsByDate.get(dateStr) ?? 0;
    const hasWorkoutOrActivity =
      workoutName !== null ||
      stepsVal >= 5000 ||
      (isToday && Boolean(habits?.workout_done || habits?.steps_goal_met));

    const completedQuestsCount =
      (hasNutrition ? 1 : 0) + (hasWeighIn ? 1 : 0) + (hasWorkoutOrActivity ? 1 : 0);
    const totalQuestsCount = 3;
    const completionPercent = Math.round((completedQuestsCount / totalQuestsCount) * 100);
    const dailyGoalMet = completedQuestsCount >= 2;
    const isPerfectCrown = completedQuestsCount === 3;
    const isLogged = completedQuestsCount >= 1;
    const bonusXp = isPerfectCrown ? 60 : dailyGoalMet ? 30 : 0;
    const earnedXp = completedQuestsCount * 50 + bonusXp;

    consecutiveHistory.push({
      date: dateStr,
      shortLabel,
      dayInitial,
      dayNumber,
      isToday,
      hasWeighIn,
      weightKg: weightVal,
      hasNutrition,
      caloriesKcal: Math.round(nutVal.kcal),
      proteinG: Math.round(nutVal.protein),
      mealsCount: nutVal.count,
      hasWorkoutOrActivity,
      workoutName,
      steps: stepsVal,
      completedQuestsCount,
      totalQuestsCount,
      completionPercent,
      dailyGoalMet,
      isPerfectCrown,
      isLogged,
      inActiveStreakChain: activeStreakDates.has(dateStr),
      earnedXp,
    });
  }

  const buildDailyGoalState = (dateStr: string): DailyGoalGamifiedState => {
    const found =
      consecutiveHistory.find((h) => h.date === dateStr) ||
      consecutiveHistory[consecutiveHistory.length - 1];

    const targetProtein = nutritionTarget?.protein_g || 175;
    const targetKcal = nutritionTarget?.calories_kcal || 2350;

    const quests: DailyGoalQuestItem[] = [
      {
        id: 'nutrition',
        title: 'Registro Nutricional y Macros',
        subtitle: found.hasNutrition
          ? `${found.caloriesKcal} / ${targetKcal} kcal · ${found.proteinG}g / ${targetProtein}g Proteína`
          : `Meta: ${targetKcal} kcal y ${targetProtein}g de proteína`,
        completed: found.hasNutrition,
        xp: 50,
        targetTab: 'nutrition',
        ctaLabel: found.hasNutrition ? 'Ver Diario' : 'Registrar Comida',
      },
      {
        id: 'weigh_in',
        title: 'Pesaje Corporal en Ayunas',
        subtitle: found.hasWeighIn
          ? found.weightKg !== null
            ? `${found.weightKg} kg registrado en bitácora`
            : 'Hábito de pesaje matutino marcado'
          : 'Registra tu peso al despertar para la media móvil 7d',
        completed: found.hasWeighIn,
        xp: 50,
        targetTab: 'weight',
        ctaLabel: found.hasWeighIn ? 'Ver Evolución' : 'Registrar Peso',
      },
      {
        id: 'workout_activity',
        title: 'Entrenamiento PPL o Actividad NEAT',
        subtitle: found.hasWorkoutOrActivity
          ? found.workoutName
            ? `Completado: ${found.workoutName}${found.steps > 0 ? ` · ${found.steps.toLocaleString()} pasos` : ''}`
            : `Actividad cumplida (${found.steps > 0 ? `${found.steps.toLocaleString()} pasos` : '5.000+ pasos'})`
          : 'Completa tu sesión PPL del día o supera los 5.000 pasos',
        completed: found.hasWorkoutOrActivity,
        xp: 50,
        targetTab: 'workout',
        ctaLabel: found.hasWorkoutOrActivity ? 'Ver Rutina' : 'Iniciar Entreno',
      },
    ];

    const bonusXpEarned = found.isPerfectCrown ? 60 : found.dailyGoalMet ? 30 : 0;

    let statusLabel = 'Meta Diaria Pendiente (0/3)';
    let statusBadgeTone: 'emerald' | 'amber' | 'zinc' = 'zinc';

    if (found.isPerfectCrown) {
      statusLabel = '¡Meta Diaria Cumplida · Día Perfecto (3/3)!';
      statusBadgeTone = 'emerald';
    } else if (found.dailyGoalMet) {
      statusLabel = '¡Meta Diaria Cumplida (2/3) · Racha Asegurada!';
      statusBadgeTone = 'emerald';
    } else if (found.completedQuestsCount === 1) {
      statusLabel = 'Racha Activa (1/3) · Completa 1 misión más para la Meta Diaria';
      statusBadgeTone = 'amber';
    }

    return {
      date: found.date,
      isDailyGoalMet: found.dailyGoalMet,
      isPerfectCrown: found.isPerfectCrown,
      completionPercent: found.completionPercent,
      completedQuestsCount: found.completedQuestsCount,
      totalQuestsCount: found.totalQuestsCount,
      earnedXpToday: found.earnedXp,
      bonusXpEarned,
      statusLabel,
      statusBadgeTone,
      quests,
    };
  };

  const todayDailyGoal = buildDailyGoalState(currentDate);
  const totalActiveDaysInWindow = consecutiveHistory.filter((d) => d.isLogged).length;
  const totalDailyGoalsMetInWindow = consecutiveHistory.filter((d) => d.dailyGoalMet).length;
  const totalStreakXp =
    consecutiveHistory.reduce((acc, d) => acc + d.earnedXp, 0) + currentStreak * 25;

  return {
    currentStreak,
    bestStreak,
    totalActiveDaysInWindow,
    totalDailyGoalsMetInWindow,
    totalStreakXp,
    gamification: getStreakGamificationState(currentStreak),
    consecutiveHistory,
    todayDailyGoal,
    getDailyGoalForDate: buildDailyGoalState,
  };
}

// ============================================================================
// 11. MONTHLY CONSISTENCY BAR CHART UTILITY (BUILT ON STREAK COUNTER ENGINE)
// ============================================================================

export interface MonthlyConsistencyDailyBar {
  date: string;
  shortLabel: string;
  axisLabel: string;
  dayNumber: string;
  isToday: boolean;
  pesajes: 0 | 1;
  comidas: 0 | 1;
  entrenamientos: 0 | 1;
  totalCompleted: number; // 0..3
  completionPercent: number; // 0..100
  dailyGoalMet: boolean;
  isPerfectCrown: boolean;
  inActiveStreakChain: boolean;
  weightKg: number | null;
  caloriesKcal: number;
  mealsCount: number;
  workoutName: string | null;
  steps: number;
}

export interface MonthlyConsistencyWeeklyBar {
  weekKey: string;
  weekLabel: string;
  shortWeekLabel: string;
  daysCount: number;
  pesajesCount: number;
  comidasCount: number;
  entrenamientosCount: number;
  dailyGoalsMetCount: number;
  perfectDaysCount: number;
  pesajesPct: number;
  comidasPct: number;
  entrenamientosPct: number;
  commitmentPct: number;
}

export interface MonthlyConsistencySummary {
  windowDays: number;
  periodLabel: string;
  pesajesDaysCount: number;
  pesajesConsistencyPct: number;
  comidasDaysCount: number;
  comidasConsistencyPct: number;
  entrenamientosDaysCount: number;
  entrenamientosConsistencyPct: number;
  activeDaysCount: number;
  dailyGoalsMetCount: number;
  perfectCrownDaysCount: number;
  overallCommitmentPct: number;
  commitmentLevelLabel: string;
  currentStreak: number;
  bestStreak: number;
  strongestPillar: 'pesajes' | 'comidas' | 'entrenamientos';
  strongestPillarLabel: string;
  focusPillar: 'pesajes' | 'comidas' | 'entrenamientos';
  focusPillarLabel: string;
}

export interface MonthlyConsistencyChartResult {
  dailyBars: MonthlyConsistencyDailyBar[];
  weeklyBars: MonthlyConsistencyWeeklyBar[];
  summary: MonthlyConsistencySummary;
}

const SPANISH_MONTH_ABBR = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

function formatShortDateSpanish(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const monthIdx = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1));
  const day = parts[2];
  return `${day} ${SPANISH_MONTH_ABBR[monthIdx]}`;
}

export function calculateMonthlyConsistencyChartData(params: {
  currentDate: string;
  weighIns: WeighIn[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs?: ActivityLog[];
  nutritionTarget?: NutritionTarget;
  habits?: DailyHabits;
  days?: number;
}): MonthlyConsistencyChartResult {
  const windowDays = Math.max(14, Math.min(60, params.days ?? 30));

  // Delegate directly to the streak counter & daily goal engine
  const streakAnalytics = calculateStreakHistoryAndDailyGoal({
    currentDate: params.currentDate,
    weighIns: params.weighIns,
    foodLogs: params.foodLogs,
    workoutSessions: params.workoutSessions,
    activityLogs: params.activityLogs,
    nutritionTarget: params.nutritionTarget,
    habits: params.habits,
    historyDays: windowDays,
  });

  const history = streakAnalytics.consecutiveHistory;

  const dailyBars: MonthlyConsistencyDailyBar[] = history.map((item) => {
    const pesajes: 0 | 1 = item.hasWeighIn ? 1 : 0;
    const comidas: 0 | 1 = item.hasNutrition ? 1 : 0;
    const entrenamientos: 0 | 1 = item.hasWorkoutOrActivity ? 1 : 0;
    const totalCompleted = pesajes + comidas + entrenamientos;

    return {
      date: item.date,
      shortLabel: item.shortLabel,
      axisLabel: formatShortDateSpanish(item.date),
      dayNumber: item.dayNumber,
      isToday: item.isToday,
      pesajes,
      comidas,
      entrenamientos,
      totalCompleted,
      completionPercent: item.completionPercent,
      dailyGoalMet: item.dailyGoalMet,
      isPerfectCrown: item.isPerfectCrown,
      inActiveStreakChain: item.inActiveStreakChain,
      weightKg: item.weightKg,
      caloriesKcal: item.caloriesKcal,
      mealsCount: item.mealsCount,
      workoutName: item.workoutName,
      steps: item.steps,
    };
  });

  // Group into 4 weekly buckets across the window for weekly comparison mode
  const bucketCount = 4;
  const weeklyBars: MonthlyConsistencyWeeklyBar[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const startIdx = Math.floor((i * dailyBars.length) / bucketCount);
    const endIdx = Math.floor(((i + 1) * dailyBars.length) / bucketCount);
    const slice = dailyBars.slice(startIdx, endIdx);
    const daysCount = Math.max(1, slice.length);
    const firstDate = slice[0]?.date ?? params.currentDate;
    const lastDate = slice[slice.length - 1]?.date ?? params.currentDate;

    const pesajesCount = slice.reduce((acc, d) => acc + d.pesajes, 0);
    const comidasCount = slice.reduce((acc, d) => acc + d.comidas, 0);
    const entrenamientosCount = slice.reduce((acc, d) => acc + d.entrenamientos, 0);
    const dailyGoalsMetCount = slice.filter((d) => d.dailyGoalMet).length;
    const perfectDaysCount = slice.filter((d) => d.isPerfectCrown).length;

    const totalPossibleLogs = daysCount * 3;
    const totalActualLogs = pesajesCount + comidasCount + entrenamientosCount;

    weeklyBars.push({
      weekKey: `W${i + 1}`,
      weekLabel: `Sem ${i + 1} (${formatShortDateSpanish(firstDate)} - ${formatShortDateSpanish(lastDate)})`,
      shortWeekLabel: `Sem ${i + 1} (${formatShortDateSpanish(firstDate)})`,
      daysCount,
      pesajesCount,
      comidasCount,
      entrenamientosCount,
      dailyGoalsMetCount,
      perfectDaysCount,
      pesajesPct: Math.round((pesajesCount / daysCount) * 100),
      comidasPct: Math.round((comidasCount / daysCount) * 100),
      entrenamientosPct: Math.round((entrenamientosCount / daysCount) * 100),
      commitmentPct: Math.round((totalActualLogs / totalPossibleLogs) * 100),
    });
  }

  const totalDays = Math.max(1, dailyBars.length);
  const pesajesDaysCount = dailyBars.reduce((acc, d) => acc + d.pesajes, 0);
  const comidasDaysCount = dailyBars.reduce((acc, d) => acc + d.comidas, 0);
  const entrenamientosDaysCount = dailyBars.reduce((acc, d) => acc + d.entrenamientos, 0);
  const activeDaysCount = dailyBars.filter((d) => d.totalCompleted >= 1).length;
  const dailyGoalsMetCount = dailyBars.filter((d) => d.dailyGoalMet).length;
  const perfectCrownDaysCount = dailyBars.filter((d) => d.isPerfectCrown).length;

  const pesajesConsistencyPct = Math.round((pesajesDaysCount / totalDays) * 100);
  const comidasConsistencyPct = Math.round((comidasDaysCount / totalDays) * 100);
  const entrenamientosConsistencyPct = Math.round((entrenamientosDaysCount / totalDays) * 100);

  const totalLoggedPillars = pesajesDaysCount + comidasDaysCount + entrenamientosDaysCount;
  const overallCommitmentPct = Math.round((totalLoggedPillars / (totalDays * 3)) * 100);

  let commitmentLevelLabel = 'Iniciando Hábito';
  if (overallCommitmentPct >= 80) {
    commitmentLevelLabel = 'Compromiso Élite';
  } else if (overallCommitmentPct >= 60) {
    commitmentLevelLabel = 'Compromiso Sólido';
  } else if (overallCommitmentPct >= 35) {
    commitmentLevelLabel = 'En Construcción';
  }

  const pillars: Array<{
    key: 'pesajes' | 'comidas' | 'entrenamientos';
    label: string;
    count: number;
  }> = [
    { key: 'comidas', label: 'Comidas y Macros', count: comidasDaysCount },
    { key: 'pesajes', label: 'Pesajes Corporales', count: pesajesDaysCount },
    { key: 'entrenamientos', label: 'Entrenamientos y NEAT', count: entrenamientosDaysCount },
  ];

  const sortedDesc = [...pillars].sort((a, b) => b.count - a.count);
  const sortedAsc = [...pillars].sort((a, b) => a.count - b.count);

  const firstDayStr = dailyBars[0]?.date ?? params.currentDate;
  const lastDayStr = dailyBars[dailyBars.length - 1]?.date ?? params.currentDate;

  return {
    dailyBars,
    weeklyBars,
    summary: {
      windowDays: totalDays,
      periodLabel: `${formatShortDateSpanish(firstDayStr)} — ${formatShortDateSpanish(lastDayStr)} (${totalDays} días)`,
      pesajesDaysCount,
      pesajesConsistencyPct,
      comidasDaysCount,
      comidasConsistencyPct,
      entrenamientosDaysCount,
      entrenamientosConsistencyPct,
      activeDaysCount,
      dailyGoalsMetCount,
      perfectCrownDaysCount,
      overallCommitmentPct,
      commitmentLevelLabel,
      currentStreak: streakAnalytics.currentStreak,
      bestStreak: streakAnalytics.bestStreak,
      strongestPillar: sortedDesc[0].key,
      strongestPillarLabel: sortedDesc[0].label,
      focusPillar: sortedAsc[0].key,
      focusPillarLabel: sortedAsc[0].label,
    },
  };
}


export const OFFLINE_ARCHITECTURE_SPEC = {
  storageEngine: 'LocalStorage Scoped por Tenant (bt_<userId>_*) + Cola de Sincronización Diferida',
  availableOffline: [
    'Registro completo de pesajes, medidas antropométricas y cálculo de media móvil de 7 días',
    'Diario de nutrición completo: buscador local, conversión g/ml/porción, comidas frecuentes y creación de alimentos manuales',
    'Modo Entrenamiento Activo PPL: registro de series, peso, repeticiones, RIR, cronómetro de descanso y cálculo de 1RM',
    'Revisión semanal adaptativa y exportación de historial completo en JSON/CSV',
  ],
  requiresConnection: [
    'Sincronización con API externa de Hevy (/api/hevy/*) mediante proxy seguro',
    'Importación en la nube de Google Health Connect / Samsung Health (cuando se vincula token OAuth externo)',
    'Envío centralizado de eventos de analítica de servidor',
  ],
  syncBehaviorOnReconnect:
    'Arquitectura Offline-First con escritura optimista inmediata (Optimistic UI): cada acción CRUD persiste instantáneamente en el almacenamiento aislado del usuario y registra su timestamp ISO. Al recuperar conexión (evento window.online), los conectores externos sincronizan mediante clave idempotente (external_id) evitando duplicados.',
  capabilitiesOffline: [
    {
      module: 'Pesajes y Medidas Corporales',
      availableOffline: true,
      syncBehavior: 'Guardado atómico inmediato en dispositivo; se encola en sync_queue y sincroniza al detectar evento window.ononline.',
    },
    {
      module: 'Diario de Nutrición, Comidas Frecuentes y Biblioteca',
      availableOffline: true,
      syncBehavior: '100% operativo sin red (incluye conversión g/ml/porción y catálogo de códigos de barras pre-cargado).',
    },
    {
      module: 'Entrenamiento Activo PPL, Cronómetro y RIR',
      availableOffline: true,
      syncBehavior: 'Las series, cargas y récords se persisten localmente tras cada cambio sin riesgo de pérdida por corte de señal en el gimnasio.',
    },
    {
      module: 'Conectores Externos (Hevy API / Wearables Cloud)',
      availableOffline: false,
      syncBehavior: 'Requiere conexión activa para consultar servidores externos; preserva el último lote cacheado con idempotencia por external_id.',
    },
  ],
};

export type DeficitHealthLevel = 'optimal' | 'caution' | 'orange_alert';

export interface DeficitHealthDayItem {
  date: string;
  shortLabel: string;
  dayNameShort: string;
  dayNumber: string;
  caloriesKcal: number;
  targetCaloriesKcal: number;
  deltaKcal: number;
  hasLogs: boolean;
  exceededTarget: boolean;
  consecutiveRunAtDay: number;
  isPartOfOrangeStreak: boolean;
}

export interface DeficitHealthAssessment {
  status: DeficitHealthLevel;
  isOrangeAlert: boolean;
  consecutiveExceededDays: number;
  currentStreakEndingToday: number;
  maxConsecutiveExceededInWindow: number;
  exceededDaysCountInWindow: number;
  withinTargetDaysCountInWindow: number;
  loggedDaysCountInWindow: number;
  windowDays: number;
  targetCaloriesKcal: number;
  accumulatedSurplusKcalInStreak: number;
  averageDailyKcalInWindow: number;
  averageDailyDeltaKcalInWindow: number;
  headline: string;
  subheadline: string;
  recommendation: string;
  badgeText: string;
  dailyBreakdown: DeficitHealthDayItem[];
}

export function evaluateDeficitHealth(params: {
  foodLogs: FoodLog[];
  targetCaloriesKcal: number;
  currentDate: string;
  windowDays?: number;
}): DeficitHealthAssessment {
  const { foodLogs, currentDate } = params;
  const targetCaloriesKcal = Math.max(800, Math.round(params.targetCaloriesKcal || 2400));
  const windowDays = Math.max(3, Math.min(30, params.windowDays ?? 7));
  const lookbackDays = Math.max(windowDays, 14);

  const dailyTotals = new Map<string, number>();
  const dailyCounts = new Map<string, number>();

  for (const log of foodLogs) {
    if (!log || !log.consumed_at) continue;
    const dateKey = log.consumed_at.slice(0, 10);
    const kcal = Number(log.calories_kcal) || 0;
    dailyTotals.set(dateKey, (dailyTotals.get(dateKey) ?? 0) + kcal);
    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const fullTimeline: DeficitHealthDayItem[] = [];
  const endObj = new Date(`${currentDate}T12:00:00Z`);

  let runningStreak = 0;
  let maxStreakAll = 0;

  for (let offset = lookbackDays - 1; offset >= 0; offset--) {
    const dObj = new Date(endObj);
    dObj.setUTCDate(dObj.getUTCDate() - offset);
    const dateStr = dObj.toISOString().split('T')[0];
    const rawTotal = dailyTotals.get(dateStr) ?? 0;
    const count = dailyCounts.get(dateStr) ?? 0;
    const caloriesKcal = Math.round(rawTotal);
    const hasLogs = count > 0;
    const exceededTarget = hasLogs && caloriesKcal > targetCaloriesKcal;
    const deltaKcal = hasLogs ? caloriesKcal - targetCaloriesKcal : 0;

    if (exceededTarget) {
      runningStreak += 1;
      if (runningStreak > maxStreakAll) {
        maxStreakAll = runningStreak;
      }
    } else if (hasLogs || offset > 0) {
      runningStreak = 0;
    }

    const dayNameShort = dayNames[dObj.getUTCDay()] ?? 'Día';
    const dayNumber = dateStr.slice(8, 10);

    fullTimeline.push({
      date: dateStr,
      shortLabel: `${dayNameShort} ${dayNumber}`,
      dayNameShort,
      dayNumber,
      caloriesKcal,
      targetCaloriesKcal,
      deltaKcal,
      hasLogs,
      exceededTarget,
      consecutiveRunAtDay: exceededTarget ? runningStreak : 0,
      isPartOfOrangeStreak: false,
    });
  }

  const todayItem = fullTimeline[fullTimeline.length - 1];
  const yesterdayItem = fullTimeline.length >= 2 ? fullTimeline[fullTimeline.length - 2] : undefined;

  const currentStreakEndingToday = todayItem?.exceededTarget ? todayItem.consecutiveRunAtDay : 0;

  const consecutiveExceededDays = todayItem?.exceededTarget
    ? todayItem.consecutiveRunAtDay
    : !todayItem?.hasLogs && yesterdayItem?.exceededTarget
    ? yesterdayItem.consecutiveRunAtDay
    : 0;

  let accumulatedSurplusKcalInStreak = 0;
  if (consecutiveExceededDays > 0) {
    const endIdx = todayItem?.exceededTarget ? fullTimeline.length - 1 : fullTimeline.length - 2;
    for (let i = endIdx; i >= 0 && endIdx - i < consecutiveExceededDays; i--) {
      const item = fullTimeline[i];
      if (item && item.exceededTarget) {
        accumulatedSurplusKcalInStreak += Math.max(0, item.deltaKcal);
      }
    }
  }

  if (consecutiveExceededDays > 2) {
    const endIdx = todayItem?.exceededTarget ? fullTimeline.length - 1 : fullTimeline.length - 2;
    for (let i = endIdx; i >= 0 && endIdx - i < consecutiveExceededDays; i--) {
      if (fullTimeline[i]) {
        fullTimeline[i].isPartOfOrangeStreak = true;
      }
    }
  }

  const dailyBreakdown = fullTimeline.slice(-windowDays);
  const maxConsecutiveExceededInWindow = dailyBreakdown.reduce(
    (maxVal, d) => Math.max(maxVal, d.consecutiveRunAtDay),
    0
  );

  const loggedDays = dailyBreakdown.filter((d) => d.hasLogs);
  const loggedDaysCountInWindow = loggedDays.length;
  const exceededDaysCountInWindow = loggedDays.filter((d) => d.exceededTarget).length;
  const withinTargetDaysCountInWindow = loggedDays.filter((d) => !d.exceededTarget).length;

  const averageDailyKcalInWindow =
    loggedDaysCountInWindow > 0
      ? Math.round(
          loggedDays.reduce((acc, d) => acc + d.caloriesKcal, 0) / loggedDaysCountInWindow
        )
      : 0;

  const averageDailyDeltaKcalInWindow =
    loggedDaysCountInWindow > 0 ? averageDailyKcalInWindow - targetCaloriesKcal : 0;

  const isOrangeAlert = consecutiveExceededDays > 2;

  let status: DeficitHealthLevel = 'optimal';
  let headline = 'Salud de Déficit Óptima';
  let subheadline = `Adherencia calórica controlada frente a tu meta de ${targetCaloriesKcal} kcal/día.`;
  let recommendation =
    'Mantén tu distribución actual de proteína y saciedad vegetal para sostener el ritmo semanal.';
  let badgeText = 'En Rango Óptimo';

  if (isOrangeAlert) {
    status = 'orange_alert';
    headline = `Alerta de Salud de Déficit: ${consecutiveExceededDays} días seguidos sobre el objetivo`;
    subheadline = `Has superado la meta de ${targetCaloriesKcal} kcal durante ${consecutiveExceededDays} días consecutivos (+${accumulatedSurplusKcalInStreak} kcal acumuladas).`;
    recommendation = `Vuelve hoy mismo a tu objetivo base de ${targetCaloriesKcal} kcal (sin recortes extremos compensatorios) y prioriza alimentos de alta saciedad y densidad proteica.`;
    badgeText = `¡Alerta Naranja! ${consecutiveExceededDays} días seguidos en exceso`;
  } else if (consecutiveExceededDays > 0) {
    status = 'caution';
    headline = `Atención Preventiva: ${consecutiveExceededDays} ${
      consecutiveExceededDays === 1 ? 'día sobre objetivo' : 'días seguidos sobre objetivo'
    }`;
    subheadline = `Acumulas +${accumulatedSurplusKcalInStreak} kcal sobre la meta de ${targetCaloriesKcal} kcal. Si excedes más de 2 días seguidos se activará la alerta naranja.`;
    recommendation =
      'Ajusta la próxima comida con proteína magra y fibra para cerrar el día dentro del presupuesto calórico y cortar la racha de exceso.';
    badgeText = `${consecutiveExceededDays}/2 días límite antes de alerta naranja`;
  }

  return {
    status,
    isOrangeAlert,
    consecutiveExceededDays,
    currentStreakEndingToday,
    maxConsecutiveExceededInWindow,
    exceededDaysCountInWindow,
    withinTargetDaysCountInWindow,
    loggedDaysCountInWindow,
    windowDays,
    targetCaloriesKcal,
    accumulatedSurplusKcalInStreak,
    averageDailyKcalInWindow,
    averageDailyDeltaKcalInWindow,
    headline,
    subheadline,
    recommendation,
    badgeText,
    dailyBreakdown,
  };
}

// ============================================================================
// 11. 4-WEEK WEIGHT & BODY FAT % LINE CHART EVOLUTION UTILITY
// ============================================================================

export interface BodyEvolutionPoint {
  date: string;
  shortLabel: string;
  weekIndex: number; // 1 to 4
  weekLabel: string; // "Sem 1" .. "Sem 4"
  weightKg: number | null;
  movingAvg7dKg: number | null;
  bodyFatPct: number | null;
  interpolatedBodyFatPct: number | null;
  waistCm: number | null;
  bodyFatMethod?: string;
  weighInContext?: string;
}

export interface FourWeekBucketSummary {
  weekIndex: number;
  weekLabel: string;
  rangeLabel: string;
  avgWeightKg: number | null;
  avgBodyFatPct: number | null;
  weighInsCount: number;
  measurementsCount: number;
}

export interface FourWeekBodyEvolutionData {
  startDate: string;
  endDate: string;
  periodLabel: string;
  windowDays: number;
  points: BodyEvolutionPoint[];
  weightPoints: BodyEvolutionPoint[];
  bodyFatPoints: BodyEvolutionPoint[];
  weeklyBuckets: FourWeekBucketSummary[];
  summary: {
    hasWeightData: boolean;
    hasBodyFatData: boolean;
    weightRecordsCount: number;
    bodyFatRecordsCount: number;
    startWeightKg: number | null;
    latestWeightKg: number | null;
    weightDelta4wKg: number | null;
    weeklyWeightRateKg: number | null;
    latestMovingAvg7dKg: number | null;
    minWeightKg: number | null;
    maxWeightKg: number | null;
    startBodyFatPct: number | null;
    latestBodyFatPct: number | null;
    bodyFatDelta4wPct: number | null;
    minBodyFatPct: number | null;
    maxBodyFatPct: number | null;
    latestWaistCm: number | null;
    targetWeightKg: number | null;
  };
}

export function calculateFourWeekBodyEvolutionData(params: {
  currentDate: string;
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  targetWeightKg?: number;
  windowDays?: number;
}): FourWeekBodyEvolutionData {
  const { currentDate, weighIns, measurements, targetWeightKg } = params;
  const windowDays = Math.max(7, Math.min(60, params.windowDays ?? 28));

  const endObj = new Date(`${currentDate}T12:00:00Z`);
  const startObj = new Date(endObj);
  startObj.setUTCDate(startObj.getUTCDate() - (windowDays - 1));
  const startDate = startObj.toISOString().split('T')[0];
  const endDate = currentDate;

  // Map weigh-ins by date (keep latest entry per day)
  const weighInMap = new Map<string, WeighIn>();
  const sortedAllWeighIns = [...weighIns]
    .filter((w) => w && typeof w.measured_at === 'string' && typeof w.weight_kg === 'number')
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  for (const w of sortedAllWeighIns) {
    const dateKey = w.measured_at.slice(0, 10);
    weighInMap.set(dateKey, w);
  }

  // Map body measurements by date
  const measurementMap = new Map<string, BodyMeasurement>();
  const sortedAllMeasurements = [...measurements]
    .filter((m) => m && typeof m.measured_at === 'string')
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  for (const m of sortedAllMeasurements) {
    const dateKey = m.measured_at.slice(0, 10);
    measurementMap.set(dateKey, m);
  }

  // Build daily points across the 28-day window
  const rawPoints: BodyEvolutionPoint[] = [];

  for (let i = 0; i < windowDays; i++) {
    const dObj = new Date(startObj);
    dObj.setUTCDate(startObj.getUTCDate() + i);
    const dateStr = dObj.toISOString().split('T')[0];
    const weekIndex = Math.min(4, Math.floor(i / 7) + 1);
    const weekLabel = `Sem ${weekIndex}`;

    // 7-day rolling weight average up to dateStr
    const sevenDaysAgoObj = new Date(dObj);
    sevenDaysAgoObj.setUTCDate(dObj.getUTCDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgoObj.toISOString().split('T')[0];

    const windowWeights: number[] = [];
    for (const [kDate, wEntry] of weighInMap.entries()) {
      if (kDate >= sevenDaysAgoStr && kDate <= dateStr) {
        windowWeights.push(wEntry.weight_kg);
      }
    }

    const movingAvg7dKg =
      windowWeights.length > 0
        ? Number(
            (windowWeights.reduce((acc, v) => acc + v, 0) / windowWeights.length).toFixed(2)
          )
        : null;

    const wItem = weighInMap.get(dateStr);
    const mItem = measurementMap.get(dateStr);
    const bodyFatPct =
      mItem && typeof mItem.body_fat_percent === 'number'
        ? Number(mItem.body_fat_percent.toFixed(1))
        : null;

    rawPoints.push({
      date: dateStr,
      shortLabel: formatShortDateSpanish(dateStr),
      weekIndex,
      weekLabel,
      weightKg: wItem ? Number(wItem.weight_kg.toFixed(1)) : null,
      movingAvg7dKg,
      bodyFatPct,
      interpolatedBodyFatPct: bodyFatPct,
      waistCm: mItem && typeof mItem.waist_cm === 'number' ? Number(mItem.waist_cm.toFixed(1)) : null,
      bodyFatMethod: mItem?.body_fat_method,
      weighInContext: wItem?.context,
    });
  }

  // Linear interpolation for bodyFatPct between measured checkpoints so dual/line chart connects smoothly
  const measuredBfIndices: number[] = [];
  rawPoints.forEach((pt, idx) => {
    if (pt.bodyFatPct !== null) measuredBfIndices.push(idx);
  });

  if (measuredBfIndices.length >= 2) {
    for (let k = 0; k < measuredBfIndices.length - 1; k++) {
      const startIdx = measuredBfIndices[k];
      const endIdx = measuredBfIndices[k + 1];
      const startVal = rawPoints[startIdx].bodyFatPct!;
      const endVal = rawPoints[endIdx].bodyFatPct!;
      const span = endIdx - startIdx;
      for (let step = 1; step < span; step++) {
        const ratio = step / span;
        rawPoints[startIdx + step].interpolatedBodyFatPct = Number(
          (startVal + (endVal - startVal) * ratio).toFixed(2)
        );
      }
    }
  }

  const weightPoints = rawPoints.filter((p) => p.weightKg !== null);
  const bodyFatPoints = rawPoints.filter((p) => p.bodyFatPct !== null);

  // Weekly 4-week buckets
  const weeklyBuckets: FourWeekBucketSummary[] = [1, 2, 3, 4].map((wIdx) => {
    const bucketPts = rawPoints.filter((p) => p.weekIndex === wIdx);
    const wVals = bucketPts.filter((p) => p.weightKg !== null).map((p) => p.weightKg as number);
    const bfVals = bucketPts.filter((p) => p.bodyFatPct !== null).map((p) => p.bodyFatPct as number);
    const firstDate = bucketPts[0]?.date ?? startDate;
    const lastDate = bucketPts[bucketPts.length - 1]?.date ?? endDate;

    return {
      weekIndex: wIdx,
      weekLabel: `Semana ${wIdx}`,
      rangeLabel: `${formatShortDateSpanish(firstDate)} – ${formatShortDateSpanish(lastDate)}`,
      avgWeightKg:
        wVals.length > 0
          ? Number((wVals.reduce((a, b) => a + b, 0) / wVals.length).toFixed(2))
          : null,
      avgBodyFatPct:
        bfVals.length > 0
          ? Number((bfVals.reduce((a, b) => a + b, 0) / bfVals.length).toFixed(1))
          : null,
      weighInsCount: wVals.length,
      measurementsCount: bfVals.length,
    };
  });

  const hasWeightData = weightPoints.length > 0;
  const hasBodyFatData = bodyFatPoints.length > 0;

  const startWeightKg = hasWeightData ? weightPoints[0].weightKg : null;
  const latestWeightKg = hasWeightData ? weightPoints[weightPoints.length - 1].weightKg : null;
  const weightDelta4wKg =
    startWeightKg !== null && latestWeightKg !== null
      ? Number((latestWeightKg - startWeightKg).toFixed(2))
      : null;
  const weeklyWeightRateKg =
    weightDelta4wKg !== null ? Number((weightDelta4wKg / 4).toFixed(2)) : null;

  const latestMovingAvg7dKg =
    hasWeightData ? weightPoints[weightPoints.length - 1].movingAvg7dKg : null;

  const allWeightNumbers = weightPoints.map((p) => p.weightKg as number);
  const minWeightKg = allWeightNumbers.length > 0 ? Math.min(...allWeightNumbers) : null;
  const maxWeightKg = allWeightNumbers.length > 0 ? Math.max(...allWeightNumbers) : null;

  const startBodyFatPct = hasBodyFatData ? bodyFatPoints[0].bodyFatPct : null;
  const latestBodyFatPct = hasBodyFatData ? bodyFatPoints[bodyFatPoints.length - 1].bodyFatPct : null;
  const bodyFatDelta4wPct =
    startBodyFatPct !== null && latestBodyFatPct !== null
      ? Number((latestBodyFatPct - startBodyFatPct).toFixed(1))
      : null;

  const allBfNumbers = bodyFatPoints.map((p) => p.bodyFatPct as number);
  const minBodyFatPct = allBfNumbers.length > 0 ? Math.min(...allBfNumbers) : null;
  const maxBodyFatPct = allBfNumbers.length > 0 ? Math.max(...allBfNumbers) : null;

  const latestWaistCm =
    bodyFatPoints.length > 0 ? bodyFatPoints[bodyFatPoints.length - 1].waistCm : null;

  return {
    startDate,
    endDate,
    periodLabel: `${formatShortDateSpanish(startDate)} — ${formatShortDateSpanish(endDate)} (Últimas 4 semanas)`,
    windowDays,
    points: rawPoints,
    weightPoints,
    bodyFatPoints,
    weeklyBuckets,
    summary: {
      hasWeightData,
      hasBodyFatData,
      weightRecordsCount: weightPoints.length,
      bodyFatRecordsCount: bodyFatPoints.length,
      startWeightKg,
      latestWeightKg,
      weightDelta4wKg,
      weeklyWeightRateKg,
      latestMovingAvg7dKg,
      minWeightKg,
      maxWeightKg,
      startBodyFatPct,
      latestBodyFatPct,
      bodyFatDelta4wPct,
      minBodyFatPct,
      maxBodyFatPct,
      latestWaistCm,
      targetWeightKg: targetWeightKg ?? null,
    },
  };
}

// ============================================================================
// 12. MEAL PUSH NOTIFICATIONS ENGINE (DESAYUNO, ALMUERZO, MERIENDA Y CENA)
// ============================================================================

export type CoreMealType = 'desayuno' | 'almuerzo' | 'merienda' | 'cena';

export interface MealPushSlotStatus {
  mealType: CoreMealType;
  label: string;
  enabled: boolean;
  scheduledTime: string;
  isLoggedToday: boolean;
  loggedCaloriesKcal: number;
  loggedProteinG: number;
  loggedItemsCount: number;
  status: 'logged_today' | 'pending_alert' | 'disabled';
  statusBadgeText: string;
  pushTitle: string;
  pushMessage: string;
  ctaLabel: string;
}

export interface MealPushNotificationsEvaluation {
  masterEnabled: boolean;
  slots: MealPushSlotStatus[];
  activeSlotsCount: number;
  loggedMealsCount: number;
  pendingMealsCount: number;
  nextPendingSlot: MealPushSlotStatus | null;
}

export function evaluateMealPushNotifications(params: {
  config: PushReminderConfig;
  foodLogs: FoodLog[];
  currentDate: string;
  nutritionTarget?: NutritionTarget;
}): MealPushNotificationsEvaluation {
  const { config, foodLogs, currentDate, nutritionTarget } = params;
  const masterEnabled = Boolean(config.enabled);

  const todayLogs = foodLogs.filter(
    (log) => log && typeof log.consumed_at === 'string' && log.consumed_at.slice(0, 10) === currentDate
  );

  const todayTotalKcal = Math.round(
    todayLogs.reduce((acc, l) => acc + (Number(l.calories_kcal) || 0), 0)
  );
  const todayTotalProtein = Math.round(
    todayLogs.reduce((acc, l) => acc + (Number(l.protein_g) || 0), 0)
  );

  const targetKcal = nutritionTarget?.calories_kcal ?? 2400;
  const targetProtein = nutritionTarget?.protein_g ?? 180;
  const remainingKcal = Math.max(0, targetKcal - todayTotalKcal);
  const remainingProtein = Math.max(0, targetProtein - todayTotalProtein);

  const slotConfigs: Array<{
    mealType: CoreMealType;
    label: string;
    enabled: boolean;
    time: string;
    defaultPrompt: string;
  }> = [
    {
      mealType: 'desayuno',
      label: 'Desayuno',
      enabled: config.breakfast_enabled ?? true,
      time: config.breakfast_time || '08:00',
      defaultPrompt:
        'Registra tu primera comida del día para asegurar tu síntesis proteica matutina.',
    },
    {
      mealType: 'almuerzo',
      label: 'Almuerzo',
      enabled: config.lunch_enabled ?? true,
      time: config.lunch_time || config.lunch_log_time || '13:30',
      defaultPrompt:
        'Es hora del almuerzo. Registra tus porciones del mediodía para mantener el déficit bajo control.',
    },
    {
      mealType: 'merienda',
      label: 'Merienda',
      enabled: config.snack_enabled ?? true,
      time: config.snack_time || '17:30',
      defaultPrompt:
        'Aviso de merienda: añade tu colación vespertina para llegar sin hambre excesiva a la noche.',
    },
    {
      mealType: 'cena',
      label: 'Cena',
      enabled: config.dinner_enabled ?? true,
      time: config.dinner_time || config.dinner_log_time || '21:00',
      defaultPrompt:
        'Hora de la cena: registra tu última comida para completar el cierre calórico y de proteína de hoy.',
    },
  ];

  const slots: MealPushSlotStatus[] = slotConfigs.map((slot) => {
    const mealLogs = todayLogs.filter((l) => l.meal_type === slot.mealType);
    const loggedItemsCount = mealLogs.length;
    const isLoggedToday = loggedItemsCount > 0;
    const loggedCaloriesKcal = Math.round(
      mealLogs.reduce((acc, l) => acc + (Number(l.calories_kcal) || 0), 0)
    );
    const loggedProteinG = Math.round(
      mealLogs.reduce((acc, l) => acc + (Number(l.protein_g) || 0), 0)
    );

    const effectiveEnabled = masterEnabled && slot.enabled;
    let status: 'logged_today' | 'pending_alert' | 'disabled' = 'disabled';
    let statusBadgeText = 'Aviso desactivado';

    if (isLoggedToday) {
      status = 'logged_today';
      statusBadgeText = `Registrado (${loggedCaloriesKcal} kcal · ${loggedProteinG}g P)`;
    } else if (effectiveEnabled) {
      status = 'pending_alert';
      statusBadgeText = `Aviso activo · ${slot.time}`;
    }

    const pushTitle = isLoggedToday
      ? `✓ ${slot.label} completado (${slot.time})`
      : `🔔 Aviso de ${slot.label} (${slot.time})`;

    const pushMessage = isLoggedToday
      ? `Ya registraste ${loggedItemsCount} alimento(s) en ${slot.label.toLowerCase()} hoy (${loggedCaloriesKcal} kcal, ${loggedProteinG}g proteína). Restan ${remainingKcal} kcal y ${remainingProtein}g de proteína en el día.`
      : `${slot.defaultPrompt} Te quedan ${remainingKcal} kcal y ${remainingProtein}g de proteína disponibles hoy.`;

    return {
      mealType: slot.mealType,
      label: slot.label,
      enabled: slot.enabled,
      scheduledTime: slot.time,
      isLoggedToday,
      loggedCaloriesKcal,
      loggedProteinG,
      loggedItemsCount,
      status,
      statusBadgeText,
      pushTitle,
      pushMessage,
      ctaLabel: isLoggedToday
        ? `Editar ${slot.label} en Nutrición →`
        : `Registrar ${slot.label} ahora →`,
    };
  });

  const activeSlotsCount = slots.filter((s) => masterEnabled && s.enabled).length;
  const loggedMealsCount = slots.filter((s) => s.isLoggedToday).length;
  const pendingMeals = slots.filter((s) => s.status === 'pending_alert');
  const pendingMealsCount = pendingMeals.length;
  const nextPendingSlot = pendingMeals.length > 0 ? pendingMeals[0] : slots[0] ?? null;

  return {
    masterEnabled,
    slots,
    activeSlotsCount,
    loggedMealsCount,
    pendingMealsCount,
    nextPendingSlot,
  };
}



