/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkoutSession, WorkoutExerciseLog, WorkoutSet, MuscleGroup } from '../../types';
import { HevyWorkout, HevySet } from '../../types/integrations';

/**
 * Infer primary muscle group from exercise title heuristics
 */
export function inferMuscleFromTitle(title: string): MuscleGroup {
  const t = title.toLowerCase();
  if (t.includes('bench') || t.includes('press banca') || t.includes('pecho') || t.includes('chest') || t.includes('push up') || t.includes('fondos en paralelas')) {
    return 'pecho';
  }
  if (t.includes('rdl') || t.includes('romanian') || t.includes('peso muerto rumano') || t.includes('leg curl') || t.includes('curl femoral') || t.includes('isquios')) {
    return 'isquiosurales';
  }
  if (t.includes('deadlift') || t.includes('peso muerto') || t.includes('row') || t.includes('remo') || t.includes('pull up') || t.includes('dominadas') || t.includes('lat pulldown') || t.includes('jalón') || t.includes('espalda')) {
    return 'espalda';
  }
  if (t.includes('overhead') || t.includes('shoulder') || t.includes('militar') || t.includes('hombro') || t.includes('lateral raise') || t.includes('elevaciones laterales') || t.includes('arnold')) {
    return 'hombros';
  }
  if (t.includes('bicep') || t.includes('curl')) {
    return 'biceps';
  }
  if (t.includes('tricep') || t.includes('skull crusher') || t.includes('extensión tras nuca')) {
    return 'triceps';
  }
  if (t.includes('squat') || t.includes('sentadilla') || t.includes('prensa') || t.includes('leg press') || t.includes('cuadriceps') || t.includes('extensión de pierna')) {
    return 'cuadriceps';
  }
  if (t.includes('hip thrust') || t.includes('glute') || t.includes('puente')) {
    return 'gluteos';
  }
  if (t.includes('calf') || t.includes('gemelos') || t.includes('pantorrilla')) {
    return 'pantorrillas';
  }
  if (t.includes('crunch') || t.includes('plank') || t.includes('abdomen') || t.includes('elevación de piernas')) {
    return 'abdomen';
  }
  return 'pecho';
}

/**
 * Map Hevy set to BodyTrack Pro WorkoutSet
 */
export function mapHevySetToWorkoutSet(set: HevySet, index: number): WorkoutSet {
  // If Hevy provided RPE (e.g. 8), RIR is 10 - RPE (e.g. 2)
  let rir: number | undefined = undefined;
  if (typeof set.rpe === 'number' && set.rpe >= 6 && set.rpe <= 10) {
    rir = Math.max(0, Math.min(4, Math.round(10 - set.rpe)));
  }

  return {
    id: `set_hevy_${index}_${Math.random().toString(36).substring(2, 7)}`,
    set_number: index + 1,
    weight_kg: Number(set.weight_kg) || 0,
    repetitions: Number(set.reps) || 0,
    rir,
    is_warmup: set.set_type === 'warmup',
    completed: true,
  };
}

/**
 * Transform Hevy API workout into BodyTrack Pro WorkoutSession
 */
export function transformHevyWorkoutToSession(hevyWorkout: HevyWorkout): WorkoutSession {
  const exercises: WorkoutExerciseLog[] = (hevyWorkout.exercises || []).map((ex, exIdx) => {
    const muscle = inferMuscleFromTitle(ex.title);
    const sets: WorkoutSet[] = (ex.sets || []).map((s, sIdx) => mapHevySetToWorkoutSet(s, sIdx));

    return {
      id: `hevy_ex_${hevyWorkout.id}_${exIdx}`,
      exercise_id: ex.exercise_template_id || `ex_template_${exIdx}`,
      exercise_name_snapshot: ex.title || 'Ejercicio Hevy',
      primary_muscle: muscle,
      order: exIdx + 1,
      sets,
      notes: ex.notes,
    };
  });

  // Calculate duration
  let duration_minutes: number | undefined = undefined;
  if (hevyWorkout.start_time && hevyWorkout.end_time) {
    const start = new Date(hevyWorkout.start_time).getTime();
    const end = new Date(hevyWorkout.end_time).getTime();
    if (end > start) {
      duration_minutes = Math.round((end - start) / (1000 * 60));
    }
  }

  return {
    id: `session_hevy_${hevyWorkout.id}`,
    routine_name: hevyWorkout.title || 'Sesión Hevy',
    started_at: hevyWorkout.start_time,
    completed_at: hevyWorkout.end_time || hevyWorkout.start_time,
    duration_minutes: duration_minutes || 60,
    status: 'completed',
    exercises,
    notes: hevyWorkout.description,
    source: 'hevy',
    external_id: hevyWorkout.id,
    external_updated_at: hevyWorkout.updated_at || hevyWorkout.created_at || hevyWorkout.start_time,
  };
}

export const HevyConnector = {
  /**
   * Verify API Key through server-side proxy
   */
  async verifyApiKey(apiKey: string): Promise<{ success: boolean; message: string; workoutCount?: number }> {
    try {
      const response = await fetch('/api/integrations/hevy/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          message: data.error || 'Clave de API de Hevy no válida o no autorizada.',
        };
      }

      return {
        success: true,
        message: '¡Conexión establecida con Hevy API con éxito!',
        workoutCount: data.workoutCount || 0,
      };
    } catch (e) {
      return {
        success: false,
        message: 'No se pudo conectar con el servidor local para verificar Hevy.',
      };
    }
  },

  /**
   * Fetch and sync workouts from Hevy through server-side proxy
   */
  async syncWorkouts(sinceDate?: string): Promise<{
    success: boolean;
    workouts: WorkoutSession[];
    error?: string;
  }> {
    try {
      const response = await fetch('/api/integrations/hevy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sinceDate }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          workouts: [],
          error: data.error || 'Error al recuperar entrenamientos de Hevy.',
        };
      }

      const sessions = (data.workouts as HevyWorkout[]).map(transformHevyWorkoutToSession);
      return {
        success: true,
        workouts: sessions,
      };
    } catch (e) {
      return {
        success: false,
        workouts: [],
        error: 'Fallo de comunicación de red al sincronizar con Hevy.',
      };
    }
  },

  /**
   * Disconnect Hevy integration on server
   */
  async disconnect(): Promise<boolean> {
    try {
      const response = await fetch('/api/integrations/hevy/disconnect', {
        method: 'POST',
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};
