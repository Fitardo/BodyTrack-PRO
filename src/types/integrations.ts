/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IntegrationProvider = 
  | 'hevy' 
  | 'fitia' 
  | 'myfitnesspal' 
  | 'health_connect' 
  | 'google_fit';

export type ConnectionStatus = 
  | 'not_configured' 
  | 'pending_approval' 
  | 'connected' 
  | 'error' 
  | 'disconnected';

export interface ProviderConfig {
  provider: IntegrationProvider;
  name: string;
  status: ConnectionStatus;
  last_sync_at?: string;
  error_message?: string;
  account_name?: string;
  features_enabled: string[];
  requires_approval?: boolean;
  approval_status_text?: string;
}

export interface SyncLogEntry {
  id: string;
  provider: IntegrationProvider;
  provider_name: string;
  started_at: string;
  completed_at: string;
  status: 'success' | 'partial' | 'error';
  records_imported: number;
  records_updated: number;
  records_skipped: number;
  duration_ms: number;
  error_message?: string;
  details?: string;
}

// Hevy API types (Official REST API v1)
export interface HevySet {
  index: number;
  set_type: 'normal' | 'warmup' | 'drop' | 'failure';
  weight_kg?: number;
  reps?: number;
  distance_meters?: number;
  duration_seconds?: number;
  rpe?: number;
}

export interface HevyExercise {
  exercise_template_id: string;
  title: string;
  notes?: string;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO
  end_time?: string;   // ISO
  created_at?: string;
  updated_at?: string;
  exercises: HevyExercise[];
}

export interface HevyWorkoutResponse {
  page: number;
  page_count: number;
  workouts: HevyWorkout[];
}

// Health Connect Schema types
export interface HealthConnectRecord {
  record_type: 'steps' | 'weight' | 'sleep' | 'active_calories' | 'distance';
  start_time: string; // ISO
  end_time?: string;   // ISO
  value: number;
  unit: string;
  device_model?: string;
  source_app?: string;
}

export interface HealthConnectSyncPayload {
  device_id: string;
  exported_at: string;
  permissions_granted: string[];
  records: HealthConnectRecord[];
}

// MyFitnessPal / Fitia parsed rows
export interface ParsedMealEntry {
  date: string; // YYYY-MM-DD
  time?: string;
  meal: 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'colacion';
  food_name: string;
  brand?: string;
  quantity: number;
  unit: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  external_id?: string;
  source: 'myfitnesspal' | 'fitia';
}
