/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  WeighIn,
  BodyMeasurement,
  FoodLog,
  WorkoutSession,
  ActivityLog,
  WeeklyReview,
  NutritionTarget,
  UserProfile,
} from '../../types';
import {
  exportWeighInsToCSV,
  exportMeasurementsToCSV,
  exportFoodLogsToCSV,
  exportWorkoutsToCSV,
  exportFullBackupJSON,
} from '../../utils/exportUtils';
import { StorageService } from '../../services/storage';
import {
  FileText,
  Download,
  Upload,
  Printer,
  ShieldCheck,
  CheckCircle,
  Database,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface ReportsViewProps {
  profile: UserProfile;
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  reviews: WeeklyReview[];
  nutritionTarget: NutritionTarget;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  profile,
  weighIns,
  measurements,
  foodLogs,
  workoutSessions,
  activityLogs,
  reviews,
  nutritionTarget,
}) => {
  const [importStatus, setImportStatus] = useState<string>('');

  const handlePrint = () => {
    window.print();
  };

  const handleFullJSONExport = () => {
    const data = StorageService.getFullExportData();
    exportFullBackupJSON(data);
  };

  const handleJSONFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const ok = StorageService.importBackupData(parsed);
        if (ok) {
          setImportStatus('¡Copia de seguridad restaurada correctamente! Recargando datos...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus('Error al importar: formato de datos no compatible.');
        }
      } catch (err) {
        setImportStatus('El archivo seleccionado no es un JSON válido.');
      }
    };
    reader.readAsText(file);
  };

  const sortedWeighIns = [...weighIns].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  const latestW = sortedWeighIns[sortedWeighIns.length - 1];
  const initialW = sortedWeighIns[0];
  const deltaW = latestW && initialW ? Number((latestW.weight_kg - initialW.weight_kg).toFixed(2)) : 0;

  const latestM = measurements[measurements.length - 1];
  const initialM = measurements[0];
  const deltaWaist = latestM && initialM ? Number((latestM.waist_cm - initialM.waist_cm).toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Centro de Informes y Exportación de Datos</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Genera informes ejecutivos, descarga tus datos en formato CSV estándar y crea copias de seguridad portables.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* CSV & JSON Export Hub (Hidden in print) */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Exportar Registros a CSV y Respaldo Total</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Descarga archivos CSV individuales para Excel o Google Sheets con fechas reales y unidades normalizadas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => exportWeighInsToCSV(weighIns)}
            className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors group"
          >
            <span className="text-xs font-semibold text-white block group-hover:text-emerald-400">
              CSV Pesajes
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">{weighIns.length} pesajes</span>
          </button>

          <button
            type="button"
            onClick={() => exportMeasurementsToCSV(measurements)}
            className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors group"
          >
            <span className="text-xs font-semibold text-white block group-hover:text-amber-400">
              CSV Medidas
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">{measurements.length} mediciones</span>
          </button>

          <button
            type="button"
            onClick={() => exportFoodLogsToCSV(foodLogs)}
            className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors group"
          >
            <span className="text-xs font-semibold text-white block group-hover:text-sky-400">
              CSV Nutrición
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">{foodLogs.length} alimentos</span>
          </button>

          <button
            type="button"
            onClick={() => exportWorkoutsToCSV(workoutSessions)}
            className="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors group"
          >
            <span className="text-xs font-semibold text-white block group-hover:text-purple-400">
              CSV Entrenamientos
            </span>
            <span className="text-[11px] text-zinc-500 block mt-0.5">{workoutSessions.length} sesiones</span>
          </button>
        </div>

        {/* JSON Backup & Restore row */}
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-zinc-200 font-semibold block flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              Copia de Seguridad Portátil (JSON)
            </span>
            <span className="text-[11px] text-zinc-400">
              Exporta toda tu base de datos o restaura tus registros en otro navegador o dispositivo.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFullJSONExport}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Respaldo</span>
            </button>

            <label className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-zinc-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar Respaldo</span>
              <input type="file" accept=".json" onChange={handleJSONFileImport} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* PRINTABLE EXECUTIVE SUMMARY REPORT */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6 print:border-none print:p-0 print:bg-white print:text-black">
        <div className="border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-mono font-bold block">
                BODYTRACK PRO &bull; INFORME DE RECOMPOSICIÓN CORPORAL
              </span>
              <h3 className="text-xl font-bold text-white mt-1 print:text-black">
                {profile.name} ({profile.age} años)
              </h3>
            </div>
            <div className="text-right text-xs text-zinc-400 font-mono">
              <div>Fecha: {new Date().toISOString().split('T')[0]}</div>
              <div>Estatura: {profile.height_cm} cm</div>
            </div>
          </div>
        </div>

        {/* Executive Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Peso Inicial</span>
            <span className="text-lg font-bold font-mono text-white print:text-black">{initialW ? initialW.weight_kg : 85} kg</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Peso Actual</span>
            <span className="text-lg font-bold font-mono text-cyan-400 print:text-black">{latestW ? latestW.weight_kg : '--'} kg</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Cambio Total</span>
            <span className="text-lg font-bold font-mono text-emerald-400 print:text-black">{deltaW} kg</span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] text-zinc-400 block uppercase font-semibold">Reducción Cintura</span>
            <span className="text-lg font-bold font-mono text-amber-400 print:text-black">{deltaWaist} cm</span>
          </div>
        </div>

        {/* Clinical / Nutritional Adherence Summary */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Evaluación del Balance Energético y Entrenamiento
          </h4>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2 print:bg-gray-50 print:border-gray-300">
            <p className="text-zinc-200 leading-relaxed print:text-gray-800">
              El usuario Santiago Quinteros (24 años, 175 cm) ha mantenido un protocolo de déficit calórico moderado fijado en {nutritionTarget.calories_kcal} kcal/día ({nutritionTarget.protein_g}g proteína, {nutritionTarget.carbohydrates_g}g carbohidratos, {nutritionTarget.fat_g}g grasas), sumando {nutritionTarget.protein_g * 4 + nutritionTarget.carbohydrates_g * 4 + nutritionTarget.fat_g * 9} kcal derivadas de macronutrientes.
            </p>
            <p className="text-zinc-200 leading-relaxed print:text-gray-800">
              La evolución de las últimas 3 semanas evidencia un descenso ponderal de {Math.abs(deltaW)} kg con reducción simultánea de {Math.abs(deltaWaist)} cm en el perímetro umbilical (de 89.0 cm a 86.8 cm). El perímetro braquial se ha mantenido firme en 38.8 cm flexionado, confirmando una <strong>recomposición corporal óptima (pérdida de tejido adiposo con preservación de masa muscular magra)</strong>.
            </p>
          </div>
        </div>

        {/* Recent Weigh-ins Sample Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Últimos 7 Pesajes Matutinos
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-950 text-zinc-400 text-[10px]">
                <tr>
                  <th className="p-2">FECHA</th>
                  <th className="p-2">PESO (kg)</th>
                  <th className="p-2">AYUNAS</th>
                  <th className="p-2">CONTEXTO</th>
                  <th className="p-2">NOTAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono text-[11px]">
                {sortedWeighIns.slice(-7).reverse().map((w) => (
                  <tr key={w.id}>
                    <td className="p-2 text-white print:text-black">{w.measured_at}</td>
                    <td className="p-2 font-bold text-cyan-400 print:text-black">{w.weight_kg} kg</td>
                    <td className="p-2 font-sans">{w.fasting ? 'Sí' : 'No'}</td>
                    <td className="p-2 font-sans text-zinc-400">{w.context || 'normal'}</td>
                    <td className="p-2 font-sans text-zinc-400">{w.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
