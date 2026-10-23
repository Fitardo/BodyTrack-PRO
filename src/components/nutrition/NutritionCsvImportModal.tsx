/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FoodLog, MealCategory } from '../../types';
import { parseMyFitnessPalCsv, SAMPLE_MFP_CSV } from '../../services/integrations/myFitnessPalConnector';
import { parseFitiaExport, SAMPLE_FITIA_CSV } from '../../services/integrations/fitiaConnector';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export type SupportedNutritionProvider = 'myfitnesspal' | 'fitia' | 'auto';

interface NutritionCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLogs: FoodLog[];
  onImportSuccess: (importedCount: number, skippedCount: number, provider: string) => void;
  onImportLogs: (logs: FoodLog[], provider: string) => { imported: number; updated: number; skipped: number };
}

export const NutritionCsvImportModal: React.FC<NutritionCsvImportModalProps> = ({
  isOpen,
  onClose,
  existingLogs,
  onImportSuccess,
  onImportLogs,
}) => {
  const [provider, setProvider] = useState<SupportedNutritionProvider>('auto');
  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedLogs, setParsedLogs] = useState<FoodLog[]>([]);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Auto detect provider if needed
  const detectAndParse = (rawText: string, chosenProvider: SupportedNutritionProvider): { logs: FoodLog[]; detected: string } => {
    let activeProvider = chosenProvider;
    if (activeProvider === 'auto') {
      const lower = rawText.toLowerCase();
      if (lower.includes('myfitnesspal') || lower.includes('breakfast') || lower.includes('dinner') || lower.includes('carbohydrates')) {
        activeProvider = 'myfitnesspal';
      } else if (lower.includes('fitia') || lower.includes('gramos') || lower.includes('tiempo')) {
        activeProvider = 'fitia';
      } else {
        // Fallback: test both and pick whichever yields more logs
        const mfpLogs = parseMyFitnessPalCsv(rawText);
        const fitiaLogs = parseFitiaExport(rawText);
        if (mfpLogs.length >= fitiaLogs.length && mfpLogs.length > 0) {
          return { logs: mfpLogs, detected: 'MyFitnessPal' };
        }
        return { logs: fitiaLogs, detected: 'Fitia Nutrición' };
      }
    }

    if (activeProvider === 'myfitnesspal') {
      return { logs: parseMyFitnessPalCsv(rawText), detected: 'MyFitnessPal' };
    }
    return { logs: parseFitiaExport(rawText), detected: 'Fitia Nutrición' };
  };

  const handleProcessContent = (rawText: string, fileTitle?: string) => {
    setErrorMsg(null);
    setImportResult(null);
    if (!rawText || !rawText.trim()) {
      setErrorMsg('El contenido está vacío. Por favor sube un archivo o pega los datos exportados.');
      setParsedLogs([]);
      return;
    }

    try {
      const { logs, detected } = detectAndParse(rawText, provider);
      if (logs.length === 0) {
        setErrorMsg('No se detectaron registros de alimentos válidos en el contenido. Verifica que incluya cabeceras de Fecha, Comida, Alimento y Calorías.');
        setParsedLogs([]);
      } else {
        setParsedLogs(logs);
        if (fileTitle) setFileName(fileTitle);
      }
    } catch (err) {
      setErrorMsg('Error al procesar el archivo. Formato no compatible.');
      setParsedLogs([]);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      readFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      handleProcessContent(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = (sampleType: 'mfp' | 'fitia') => {
    const text = sampleType === 'mfp' ? SAMPLE_MFP_CSV : SAMPLE_FITIA_CSV;
    const name = sampleType === 'mfp' ? 'ejemplo_myfitnesspal_export.csv' : 'ejemplo_fitia_export.csv';
    setProvider(sampleType === 'mfp' ? 'myfitnesspal' : 'fitia');
    setInputText(text);
    setInputMode('paste');
    handleProcessContent(text, name);
  };

  const handleReset = () => {
    setInputText('');
    setFileName(null);
    setParsedLogs([]);
    setErrorMsg(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = () => {
    if (parsedLogs.length === 0) return;
    setIsProcessing(true);

    try {
      const result = onImportLogs(parsedLogs, provider === 'auto' ? 'myfitnesspal' : provider);
      setImportResult(result);
      onImportSuccess(result.imported + result.updated, result.skipped, provider);
    } catch (err) {
      setErrorMsg('Ocurrió un error al persistir los registros nutricionales.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview metrics
  const uniqueDates = Array.from(new Set(parsedLogs.map((l) => l.consumed_at))).sort();
  const dateRangeStr =
    uniqueDates.length > 1
      ? `${uniqueDates[0]} → ${uniqueDates[uniqueDates.length - 1]} (${uniqueDates.length} días)`
      : uniqueDates[0] || '';

  const totalCaloriesParsed = parsedLogs.reduce((sum, l) => sum + l.calories_kcal, 0);

  // Check potential duplicates or manual overrides
  let potentialSkipped = 0;
  parsedLogs.forEach((item) => {
    const exists = existingLogs.some(
      (l) =>
        (item.external_id && l.external_id === item.external_id) ||
        (l.consumed_at === item.consumed_at &&
          l.meal_type === item.meal_type &&
          l.food_name_snapshot.toLowerCase().trim() === item.food_name_snapshot.toLowerCase().trim())
    );
    if (exists) potentialSkipped++;
  });

  const getMealBadgeColor = (meal: MealCategory) => {
    switch (meal) {
      case 'desayuno':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'almuerzo':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'merienda':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'cena':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Importador de Historial Nutricional
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  CSV / JSON
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Compatible con MyFitnessPal y Fitia. Ingesta idempotente que respeta tus registros manuales.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Success state banner if already imported */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-300">
                  ¡Importación completada con éxito!
                </p>
                <p className="text-xs text-zinc-300">
                  Se importaron <strong>{importResult.imported}</strong> alimentos nuevos y se actualizaron{' '}
                  <strong>{importResult.updated}</strong> registros. Se omitieron <strong>{importResult.skipped}</strong>{' '}
                  duplicados para preservar la integridad de tu diario.
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                  >
                    Cerrar y Ver Diario
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Importar otro archivo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Options: Provider selector and Mode toggle */}
          {!importResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Formato de origen del archivo:
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('auto');
                      if (inputText) handleProcessContent(inputText, fileName || undefined);
                    }}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                      provider === 'auto'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Detección Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('myfitnesspal');
                      if (inputText) handleProcessContent(inputText, fileName || undefined);
                    }}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                      provider === 'myfitnesspal'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    MyFitnessPal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProvider('fitia');
                      if (inputText) handleProcessContent(inputText, fileName || undefined);
                    }}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                      provider === 'fitia'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Fitia (CSV/JSON)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Método de entrada:
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setInputMode('upload')}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      inputMode === 'upload'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Archivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('paste')}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      inputMode === 'paste'
                        ? 'bg-zinc-800 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pegar Texto</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick templates helper */}
          {!importResult && parsedLogs.length === 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>¿No tienes un archivo a mano? Prueba con una muestra:</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleLoadSample('mfp')}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-blue-300 transition-colors"
                >
                  Muestra MyFitnessPal
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('fitia')}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 transition-colors"
                >
                  Muestra Fitia
                </button>
              </div>
            </div>
          )}

          {/* File Upload Zone */}
          {!importResult && inputMode === 'upload' && parsedLogs.length === 0 && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-950/70 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 group-hover:bg-emerald-500/10 border border-zinc-700 group-hover:border-emerald-500/30 flex items-center justify-center mx-auto text-zinc-400 group-hover:text-emerald-400 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white mt-3">
                Arrastra tu archivo CSV o JSON aquí, o haz clic para explorar
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Archivos compatibles: Exportaciones de MyFitnessPal (.csv), Fitia Nutrición (.csv o .json)
              </p>
            </div>
          )}

          {/* Direct Paste Area */}
          {!importResult && inputMode === 'paste' && parsedLogs.length === 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-400">
                Pega el texto CSV o JSON exportado:
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Date,Meal,Food,Calories,Protein,Carbohydrates,Fat,Fiber..."
                rows={7}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleProcessContent(inputText, 'Texto pegado')}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Analizar y Previsualizar Alimentos</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {!importResult && parsedLogs.length > 0 && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Registros Detectados</span>
                  <span className="text-lg font-bold text-white">{parsedLogs.length} alimentos</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Rango de Fechas</span>
                  <span className="text-xs font-bold text-zinc-200 truncate block mt-1" title={dateRangeStr}>
                    {dateRangeStr || 'N/A'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Energía Total</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {totalCaloriesParsed.toLocaleString()} kcal
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[11px] text-zinc-400 block">Integridad & Duplicados</span>
                  <span className="text-xs font-medium text-zinc-300 block mt-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {potentialSkipped > 0
                        ? `${potentialSkipped} ya registrados`
                        : '100% nuevos'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Table of items */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <div className="p-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Vista Previa de Alimentos a Ingestar (primeros {Math.min(parsedLogs.length, 10)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Cambiar archivo</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/40 text-zinc-400 border-b border-zinc-800/60 sticky top-0">
                      <tr>
                        <th className="p-2 font-medium">Fecha</th>
                        <th className="p-2 font-medium">Comida</th>
                        <th className="p-2 font-medium">Alimento</th>
                        <th className="p-2 font-medium text-right">Calorías</th>
                        <th className="p-2 font-medium text-right">Prot (g)</th>
                        <th className="p-2 font-medium text-right">Carb (g)</th>
                        <th className="p-2 font-medium text-right">Grasa (g)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                      {parsedLogs.slice(0, 10).map((log, idx) => (
                        <tr key={log.id || idx} className="hover:bg-zinc-900/30">
                          <td className="p-2 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                            {log.consumed_at}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getMealBadgeColor(
                                log.meal_type
                              )}`}
                            >
                              {log.meal_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2 font-medium text-white max-w-[200px] truncate" title={log.food_name_snapshot}>
                            {log.food_name_snapshot}
                          </td>
                          <td className="p-2 text-right font-bold text-emerald-400">
                            {log.calories_kcal}
                          </td>
                          <td className="p-2 text-right text-blue-400">{log.protein_g}</td>
                          <td className="p-2 text-right text-amber-400">{log.carbohydrates_g}</td>
                          <td className="p-2 text-right text-rose-400">{log.fat_g}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {parsedLogs.length > 10 && (
                  <div className="p-2 bg-zinc-900/40 border-t border-zinc-800/60 text-center text-[11px] text-zinc-500">
                    ... y {parsedLogs.length - 10} alimentos más listos para incorporar.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <p className="text-xs text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 inline text-emerald-400 mr-1" />
                  Los registros manuales existentes no se sobrescribirán jamás.
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleExecuteImport}
                    className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {isProcessing
                        ? 'Procesando...'
                        : `Importar ${parsedLogs.length} Alimentos`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
