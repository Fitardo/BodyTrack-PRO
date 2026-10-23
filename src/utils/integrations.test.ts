/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  transformHevyWorkoutToSession,
  mapHevySetToWorkoutSet,
  inferMuscleFromTitle,
} from '../services/integrations/hevyConnector';
import { parseMyFitnessPalCsv, normalizeMfpMeal } from '../services/integrations/myFitnessPalConnector';
import { parseFitiaExport, normalizeFitiaMeal } from '../services/integrations/fitiaConnector';
import { processHealthConnectPayload } from '../services/integrations/healthConnectConnector';
import { HevyWorkout, HealthConnectSyncPayload } from '../types/integrations';
import { WorkoutSession } from '../types';

// Mock in-memory storage simulator for idempotency testing
function createTestStorage() {
  let sessions: WorkoutSession[] = [];

  return {
    getSessions: () => sessions,
    setSessions: (s: WorkoutSession[]) => { sessions = s; },
    batchImportWorkouts(incoming: WorkoutSession[]) {
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const list = [...sessions];

      incoming.forEach((item) => {
        if (!item.external_id) {
          const match = list.find((s) => s.started_at === item.started_at && s.routine_name === item.routine_name);
          if (match) {
            skipped++;
          } else {
            list.push(item);
            imported++;
          }
          return;
        }

        const idx = list.findIndex((s) => s.external_id === item.external_id);
        if (idx >= 0) {
          const existing = list[idx];
          if (existing.source === 'manual') {
            skipped++;
            return;
          }
          if (item.external_updated_at && existing.external_updated_at && item.external_updated_at <= existing.external_updated_at) {
            skipped++;
            return;
          }
          list[idx] = { ...item, id: existing.id };
          updated++;
        } else {
          list.push(item);
          imported++;
        }
      });

      sessions = list;
      return { imported, updated, skipped };
    },
  };
}

// --- 1. Hevy Transformations ---

test('Hevy: muscle group inference accurately categorizes exercise titles', () => {
  assert.equal(inferMuscleFromTitle('Barbell Flat Bench Press'), 'pecho');
  assert.equal(inferMuscleFromTitle('Incline Dumbbell Press'), 'pecho');
  assert.equal(inferMuscleFromTitle('Conv Deadlift'), 'espalda');
  assert.equal(inferMuscleFromTitle('Lat Pulldown Wide Grip'), 'espalda');
  assert.equal(inferMuscleFromTitle('Overhead Press (OHP)'), 'hombros');
  assert.equal(inferMuscleFromTitle('Lateral Raise Cable'), 'hombros');
  assert.equal(inferMuscleFromTitle('Incline Bicep Curl'), 'biceps');
  assert.equal(inferMuscleFromTitle('Rope Tricep Pushdown'), 'triceps');
  assert.equal(inferMuscleFromTitle('Barbell Back Squat'), 'cuadriceps');
  assert.equal(inferMuscleFromTitle('Romanian Deadlift (RDL)'), 'isquiosurales');
  assert.equal(inferMuscleFromTitle('Barbell Hip Thrust'), 'gluteos');
  assert.equal(inferMuscleFromTitle('Standing Calf Raise'), 'pantorrillas');
});

test('Hevy: set mapping preserves weight, reps, warmup, and computes RIR from RPE', () => {
  const warmupSet = mapHevySetToWorkoutSet(
    { index: 0, set_type: 'warmup', weight_kg: 40, reps: 10, rpe: 6 },
    0
  );
  assert.equal(warmupSet.set_number, 1);
  assert.equal(warmupSet.weight_kg, 40);
  assert.equal(warmupSet.repetitions, 10);
  assert.equal(warmupSet.is_warmup, true);
  assert.equal(warmupSet.rir, 4); // 10 - 6 = 4

  const workingSet = mapHevySetToWorkoutSet(
    { index: 1, set_type: 'normal', weight_kg: 85, reps: 8, rpe: 8.5 },
    1
  );
  assert.equal(workingSet.set_number, 2);
  assert.equal(workingSet.weight_kg, 85);
  assert.equal(workingSet.repetitions, 8);
  assert.equal(workingSet.is_warmup, false);
  assert.equal(workingSet.rir, 2); // 10 - 8.5 = 1.5 -> Math.round is 2
});

