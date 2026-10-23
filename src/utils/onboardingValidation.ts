/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoalType, UnitSystem } from '../types';

export interface UnitOption {
  id: UnitSystem;
  label: string;
  shortLabel: string;
  description: string;
}

export interface PrimaryGoalOption {
  id: GoalType;
  label: string;
  description: string;
  recommendedRatePercent: number;
}

export const ONBOARDING_UNIT_OPTIONS: UnitOption[] = [
  {
    id: 'metric',
    label: 'Sistema Métrico (kg / cm)',
    shortLabel: 'kg / cm',
    description: 'Kilogramos para peso corporal y cargas de gimnasio; centímetros para estatura y cintura.',
  },
  {
    id: 'imperial',
    label: 'Sistema Imperial (lb / in)',
    shortLabel: 'lb / in',
    description: 'Libras para peso corporal y cargas de barra; pulgadas para perímetros corporales.',
  },
];

export const ONBOARDING_GOAL_OPTIONS: PrimaryGoalOption[] = [
  {
    id: 'recomp',
    label: 'Recomposición Corporal',
    description: 'Reducir grasa corporal mientras mantienes o aumentas masa muscular y fuerza en básicos.',
    recommendedRatePercent: 0.5,
  },
  {
    id: 'fat_loss',
    label: 'Pérdida de Grasa (Definición)',
    description: 'Déficit calórico sostenido con alta ingesta proteica para preservar tejido magro.',
    recommendedRatePercent: 0.7,
  },
  {
    id: 'muscle_gain',
    label: 'Aumento de Masa Muscular (Superávit Calórico)',
    description: 'Superávit calórico controlado (+250 a +350 kcal/día) enfocado en hipertrofia y sobrecarga progresiva PPL.',
    recommendedRatePercent: 0.35,
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento y Rendimiento Atlético',
    description: 'Equilibrio energético normocalórico priorizando recuperación y marcas de fuerza.',
    recommendedRatePercent: 0.2,
  },
];

export interface OnboardingValidationInput {
  userName?: string | null;
  unitOfMeasure?: string | null;
  primaryGoal?: string | null;
  acceptedTerms?: boolean;
  acceptedPrivacy?: boolean;
}

export interface OnboardingValidationResult {
  canFinish: boolean;
  canProceedSelection: boolean;
  isUnitSelected: boolean;
  isGoalSelected: boolean;
  areTermsAccepted: boolean;
  formattedDisplayName: string;
  welcomeMessage: string;
  welcomeSubtitle: string;
  errors: {
    unitOfMeasure?: string;
    primaryGoal?: string;
    terms?: string;
  };
  summaryMessage: string | null;
}

const VALID_UNIT_IDS = new Set<string>(['metric', 'imperial']);
const VALID_GOAL_IDS = new Set<string>(['recomp', 'fat_loss', 'muscle_gain', 'maintenance']);

/**
 * Formats a personalized welcome greeting using the user's name.
 */
export function formatWelcomeGreeting(
  rawName?: string | null,
  fallbackName: string = 'Santiago Quinteros'
): {
  displayName: string;
  welcomeMessage: string;
  welcomeSubtitle: string;
} {
  const cleaned = typeof rawName === 'string' ? rawName.trim() : '';
  const displayName = cleaned.length > 0 ? cleaned : fallbackName;

  return {
    displayName,
    welcomeMessage: `¡Bienvenido, ${displayName}!`,
    welcomeSubtitle: `Hola ${displayName}, configura tus unidades de medida y tu objetivo principal para personalizar tu experiencia en BodyTrack Pro.`,
  };
}

/**
 * Validates that the user has selected at least one valid unit of measurement
 * and one primary goal (plus terms acceptance when finalizing) before allowing
 * OnboardingWizard completion.
 */
export function validateOnboardingCompletion(
  input: OnboardingValidationInput
): OnboardingValidationResult {
  const { displayName, welcomeMessage, welcomeSubtitle } = formatWelcomeGreeting(input.userName);

  const unitVal = typeof input.unitOfMeasure === 'string' ? input.unitOfMeasure.trim() : '';
  const goalVal = typeof input.primaryGoal === 'string' ? input.primaryGoal.trim() : '';

  const isUnitSelected = VALID_UNIT_IDS.has(unitVal);
  const isGoalSelected = VALID_GOAL_IDS.has(goalVal);
  const areTermsAccepted = Boolean(input.acceptedTerms && input.acceptedPrivacy);

  const errors: OnboardingValidationResult['errors'] = {};

  if (!isUnitSelected) {
    errors.unitOfMeasure =
      'Debes seleccionar al menos una unidad de medida (Sistema Métrico kg/cm o Imperial lb/in).';
  }

  if (!isGoalSelected) {
    errors.primaryGoal =
      'Debes seleccionar un objetivo principal (Recomposición, Pérdida de Grasa, Ganancia Muscular o Mantenimiento).';
  }

  if (!areTermsAccepted) {
    errors.terms =
      'Debes aceptar las condiciones de uso de la beta y la política de privacidad para finalizar.';
  }

  let summaryMessage: string | null = null;
  if (!isUnitSelected && !isGoalSelected) {
    summaryMessage =
      'Requisito pendiente: Selecciona al menos una unidad de medida y un objetivo principal antes de finalizar el proceso.';
  } else if (!isUnitSelected) {
    summaryMessage =
      'Requisito pendiente: Selecciona al menos una unidad de medida antes de finalizar el proceso.';
  } else if (!isGoalSelected) {
    summaryMessage =
      'Requisito pendiente: Selecciona un objetivo principal antes de finalizar el proceso.';
  } else if (!areTermsAccepted) {
    summaryMessage =
      'Requisito pendiente: Acepta las condiciones de la beta y la política de privacidad para activar tu cuenta.';
  }

  return {
    canFinish: isUnitSelected && isGoalSelected && areTermsAccepted,
    canProceedSelection: isUnitSelected && isGoalSelected,
    isUnitSelected,
    isGoalSelected,
    areTermsAccepted,
    formattedDisplayName: displayName,
    welcomeMessage,
    welcomeSubtitle,
    errors,
    summaryMessage,
  };
}

export function getUnitLabel(unit?: UnitSystem | string | null): string {
  const found = ONBOARDING_UNIT_OPTIONS.find((u) => u.id === unit);
  return found ? found.label : 'Sin seleccionar';
}

export function getGoalLabel(goal?: GoalType | string | null): string {
  const found = ONBOARDING_GOAL_OPTIONS.find((g) => g.id === goal);
  return found ? found.label : 'Sin seleccionar';
}
