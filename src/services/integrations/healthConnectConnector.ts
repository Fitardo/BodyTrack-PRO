/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivityLog, WeighIn, RecoveryLog } from '../../types';
import { HealthConnectSyncPayload, HealthConnectRecord } from '../../types/integrations';

export const HEALTH_CONNECT_PERMISSIONS = [
  {
    key: 'android.permission.health.READ_STEPS',
    label: 'Pasos diarios',
    dataType: 'StepsRecord',
    purpose: 'Cálculo del NEAT (termogénesis no asociada al ejercicio) y gasto calórico.',
    required: true,
  },
  {
    key: 'android.permission.health.READ_WEIGHT',
    label: 'Peso corporal',
    dataType: 'WeightRecord',
    purpose: 'Registro de pesajes matutinos sincronizados con básculas inteligentes.',
    required: true,
  },
  {
    key: 'android.permission.health.READ_SLEEP',
    label: 'Sesiones de sueño',
    dataType: 'SleepSessionRecord',
    purpose: 'Monitoreo de horas y calidad de descanso para el análisis de recuperación.',
    required: false,
  },
  {
    key: 'android.permission.health.READ_TOTAL_CALORIES_BURNED',
    label: 'Calorías activas quemadas',
    dataType: 'TotalCaloriesBurnedRecord',
    purpose: 'Gasto energético por actividades cardiovasculares.',
    required: false,
  },
];

export const ANDROID_COMPANION_SPEC = {
  architectureName: 'BodyTrack Android Companion Bridge',
  minSdkVersion: 26,
  targetSdkVersion: 34,
  requiredLibrary: 'androidx.health.connect:connect-client:1.1.0-alpha10',
  manifestPermissions: [
    '<uses-permission android:name="android.permission.health.READ_STEPS"/>',
    '<uses-permission android:name="android.permission.health.READ_WEIGHT"/>',
    '<uses-permission android:name="android.permission.health.READ_SLEEP"/>',
    '<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED"/>',
  ],
  privacyRationaleActivity: 'com.bodytrackpro.companion.PermissionsRationaleActivity',
  syncEndpoint: '/api/integrations/health-connect/sync',
};

/**
 * Transforms incoming Health Connect records into BodyTrack Pro domain models
 */
export function processHealthConnectPayload(payload: HealthConnectSyncPayload): {
  activityLogs: ActivityLog[];
  weighIns: WeighIn[];
  recoveryLogs: RecoveryLog[];
} {
  const activityMap = new Map<string, ActivityLog>();
  const weighIns: WeighIn[] = [];
  const recoveryMap = new Map<string, Partial<RecoveryLog>>();

  (payload.records || []).forEach((rec: HealthConnectRecord) => {
    const dateStr = rec.start_time.split('T')[0];

    if (rec.record_type === 'steps') {
      const existing = activityMap.get(dateStr) || {
        id: `hc_act_${dateStr}`,
        activity_date: dateStr,
        steps: 0,
        source: 'health_connect',
        external_id: `hc_steps_${dateStr}`,
      };
      existing.steps += Math.round(rec.value);
      activityMap.set(dateStr, existing);
    } else if (rec.record_type === 'distance') {
      const existing = activityMap.get(dateStr) || {
        id: `hc_act_${dateStr}`,
        activity_date: dateStr,
        steps: 0,
        source: 'health_connect',
        external_id: `hc_steps_${dateStr}`,
      };
      existing.distance_km = (existing.distance_km || 0) + Math.round((rec.value / 1000) * 10) / 10;
      activityMap.set(dateStr, existing);
    } else if (rec.record_type === 'weight') {
      weighIns.push({
        id: `hc_weight_${rec.start_time.replace(/[:.]/g, '_')}`,
        measured_at: dateStr,
        weight_kg: Math.round(rec.value * 10) / 10,
        fasting: true,
        source: 'health_connect',
        external_id: `hc_w_${rec.start_time}`,
        notes: `Importado de Health Connect (${rec.source_app || 'Sensor'})`,
      });
    } else if (rec.record_type === 'sleep') {
      const existingRec = recoveryMap.get(dateStr) || {
        id: `hc_rec_${dateStr}`,
        recorded_at: dateStr,
        sleep_hours: 0,
        sleep_quality: 3,
        fatigue: 2,
        soreness: 2,
        energy: 4,
        hunger: 3,
        stress: 2,
      };
      // value in hours
      existingRec.sleep_hours = (existingRec.sleep_hours || 0) + Math.round(rec.value * 10) / 10;
      recoveryMap.set(dateStr, existingRec);
    }
  });

  const recoveryLogs: RecoveryLog[] = Array.from(recoveryMap.values()).map((r) => r as RecoveryLog);

  return {
    activityLogs: Array.from(activityMap.values()),
    weighIns,
    recoveryLogs,
  };
}

export const HealthConnectConnector = {
  getArchitectureSpec() {
    return ANDROID_COMPANION_SPEC;
  },
  getPermissions() {
    return HEALTH_CONNECT_PERMISSIONS;
  },
  processPayload(payload: HealthConnectSyncPayload) {
    return processHealthConnectPayload(payload);
  },
};
