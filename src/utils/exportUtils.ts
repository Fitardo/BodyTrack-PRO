/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeighIn, BodyMeasurement, FoodLog, WorkoutSession, ActivityLog } from '../types';

/**
 * Trigger browser file download for text/blob
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Weigh-ins to CSV
 */
export function exportWeighInsToCSV(weighIns: WeighIn[]) {
  const headers = ['Fecha', 'Peso_kg', 'Ayunas', 'Hora', 'Contexto', 'Notas'];
  const rows = weighIns.map((w) => [
    w.measured_at,
    w.weight_kg,
    w.fasting ? 'Sí' : 'No',
    w.time_of_day || '',
    w.context || 'normal',
    `"${(w.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(`BodyTrackPro_Pesajes_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

/**
 * Export Body Measurements to CSV
 */
export function exportMeasurementsToCSV(measurements: BodyMeasurement[]) {
  const headers = ['Fecha', 'Cintura_cm', 'Cuello_cm', 'Pecho_cm', 'Cadera_cm', 'Brazo_Relajado_cm', 'Brazo_Flexionado_cm', 'Muslo_cm', 'Pantorrilla_cm', 'Grasa_Corporal_Porc', 'Metodo', 'Notas'];
  const rows = measurements.map((m) => [
    m.measured_at,
    m.waist_cm,
    m.neck_cm || '',
    m.chest_cm || '',
    m.hip_cm || '',
    m.arm_relaxed_cm || '',
    m.arm_flexed_cm || '',
    m.thigh_cm || '',
    m.calf_cm || '',
    m.body_fat_percent || '',
    m.body_fat_method || '',
    `"${(m.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(`BodyTrackPro_Medidas_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

/**
 * Export Food Logs to CSV
 */
export function exportFoodLogsToCSV(logs: FoodLog[]) {
  const headers = ['Fecha', 'Hora', 'Comida', 'Alimento', 'Cantidad', 'Unidad', 'Estado', 'Calorias_kcal', 'Proteina_g', 'Carbohidratos_g', 'Grasas_g', 'Fibra_g'];
  const rows = logs.map((l) => [
    l.consumed_at,
    l.consumed_time || '',
    l.meal_type,
    `"${l.food_name_snapshot.replace(/"/g, '""')}"`,
    l.quantity,
    l.unit,
    l.preparation_state || '',
    l.calories_kcal,
    l.protein_g,
    l.carbohydrates_g,
    l.fat_g,
    l.fiber_g || 0,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(`BodyTrackPro_Nutricion_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

/**
 * Export Workouts to CSV
 */
export function exportWorkoutsToCSV(sessions: WorkoutSession[]) {
  const headers = ['Fecha', 'Rutina', 'Duracion_min', 'Estado', 'RPE', 'Ejercicio', 'Serie', 'Peso_kg', 'Reps', 'RIR', 'Calentamiento'];
  const rows: string[][] = [];

  for (const s of sessions) {
    const dateStr = s.started_at.split('T')[0];
    for (const ex of s.exercises) {
      for (const st of ex.sets) {
        rows.push([
          dateStr,
          `"${s.routine_name.replace(/"/g, '""')}"`,
          String(s.duration_minutes || 0),
          s.status,
          String(s.perceived_rpe || ''),
          `"${ex.exercise_name_snapshot.replace(/"/g, '""')}"`,
          String(st.set_number),
          String(st.weight_kg),
          String(st.repetitions),
          String(st.rir ?? ''),
          st.is_warmup ? 'Sí' : 'No',
        ]);
      }
    }
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(`BodyTrackPro_Entrenamientos_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
}

/**
 * Full JSON Backup Export
 */
export function exportFullBackupJSON(data: Record<string, unknown>) {
  const json = JSON.stringify(data, null, 2);
  downloadFile(`BodyTrackPro_Backup_${new Date().toISOString().split('T')[0]}.json`, json, 'application/json');
}
