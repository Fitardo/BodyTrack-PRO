/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  NutritionTarget,
  Food,
  FoodLog,
  UserProfile,
  MealCategory,
} from '../../types';
import {
  calculateMifflinStJeor,
  calculateTDEE,
  calculateMacroCalories,
} from '../../utils/calculations';
import {
  Utensils,
  Plus,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Edit2,
  Trash2,
  Info,
  Calendar,
  BookOpen,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { NutritionCsvImportModal } from './NutritionCsvImportModal';
import { StorageService } from '../../services/storage';

interface NutritionViewProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  nutritionTarget: NutritionTarget;
  onUpdateTarget: (target: NutritionTarget) => void;
  profile: UserProfile;
  foods: Food[];
  foodLogs: FoodLog[];
  onOpenAddFoodLog: (mealType?: MealCategory) => void;
  onOpenEditFoodLog: (log: FoodLog) => void;
  onDeleteFoodLog: (id: string) => void;
  onOpenCreateCustomFood: () => void;
  onImportFoodLogs?: (logs: FoodLog[], provider: string) => { imported: number; updated: number; skipped: number };
}

export const NutritionView: React.FC<NutritionViewProps> = ({
  currentDate,
  onDateChange,
  nutritionTarget,
  onUpdateTarget,
  profile,
  foods,
  foodLogs,
  onOpenAddFoodLog,
  onOpenEditFoodLog,
  onDeleteFoodLog,
  onOpenCreateCustomFood,
  onImportFoodLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'target_calculator' | 'food_library' | 'import_csv'>('daily');
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  // Mifflin-St Jeor calculations
  const bmr = calculateMifflinStJeor(
    profile.initial_weight_kg,
    profile.height_cm,
    profile.age,
    profile.sex_for_equations
  );
  const estimatedTDEE = calculateTDEE(
    profile.initial_weight_kg,
    profile.height_cm,
    profile.age,
    profile.sex_for_equations,
    profile.activity_level
  );
  const derivedTargetMacros = calculateMacroCalories(
    nutritionTarget.protein_g,
    nutritionTarget.carbohydrates_g,
    nutritionTarget.fat_g
  );

  const estimatedDeficit = estimatedTDEE - nutritionTarget.calories_kcal;

  // Filter logs for selected date
  const dayLogs = foodLogs.filter((l) => l.consumed_at === currentDate);

  const totalCalories = dayLogs.reduce((acc, curr) => acc + curr.calories_kcal, 0);
  const totalProtein = Number(dayLogs.reduce((acc, curr) => acc + curr.protein_g, 0).toFixed(1));
  const totalCarbs = Number(dayLogs.reduce((acc, curr) => acc + curr.carbohydrates_g, 0).toFixed(1));
  const totalFat = Number(dayLogs.reduce((acc, curr) => acc + curr.fat_g, 0).toFixed(1));
  const totalFiber = Number(dayLogs.reduce((acc, curr) => acc + (curr.fiber_g || 0), 0).toFixed(1));

  const remainingCalories = nutritionTarget.calories_kcal - totalCalories;
  const remainingProtein = Number((nutritionTarget.protein_g - totalProtein).toFixed(1));
  const remainingCarbs = Number((nutritionTarget.carbohydrates_g - totalCarbs).toFixed(1));
  const remainingFat = Number((nutritionTarget.fat_g - totalFat).toFixed(1));

  const mealsList: Array<{ id: MealCategory; label: string }> = [
    { id: 'desayuno', label: 'Desayuno' },
    { id: 'almuerzo', label: 'Almuerzo' },
    { id: 'merienda', label: 'Merienda' },
    { id: 'cena', label: 'Cena' },
    { id: 'colacion', label: 'Colaciones y Snacks' },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Utensils className="w-5 h-5 text-emerald-400" />
            <span>Nutrición y Déficit Calórico</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Seguimiento de comidas, desglose de macronutrientes y cálculo de balance energético.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'daily' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Diario ({currentDate})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('target_calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'target_calculator' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Objetivos & Ecuación
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('food_library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'food_library' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Biblioteca Alimentos ({foods.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('import_csv');
                setIsCsvImportModalOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'import_csv' ? 'bg-zinc-800 text-emerald-400 shadow-xs' : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCsvImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors shadow-xs"
              title="Importar archivo CSV de MyFitnessPal o Fitia"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Importar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAddFoodLog()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Alimento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification banner if recently imported */}
      {importNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{importNotification}</span>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUBTAB 1: DAILY FOOD LOG */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Daily Macro Progress Summary Card */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Balance Calórico de Hoy</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{totalCalories}</span>
                  <span className="text-xs text-zinc-400">/ {nutritionTarget.calories_kcal} kcal</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400">Estado:</span>
                <span className={`block font-mono text-sm font-bold ${
                  remainingCalories >= 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {remainingCalories >= 0 ? `${remainingCalories} kcal restantes` : `${Math.abs(remainingCalories)} kcal de exceso`}
                </span>
              </div>
            </div>

            {/* Macro Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Protein */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Dumbbell className="w-3.5 h-3.5" /> Proteína
                  </span>
                  <span className="font-mono text-white font-bold">{totalProtein} / {nutritionTarget.protein_g}g</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalProtein / nutritionTarget.protein_g) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalProtein * 4).toFixed(0)} kcal</span>
                  <span>{remainingProtein > 0 ? `${remainingProtein}g pend.` : 'Cumplido'}</span>
                </div>
              </div>

              {/* Carbs */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400 flex items-center gap-1">
                    <Wheat className="w-3.5 h-3.5" /> Carbohidratos
                  </span>
                  <span className="font-mono text-white font-bold">{totalCarbs} / {nutritionTarget.carbohydrates_g}g</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalCarbs / nutritionTarget.carbohydrates_g) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalCarbs * 4).toFixed(0)} kcal</span>
                  <span>{remainingCarbs > 0 ? `${remainingCarbs}g pend.` : '0g pend.'}</span>
                </div>
              </div>

              {/* Fat */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5" /> Grasas
                  </span>
                  <span className="font-mono text-white font-bold">{totalFat} / {nutritionTarget.fat_g}g</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalFat / nutritionTarget.fat_g) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalFat * 9).toFixed(0)} kcal</span>
                  <span>{remainingFat > 0 ? `${remainingFat}g pend.` : '0g pend.'}</span>
                </div>
              </div>

              {/* Fiber */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Fibra</span>
                  <span className="font-mono text-white font-bold">{totalFiber} / {nutritionTarget.fiber_g}g</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-zinc-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalFiber / nutritionTarget.fiber_g) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Saciedad</span>
                  <span>Meta: {nutritionTarget.fiber_g}g</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meals Grouped Sections */}
          <div className="space-y-4">
            {mealsList.map((meal) => {
              const logsForMeal = dayLogs.filter((l) => l.meal_type === meal.id);
              const mealCalories = logsForMeal.reduce((acc, curr) => acc + curr.calories_kcal, 0);
              const mealProtein = logsForMeal.reduce((acc, curr) => acc + curr.protein_g, 0);

              return (
                <div key={meal.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-white">{meal.label}</h3>
                      <span className="text-xs font-mono text-zinc-400">
                        {mealCalories} kcal &bull; {mealProtein.toFixed(1)}g P
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAddFoodLog(meal.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir a {meal.label.toLowerCase()}</span>
                    </button>
                  </div>

                  {logsForMeal.length === 0 ? (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      No hay alimentos registrados en {meal.label.toLowerCase()}.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60">
                      {logsForMeal.map((log) => (
                        <div
                          key={log.id}
                          className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-white">{log.food_name_snapshot}</span>
                              {log.brand_snapshot && (
                                <span className="text-[11px] text-zinc-400 truncate">({log.brand_snapshot})</span>
                              )}
                              {log.preparation_state && log.preparation_state !== 'na' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                  {log.preparation_state === 'raw' ? 'crudo' : 'cocido'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                              <span>{log.quantity} {log.unit}</span>
                              <span>&bull;</span>
                              <span className="text-emerald-400 font-bold">{log.protein_g}g P</span>
                              <span>&bull;</span>
                              <span className="text-sky-400">{log.carbohydrates_g}g C</span>
                              <span>&bull;</span>
                              <span className="text-amber-400">{log.fat_g}g G</span>
                              {log.consumed_time && (
                                <>
                                  <span>&bull;</span>
                                  <span>{log.consumed_time}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-sm font-bold text-white">{log.calories_kcal} kcal</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenEditFoodLog(log)}
                                aria-label="Editar alimento"
                                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteFoodLog(log.id)}
                                aria-label="Eliminar alimento"
                                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: TARGET & METABOLIC EQUATIONS */}
      {activeTab === 'target_calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Target Macros Configurator */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <span>Objetivos Nutricionales Diarios</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Ajusta las cantidades de macronutrientes. La aplicación calcula automáticamente las calorías derivadas por factor 4-4-9.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Calorías Objetivo (kcal/día)</label>
                <input
                  type="number"
                  step="50"
                  value={nutritionTarget.calories_kcal}
                  onChange={(e) =>
                    onUpdateTarget({ ...nutritionTarget, calories_kcal: parseInt(e.target.value) || 2400 })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-base font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    step="5"
                    value={nutritionTarget.protein_g}
                    onChange={(e) =>
                      onUpdateTarget({ ...nutritionTarget, protein_g: parseInt(e.target.value) || 180 })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                    {nutritionTarget.protein_g * 4} kcal
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-sky-400 mb-1">Carbohidratos (g)</label>
                  <input
                    type="number"
                    step="5"
                    value={nutritionTarget.carbohydrates_g}
                    onChange={(e) =>
                      onUpdateTarget({ ...nutritionTarget, carbohydrates_g: parseInt(e.target.value) || 260 })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                    {nutritionTarget.carbohydrates_g * 4} kcal
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    step="5"
                    value={nutritionTarget.fat_g}
                    onChange={(e) =>
                      onUpdateTarget({ ...nutritionTarget, fat_g: parseInt(e.target.value) || 70 })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                    {nutritionTarget.fat_g * 9} kcal
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Suma derivada de macronutrientes:</span>
                <span className="font-mono font-bold text-white">
                  {derivedTargetMacros.totalKcal} kcal
                  {derivedTargetMacros.totalKcal !== nutritionTarget.calories_kcal && (
                    <span className="text-[10px] text-zinc-400 font-normal ml-1">
                      (diferencia de redondeo: {derivedTargetMacros.totalKcal - nutritionTarget.calories_kcal} kcal)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Metabolic Estimation (Mifflin-St Jeor) */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Estimación Metabólica (Mifflin–St Jeor)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Predicción teórica del gasto energético diario según variables antropométricas actuales.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">Metabolismo Basal (BMR)</span>
                  <span className="text-[10px] text-zinc-400">Gasto vital en reposo absoluto</span>
                </div>
                <span className="text-lg font-bold font-mono text-white">{bmr} kcal</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">Gasto Total Estimado (TDEE)</span>
                  <span className="text-[10px] text-zinc-400">Actividad: Sedentario + 5-6 días entreno</span>
                </div>
                <span className="text-lg font-bold font-mono text-cyan-400">{estimatedTDEE} kcal</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">Déficit / Superávit Teórico</span>
                  <span className="text-[10px] text-zinc-400">TDEE estimado - Objetivo actual</span>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {estimatedDeficit > 0 ? `-${estimatedDeficit} kcal (Déficit)` : `+${Math.abs(estimatedDeficit)} kcal`}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="text-white font-semibold block">Nota sobre precisión científica:</span>
              <p className="leading-relaxed">
                Ninguna fórmula metabólica es exacta. El gasto energético real fluctúa con el NEAT, la adaptación termogénica y el entrenamiento. Por ello, BodyTrack Pro utiliza la <strong>Revisión Semanal Retrospectiva</strong> para calcular tu gasto calórico verdadero a partir de la tendencia observada en la báscula y el registro alimentario.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FOOD LIBRARY */}
      {activeTab === 'food_library' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Base de Datos de Alimentos Verificados y Personalizados</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Alimentos con datos nutricionales reales por porción de 100g o unidades estándar.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateCustomFood}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Nuevo</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {foods.map((food) => (
              <div key={food.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-white">{food.name}</h4>
                    {food.brand && <span className="text-[10px] text-zinc-400 block">{food.brand}</span>}
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300">
                    {food.serving_size}{food.serving_unit}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px] pt-1 border-t border-zinc-800/80">
                  <div>
                    <span className="text-[10px] text-zinc-400 block font-sans">Kcal</span>
                    <span className="text-white font-bold">{food.calories_kcal}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block font-sans">P</span>
                    <span className="text-white font-semibold">{food.protein_g}g</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-400 block font-sans">C</span>
                    <span className="text-white font-semibold">{food.carbohydrates_g}g</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-400 block font-sans">G</span>
                    <span className="text-white font-semibold">{food.fat_g}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: IMPORT CSV / HISTORICAL DATA */}
      {activeTab === 'import_csv' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>Importación de Historial Nutricional</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Importa registros exportados de MyFitnessPal (CSV) o Fitia Nutrición (CSV o JSON) sin perder tus datos manuales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCsvImportModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Abrir Importador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <h4 className="text-sm font-semibold text-white">MyFitnessPal (CSV Oficial)</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Exporta tu historial desde tu cuenta web en MyFitnessPal. Soporta delimitadores de coma o punto y coma, y detecta automáticamente comidas (Desayuno, Almuerzo, Merienda, Cena) y macronutrientes.
              </p>
              <button
                type="button"
                onClick={() => setIsCsvImportModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Cargar archivo de MyFitnessPal →
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="text-sm font-semibold text-white">Fitia Nutrición (CSV / JSON)</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Admite las exportaciones generadas desde la app de Fitia en formato CSV o JSON estructurado. Asigna porciones, gramos y macronutrientes correspondientes a cada tiempo de comida.
              </p>
              <button
                type="button"
                onClick={() => setIsCsvImportModalOpen(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                Cargar archivo de Fitia →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      <NutritionCsvImportModal
        isOpen={isCsvImportModalOpen}
        onClose={() => setIsCsvImportModalOpen(false)}
        existingLogs={foodLogs}
        onImportLogs={(logs, prov) => {
          if (onImportFoodLogs) {
            return onImportFoodLogs(logs, prov);
          }
          return StorageService.batchImportFoodLogs(logs);
        }}
        onImportSuccess={(count, skipped, prov) => {
          setImportNotification(
            `¡Éxito! Se importaron ${count} alimentos (${prov}). ${skipped > 0 ? `${skipped} duplicados omitidos.` : ''}`
          );
        }}
      />
    </div>
  );
};