test('Hevy: workout transformation builds complete WorkoutSession with external metadata', () => {
  const syntheticHevyWorkout: HevyWorkout = {
    id: 'hevy_w_98765',
    title: 'Push Day Hypertrophy',
    start_time: '2026-10-22T10:00:00Z',
    end_time: '2026-10-22T11:15:00Z',
    created_at: '2026-10-22T11:15:00Z',
    updated_at: '2026-10-22T11:20:00Z',
    exercises: [
      {
        exercise_template_id: 'ex_bench',
        title: 'Flat Bench Press',
        sets: [
          { index: 0, set_type: 'normal', weight_kg: 80, reps: 8, rpe: 8 },
        ],
      },
    ],
  };

  const session = transformHevyWorkoutToSession(syntheticHevyWorkout);
  assert.equal(session.external_id, 'hevy_w_98765');
  assert.equal(session.source, 'hevy');
  assert.equal(session.routine_name, 'Push Day Hypertrophy');
  assert.equal(session.duration_minutes, 75);
  assert.equal(session.exercises.length, 1);
  assert.equal(session.exercises[0].primary_muscle, 'pecho');
  assert.equal(session.exercises[0].sets[0].weight_kg, 80);
});

// --- 2. Idempotency & Deduplication ---

test('Idempotency: duplicate import with same external_id is skipped and does not create duplicate', () => {
  const storage = createTestStorage();

  const session1: WorkoutSession = {
    id: 's_001',
    routine_name: 'Legs A',
    started_at: '2026-10-20T17:00:00Z',
    status: 'completed',
    exercises: [],
    source: 'hevy',
    external_id: 'hevy_unique_123',
    external_updated_at: '2026-10-20T18:00:00Z',
  };

  // First import
  const result1 = storage.batchImportWorkouts([session1]);
  assert.equal(result1.imported, 1);
  assert.equal(result1.updated, 0);
  assert.equal(result1.skipped, 0);
  assert.equal(storage.getSessions().length, 1);

  // Second import identical payload
  const result2 = storage.batchImportWorkouts([session1]);
  assert.equal(result2.imported, 0);
  assert.equal(result2.updated, 0);
  assert.equal(result2.skipped, 1);
  assert.equal(storage.getSessions().length, 1); // No duplicate added!
});

test('Idempotency: updated workout with newer timestamp updates record preserving internal ID', () => {
  const storage = createTestStorage();

  const original: WorkoutSession = {
    id: 's_persisted_id',
    routine_name: 'Pull A',
    started_at: '2026-10-21T18:00:00Z',
    status: 'completed',
    exercises: [],
    source: 'hevy',
    external_id: 'hevy_update_test',
    external_updated_at: '2026-10-21T19:00:00Z',
  };

  storage.batchImportWorkouts([original]);

  // Updated version with newer timestamp and revised title
  const updatedVersion: WorkoutSession = {
    id: 'different_transient_id',
    routine_name: 'Pull A (Heavier Deadlifts)',
    started_at: '2026-10-21T18:00:00Z',
    status: 'completed',
    exercises: [],
    source: 'hevy',
    external_id: 'hevy_update_test',
    external_updated_at: '2026-10-21T20:30:00Z', // newer
  };

  const updateResult = storage.batchImportWorkouts([updatedVersion]);
  assert.equal(updateResult.updated, 1);
  assert.equal(updateResult.imported, 0);
  assert.equal(storage.getSessions().length, 1);
  assert.equal(storage.getSessions()[0].id, 's_persisted_id'); // preserved internal ID!
  assert.equal(storage.getSessions()[0].routine_name, 'Pull A (Heavier Deadlifts)');
});

test('Integrity: manually created workouts are NEVER overwritten by external imports', () => {
  const storage = createTestStorage();

  const manualSession: WorkoutSession = {
    id: 'manual_session_01',
    routine_name: 'Rutina Manual Pro',
    started_at: '2026-10-22T08:00:00Z',
    status: 'completed',
    exercises: [],
    source: 'manual',
    external_id: 'colliding_id_test',
  };

  storage.setSessions([manualSession]);

  const externalAttempt: WorkoutSession = {
    id: 'incoming_external',
    routine_name: 'Overwriting Attempt',
    started_at: '2026-10-22T08:00:00Z',
    status: 'completed',
    exercises: [],
    source: 'hevy',
    external_id: 'colliding_id_test',
    external_updated_at: '2026-10-22T12:00:00Z',
  };

  const res = storage.batchImportWorkouts([externalAttempt]);
  assert.equal(res.skipped, 1);
  assert.equal(res.updated, 0);
  assert.equal(storage.getSessions()[0].routine_name, 'Rutina Manual Pro'); // Unchanged!
});

// --- 3. MyFitnessPal CSV Parser ---

test('MyFitnessPal: normalize meal names from English/Spanish tags', () => {
  assert.equal(normalizeMfpMeal('Breakfast'), 'desayuno');
  assert.equal(normalizeMfpMeal('Desayuno'), 'desayuno');
  assert.equal(normalizeMfpMeal('Lunch'), 'almuerzo');
  assert.equal(normalizeMfpMeal('Dinner'), 'cena');
  assert.equal(normalizeMfpMeal('Snacks'), 'merienda');
});

