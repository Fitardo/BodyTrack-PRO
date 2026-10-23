/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  PhysicalGoal,
  NutritionTarget,
  WeighIn,
  BodyMeasurement,
  FoodLog,
  WorkoutSession,
  ActivityLog,
  RecoveryLog,
  WeeklyReview,
  DailyHabits,
} from '../types';
import {
  INITIAL_USER_PROFILE,
  INITIAL_PHYSICAL_GOAL,
  INITIAL_NUTRITION_TARGET,
  SEED_WEIGH_INS,
  SEED_BODY_MEASUREMENTS,
  SEED_FOOD_LOGS_TODAY,
  SEED_WORKOUT_SESSION,
  SEED_ACTIVITY_LOGS,
  SEED_RECOVERY_LOGS,
  SEED_WEEKLY_REVIEWS,
  SEED_HABITS,
} from './seedData';

export type WorkspaceInitMode = 'demo' | 'zero';

export interface WorkspaceDataset {
  mode: WorkspaceInitMode;
  onboardingRequired: boolean;
  profile: UserProfile;
  goal: PhysicalGoal;
  nutritionTarget: NutritionTarget;
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  recoveryLogs: RecoveryLog[];
  weeklyReviews: WeeklyReview[];
  habitsByDate: Record<string, DailyHabits>;
}

/**
 * Builds either a complete Demo dataset ("Datos de Prueba") or a Clean Slate dataset ("Empezar de 0").
 */
export function buildWorkspaceDataset(
  mode: WorkspaceInitMode,
  userName?: string | null
): WorkspaceDataset {
  const cleanName =
    typeof userName === 'string' && userName.trim().length > 0
      ? userName.trim()
      : INITIAL_USER_PROFILE.name || 'Santiago Quinteros';

  if (mode === 'zero') {
    return {
      mode: 'zero',
      onboardingRequired: true,
      profile: {
        ...structuredClone(INITIAL_USER_PROFILE),
        name: cleanName,
        initial_weight_kg: 80.0,
        updated_at: new Date().toISOString(),
      },
      goal: {
        ...structuredClone(INITIAL_PHYSICAL_GOAL),
        target_weight_kg: 75.0,
        weekly_rate_percent: 0.5,
      },
      nutritionTarget: {
        ...structuredClone(INITIAL_NUTRITION_TARGET),
      },
      weighIns: [],
      measurements: [],
      foodLogs: [],
      workoutSessions: [],
      activityLogs: [],
      recoveryLogs: [],
      weeklyReviews: [],
      habitsByDate: {},
    };
  }

  return {
    mode: 'demo',
    onboardingRequired: false,
    profile: {
      ...structuredClone(INITIAL_USER_PROFILE),
      name: cleanName,
      updated_at: new Date().toISOString(),
    },
    goal: structuredClone(INITIAL_PHYSICAL_GOAL),
    nutritionTarget: structuredClone(INITIAL_NUTRITION_TARGET),
    weighIns: structuredClone(SEED_WEIGH_INS),
    measurements: structuredClone(SEED_BODY_MEASUREMENTS),
    foodLogs: structuredClone(SEED_FOOD_LOGS_TODAY),
    workoutSessions: [structuredClone(SEED_WORKOUT_SESSION)],
    activityLogs: structuredClone(SEED_ACTIVITY_LOGS),
    recoveryLogs: structuredClone(SEED_RECOVERY_LOGS),
    weeklyReviews: structuredClone(SEED_WEEKLY_REVIEWS),
    habitsByDate: {
      '2026-10-22': structuredClone(SEED_HABITS),
    },
  };
}

export interface AuthFormValidationInput {
  authTab: 'login' | 'register';
  email: string;
  password: string;
  name?: string;
}

export interface AuthFormValidationResult {
  valid: boolean;
  error?: string;
  normalizedEmail: string;
  normalizedName: string;
}

/**
 * Validates Login and Sign Up inputs on the full-screen AuthScreen.
 */
export function validateAuthScreenInput(
  input: AuthFormValidationInput
): AuthFormValidationResult {
  const normalizedEmail = (input.email || '').trim().toLowerCase();
  const normalizedName =
    (input.name || '').trim() ||
    (normalizedEmail.includes('@') ? normalizedEmail.split('@')[0] : 'Santiago Quinteros');

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return {
      valid: false,
      error: 'Ingresa un correo electrónico válido (ej. santiago@bodytrack.pro).',
      normalizedEmail,
      normalizedName,
    };
  }

  if (!input.password || input.password.trim().length < 6) {
    return {
      valid: false,
      error: 'La contraseña debe tener al menos 6 caracteres.',
      normalizedEmail,
      normalizedName,
    };
  }

  if (input.authTab === 'register' && (!input.name || input.name.trim().length < 2)) {
    return {
      valid: false,
      error: 'Ingresa tu nombre o alias para crear tu cuenta.',
      normalizedEmail,
      normalizedName,
    };
  }

  return {
    valid: true,
    normalizedEmail,
    normalizedName,
  };
}
