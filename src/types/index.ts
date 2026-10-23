/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SexForEquations = 'male' | 'female';

export type ActivityLevel = 
  | 'sedentary'      // Poco o ningún ejercicio (factor 1.2)
  | 'light'          // Ejercicio ligero 1-3 días/sem (factor 1.375)
  | 'moderate'       // Ejercicio moderado 3-5 días/sem (factor 1.55)
  | 'heavy'          // Ejercicio pesado 6-7 días/sem (factor 1.725)
  | 'athlete';       // Muy pesado / trabajo físico + entreno (factor 1.9)

export type GoalType = 'recomp' | 'fat_loss' | 'muscle_gain' | 'maintenance';

export type UnitSystem = 'metric' | 'imperial';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex_for_equations: SexForEquations;
  height_cm: number;
  initial_weight_kg: number;
  activity_level: ActivityLevel;
  unit_system?: UnitSystem; // 'metric' (kg/cm) | 'imperial' (lb/in)
  training_frequency: number; // e.g. 5 or 6
  preferred_training_split: string; // 'Push / Pull / Legs (PPL)'
  dietary_preferences: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PhysicalGoal {
  id: string;
  primary_goal?: GoalType;
  target_weight_kg: number;
  target_weight_min_kg?: number;
  target_weight_max_kg?: number;
  target_waist_cm?: number;
  weekly_rate_percent: number; // e.g. 0.5% (recommended 0.25 - 0.75%)
  optional_target_date?: string;
  active: boolean;
}

export interface WeighIn {
  id: string;
  measured_at: string; // ISO date-time or YYYY-MM-DD
  weight_kg: number;
  fasting: boolean;
  time_of_day?: string; // e.g. "07:30"
  context?: 'normal' | 'post_cheat_meal' | 'post_workout' | 'travel' | 'poor_sleep' | 'salty_food';
  notes?: string;
  source?: 'manual' | 'health_connect';
  external_id?: string;
}

export interface BodyMeasurement {
  id: string;
  measured_at: string; // YYYY-MM-DD
  waist_cm: number;
  neck_cm?: number;
  chest_cm?: number;
  hip_cm?: number;
  arm_relaxed_cm?: number;
  arm_flexed_cm?: number;
  thigh_cm?: number;
  calf_cm?: number;
  body_fat_percent?: number; // External DEXA, caliper, etc. or estimated
  body_fat_method?: string; // 'U.S. Navy', 'Bioimpedancia', 'DEXA', 'Pliegues'
  is_estimate?: boolean;
  notes?: string;
  source?: 'manual' | 'hevy' | 'health_connect';
  external_id?: string;
}

export interface NutritionTarget {
  id: string;
  effective_from: string;
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  serving_size: number;
  serving_unit: string; // 'g', 'ml', 'unidad', 'porción'
  preparation_state?: 'raw' | 'cooked' | 'na'; // 'crudo' vs 'cocido'
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g?: number;
  source: 'verified' | 'custom' | 'usda';
  category?: 'proteina' | 'carbohidrato' | 'grasa' | 'vegetal' | 'fruta' | 'lacteo' | 'snack';
}

export type MealCategory = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'colacion';

export interface FoodLog {
  id: string;
  consumed_at: string; // YYYY-MM-DD
  consumed_time?: string; // "08:30"
  meal_type: MealCategory;
  food_id?: string;
  food_name_snapshot: string;
  brand_snapshot?: string;
  quantity: number;
  unit: string;
  preparation_state?: 'raw' | 'cooked' | 'na';
  calories_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g?: number;
  notes?: string;
  source?: 'manual' | 'myfitnesspal' | 'fitia';
  external_id?: string;
}

export type MuscleGroup = 
  | 'pecho' 
  | 'espalda' 
  | 'hombros' 
  | 'biceps' 
  | 'triceps' 
  | 'cuadriceps' 
  | 'isquiosurales' 
  | 'gluteos' 
  | 'pantorrillas' 
  | 'abdomen' 
  | 'antebrazo';

export type MovementPattern = 
  | 'empuje_horizontal' 
  | 'empuje_vertical' 
  | 'traccion_horizontal' 
  | 'traccion_vertical' 
  | 'patron_rodilla' 
  | 'patron_cadera' 
  | 'aislamiento' 
  | 'core';

