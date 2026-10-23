/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  UserProfile,
  PhysicalGoal,
  NutritionTarget,
  Food,
  FoodLog,
  Exercise,
  WorkoutRoutine,
  WorkoutSession,
  WeighIn,
  BodyMeasurement,
  ActivityLog,
  RecoveryLog,
  ProgressPhoto,
  WeeklyReview,
  DailyHabits,
  FrequentMeal,
  PushReminderConfig,
} from '../types';
import {
  DEFAULT_FREQUENT_MEALS,
  BARCODE_PRODUCTS_DB,
} from '../utils/auditAndRetentionUtils';
import {
  INITIAL_USER_PROFILE,
  INITIAL_PHYSICAL_GOAL,
  INITIAL_NUTRITION_TARGET,
  DEFAULT_FOODS,
  DEFAULT_EXERCISES,
  DEFAULT_ROUTINES,
  SEED_WEIGH_INS,
  SEED_BODY_MEASUREMENTS,
  SEED_FOOD_LOGS_TODAY,
  SEED_WORKOUT_SESSION,
  SEED_ACTIVITY_LOGS,
  SEED_RECOVERY_LOGS,
  SEED_HABITS,
  SEED_WEEKLY_REVIEWS,
} from '../utils/seedData';

import {
  ProviderConfig,
  SyncLogEntry,
  IntegrationProvider,
} from '../types/integrations';
import { AuthSession } from '../types/auth';
import { buildWorkspaceDataset, WorkspaceInitMode } from '../utils/workspaceMode';

const STORAGE_KEYS = {
  AUTH_SESSION: 'bodytrack_auth_session_v1',
  WORKSPACE_MODE: 'bodytrack_workspace_mode_v1',
  PROFILE: 'bodytrack_profile_v1',
  GOALS: 'bodytrack_goals_v1',
  NUTRITION_TARGET: 'bodytrack_nutrition_target_v1',
  FOODS: 'bodytrack_foods_v1',
  FOOD_LOGS: 'bodytrack_food_logs_v1',
  EXERCISES: 'bodytrack_exercises_v1',
  ROUTINES: 'bodytrack_routines_v1',
  WORKOUT_SESSIONS: 'bodytrack_workout_sessions_v1',
  WEIGH_INS: 'bodytrack_weigh_ins_v1',
  BODY_MEASUREMENTS: 'bodytrack_measurements_v1',
  ACTIVITY_LOGS: 'bodytrack_activity_v1',
  RECOVERY_LOGS: 'bodytrack_recovery_v1',
  PROGRESS_PHOTOS: 'bodytrack_photos_v1',
  WEEKLY_REVIEWS: 'bodytrack_reviews_v1',
  HABITS: 'bodytrack_habits_v1',
  THEME: 'bodytrack_theme_v1',
  INTEGRATIONS_CONFIG: 'bodytrack_integrations_config_v1',
  SYNC_LOGS: 'bodytrack_sync_logs_v1',
  FREQUENT_MEALS: 'bodytrack_frequent_meals_v1',
  PUSH_REMINDERS: 'bodytrack_push_reminders_v1',
  OFFLINE_QUEUE: 'bodytrack_offline_sync_queue_v1',
};

// Current active tenant user ID for strict data isolation
let activeTenantId: string | null = null;

// Initialize tenant from saved session if present
try {
  const savedSessionRaw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
  if (savedSessionRaw) {
    const parsed: AuthSession = JSON.parse(savedSessionRaw);
    if (parsed && parsed.user && parsed.user.id) {
      activeTenantId = parsed.user.id;
    }
  }
} catch (e) {
  // Ignore on boot
}

