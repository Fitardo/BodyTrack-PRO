/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Link2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Upload,
  Smartphone,
  Info,
  Key,
  Trash2,
  Code2,
  Dumbbell,
  Utensils,
  Activity,
  ChevronDown,
  ChevronUp,
  Watch,
  WifiOff,
  HeartPulse,
  Moon,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { HevyConnector } from '../../services/integrations/hevyConnector';
import { SyncManager } from '../../services/integrations/syncManager';
import {
  HEALTH_CONNECT_PERMISSIONS,
  ANDROID_COMPANION_SPEC,
} from '../../services/integrations/healthConnectConnector';
import {
  IntegrationProvider,
  ProviderConfig,
  SyncLogEntry,
} from '../../types/integrations';
import { OFFLINE_ARCHITECTURE_SPEC } from '../../utils/auditAndRetentionUtils';

interface IntegrationsViewProps {
  onDataImported?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onDataImported }) => {
  const [configs, setConfigs] = useState<Record<IntegrationProvider, ProviderConfig>>(
    StorageService.getIntegrationConfigs()
  );
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(StorageService.getSyncLogs());
  const [activeTab, setActiveTab] = useState<
    IntegrationProvider | 'wearables_rhr' | 'offline_audit' | 'logs'
  >('hevy');

  // Hevy form state
  const [hevyApiKey, setHevyApiKey] = useState<string>('');
  const [isHevyVerifying, setIsHevyVerifying] = useState<boolean>(false);
  const [isHevySyncing, setIsHevySyncing] = useState<boolean>(false);
  const [hevyFeedback, setHevyFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // File upload state for MFP & Fitia
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [fileFeedback, setFileFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Health connect mock/bridge payload state
  const [healthConnectJson, setHealthConnectJson] = useState<string>('');
  const [showAndroidSpec, setShowAndroidSpec] = useState<boolean>(false);
  const [hcFeedback, setHcFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Wearables (Samsung Health / Smartwatch RHR & Sleep) state
  const [wearableProvider, setWearableProvider] = useState<
    'samsung_health' | 'garmin_connect' | 'health_connect_watch'
  >('samsung_health');
  const [simulatedRhrBpm, setSimulatedRhrBpm] = useState<number>(56);
  const [simulatedSleepHours, setSimulatedSleepHours] = useState<number>(7.9);
  const [simulatedSteps, setSimulatedSteps] = useState<number>(9200);
  const [wearableFeedback, setWearableFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function checkServerStatus() {
      try {
        const res = await fetch('/api/integrations/status');
        if (res.ok) {
          const data = await res.json();
          if (data.hevy?.hasKey && configs.hevy.status === 'not_configured') {
            StorageService.saveIntegrationConfig('hevy', { status: 'connected' });
            setConfigs(StorageService.getIntegrationConfigs());
          }
        }
      } catch {
        // Server status optional check
      }
    }
    checkServerStatus();
  }, []);

  const refreshData = () => {
    setConfigs(StorageService.getIntegrationConfigs());
    setSyncLogs(StorageService.getSyncLogs());
    if (onDataImported) onDataImported();
  };

  // --- Hevy Handlers ---
  const handleVerifyHevy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hevyApiKey.trim()) return;

    setIsHevyVerifying(true);
    setHevyFeedback(null);

    const res = await HevyConnector.verifyApiKey(hevyApiKey);
    setIsHevyVerifying(false);

    if (res.success) {
      StorageService.saveIntegrationConfig('hevy', {
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        error_message: undefined,
      });
      setHevyFeedback({
        type: 'success',
        message: `${res.message} (${res.workoutCount ?? 0} entrenamientos disponibles)`,
      });
      setHevyApiKey('');
      refreshData();
    } else {
      StorageService.saveIntegrationConfig('hevy', {
        status: 'error',
        error_message: res.message,
      });
      setHevyFeedback({ type: 'error', message: res.message });
      refreshData();
    }
  };

  const handleSyncHevy = async () => {
    setIsHevySyncing(true);
    setHevyFeedback(null);

    const result = await SyncManager.syncHevy();
    setIsHevySyncing(false);

    if (result.success) {
      setHevyFeedback({
        type: 'success',
        message: `Sincronización exitosa: ${result.imported} nuevos entrenamientos, ${result.updated} actualizados, ${result.skipped} omitidos.`,
      });
    } else {
      setHevyFeedback({
        type: 'error',
        message: result.error || 'Ocurrió un error al sincronizar con Hevy.',
      });
    }
    refreshData();
  };

  const handleDisconnectHevy = async () => {
    await SyncManager.disconnectProvider('hevy');
    setHevyFeedback({
      type: 'success',
      message: 'Hevy desconectado y credenciales revocadas del servidor.',
    });
    refreshData();
  };

  // --- MyFitnessPal File Import ---
  const handleMfpFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = SyncManager.importMyFitnessPalCsv(content);
      setIsProcessingFile(false);

      if (res.success) {
        setFileFeedback({
          type: 'success',
          message: `Archivo MyFitnessPal procesado: ${res.imported} comidas importadas, ${res.updated} actualizadas, ${res.skipped} omitidas.`,
        });
      } else {
        setFileFeedback({
          type: 'error',
          message: res.error || 'No se pudo procesar el archivo CSV de MyFitnessPal.',
        });
      }
      refreshData();
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      setFileFeedback({ type: 'error', message: 'Error de lectura de archivo local.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Fitia File Import ---
  const handleFitiaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setFileFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = SyncManager.importFitiaContent(content);
      setIsProcessingFile(false);

      if (res.success) {
        setFileFeedback({
          type: 'success',
          message: `Historial de Fitia procesado: ${res.imported} alimentos registrados, ${res.updated} actualizados, ${res.skipped} omitidos.`,
        });
      } else {
        setFileFeedback({
          type: 'error',
          message: res.error || 'No se pudo procesar el archivo de exportación de Fitia.',
        });
      }
      refreshData();
    };
    reader.onerror = () => {
      setIsProcessingFile(false);
      setFileFeedback({ type: 'error', message: 'Error de lectura del archivo de Fitia.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // --- Health Connect Payload Import ---
  const handleImportHealthConnectPayload = () => {
    if (!healthConnectJson.trim()) return;

    try {
      const parsed = JSON.parse(healthConnectJson);
      const res = SyncManager.importHealthConnectPayload(parsed);

      if (res.success) {
        setHcFeedback({
          type: 'success',
          message: `Paquete Health Connect sincronizado: ${res.imported} registros ingresados, ${res.updated} actualizados, ${res.skipped} omitidos.`,
        });
        setHealthConnectJson('');
      } else {
        setHcFeedback({
          type: 'error',
          message: res.error || 'Error al validar el paquete de Health Connect.',
        });
      }
      refreshData();
    } catch {
      setHcFeedback({
        type: 'error',
        message: 'El texto ingresado no es un JSON válido según el esquema de Health Connect.',
      });
    }
  };

  const handleLoadDemoHealthConnect = () => {
    const demoPayload = {
      device_id: 'Pixel_8_Pro_Android_14',
      exported_at: new Date().toISOString(),
      permissions_granted: [
        'android.permission.health.READ_STEPS',
        'android.permission.health.READ_WEIGHT',
        'android.permission.health.READ_SLEEP',
        'android.permission.health.READ_HEART_RATE',
      ],
      records: [
        {
          record_type: 'steps',
          start_time: '2026-10-22T08:00:00Z',
          value: 10450,
          unit: 'count',
          source_app: 'com.google.android.apps.fitness',
        },
        {
          record_type: 'weight',
          start_time: '2026-10-22T07:15:00Z',
          value: 84.2,
          unit: 'kg',
          source_app: 'com.withings.wiscale2',
        },
        {
          record_type: 'sleep',
          start_time: '2026-10-22T06:30:00Z',
          value: 7.8,
          unit: 'hours',
          source_app: 'com.sec.android.app.shealth',
        },
      ],
    };
    setHealthConnectJson(JSON.stringify(demoPayload, null, 2));
  };

  // --- Sync Smartwatch / Samsung Health RHR + Sleep ---
  const handleSyncWearableMetrics = () => {
    const todayStr = '2026-10-22';
    StorageService.saveRecoveryLog({
      id: `rec-wearable-${Date.now()}`,
      recorded_at: todayStr,
      sleep_hours: simulatedSleepHours,
      sleep_quality: simulatedSleepHours >= 7.5 ? 5 : 4,
      resting_heart_rate_bpm: simulatedRhrBpm,
      fatigue_level: simulatedRhrBpm <= 60 ? 3 : 6,
      soreness_level: 3,
      stress_level: 3,
      notes: `Sincronizado desde ${
        wearableProvider === 'samsung_health'
          ? 'Samsung Health (Galaxy Watch)'
          : wearableProvider === 'garmin_connect'
          ? 'Garmin Connect'
          : 'Google Health Connect'
      }: FC Reposo ${simulatedRhrBpm} bpm, Sueño ${simulatedSleepHours}h`,
    });

    StorageService.saveActivityLog({
      id: `act-wearable-${Date.now()}`,
      activity_date: todayStr,
      steps: simulatedSteps,
      active_minutes: Math.round(simulatedSteps / 110),
    });

    StorageService.addSyncLog({
      id: `sync_wearable_${Date.now()}`,
      provider: 'health_connect',
      provider_name:
        wearableProvider === 'samsung_health'
          ? 'Samsung Health / Galaxy Watch'
          : wearableProvider === 'garmin_connect'
          ? 'Garmin Smartwatch'
          : 'Google Health Connect',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      status: 'success',
      records_imported: 2,
      records_updated: 0,
      records_skipped: 0,
      duration_ms: 140,
      details: `FC en reposo (${simulatedRhrBpm} bpm), Sueño (${simulatedSleepHours}h) y Pasos (${simulatedSteps}) importados.`,
    });

    setWearableFeedback(
      `¡Datos biométricos sincronizados!: FC en reposo (${simulatedRhrBpm} bpm), Sueño (${simulatedSleepHours}h) y ${simulatedSteps.toLocaleString()} pasos.`
    );
    refreshData();
  };

  // Status badge helper
  const renderStatusBadge = (cfg: ProviderConfig) => {
    switch (cfg.status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Conectada
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Pendiente de Autorización
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Error de Conexión
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <XCircle className="w-3.5 h-3.5" />
            Desconectada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            No configurada
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-400" />
              <span>Integraciones, Wearables y Arquitectura Offline</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Conectores oficiales (Hevy, Health Connect, Samsung Health, Smartwatches) y auditoría de modo sin conexión.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Claves seguras en servidor (Sin exposición local)</span>
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('hevy')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'hevy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Hevy (API Oficial)</span>
          </button>

          <button
            type="button"
            data-testid="tab-wearables-rhr"
            onClick={() => setActiveTab('wearables_rhr')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'wearables_rhr'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            <span>Samsung Health & Smartwatches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health_connect')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'health_connect'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Google Health Connect</span>
          </button>

          <button
            type="button"
            data-testid="tab-offline-audit"
            onClick={() => setActiveTab('offline_audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'offline_audit'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Arquitectura Offline</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('myfitnesspal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'myfitnesspal'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>MyFitnessPal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fitia')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'fitia'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Fitia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ml-auto cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-zinc-800 text-white border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Historial ({syncLogs.length})</span>
          </button>
        </div>
      </div>

      {/* --- SAMSUNG HEALTH & SMARTWATCHES (RHR & SLEEP) TAB --- */}
      {activeTab === 'wearables_rhr' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Watch className="w-5 h-5 text-emerald-400" />
                <span>
                  Viabilidad Técnica y Conector: Google Health Connect, Samsung Health y Smartwatches
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Importación de frecuencia cardíaca en reposo (RHR), arquitectura de sueño y actividad diaria para ajustar el volumen de entrenamiento según tu recuperación autonómica.
              </p>
            </div>

            {wearableFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{wearableFeedback}</span>
              </div>
            )}

            {/* Feasibility Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  Google Health Connect
                </span>
                <h4 className="font-bold text-white">Puente Unificado Android 14+</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Centraliza lecturas de <code>HeartRateRecord</code>, <code>RestingHeartRateRecord</code> y <code>SleepSessionRecord</code> mediante permisos explícitos en Android.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
                  Samsung Health (Galaxy Watch)
                </span>
                <h4 className="font-bold text-white">Sincronización Bidireccional</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Samsung Health sincroniza nativamente con Health Connect o exporta paquetes JSON/CSV con FC basal nocturna y fases REM/profundo.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                  Smartwatches (Garmin / WearOS)
                </span>
                <h4 className="font-bold text-white">Impacto en Recuperación PPL</h4>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Una subida de +5–8 bpm en tu FC en reposo o &lt;6h de sueño alerta sobre fatiga del SNC, sugiriendo mantener RIR 2–3 en el entreno.
                </p>
              </div>
            </div>

            {/* Interactive Wearable Sync Simulator */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulador de Sincronización Biométrica (FC Reposo & Sueño)
                </h4>
                <select
                  value={wearableProvider}
                  onChange={(e) => setWearableProvider(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
                >
                  <option value="samsung_health">Samsung Health (Galaxy Watch 6)</option>
                  <option value="health_connect_watch">Google Health Connect (Pixel Watch)</option>
                  <option value="garmin_connect">Garmin Connect (Forerunner / Fenix)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-300 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    <span>FC en Reposo (bpm)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={simulatedRhrBpm}
                    onChange={(e) => setSimulatedRhrBpm(parseInt(e.target.value) || 58)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 mb-1 flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-violet-400" />
                    <span>Horas de Sueño (h)</span>
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={simulatedSleepHours}
                    onChange={(e) => setSimulatedSleepHours(parseFloat(e.target.value) || 7.5)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pasos Registrados</span>
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="100"
                    value={simulatedSteps}
                    onChange={(e) => setSimulatedSteps(parseInt(e.target.value) || 8000)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                data-testid="sync-wearable-biometrics-btn"
                onClick={handleSyncWearableMetrics}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Importar FC en Reposo, Sueño y Pasos al Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- OFFLINE ARCHITECTURE AUDIT TAB --- */}
      {activeTab === 'offline_audit' && (
        <div
          data-testid="offline-architecture-audit-panel"
          className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <WifiOff className="w-5 h-5 text-emerald-400" />
                <span>Auditoría de Arquitectura Offline-First y Sincronización</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Documentación técnica del comportamiento sin conexión y resolución de conflictos al recuperar conectividad.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              {OFFLINE_ARCHITECTURE_SPEC.storageEngine}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Módulos 100% Operativos Sin Conexión (Offline-First CRUD)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {OFFLINE_ARCHITECTURE_SPEC.availableOffline.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-200"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase">
                Operaciones que Requieren Red
              </h4>
              <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-1">
                {OFFLINE_ARCHITECTURE_SPEC.requiresConnection.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <h4 className="text-xs font-bold text-cyan-400 uppercase">
                Comportamiento de Sincronización al Reconectar
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {OFFLINE_ARCHITECTURE_SPEC.syncBehaviorOnReconnect}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- HEVY TAB --- */}
      {activeTab === 'hevy' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">Hevy Workout Tracker</h3>
                  {renderStatusBadge(configs.hevy)}
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  Conexión oficial directa mediante la API v1 de Hevy (
                  <code>https://api.hevyapp.com/v1</code>). Permite importar sesiones de entrenamiento, ejercicios, series, cargas en kilogramos, repeticiones y estimaciones de RPE/RIR.
                </p>
              </div>

              {configs.hevy.status === 'connected' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncHevy}
                    disabled={isHevySyncing}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isHevySyncing ? 'animate-spin' : ''}`}
                    />
                    <span>{isHevySyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectHevy}
                    className="p-2 rounded-xl bg-zinc-950 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs transition-colors cursor-pointer"
                    title="Desconectar y borrar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {hevyFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  hevyFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {hevyFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{hevyFeedback.message}</span>
              </div>
            )}

            <form
              onSubmit={handleVerifyHevy}
              className="space-y-4 pt-2 border-t border-zinc-800/80"
            >
              <label htmlFor="hevy-api-key" className="block text-xs font-semibold text-zinc-300">
                {configs.hevy.status === 'connected'
                  ? 'Actualizar Clave de API'
                  : 'Clave de API de Hevy'}
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    id="hevy-api-key"
                    type="password"
                    value={hevyApiKey}
                    onChange={(e) => setHevyApiKey(e.target.value)}
                    placeholder="Pega aquí tu Personal API Key de Hevy (ej. hevy_api_...)"
                    className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isHevyVerifying || !hevyApiKey.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isHevyVerifying ? 'animate-spin' : ''}`}
                  />
                  <span>{isHevyVerifying ? 'Verificando...' : 'Verificar y Conectar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MYFITNESSPAL TAB --- */}
      {activeTab === 'myfitnesspal' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">MyFitnessPal</h3>
              {renderStatusBadge(configs.myfitnesspal)}
            </div>
            {fileFeedback && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                {fileFeedback.message}
              </div>
            )}
            <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 text-center space-y-3">
              <Upload className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-white">
                Cargar exportación de MyFitnessPal (archivo .csv)
              </p>
              <label
                htmlFor="mfp-csv-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isProcessingFile ? 'Procesando...' : 'Seleccionar Archivo CSV'}</span>
                <input
                  id="mfp-csv-input"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleMfpFileUpload}
                  disabled={isProcessingFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* --- FITIA TAB --- */}
      {activeTab === 'fitia' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">Fitia Nutrición</h3>
              {renderStatusBadge(configs.fitia)}
            </div>
            <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 text-center space-y-3">
              <Upload className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-xs font-semibold text-white">
                Cargar exportación de Fitia (.json o .csv)
              </p>
              <label
                htmlFor="fitia-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isProcessingFile ? 'Procesando...' : 'Seleccionar Archivo Fitia'}</span>
                <input
                  id="fitia-file-input"
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={handleFitiaFileUpload}
                  disabled={isProcessingFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* --- HEALTH CONNECT TAB --- */}
      {activeTab === 'health_connect' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">Android Health Connect</h3>
              {renderStatusBadge(configs.health_connect)}
            </div>

            {hcFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  hcFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span>{hcFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {HEALTH_CONNECT_PERMISSIONS.map((perm) => (
                <div
                  key={perm.key}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{perm.label}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {perm.dataType}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">{perm.purpose}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-300">
                  Ingesta de Paquete de Sincronización Móvil (JSON)
                </h4>
                <button
                  type="button"
                  onClick={handleLoadDemoHealthConnect}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                >
                  Cargar paquete sintético de prueba (Pixel 8 + Galaxy Watch)
                </button>
              </div>

              <textarea
                value={healthConnectJson}
                onChange={(e) => setHealthConnectJson(e.target.value)}
                placeholder="Pega aquí el paquete JSON exportado por Health Connect..."
                rows={5}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleImportHealthConnectPayload}
                  disabled={!healthConnectJson.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Procesar e Importar Paquete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAndroidSpec(!showAndroidSpec)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>
                    {showAndroidSpec ? 'Ocultar arquitectura' : 'Ver arquitectura Android Kotlin'}
                  </span>
                  {showAndroidSpec ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {showAndroidSpec && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-emerald-400 font-bold">
                    {ANDROID_COMPANION_SPEC.architectureName}
                  </span>
                  <span className="text-zinc-500 text-[10px]">Min SDK 26 | Target SDK 34</span>
                </div>
                <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-200 text-[11px] overflow-x-auto">
                  {ANDROID_COMPANION_SPEC.manifestPermissions.join('\n')}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SYNC LOGS TAB --- */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Registro de Auditoría de Sincronizaciones
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Historial detallado de importaciones, actualizaciones y control de duplicados.
                </p>
              </div>

              {syncLogs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    StorageService.clearSyncLogs();
                    refreshData();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 text-zinc-400 hover:text-rose-400 text-xs border border-zinc-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Historial</span>
                </button>
              )}
            </div>

            {syncLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No hay sincronizaciones registradas aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Fecha y Hora</th>
                      <th className="py-2.5 px-3">Proveedor</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Nuevos</th>
                      <th className="py-2.5 px-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                          {new Date(log.started_at).toLocaleString('es-AR')}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">
                          {log.provider_name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">
                          {log.records_imported}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                          {log.details || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