test('MyFitnessPal: parses authentic CSV export format and extracts macros', () => {
  const sampleMfpCsv = `Date,Meal,Food,Calories,Protein,Carbohydrates,Fat,Fiber
2026-10-20,Breakfast,"Oatmeal with Whey and Berries",420,35.5,52.0,8.2,7.5
2026-10-20,Lunch,"Chicken Breast 200g with Rice",580,54.0,65.0,7.0,3.2
2026-10-20,Dinner,"Salmon Fillet 180g with Sweet Potato",520,38.0,42.0,18.0,4.0
Total,,,,1520,127.5,159.0,33.2,14.7`;

  const logs = parseMyFitnessPalCsv(sampleMfpCsv);
  assert.equal(logs.length, 3); // summary row 'Total' ignored
  assert.equal(logs[0].consumed_at, '2026-10-20');
  assert.equal(logs[0].meal_type, 'desayuno');
  assert.equal(logs[0].food_name_snapshot, 'Oatmeal with Whey and Berries');
  assert.equal(logs[0].calories_kcal, 420);
  assert.equal(logs[0].protein_g, 35.5);
  assert.equal(logs[0].carbohydrates_g, 52);
  assert.equal(logs[0].fat_g, 8.2);
  assert.equal(logs[0].fiber_g, 7.5);
  assert.equal(logs[0].source, 'myfitnesspal');
});

// --- 4. Fitia Export Parser ---

test('Fitia: parses JSON export and normalizes meals', () => {
  const fitiaJson = JSON.stringify([
    {
      date: '2026-10-21',
      meal: 'Almuerzo',
      name: 'Pechuga a la plancha con papas',
      calories: 490,
      protein: 48,
      carbs: 45,
      fat: 10,
      grams: 350,
    },
  ]);

  const parsed = parseFitiaExport(fitiaJson);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].meal_type, 'almuerzo');
  assert.equal(parsed[0].calories_kcal, 490);
  assert.equal(parsed[0].protein_g, 48);
  assert.equal(parsed[0].source, 'fitia');
});

test('Fitia: parses CSV export with semicolon or comma', () => {
  const fitiaCsv = `Fecha,Comida,Alimento,Calorias,Proteina,Carbohidratos,Grasa,Peso
2026-10-21,Cena,Huevos revueltos con tostadas,380,24,28,18,200`;

  const parsed = parseFitiaExport(fitiaCsv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].meal_type, 'cena');
  assert.equal(parsed[0].calories_kcal, 380);
  assert.equal(parsed[0].protein_g, 24);
});

// --- 5. Health Connect Payload ---

test('Health Connect: separates steps, weight and sleep records accurately', () => {
  const payload: HealthConnectSyncPayload = {
    device_id: 'Pixel_8_Test',
    exported_at: '2026-10-22T08:00:00Z',
    permissions_granted: [
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.READ_SLEEP',
    ],
    records: [
      {
        record_type: 'steps',
        start_time: '2026-10-21T09:00:00Z',
        value: 6500,
        unit: 'count',
      },
      {
        record_type: 'steps',
        start_time: '2026-10-21T15:00:00Z',
        value: 4200,
        unit: 'count',
      },
      {
        record_type: 'weight',
        start_time: '2026-10-21T07:00:00Z',
        value: 84.5,
        unit: 'kg',
      },
      {
        record_type: 'sleep',
        start_time: '2026-10-21T23:00:00Z',
        value: 7.5,
        unit: 'hours',
      },
    ],
  };

  const processed = processHealthConnectPayload(payload);

  // Total steps for 2026-10-21 aggregated: 6500 + 4200 = 10700
  assert.equal(processed.activityLogs.length, 1);
  assert.equal(processed.activityLogs[0].activity_date, '2026-10-21');
  assert.equal(processed.activityLogs[0].steps, 10700);

  // Weight entry
  assert.equal(processed.weighIns.length, 1);
  assert.equal(processed.weighIns[0].weight_kg, 84.5);
  assert.equal(processed.weighIns[0].source, 'health_connect');

  // Sleep entry
  assert.equal(processed.recoveryLogs.length, 1);
  assert.equal(processed.recoveryLogs[0].sleep_hours, 7.5);
});

// --- 6. Extended CSV Dialect Tests (Semicolons, European Decimals, Dates) ---