function resolveKey(baseKey: string): string {
  // Global device settings
  if (baseKey === STORAGE_KEYS.THEME || baseKey === STORAGE_KEYS.AUTH_SESSION) {
    return baseKey;
  }
  // Scoped per authenticated tenant
  const tenantPrefix = activeTenantId ? `bt_${activeTenantId}_` : 'bt_guest_';
  return `${tenantPrefix}${baseKey}`;
}

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const scopedKey = resolveKey(key);
    const raw = localStorage.getItem(scopedKey);
    if (!raw) return structuredClone(defaultValue);
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from storage:`, e);
    return structuredClone(defaultValue);
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    const scopedKey = resolveKey(key);
    localStorage.setItem(scopedKey, JSON.stringify(value));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('bodytrack_storage_changed', { detail: { key: scopedKey } }));
    }
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export const StorageService = {
  // --- Profile ---
  getProfile(): UserProfile {
    return getItem<UserProfile>(STORAGE_KEYS.PROFILE, INITIAL_USER_PROFILE);
  },
  updateProfile(profile: UserProfile): void {
    profile.updated_at = new Date().toISOString();
    setItem(STORAGE_KEYS.PROFILE, profile);
  },

  // --- Physical Goals ---
  getGoal(): PhysicalGoal {
    return getItem<PhysicalGoal>(STORAGE_KEYS.GOALS, INITIAL_PHYSICAL_GOAL);
  },
  updateGoal(goal: PhysicalGoal): void {
    setItem(STORAGE_KEYS.GOALS, goal);
  },

  // --- Nutrition Targets ---
  getNutritionTarget(): NutritionTarget {
    return getItem<NutritionTarget>(STORAGE_KEYS.NUTRITION_TARGET, INITIAL_NUTRITION_TARGET);
  },
  updateNutritionTarget(target: NutritionTarget): void {
    setItem(STORAGE_KEYS.NUTRITION_TARGET, target);
  },

  // --- Foods Library ---
  getFoods(): Food[] {
    const saved = getItem<Food[]>(STORAGE_KEYS.FOODS, [...DEFAULT_FOODS, ...BARCODE_PRODUCTS_DB]);
    // Ensure barcode products exist in catalog
    const existingIds = new Set(saved.map((f) => f.id));
    let merged = [...saved];
    BARCODE_PRODUCTS_DB.forEach((bf) => {
      if (!existingIds.has(bf.id)) {
        merged.push(bf);
      }
    });
    return merged;
  },
  saveFood(food: Food): void {
    const foods = this.getFoods();
    const idx = foods.findIndex((f) => f.id === food.id);
    if (idx >= 0) {
      foods[idx] = food;
    } else {
      foods.unshift(food);
    }
    setItem(STORAGE_KEYS.FOODS, foods);
  },
  getFavoriteFoodIds(): string[] {
    return this.getFoods()
      .filter((f) => Boolean(f.is_favorite))
      .map((f) => f.id);
  },
  toggleFavoriteFood(foodId: string): string[] {
    const foods = this.getFoods().map((f) =>
      f.id === foodId ? { ...f, is_favorite: !f.is_favorite } : f
    );
    setItem(STORAGE_KEYS.FOODS, foods);
    return foods.filter((f) => Boolean(f.is_favorite)).map((f) => f.id);
  },
  deleteFood(id: string): void {
    const filtered = this.getFoods().filter((f) => f.id !== id);
    setItem(STORAGE_KEYS.FOODS, filtered);
  },

  // --- Frequent Meals (1-click logging) ---
  getFrequentMeals(): FrequentMeal[] {
    return getItem<FrequentMeal[]>(STORAGE_KEYS.FREQUENT_MEALS, DEFAULT_FREQUENT_MEALS);
  },
  saveFrequentMeal(meal: FrequentMeal): void {
    const list = this.getFrequentMeals();
    const idx = list.findIndex((m) => m.id === meal.id);
    if (idx >= 0) {
      list[idx] = meal;
    } else {
      list.unshift(meal);
    }
    setItem(STORAGE_KEYS.FREQUENT_MEALS, list);
  },
  deleteFrequentMeal(id: string): void {
    const filtered = this.getFrequentMeals().filter((m) => m.id !== id);
    setItem(STORAGE_KEYS.FREQUENT_MEALS, filtered);
  },

  // --- Push Reminders Config ---
  getPushReminders(): PushReminderConfig {
    const defaults: PushReminderConfig = {
      enabled: true,
      breakfast_enabled: true,
      breakfast_time: '08:00',
      lunch_enabled: true,
      lunch_time: '13:30',
      snack_enabled: true,
      snack_time: '17:30',
      dinner_enabled: true,
      dinner_time: '21:00',
      smart_suppress_if_logged: true,
      weigh_in_time: '07:30',
      lunch_log_time: '13:30',
      dinner_log_time: '21:00',
      workout_time: '18:00',
      remind_weigh_in: true,
      remind_meals: true,
      remind_workout: true,
      weigh_in_reminder: true,
      meals_reminder: true,
      meals_time: '13:30',
      workout_reminder: true,
    };
    const stored = getItem<PushReminderConfig>(STORAGE_KEYS.PUSH_REMINDERS, defaults);
    return {
      ...defaults,
      ...stored,
      breakfast_enabled: stored.breakfast_enabled ?? true,
      breakfast_time: stored.breakfast_time || '08:00',
      lunch_enabled: stored.lunch_enabled ?? true,
      lunch_time: stored.lunch_time || stored.lunch_log_time || '13:30',
      snack_enabled: stored.snack_enabled ?? true,
      snack_time: stored.snack_time || '17:30',
      dinner_enabled: stored.dinner_enabled ?? true,
      dinner_time: stored.dinner_time || stored.dinner_log_time || '21:00',
      smart_suppress_if_logged: stored.smart_suppress_if_logged ?? true,
    };
  },
  savePushReminders(config: PushReminderConfig): void {
    setItem(STORAGE_KEYS.PUSH_REMINDERS, config);
  },

  // --- Food Logs ---
  getFoodLogs(): FoodLog[] {
    return getItem<FoodLog[]>(STORAGE_KEYS.FOOD_LOGS, SEED_FOOD_LOGS_TODAY);
  },
  saveFoodLog(log: FoodLog): void {
    const logs = this.getFoodLogs();
    const idx = logs.findIndex((l) => l.id === log.id);
    if (idx >= 0) {
      logs[idx] = log;
    } else {
      logs.push(log);
    }
    setItem(STORAGE_KEYS.FOOD_LOGS, logs);
  },
  deleteFoodLog(id: string): void {
    const filtered = this.getFoodLogs().filter((l) => l.id !== id);
    setItem(STORAGE_KEYS.FOOD_LOGS, filtered);
  },

  // --- Weigh-Ins ---
  getWeighIns(): WeighIn[] {
    const items = getItem<WeighIn[]>(STORAGE_KEYS.WEIGH_INS, SEED_WEIGH_INS);
    // Return sorted chronologically
    return items.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  },
  saveWeighIn(weighIn: WeighIn): void {
    const list = this.getWeighIns();
    const idx = list.findIndex((w) => w.id === weighIn.id);
    if (idx >= 0) {
      list[idx] = weighIn;
    } else {
      list.push(weighIn);
    }
    setItem(STORAGE_KEYS.WEIGH_INS, list);
  },
  deleteWeighIn(id: string): void {
    const filtered = this.getWeighIns().filter((w) => w.id !== id);
    setItem(STORAGE_KEYS.WEIGH_INS, filtered);
  },

  // --- Body Measurements ---
  getBodyMeasurements(): BodyMeasurement[] {
    const list = getItem<BodyMeasurement[]>(STORAGE_KEYS.BODY_MEASUREMENTS, SEED_BODY_MEASUREMENTS);
    return list.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  },
  saveBodyMeasurement(meas: BodyMeasurement): void {
    const list = this.getBodyMeasurements();
    const idx = list.findIndex((m) => m.id === meas.id);
    if (idx >= 0) {
      list[idx] = meas;
    } else {
      list.push(meas);
    }
    setItem(STORAGE_KEYS.BODY_MEASUREMENTS, list);
  },
  deleteBodyMeasurement(id: string): void {
    const filtered = this.getBodyMeasurements().filter((m) => m.id !== id);
    setItem(STORAGE_KEYS.BODY_MEASUREMENTS, filtered);
  },

  // --- Exercises ---
  getExercises(): Exercise[] {
    return getItem<Exercise[]>(STORAGE_KEYS.EXERCISES, DEFAULT_EXERCISES);
  },
  saveExercise(exercise: Exercise): void {
    const list = this.getExercises();
    const idx = list.findIndex((e) => e.id === exercise.id);
    if (idx >= 0) {
      list[idx] = exercise;
    } else {
      list.push(exercise);
    }
    setItem(STORAGE_KEYS.EXERCISES, list);
  },

  // --- Workout Routines ---
  getRoutines(): WorkoutRoutine[] {
    return getItem<WorkoutRoutine[]>(STORAGE_KEYS.ROUTINES, DEFAULT_ROUTINES);
  },
  saveRoutine(routine: WorkoutRoutine): void {
    const list = this.getRoutines();
    const idx = list.findIndex((r) => r.id === routine.id);
    if (idx >= 0) {
      list[idx] = routine;
    } else {
      list.push(routine);
    }
    setItem(STORAGE_KEYS.ROUTINES, list);
  },

  // --- Workout Sessions ---
  getWorkoutSessions(): WorkoutSession[] {
    const list = getItem<WorkoutSession[]>(STORAGE_KEYS.WORKOUT_SESSIONS, [SEED_WORKOUT_SESSION]);
    return list.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  },
  saveWorkoutSession(session: WorkoutSession): void {
    const list = this.getWorkoutSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    setItem(STORAGE_KEYS.WORKOUT_SESSIONS, list);
  },
  deleteWorkoutSession(id: string): void {
    const filtered = this.getWorkoutSessions().filter((s) => s.id !== id);
    setItem(STORAGE_KEYS.WORKOUT_SESSIONS, filtered);
  },

  // --- Activity Logs ---
  getActivityLogs(): ActivityLog[] {
    const list = getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS, SEED_ACTIVITY_LOGS);
    return list.sort((a, b) => new Date(a.activity_date).getTime() - new Date(b.activity_date).getTime());
  },
  saveActivityLog(log: ActivityLog): void {
    const list = this.getActivityLogs();
    const idx = list.findIndex((a) => a.activity_date === log.activity_date);
    if (idx >= 0) {
      list[idx] = log;
    } else {
      list.push(log);
    }
    setItem(STORAGE_KEYS.ACTIVITY_LOGS, list);
  },

  // --- Recovery Logs ---
  getRecoveryLogs(): RecoveryLog[] {
    const list = getItem<RecoveryLog[]>(STORAGE_KEYS.RECOVERY_LOGS, SEED_RECOVERY_LOGS);
    return list.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  },
  saveRecoveryLog(log: RecoveryLog): void {
    const list = this.getRecoveryLogs();
    const idx = list.findIndex((r) => r.recorded_at === log.recorded_at);
    if (idx >= 0) {
      list[idx] = log;
    } else {
      list.push(log);
    }
    setItem(STORAGE_KEYS.RECOVERY_LOGS, list);
  },

  // --- Progress Photos ---
  getProgressPhotos(): ProgressPhoto[] {
    return getItem<ProgressPhoto[]>(STORAGE_KEYS.PROGRESS_PHOTOS, []);
  },
  saveProgressPhoto(photo: ProgressPhoto): void {
    const list = this.getProgressPhotos();
    const idx = list.findIndex((p) => p.id === photo.id);
    if (idx >= 0) {
      list[idx] = photo;
    } else {
      list.unshift(photo);
    }
    setItem(STORAGE_KEYS.PROGRESS_PHOTOS, list);
  },
  deleteProgressPhoto(id: string): void {
    const filtered = this.getProgressPhotos().filter((p) => p.id !== id);
    setItem(STORAGE_KEYS.PROGRESS_PHOTOS, filtered);
  },

  // --- Weekly Reviews ---
  getWeeklyReviews(): WeeklyReview[] {
    const list = getItem<WeeklyReview[]>(STORAGE_KEYS.WEEKLY_REVIEWS, SEED_WEEKLY_REVIEWS);
    return list.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
  },
  saveWeeklyReview(review: WeeklyReview): void {
    const list = this.getWeeklyReviews();
    const idx = list.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      list[idx] = review;
    } else {
      list.unshift(review);
    }
    setItem(STORAGE_KEYS.WEEKLY_REVIEWS, list);
  },

  // --- Daily Habits ---
  getHabits(dateStr: string): DailyHabits {
    const allHabits = getItem<Record<string, DailyHabits>>(STORAGE_KEYS.HABITS, {
      '2026-10-22': SEED_HABITS,
    });
    if (allHabits[dateStr]) {
      return allHabits[dateStr];
    }
    return {
      id: `hab-${dateStr}`,
      date: dateStr,
      weigh_in_done: false,
      protein_goal_met: false,
      meals_logged: false,
      workout_done: false,
      steps_goal_met: false,
      sleep_7h_plus: false,
      measurements_logged: false,
    };
  },
  saveHabits(habits: DailyHabits): void {
    const allHabits = getItem<Record<string, DailyHabits>>(STORAGE_KEYS.HABITS, {});
    allHabits[habits.date] = habits;
    setItem(STORAGE_KEYS.HABITS, allHabits);
  },

  // --- Theme preference ---
  getTheme(): 'dark' | 'light' {
    return getItem<'dark' | 'light'>(STORAGE_KEYS.THEME, 'dark');
  },
  setTheme(theme: 'dark' | 'light'): void {
    setItem(STORAGE_KEYS.THEME, theme);
  },

  // --- Full Backup & Restore ---
  getFullExportData(): Record<string, unknown> {
    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      profile: this.getProfile(),
      goal: this.getGoal(),
      nutritionTarget: this.getNutritionTarget(),
      foods: this.getFoods(),
      foodLogs: this.getFoodLogs(),
      weighIns: this.getWeighIns(),
      bodyMeasurements: this.getBodyMeasurements(),
      exercises: this.getExercises(),
      routines: this.getRoutines(),
      workoutSessions: this.getWorkoutSessions(),
      activityLogs: this.getActivityLogs(),
      recoveryLogs: this.getRecoveryLogs(),
      progressPhotos: this.getProgressPhotos(),
      weeklyReviews: this.getWeeklyReviews(),
    };
  },
  importBackupData(data: Record<string, unknown>): boolean {
    try {
      if (data.profile) setItem(STORAGE_KEYS.PROFILE, data.profile);
      if (data.goal) setItem(STORAGE_KEYS.GOALS, data.goal);
      if (data.nutritionTarget) setItem(STORAGE_KEYS.NUTRITION_TARGET, data.nutritionTarget);
      if (data.foods) setItem(STORAGE_KEYS.FOODS, data.foods);
      if (data.foodLogs) setItem(STORAGE_KEYS.FOOD_LOGS, data.foodLogs);
      if (data.weighIns) setItem(STORAGE_KEYS.WEIGH_INS, data.weighIns);
      if (data.bodyMeasurements) setItem(STORAGE_KEYS.BODY_MEASUREMENTS, data.bodyMeasurements);
      if (data.exercises) setItem(STORAGE_KEYS.EXERCISES, data.exercises);
      if (data.routines) setItem(STORAGE_KEYS.ROUTINES, data.routines);
      if (data.workoutSessions) setItem(STORAGE_KEYS.WORKOUT_SESSIONS, data.workoutSessions);
      if (data.activityLogs) setItem(STORAGE_KEYS.ACTIVITY_LOGS, data.activityLogs);
      if (data.recoveryLogs) setItem(STORAGE_KEYS.RECOVERY_LOGS, data.recoveryLogs);
      if (data.progressPhotos) setItem(STORAGE_KEYS.PROGRESS_PHOTOS, data.progressPhotos);
      if (data.weeklyReviews) setItem(STORAGE_KEYS.WEEKLY_REVIEWS, data.weeklyReviews);
      return true;
    } catch (e) {
      console.error('Error importing backup data:', e);
      return false;
    }
  },
  // --- Integrations & Sync ---
  getIntegrationConfigs(): Record<IntegrationProvider, ProviderConfig> {
    const defaults: Record<IntegrationProvider, ProviderConfig> = {
      hevy: {
        provider: 'hevy',
        name: 'Hevy Workout Tracker',
        status: 'not_configured',
        features_enabled: ['Entrenamientos', 'Series y Repeticiones', 'Cargas (kg)', 'RPE / RIR'],
        requires_approval: false,
      },
      myfitnesspal: {
        provider: 'myfitnesspal',
        name: 'MyFitnessPal',
        status: 'pending_approval',
        requires_approval: true,
        approval_status_text: 'Requiere API de socio comercial (OAuth2 Enterprise Partner)',
        features_enabled: ['Comidas', 'Calorías y Macros', 'Importación CSV Oficial'],
      },
      fitia: {
        provider: 'fitia',
        name: 'Fitia Nutrición',
        status: 'pending_approval',
        requires_approval: true,
        approval_status_text: 'API pública no disponible (Soporte importación CSV/JSON)',
        features_enabled: ['Comidas', 'Calorías', 'Proteínas'],
      },
      health_connect: {
        provider: 'health_connect',
        name: 'Android Health Connect',
        status: 'not_configured',
        requires_approval: false,
        approval_status_text: 'Conector Android Companion Requerido (On-device)',
        features_enabled: ['Pasos', 'Peso', 'Horas de Sueño', 'Gasto Energético Activo'],
      },
      google_fit: {
        provider: 'google_fit',
        name: 'Google Fit',
        status: 'disconnected',
        requires_approval: false,
        approval_status_text: 'API REST Obsolescente (Transición recomendada a Health Connect)',
        features_enabled: ['Histórico'],
      },
    };

    const saved = getItem<Record<string, ProviderConfig>>(STORAGE_KEYS.INTEGRATIONS_CONFIG, {});
    return { ...defaults, ...saved } as Record<IntegrationProvider, ProviderConfig>;
  },

  saveIntegrationConfig(provider: IntegrationProvider, update: Partial<ProviderConfig>): void {
    const configs = this.getIntegrationConfigs();
    configs[provider] = {
      ...configs[provider],
      ...update,
    };
    setItem(STORAGE_KEYS.INTEGRATIONS_CONFIG, configs);
  },

  getSyncLogs(): SyncLogEntry[] {
    return getItem<SyncLogEntry[]>(STORAGE_KEYS.SYNC_LOGS, []);
  },

  addSyncLog(log: SyncLogEntry): void {
    const current = this.getSyncLogs();
    const updated = [log, ...current].slice(0, 50); // keep last 50
    setItem(STORAGE_KEYS.SYNC_LOGS, updated);
  },

  clearSyncLogs(): void {
    setItem(STORAGE_KEYS.SYNC_LOGS, []);
  },

  // --- Batch Imports with Idempotency & Protection of Manual Data ---
  batchImportWorkouts(incoming: WorkoutSession[]): { imported: number; updated: number; skipped: number } {
    const existing = this.getWorkoutSessions();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const sessionMap = new Map<string, WorkoutSession>();
    // Index existing by external_id if present
    existing.forEach((sess) => {
      if (sess.external_id) {
        sessionMap.set(sess.external_id, sess);
      }
    });

    const newSessions = [...existing];

    incoming.forEach((item) => {
      if (!item.external_id) {
        // Without external_id, check for exact same date and name to avoid duplicate
        const match = existing.find(
          (s) => s.started_at === item.started_at && s.routine_name === item.routine_name
        );
        if (match) {
          skipped++;
        } else {
          newSessions.push(item);
          imported++;
        }
        return;
      }

      const existingIndex = newSessions.findIndex((s) => s.external_id === item.external_id);
      if (existingIndex >= 0) {
        const existingItem = newSessions[existingIndex];
        // Protect manual modifications if source was changed or manual
        if (existingItem.source === 'manual') {
          skipped++;
          return;
        }

        // Check if external updated timestamp changed
        if (
          item.external_updated_at &&
          existingItem.external_updated_at &&
          item.external_updated_at <= existingItem.external_updated_at
        ) {
          skipped++;
          return;
        }

        // Update preserving internal id
        newSessions[existingIndex] = {
          ...item,
          id: existingItem.id,
        };
        updated++;
      } else {
        newSessions.push(item);
        imported++;
      }
    });

    setItem(STORAGE_KEYS.WORKOUT_SESSIONS, newSessions);
    return { imported, updated, skipped };
  },

  batchImportFoodLogs(incoming: FoodLog[]): { imported: number; updated: number; skipped: number } {
    const existing = this.getFoodLogs();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const newLogs = [...existing];

    incoming.forEach((item) => {
      // Find matching item by external_id or by exact time/food/meal
      const matchIndex = newLogs.findIndex((log) => {
        if (item.external_id && log.external_id) {
          return item.external_id === log.external_id;
        }
        return (
          log.consumed_at === item.consumed_at &&
          log.meal_type === item.meal_type &&
          log.food_name_snapshot.toLowerCase().trim() === item.food_name_snapshot.toLowerCase().trim() &&
          Math.abs(log.calories_kcal - item.calories_kcal) < 1
        );
      });

      if (matchIndex >= 0) {
        // Never overwrite a manual entry
        if (newLogs[matchIndex].source === 'manual') {
          skipped++;
          return;
        }
        newLogs[matchIndex] = {
          ...item,
          id: newLogs[matchIndex].id,
        };
        updated++;
      } else {
        newLogs.push(item);
        imported++;
      }
    });

    setItem(STORAGE_KEYS.FOOD_LOGS, newLogs);
    return { imported, updated, skipped };
  },

  batchImportWeighIns(incoming: WeighIn[]): { imported: number; updated: number; skipped: number } {
    const existing = this.getWeighIns();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const newItems = [...existing];

    incoming.forEach((item) => {
      const matchIndex = newItems.findIndex((w) => {
        if (item.external_id && w.external_id) return item.external_id === w.external_id;
        return w.measured_at.split('T')[0] === item.measured_at.split('T')[0];
      });

      if (matchIndex >= 0) {
        if (newItems[matchIndex].source === 'manual') {
          skipped++;
          return;
        }
        newItems[matchIndex] = { ...item, id: newItems[matchIndex].id };
        updated++;
      } else {
        newItems.push(item);
        imported++;
      }
    });

    setItem(STORAGE_KEYS.WEIGH_INS, newItems);
    return { imported, updated, skipped };
  },

  batchImportActivityLogs(incoming: ActivityLog[]): { imported: number; updated: number; skipped: number } {
    const existing = this.getActivityLogs();
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    const newItems = [...existing];

    incoming.forEach((item) => {
      const matchIndex = newItems.findIndex((a) => {
        if (item.external_id && a.external_id) return item.external_id === a.external_id;
        return a.activity_date === item.activity_date;
      });

      if (matchIndex >= 0) {
        if (newItems[matchIndex].source === 'manual') {
          skipped++;
          return;
        }
        newItems[matchIndex] = { ...item, id: newItems[matchIndex].id };
        updated++;
      } else {
        newItems.push(item);
        imported++;
      }
    });

    setItem(STORAGE_KEYS.ACTIVITY_LOGS, newItems);
    return { imported, updated, skipped };
  },

  // --- Auth Session & Tenant Isolation ---
  setActiveTenant(userId: string | null): void {
    activeTenantId = userId;
  },

  getActiveTenant(): string | null {
    return activeTenantId;
  },

  getAuthSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setAuthSession(session: AuthSession | null): void {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
      this.setActiveTenant(session.user.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      this.setActiveTenant(null);
    }
  },

  clearAuthSession(): void {
    this.setAuthSession(null);
  },

  getWorkspaceMode(): WorkspaceInitMode {
    return getItem<WorkspaceInitMode>(STORAGE_KEYS.WORKSPACE_MODE, 'demo');
  },

  setWorkspaceMode(mode: WorkspaceInitMode): void {
    setItem<WorkspaceInitMode>(STORAGE_KEYS.WORKSPACE_MODE, mode);
  },

  /**
   * Initializes the active tenant workspace either with complete Demo Data ('demo')
   * or completely from zero ('zero') so the user can configure everything in the full-screen Onboarding Wizard.
   */
  initializeWorkspaceMode(
    mode: WorkspaceInitMode,
    userOverrides?: {
      id?: string;
      name?: string;
      email?: string;
      role?: 'admin' | 'user';
      token?: string;
    }
  ): AuthSession {
    const existingSession = this.getAuthSession();
    const userId =
      userOverrides?.id ||
      existingSession?.user.id ||
      (mode === 'zero' ? 'usr_clean_zero' : 'usr_demo_tester');
    const userName =
      userOverrides?.name ||
      existingSession?.user.name ||
      'Santiago Quinteros';
    const userEmail =
      userOverrides?.email ||
      existingSession?.user.email ||
      (mode === 'zero' ? 'santiago.cero@bodytrack.pro' : 'beta.tester@bodytrack.pro');
    const userRole = userOverrides?.role || existingSession?.user.role || 'user';

    const newSession: AuthSession = {
      token: userOverrides?.token || existingSession?.token || `bt_local_${mode}_${Date.now()}`,
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: userRole,
        status: 'active',
        created_at: existingSession?.user.created_at || new Date().toISOString(),
        onboarding_completed: mode === 'demo',
        privacy_accepted_at: mode === 'demo' ? new Date().toISOString() : undefined,
      },
    };

    this.setAuthSession(newSession);
    const dataset = buildWorkspaceDataset(mode, userName);

    setItem(STORAGE_KEYS.WORKSPACE_MODE, mode);
    setItem(STORAGE_KEYS.PROFILE, dataset.profile);
    setItem(STORAGE_KEYS.GOALS, dataset.goal);
    setItem(STORAGE_KEYS.NUTRITION_TARGET, dataset.nutritionTarget);
    setItem(STORAGE_KEYS.FOODS, DEFAULT_FOODS);
    setItem(STORAGE_KEYS.EXERCISES, DEFAULT_EXERCISES);
    setItem(STORAGE_KEYS.ROUTINES, DEFAULT_ROUTINES);
    setItem(STORAGE_KEYS.WEIGH_INS, dataset.weighIns);
    setItem(STORAGE_KEYS.BODY_MEASUREMENTS, dataset.measurements);
    setItem(STORAGE_KEYS.FOOD_LOGS, dataset.foodLogs);
    setItem(STORAGE_KEYS.WORKOUT_SESSIONS, dataset.workoutSessions);
    setItem(STORAGE_KEYS.ACTIVITY_LOGS, dataset.activityLogs);
    setItem(STORAGE_KEYS.RECOVERY_LOGS, dataset.recoveryLogs);
    setItem(STORAGE_KEYS.PROGRESS_PHOTOS, []);
    setItem(STORAGE_KEYS.WEEKLY_REVIEWS, dataset.weeklyReviews);
    setItem(STORAGE_KEYS.HABITS, dataset.habitsByDate);

    return newSession;
  },

  // Export full user dataset for privacy compliance (GDPR Right to Data Portability)
  exportCurrentUserData(): Record<string, unknown> {
    return {
      exported_at: new Date().toISOString(),
      tenant_user_id: activeTenantId,
      profile: this.getProfile(),
      goal: this.getGoal(),
      nutrition_target: this.getNutritionTarget(),
      weigh_ins: this.getWeighIns(),
      body_measurements: this.getBodyMeasurements(),
      workout_sessions: this.getWorkoutSessions(),
      food_logs: this.getFoodLogs(),
      custom_foods: this.getFoods(),
      routines: this.getRoutines(),
      activity_logs: this.getActivityLogs(),
      recovery_logs: this.getRecoveryLogs(),
      progress_photos_count: this.getProgressPhotos().length,
      weekly_reviews: this.getWeeklyReviews(),
    };
  },

  // Completely purge all private data for tenant (GDPR Right to be Forgotten)
  purgeCurrentUserData(userId?: string): number {
    const targetId = userId || activeTenantId;
    if (!targetId) return 0;

    const prefix = `bt_${targetId}_`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));

    if (activeTenantId === targetId) {
      this.clearAuthSession();
    }
    return keysToRemove.length;
  },

  resetToInitialSeed(): void {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    window.location.reload();
  },
};
