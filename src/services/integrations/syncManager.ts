/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StorageService } from '../storage';
import { HevyConnector } from './hevyConnector';
import { parseMyFitnessPalCsv } from './myFitnessPalConnector';
import { parseFitiaExport } from './fitiaConnector';
import { processHealthConnectPayload } from './healthConnectConnector';
import { IntegrationProvider, SyncLogEntry, HealthConnectSyncPayload } from '../../types/integrations';

export const SyncManager = {
  /**
   * Run sync for Hevy workouts
   */
  async syncHevy(): Promise<{
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
  }> {
    const startTime = new Date().toISOString();
    const t0 = performance.now();

    try {
      const res = await HevyConnector.syncWorkouts();
      const durationMs = Math.round(performance.now() - t0);

      if (!res.success || !res.workouts) {
        const errorLog: SyncLogEntry = {
          id: `sync_err_${Date.now()}`,
          provider: 'hevy',
          provider_name: 'Hevy Workout Tracker',
          started_at: startTime,
          completed_at: new Date().toISOString(),
          status: 'error',
          records_imported: 0,
          records_updated: 0,
          records_skipped: 0,
          duration_ms: durationMs,
          error_message: res.error || 'Error de sincronización con Hevy',
        };
        StorageService.addSyncLog(errorLog);
        StorageService.saveIntegrationConfig('hevy', {
          status: 'error',
          error_message: res.error,
        });

        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          error: res.error,
        };
      }

      // Batch import with idempotency safeguards
      const stats = StorageService.batchImportWorkouts(res.workouts);

      const log: SyncLogEntry = {
        id: `sync_hevy_${Date.now()}`,
        provider: 'hevy',
        provider_name: 'Hevy Workout Tracker',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: 'success',
        records_imported: stats.imported,
        records_updated: stats.updated,
        records_skipped: stats.skipped,
        duration_ms: durationMs,
        details: `${stats.imported} nuevos entrenamientos, ${stats.updated} actualizados, ${stats.skipped} idénticos/omitidos.`,
      };
      StorageService.addSyncLog(log);

      StorageService.saveIntegrationConfig('hevy', {
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        error_message: undefined,
      });

      return {
        success: true,
        ...stats,
      };
    } catch (e: unknown) {
      const durationMs = Math.round(performance.now() - t0);
      const msg = e instanceof Error ? e.message : 'Error inesperado';
      const errorLog: SyncLogEntry = {
        id: `sync_err_${Date.now()}`,
        provider: 'hevy',
        provider_name: 'Hevy Workout Tracker',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: 'error',
        records_imported: 0,
        records_updated: 0,
        records_skipped: 0,
        duration_ms: durationMs,
        error_message: msg,
      };
      StorageService.addSyncLog(errorLog);
      StorageService.saveIntegrationConfig('hevy', {
        status: 'error',
        error_message: msg,
      });

      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        error: msg,
      };
    }
  },

  /**
   * Import MyFitnessPal CSV file
   */
  importMyFitnessPalCsv(csvContent: string): {
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
  } {
    const startTime = new Date().toISOString();
    const t0 = performance.now();

    try {
      const logs = parseMyFitnessPalCsv(csvContent);
      if (logs.length === 0) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          error: 'No se encontraron registros nutricionales válidos en el archivo CSV de MyFitnessPal.',
        };
      }

      const stats = StorageService.batchImportFoodLogs(logs);
      const durationMs = Math.round(performance.now() - t0);

      const log: SyncLogEntry = {
        id: `sync_mfp_${Date.now()}`,
        provider: 'myfitnesspal',
        provider_name: 'MyFitnessPal (Exportación CSV)',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: 'success',
        records_imported: stats.imported,
        records_updated: stats.updated,
        records_skipped: stats.skipped,
        duration_ms: durationMs,
        details: `${stats.imported} comidas importadas, ${stats.updated} actualizadas, ${stats.skipped} duplicados omitidos.`,
      };
      StorageService.addSyncLog(log);

      StorageService.saveIntegrationConfig('myfitnesspal', {
        last_sync_at: new Date().toISOString(),
      });

      return {
        success: true,
        ...stats,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al procesar archivo MyFitnessPal';
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        error: msg,
      };
    }
  },

  /**
   * Import Fitia CSV or JSON file
   */
  importFitiaContent(content: string): {
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
  } {
    const startTime = new Date().toISOString();
    const t0 = performance.now();

    try {
      const logs = parseFitiaExport(content);
      if (logs.length === 0) {
        return {
          success: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          error: 'No se encontraron registros de alimentos en el archivo de Fitia.',
        };
      }

      const stats = StorageService.batchImportFoodLogs(logs);
      const durationMs = Math.round(performance.now() - t0);

      const log: SyncLogEntry = {
        id: `sync_fitia_${Date.now()}`,
        provider: 'fitia',
        provider_name: 'Fitia Nutrición',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: 'success',
        records_imported: stats.imported,
        records_updated: stats.updated,
        records_skipped: stats.skipped,
        duration_ms: durationMs,
        details: `${stats.imported} alimentos cargados, ${stats.updated} actualizados, ${stats.skipped} omitidos.`,
      };
      StorageService.addSyncLog(log);

      StorageService.saveIntegrationConfig('fitia', {
        last_sync_at: new Date().toISOString(),
      });

      return {
        success: true,
        ...stats,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error procesando archivo Fitia';
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        error: msg,
      };
    }
  },

  /**
   * Ingest Health Connect JSON sync package
   */
  importHealthConnectPayload(payload: HealthConnectSyncPayload): {
    success: boolean;
    imported: number;
    updated: number;
    skipped: number;
    error?: string;
  } {
    const startTime = new Date().toISOString();
    const t0 = performance.now();

    try {
      const { activityLogs, weighIns } = processHealthConnectPayload(payload);
      const actStats = StorageService.batchImportActivityLogs(activityLogs);
      const weightStats = StorageService.batchImportWeighIns(weighIns);

      const totalImported = actStats.imported + weightStats.imported;
      const totalUpdated = actStats.updated + weightStats.updated;
      const totalSkipped = actStats.skipped + weightStats.skipped;
      const durationMs = Math.round(performance.now() - t0);

      const log: SyncLogEntry = {
        id: `sync_hc_${Date.now()}`,
        provider: 'health_connect',
        provider_name: 'Android Health Connect',
        started_at: startTime,
        completed_at: new Date().toISOString(),
        status: 'success',
        records_imported: totalImported,
        records_updated: totalUpdated,
        records_skipped: totalSkipped,
        duration_ms: durationMs,
        details: `Dispositivo ${payload.device_id}: ${actStats.imported} días de actividad y ${weightStats.imported} pesajes.`,
      };
      StorageService.addSyncLog(log);

      StorageService.saveIntegrationConfig('health_connect', {
        status: 'connected',
        last_sync_at: new Date().toISOString(),
      });

      return {
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error importando datos de Health Connect';
      return {
        success: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        error: msg,
      };
    }
  },

  /**
   * Disconnect any provider and revoke stored state
   */
  async disconnectProvider(provider: IntegrationProvider): Promise<void> {
    if (provider === 'hevy') {
      await HevyConnector.disconnect();
    }

    StorageService.saveIntegrationConfig(provider, {
      status: 'disconnected',
      error_message: undefined,
    });

    const log: SyncLogEntry = {
      id: `disconnect_${provider}_${Date.now()}`,
      provider,
      provider_name: provider.toUpperCase(),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'partial',
      records_imported: 0,
      records_updated: 0,
      records_skipped: 0,
      duration_ms: 10,
      details: `Proveedor ${provider} desconectado y credenciales del servidor revocadas por el usuario.`,
    };
    StorageService.addSyncLog(log);
  },
};