test('MyFitnessPal: handles European semicolon delimiter, decimal commas and Spanish headers', () => {
  const euroCsv = `Fecha;Comida;Alimento;Calorías;Proteína;Carbohidratos;Grasa;Fibra
2026-10-22;Desayuno;Tortilla con pan de centeno;350,5;26,5;30,0;8,5;4,2
2026-10-22;Comida;Arroz integral con salmón;540,0;42,0;55,0;14,5;3,8
Resumen diario;;;890,5;68,5;85,0;23,0;8,0`;

  const logs = parseMyFitnessPalCsv(euroCsv);
  assert.equal(logs.length, 2); // Resumen diario skipped
  assert.equal(logs[0].meal_type, 'desayuno');
  assert.equal(logs[0].food_name_snapshot, 'Tortilla con pan de centeno');
  assert.equal(logs[0].calories_kcal, 351); // 350.5 rounded
  assert.equal(logs[0].protein_g, 26.5);
  assert.equal(logs[0].fiber_g, 4.2);
  assert.equal(logs[1].meal_type, 'almuerzo');
  assert.equal(logs[1].protein_g, 42);
});

test('MyFitnessPal: parses DD/MM/YYYY date formats properly', () => {
  const slashDateCsv = `Date,Meal,Food,Calories,Protein,Carbohydrates,Fat
25/10/2026,Lunch,Protein Bowl,480,45.0,50.0,9.0`;

  const logs = parseMyFitnessPalCsv(slashDateCsv);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].consumed_at, '2026-10-25');
  assert.equal(logs[0].calories_kcal, 480);
});

test('Fitia: handles semicolon CSV with European decimals and grams', () => {
  const fitiaEuroCsv = `Fecha;Comida;Alimento;Calorias;Proteina;Carbohidratos;Grasa;Peso
2026-10-22;Cena;Lomo embuchado con queso fresco;280,5;38,0;4,5;8,0;150`;

  const logs = parseFitiaExport(fitiaEuroCsv);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].consumed_at, '2026-10-22');
  assert.equal(logs[0].meal_type, 'cena');
  assert.equal(logs[0].protein_g, 38);
  assert.equal(logs[0].quantity, 150);
});

test('Food Log Idempotency: duplicate import skips identical meals and preserves manual entries', () => {
  // Simulator for food log batch import logic
  let foodLogs: any[] = [
    {
      id: 'manual_food_001',
      consumed_at: '2026-10-22',
      meal_type: 'almuerzo',
      food_name_snapshot: 'Pechuga a la plancha',
      calories_kcal: 400,
      protein_g: 45,
      carbohydrates_g: 10,
      fat_g: 5,
      source: 'manual', // Manual!
    },
  ];

  function batchImport(incoming: any[]) {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    incoming.forEach((item) => {
      const matchIndex = foodLogs.findIndex((log) => {
        if (item.external_id && log.external_id) return item.external_id === log.external_id;
        return (
          log.consumed_at === item.consumed_at &&
          log.meal_type === item.meal_type &&
          log.food_name_snapshot.toLowerCase().trim() === item.food_name_snapshot.toLowerCase().trim()
        );
      });

      if (matchIndex >= 0) {
        if (foodLogs[matchIndex].source === 'manual') {
          skipped++;
          return;
        }
        foodLogs[matchIndex] = { ...item, id: foodLogs[matchIndex].id };
        updated++;
      } else {
        foodLogs.push(item);
        imported++;
      }
    });

    return { imported, updated, skipped };
  }

  // Attempt 1: Try importing an external record that collides with the manual entry
  const incomingColliding = [
    {
      id: 'ext_1',
      external_id: 'mfp_item_1',
      consumed_at: '2026-10-22',
      meal_type: 'almuerzo',
      food_name_snapshot: 'Pechuga a la plancha',
      calories_kcal: 450, // different calories
      protein_g: 48,
      source: 'myfitnesspal',
    },
    {
      id: 'ext_2',
      external_id: 'mfp_item_2',
      consumed_at: '2026-10-22',
      meal_type: 'desayuno',
      food_name_snapshot: 'Avena con leche',
      calories_kcal: 320,
      protein_g: 18,
      source: 'myfitnesspal',
    },
  ];

  const res1 = batchImport(incomingColliding);
  assert.equal(res1.skipped, 1); // Manual entry protected from overwrite!
  assert.equal(res1.imported, 1); // Breakfast was new and imported
  assert.equal(foodLogs.length, 2);
  assert.equal(foodLogs[0].source, 'manual');
  assert.equal(foodLogs[0].calories_kcal, 400); // Unchanged!

  // Attempt 2: Re-importing exact same payload
  const res2 = batchImport(incomingColliding);
  assert.equal(res2.skipped, 1); // Colliding manual skipped again
  assert.equal(res2.imported, 0); // No new duplicates!
  assert.equal(res2.updated, 1); // Breakfast was updated cleanly
  assert.equal(foodLogs.length, 2); // No duplicate rows created!
});

