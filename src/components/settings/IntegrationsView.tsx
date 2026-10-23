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
  ExternalLink,
  Code2,
  Dumbbell,
  Utensils,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { HevyConnector } from '../../services/integrations/hevyConnector';
import { SyncManager } from '../../services/integrations/syncManager';
import { HEALTH_CONNECT_PERMISSIONS, ANDROID_COMPANION_SPEC } from '../../services/integrations/healthConnectConnector';
import {
  IntegrationProvider,
  ProviderConfig,
  SyncLogEntry,
} from '../../types/integrations';

interface IntegrationsViewProps {
  onDataImported?: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ onDataImported }) => {
  const [configs, setConfigs] = useState<Record<IntegrationProvider, ProviderConfig>>(
    StorageService.getIntegrationConfigs()
  );
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(StorageService.getSyncLogs());
  const [activeTab, setActiveTab] = useState<IntegrationProvider | 'logs'>('hevy');

  // Hevy form state
  const [hevyApiKey, setHevyApiKey] = useState<string>('');
  const [isHevyVerifying, setIsHevyVerifying] = useState<boolean>(false);
  const [isHevySyncing, setIsHevySyncing] = useState<boolean>(false);
  const [hevyFeedback, setHevyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // File upload state for MFP & Fitia
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [fileFeedback, setFileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Health connect mock/bridge payload state
  const [healthConnectJson, setHealthConnectJson] = useState<string>('');
  const [showAndroidSpec, setShowAndroidSpec] = useState<boolean>(false);
  const [hcFeedback, setHcFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check server status on mount
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
      setHevyFeedback({ type: 'success', message: `${res.message} (${res.workoutCount ?? 0} entrenamientos disponibles)` });
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
    if (confirm('¿Desconectar Hevy y revocar la clave de API guardada en el servidor? Los entrenamientos ya sincronizados se conservarán.')) {
      await SyncManager.disconnectProvider('hevy');
      setHevyFeedback({ type: 'success', message: 'Hevy desconectado y credenciales revocadas del servidor.' });
      refreshData();
    }
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
      ],
      records: [
        {
          record_type: 'steps',
          start_time: '2026-10-21T08:00:00Z',
          value: 10450,
          unit: 'count',
          source_app: 'com.google.android.apps.fitness',
        },
        {
          record_type: 'weight',
          start_time: '2026-10-21T07:15:00Z',
          value: 84.7,
          unit: 'kg',
          source_app: 'com.withings.wiscale2',
        },
        {
          record_type: 'sleep',
          start_time: '2026-10-21T23:30:00Z',
          value: 7.8,
          unit: 'hours',
          source_app: 'com.google.android.apps.fitness',
        },
      ],
    };
    setHealthConnectJson(JSON.stringify(demoPayload, null, 2));
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
              <span>Integraciones y Conectores Externos</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Conexión oficial con aplicaciones de entrenamiento, nutrición y sensores de salud.
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'hevy'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Hevy (API Oficial)</span>
            {configs.hevy.status === 'connected' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('myfitnesspal')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
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
            onClick={() => setActiveTab('health_connect')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'health_connect'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Health Connect (Android)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('google_fit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === 'google_fit'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Google Fit</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ml-auto ${
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
                  Conexión oficial directa mediante la API v1 de Hevy (<code>https://api.hevyapp.com/v1</code>). Permite importar sesiones de entrenamiento, ejercicios, series, cargas en kilogramos, repeticiones y estimaciones de RPE/RIR.
                </p>
              </div>

              {configs.hevy.status === 'connected' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncHevy}
                    disabled={isHevySyncing}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isHevySyncing ? 'animate-spin' : ''}`} />
                    <span>{isHevySyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnectHevy}
                    className="p-2 rounded-xl bg-zinc-950 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs transition-colors"
                    title="Desconectar y borrar clave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Hevy Feedback Banner */}
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

            {/* API Key Form */}
            <form onSubmit={handleVerifyHevy} className="space-y-4 pt-2 border-t border-zinc-800/80">
              <label htmlFor="hevy-api-key" className="block text-xs font-semibold text-zinc-300">
                {configs.hevy.status === 'connected' ? 'Actualizar Clave de API' : 'Clave de API de Hevy'}
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
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isHevyVerifying ? 'animate-spin' : ''}`} />
                  <span>{isHevyVerifying ? 'Verificando...' : 'Verificar y Conectar'}</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                <p className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pasos para obtener tu clave oficial de Hevy:</span>
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-400">
                  <li>Inicia sesión en la versión web o app de <strong>Hevy</strong>.</li>
                  <li>Ve a <strong>Settings (Ajustes) &gt; Integrations / Developer API</strong>.</li>
                  <li>Genera un <strong>Personal API Key</strong> con permisos de lectura de entrenamientos.</li>
                  <li>Ingresa la clave en el campo superior. La clave se envía y almacena <strong>únicamente en el servidor de BodyTrack Pro</strong>, sin exponerse en el navegador ni en bundles públicos.</li>
                </ol>
              </div>
            </form>

            {/* Provider Capabilities table */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">Capacidades y Gobernanza de Datos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Lectura</span>
                  <p className="font-medium text-zinc-200">Sesiones, series, cargas, repeticiones y RPE</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Idempotencia</span>
                  <p className="font-medium text-emerald-400">Garantizada por external_id</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Paginación &amp; Rate Limit</span>
                  <p className="font-medium text-zinc-200">Respeta Retry-After (429)</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Datos manuales</span>
                  <p className="font-medium text-zinc-200">Nunca se sobrescriben</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MYFITNESSPAL TAB --- */}
      {activeTab === 'myfitnesspal' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">MyFitnessPal</h3>
                  {renderStatusBadge(configs.myfitnesspal)}
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  {configs.myfitnesspal.approval_status_text}. MyFitnessPal no dispone de API pública abierta para usuarios individuales. La integración oficial y autorizada se realiza mediante la importación de su exportación de diario nutricional (CSV).
                </p>
              </div>
            </div>

            {/* File Feedback */}
            {fileFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  fileFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {fileFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{fileFeedback.message}</span>
              </div>
            )}

            {/* CSV Dropzone */}
            <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-950/60 transition-colors text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Cargar exportación de MyFitnessPal (archivo .csv)
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Importa fechas, comidas, alimentos, calorías, proteínas, carbohidratos, grasas y fibra.
                </p>
              </div>

              <label
                htmlFor="mfp-csv-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer transition-colors"
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

            {/* Export Instructions */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>¿Cómo exportar tus datos oficiales desde MyFitnessPal?</span>
              </h4>
              <ol className="list-decimal pl-5 space-y-1 text-zinc-400 text-[11px]">
                <li>Inicia sesión en <strong>myfitnesspal.com</strong> desde un navegador de escritorio o móvil.</li>
                <li>Ve a <strong>Settings (Configuración) &gt; Export Data (Exportar datos)</strong>.</li>
                <li>Selecciona el rango de fechas que deseas sincronizar y haz clic en Exportar.</li>
                <li>Recibirás un enlace de descarga con el archivo <code>Nutrition Summary.csv</code>.</li>
                <li>Súbelo en el recuadro superior. BodyTrack Pro calculará la distribución de macros y preservará los registros previos.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* --- FITIA TAB --- */}
      {activeTab === 'fitia' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">Fitia Nutrición</h3>
                  {renderStatusBadge(configs.fitia)}
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  {configs.fitia.approval_status_text}. Fitia funciona en un ecosistema móvil cerrado. Soporta la importación transparente de registros exportados en formato JSON o CSV.
                </p>
              </div>
            </div>

            {/* File Feedback */}
            {fileFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  fileFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {fileFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{fileFeedback.message}</span>
              </div>
            )}

            {/* Dropzone */}
            <div className="p-6 rounded-xl border-2 border-dashed border-zinc-700 hover:border-emerald-500/60 bg-zinc-950/60 transition-colors text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mx-auto text-emerald-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Cargar exportación de Fitia (.json o .csv)
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Importa comidas, alimentos, porciones, calorías y macronutrientes.
                </p>
              </div>

              <label
                htmlFor="fitia-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer transition-colors"
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

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
              <h4 className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Instrucciones de Exportación desde Fitia</span>
              </h4>
              <ol className="list-decimal pl-5 space-y-1 text-zinc-400 text-[11px]">
                <li>Abre la aplicación <strong>Fitia</strong> en tu smartphone.</li>
                <li>Accede a tu perfil o historial y selecciona <strong>Exportar diario nutricional</strong>.</li>
                <li>Guarda el archivo en tu dispositivo o envíalo por correo.</li>
                <li>Cárgalo aquí para consolidar tu ingesta calórica en BodyTrack Pro.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* --- HEALTH CONNECT TAB --- */}
      {activeTab === 'health_connect' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-white">Android Health Connect</h3>
                  {renderStatusBadge(configs.health_connect)}
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  Health Connect de Android es una biblioteca nativa en el dispositivo (<code>androidx.health.connect:connect-client</code>). Los navegadores web no tienen acceso directo a los servicios IPC de Android. Se utiliza un puente o importador compatible.
                </p>
              </div>
            </div>

            {/* Health Connect Feedback */}
            {hcFeedback && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                  hcFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {hcFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{hcFeedback.message}</span>
              </div>
            )}

            {/* Permissions list */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">Permisos Explícitos Solicitados en Android</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {HEALTH_CONNECT_PERMISSIONS.map((perm) => (
                  <div key={perm.key} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{perm.label}</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {perm.dataType}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{perm.purpose}</p>
                    <code className="text-[9px] text-zinc-500 block mt-1.5 font-mono">{perm.key}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingestion & Simulation Tool */}
            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-300">
                  Ingesta de Paquete de Sincronización Móvil (JSON)
                </h4>
                <button
                  type="button"
                  onClick={handleLoadDemoHealthConnect}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline"
                >
                  Cargar paquete sintético de prueba (Pixel 8)
                </button>
              </div>

              <textarea
                value={healthConnectJson}
                onChange={(e) => setHealthConnectJson(e.target.value)}
                placeholder="Pega aquí el paquete JSON exportado por la app companion de Android..."
                rows={5}
                className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono text-xs placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleImportHealthConnectPayload}
                  disabled={!healthConnectJson.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Procesar e Importar Paquete</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAndroidSpec(!showAndroidSpec)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showAndroidSpec ? 'Ocultar arquitectura' : 'Ver arquitectura Android Kotlin'}</span>
                  {showAndroidSpec ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Android Companion Architecture Spec */}
            {showAndroidSpec && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-emerald-400 font-bold">{ANDROID_COMPANION_SPEC.architectureName}</span>
                  <span className="text-zinc-500 text-[10px]">Min SDK 26 | Target SDK 34</span>
                </div>
                <div>
                  <p className="text-zinc-400 text-[11px] mb-1 font-sans">Dependencia Jetpack en build.gradle.kts:</p>
                  <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-200 text-[11px] overflow-x-auto">
                    implementation(&quot;{ANDROID_COMPANION_SPEC.requiredLibrary}&quot;)
                  </pre>
                </div>
                <div>
                  <p className="text-zinc-400 text-[11px] mb-1 font-sans">Permisos en AndroidManifest.xml:</p>
                  <pre className="p-2.5 rounded-lg bg-zinc-900 text-zinc-200 text-[11px] overflow-x-auto">
                    {ANDROID_COMPANION_SPEC.manifestPermissions.join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- GOOGLE FIT TAB --- */}
      {activeTab === 'google_fit' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white">Google Fit</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                API REST Obsolescente
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-200 space-y-2">
              <p className="font-semibold">Aviso Oficial de Transición de Google:</p>
              <p className="text-amber-200/90 leading-relaxed">
                Google ha anunciado formalmente la obsolescencia y el apagado (sunset) progresivo de la Google Fit REST API (Fitness API) para 2025/2026. Siguiendo las directrices técnicas del proyecto, <strong>no se deben crear nuevas dependencias sobre la API antigua de Google Fit</strong>.
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                En su lugar, Google centraliza todos los datos de salud y actividad física en el estándar <strong>Android Health Connect</strong>. Puedes utilizar la pestaña de Health Connect para conectar tu dispositivo Android y tus sensores con BodyTrack Pro.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- SYNC LOGS TAB --- */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Registro de Auditoría de Sincronizaciones</h3>
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
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-950 text-zinc-400 hover:text-rose-400 text-xs border border-zinc-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Historial</span>
                </button>
              )}
            </div>

            {syncLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                No hay sincronizaciones registradas aún. Conecta Hevy o carga un archivo para comenzar.
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
                      <th className="py-2.5 px-3">Actualizados</th>
                      <th className="py-2.5 px-3">Omitidos</th>
                      <th className="py-2.5 px-3">Duración</th>
                      <th className="py-2.5 px-3">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                          {new Date(log.started_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">{log.provider_name}</td>
                        <td className="py-2.5 px-3">
                          {log.status === 'success' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                              Éxito
                            </span>
                          ) : log.status === 'partial' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              Parcial
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400">{log.records_imported}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-400">{log.records_updated}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500">{log.records_skipped}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">{log.duration_ms} ms</td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px] max-w-xs truncate" title={log.details || log.error_message}>
                          {log.error_message ? (
                            <span className="text-rose-400">{log.error_message}</span>
                          ) : (
                            log.details || '-'
                          )}
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