export interface Exercise {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  movement_pattern: MovementPattern;
  equipment: 'barra' | 'mancuernas' | 'polea' | 'maquina' | 'peso_corporal' | 'kettlebell';
  instructions?: string;
  suggested_rep_range?: [number, number]; // e.g. [8, 12]
  source?: 'verified' | 'custom' | 'usda' | 'hevy';
  external_id?: string;
}

export interface WorkoutRoutineExercise {
  exercise_id: string;
  order: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
  suggested_weight_kg?: number;
  suggested_rir?: number;
  rest_seconds?: number;
  notes?: string;
}

export interface WorkoutRoutine {
  id: string;
  name: string; // "Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"
  split: 'Push' | 'Pull' | 'Legs' | 'Other';
  description: string;
  exercises: WorkoutRoutineExercise[];
  is_active: boolean;
  source?: 'manual' | 'hevy';
  external_id?: string;
}

export interface WorkoutSet {
  id: string;
  set_number: number;
  weight_kg: number;
  repetitions: number;
  rir?: number; // Reps in reserve (0-4)
  is_warmup: boolean;
  completed: boolean;
  notes?: string;
}

export interface WorkoutExerciseLog {
  id: string;
  exercise_id: string;
  exercise_name_snapshot: string;
  primary_muscle: MuscleGroup;
  order: number;
  sets: WorkoutSet[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  routine_id?: string;
  routine_name: string;
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  exercises: WorkoutExerciseLog[];
  notes?: string;
  perceived_rpe?: number; // 1-10
  source?: 'manual' | 'hevy' | 'health_connect';
  external_id?: string;
  external_updated_at?: string;
}

export interface ActivityLog {
  id: string;
  activity_date: string; // YYYY-MM-DD
  steps: number;
  distance_km?: number;
  cardio_minutes?: number;
  cardio_type?: 'caminata' | 'carrera' | 'ciclismo' | 'natacion' | 'hiit' | 'otro';
  intensity?: 'baja' | 'moderada' | 'alta';
  notes?: string;
  source?: 'manual' | 'health_connect';
  external_id?: string;
}

export interface RecoveryLog {
  id: string;
  recorded_at: string; // YYYY-MM-DD
  sleep_hours: number;
  sleep_quality: number; // 1-5
  fatigue: number; // 1-5
  soreness: number; // 1-5 (DOMS)
  energy: number; // 1-5
  hunger: number; // 1-5
  stress: number; // 1-5
  notes?: string;
}

export type PhotoType = 'frontal' | 'lateral' | 'espalda' | 'otra';

export interface ProgressPhoto {
  id: string;
  captured_at: string; // YYYY-MM-DD
  photo_type: PhotoType;
  image_data_url: string; // Local private base64 storage
  associated_weight_kg?: number;
  associated_waist_cm?: number;
  notes?: string;
  stage_tag: 'inicio' | 'seguimiento' | 'meta_visual';
  is_reference_image?: boolean;
}

export interface DailyHabits {
  id: string;
  date: string; // YYYY-MM-DD
  weigh_in_done: boolean;
  protein_goal_met: boolean;
  meals_logged: boolean;
  workout_done: boolean;
  steps_goal_met: boolean;
  sleep_7h_plus: boolean;
  measurements_logged: boolean;
}

export interface WeeklyReview {
  id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  weight_average_kg: number;
  weight_change_vs_prev_week_kg?: number;
  rate_of_loss_percent?: number;
  waist_average_cm?: number;
  calorie_average_kcal: number;
  protein_average_g: number;
  days_logged_count: number;
  weigh_ins_count: number;
  workout_sessions_count: number;
  adherence_summary: string;
  performance_summary: string;
  retrospective_tdee_estimate?: number;
  confidence_level: 'alta' | 'moderada' | 'baja';
  missing_data_notes?: string;
  recommendation_action: 'mantener' | 'reducir_deficit' | 'aumentar_ingesta' | 'datos_insuficientes';
  suggested_calorie_change_kcal: number;
  recommendation_reason: string;
  user_decision: 'pendiente' | 'aceptado' | 'rechazado' | 'pospuesto';
  created_at: string;
}
