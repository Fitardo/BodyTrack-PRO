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
  FrequentMeal,
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
  BookOpen,
  Upload,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  Users,
  AlertTriangle,
  HelpCircle,
  Zap,
  Star,
} from 'lucide-react';
import { NutritionCsvImportModal } from './NutritionCsvImportModal';
import { StorageService } from '../../services/storage';
import {
  generateMacroDeficitSuggestions,
  evaluateCalorieTargetSafety,
  EDUCATIONAL_TOOLTIPS,
} from '../../utils/auditAndRetentionUtils';

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
  onQuickAddFoodLog?: (log: FoodLog) => void;
  onImportFoodLogs?: (
    logs: FoodLog[],
    provider: string
  ) => { imported: number; updated: number; skipped: number };
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
  onQuickAddFoodLog,
  onImportFoodLogs,
}) => {
  const [activeTab, setActiveTab] = useState<
    'daily' | 'target_calculator' | 'food_library' | 'import_csv'
  >('daily');
  const [isCsvImportModalOpen, setIsCsvImportModalOpen] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [frequentMeals, setFrequentMeals] = useState<FrequentMeal[]>(() =>
    StorageService.getFrequentMeals()
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    StorageService.getFavoriteFoodIds()
  );

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

  // Evaluate calorie target safety
  const calorieSafety = evaluateCalorieTargetSafety(
    nutritionTarget.calories_kcal,
    bmr,
    estimatedTDEE,
    profile.sex_for_equations,
    currentDate
  );

  // Filter logs for selected date
  const dayLogs = foodLogs.filter((l) => l.consumed_at === currentDate);

  const totalCalories = dayLogs.reduce((acc, curr) => acc + curr.calories_kcal, 0);
  const totalProtein = Number(dayLogs.reduce((acc, curr) => acc + curr.protein_g, 0).toFixed(1));
  const totalCarbs = Number(
    dayLogs.reduce((acc, curr) => acc + curr.carbohydrates_g, 0).toFixed(1)
  );
  const totalFat = Number(dayLogs.reduce((acc, curr) => acc + curr.fat_g, 0).toFixed(1));
  const totalFiber = Number(
    dayLogs.reduce((acc, curr) => acc + (curr.fiber_g || 0), 0).toFixed(1)
  );

  const remainingCalories = nutritionTarget.calories_kcal - totalCalories;
  const remainingProtein = Number((nutritionTarget.protein_g - totalProtein).toFixed(1));
  const remainingCarbs = Number((nutritionTarget.carbohydrates_g - totalCarbs).toFixed(1));
  const remainingFat = Number((nutritionTarget.fat_g - totalFat).toFixed(1));

  // Smart Macro Suggestions
  const smartSuggestions = generateMacroDeficitSuggestions(
    nutritionTarget,
    totalProtein,
    totalCarbs,
    totalFat
  );

  const handleQuickAddSuggestion = (
    option: {
      food_id: string;
      food_name: string;
      quantity: number;
      unit: 'g' | 'ml' | 'porción';
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      calories_kcal: number;
    }
  ) => {
    const newLog: FoodLog = {
      id: `fl-sug-${Date.now()}`,
      consumed_at: currentDate,
      consumed_time: new Date().toTimeString().slice(0, 5),
      meal_type: 'colacion',
      food_id: option.food_id,
      food_name_snapshot: option.food_name,
      quantity: option.quantity,
      unit: option.unit,
      calories_kcal: option.calories_kcal,
      protein_g: option.protein_g,
      carbohydrates_g: option.carbs_g,
      fat_g: option.fat_g,
      fiber_g: 1,
      notes: 'Añadido desde Sugerencia Inteligente de Macros',
    };
    if (onQuickAddFoodLog) {
      onQuickAddFoodLog(newLog);
    } else {
      StorageService.saveFoodLog(newLog);
    }
    setImportNotification(`¡Añadido rápido!: ${option.food_name} (+${option.protein_g}g P, ${option.calories_kcal} kcal)`);
  };

  const handleQuickLogFrequentMeal = (meal: FrequentMeal) => {
    meal.items.forEach((item, idx) => {
      const log: FoodLog = {
        id: `fl-freq-${Date.now()}-${idx}`,
        consumed_at: currentDate,
        consumed_time: new Date().toTimeString().slice(0, 5),
        meal_type: meal.meal_type,
        food_id: item.food_id,
        food_name_snapshot: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbohydrates_g: item.carbohydrates_g,
        fat_g: item.fat_g,
        fiber_g: 2,
        notes: `Combo frecuente: ${meal.name}`,
      };
      if (onQuickAddFoodLog) {
        onQuickAddFoodLog(log);
      } else {
        StorageService.saveFoodLog(log);
      }
    });
    setImportNotification(`¡Comida frecuente registrada!: "${meal.name}" añadida a tu diario de hoy.`);
  };

  const handleSaveMealGroupAsFrequent = (mealCat: MealCategory, label: string, logs: FoodLog[]) => {
    if (logs.length === 0) return;
    const newFreq: FrequentMeal = {
      id: `freq-custom-${Date.now()}`,
      name: `${label} Habitual (${logs.length} items)`,
      meal_type: mealCat,
      created_at: currentDate,
      items: logs.map((l) => ({
        food_id: l.food_id || 'f1',
        food_name: l.food_name_snapshot,
        quantity: l.quantity,
        unit:
          l.unit === 'ml'
            ? 'ml'
            : l.unit === 'porción' || l.unit === 'unidad'
            ? 'porción'
            : 'g',
        calories_kcal: l.calories_kcal,
        protein_g: l.protein_g,
        carbohydrates_g: l.carbohydrates_g,
        fat_g: l.fat_g,
      })),
    };
    StorageService.saveFrequentMeal(newFreq);
    setFrequentMeals(StorageService.getFrequentMeals());
    setImportNotification(`¡Guardado en Comidas Frecuentes!: "${newFreq.name}" disponible en 1 clic.`);
  };

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
            <span>Nutrición, Escáner y Balance Energético</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Registro ágil por gramos/ml/porciones, escáner EAN-13, comidas frecuentes y sugerencias de macros.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'daily' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Diario ({currentDate})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('target_calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'target_calculator'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Objetivos & Ecuación
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('food_library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'food_library'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Biblioteca ({foods.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('import_csv');
                setIsCsvImportModalOpen(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'import_csv'
                  ? 'bg-zinc-800 text-emerald-400 shadow-xs'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar CSV</span>
            </button>
          </div>

          <button
            type="button"
            data-testid="open-add-food-modal-btn"
            onClick={() => onOpenAddFoodLog()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Añadir / Escanear</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {importNotification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <span>{importNotification}</span>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-400 font-medium">Balance Calórico de Hoy</span>
                  <span
                    data-testid="nutrition-adjustable-estimate-badge"
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold"
                  >
                    {calorieSafety.adjustableLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-bold font-mono text-white">{totalCalories}</span>
                  <span className="text-xs text-zinc-400">
                    / {nutritionTarget.calories_kcal} kcal
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400">Estado:</span>
                <span
                  className={`block font-mono text-sm font-bold ${
                    remainingCalories >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {remainingCalories >= 0
                    ? `${remainingCalories} kcal restantes`
                    : `${Math.abs(remainingCalories)} kcal de exceso`}
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
                  <span className="font-mono text-white font-bold">
                    {totalProtein} / {nutritionTarget.protein_g}g
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalProtein / nutritionTarget.protein_g) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalProtein * 4).toFixed(0)} kcal</span>
                  <span>
                    {remainingProtein > 0 ? `Faltan ${remainingProtein}g` : 'Meta cumplida ✓'}
                  </span>
                </div>
              </div>

              {/* Carbs */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400 flex items-center gap-1">
                    <Wheat className="w-3.5 h-3.5" /> Carbohidratos
                  </span>
                  <span className="font-mono text-white font-bold">
                    {totalCarbs} / {nutritionTarget.carbohydrates_g}g
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (totalCarbs / nutritionTarget.carbohydrates_g) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalCarbs * 4).toFixed(0)} kcal</span>
                  <span>{remainingCarbs > 0 ? `Faltan ${remainingCarbs}g` : 'Meta cumplida ✓'}</span>
                </div>
              </div>

              {/* Fat */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5" /> Grasas
                  </span>
                  <span className="font-mono text-white font-bold">
                    {totalFat} / {nutritionTarget.fat_g}g
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalFat / nutritionTarget.fat_g) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>{(totalFat * 9).toFixed(0)} kcal</span>
                  <span>{remainingFat > 0 ? `Faltan ${remainingFat}g` : 'Meta cumplida ✓'}</span>
                </div>
              </div>

              {/* Fiber */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Fibra</span>
                  <span className="font-mono text-white font-bold">
                    {totalFiber} / {nutritionTarget.fiber_g}g
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-zinc-400 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (totalFiber / nutritionTarget.fiber_g) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Saciedad</span>
                  <span>Meta: {nutritionTarget.fiber_g}g</span>
                </div>
              </div>
            </div>

            {/* Smart Macro Deficit Suggestions Banner */}
            {smartSuggestions.length > 0 && (
              <div
                data-testid="smart-macro-suggestions-card"
                className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Alertas de Progreso de Macros y Sugerencias Prácticas</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {smartSuggestions.slice(0, 2).map((sug) => (
                    <div
                      key={sug.macro}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{sug.headline}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                          -{sug.missingGrams}g
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300">{sug.suggestionText}</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sug.quickAddOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            data-testid={`quick-add-suggestion-${sug.macro}-${idx}`}
                            onClick={() => handleQuickAddSuggestion(opt)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-emerald-500 hover:text-zinc-950 border border-zinc-700 text-[11px] font-semibold text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>
                              {opt.food_name} ({opt.quantity}
                              {opt.unit === 'g' ? 'g' : ` ${opt.unit}`})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Frequent Meals Strip */}
            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Comidas Frecuentes (1 clic):</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {frequentMeals.map((fm) => (
                  <button
                    key={fm.id}
                    type="button"
                    data-testid={`daily-quick-freq-${fm.id}`}
                    onClick={() => handleQuickLogFrequentMeal(fm)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-emerald-500/15 border border-zinc-800 hover:border-emerald-500/30 text-xs text-zinc-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>{fm.name}</span>
                  </button>
                ))}
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
                <div
                  key={meal.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
                >
                  <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-white">{meal.label}</h3>
                      <span className="text-xs font-mono text-zinc-400">
                        {mealCalories} kcal &bull; {mealProtein.toFixed(1)}g P
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {logsForMeal.length >= 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveMealGroupAsFrequent(meal.id, meal.label, logsForMeal)
                          }
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                          title="Guardar este bloque como comida frecuente para registrarlo en 1 clic"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Guardar como comida frecuente</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onOpenAddFoodLog(meal.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir a {meal.label.toLowerCase()}</span>
                      </button>
                    </div>
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white">
                                {log.food_name_snapshot}
                              </span>
                              {log.brand_snapshot && (
                                <span className="text-[11px] text-zinc-400 truncate">
                                  ({log.brand_snapshot})
                                </span>
                              )}
                              {log.preparation_state && log.preparation_state !== 'na' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                                  {log.preparation_state === 'raw' ? 'crudo' : 'cocido'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                              <span>
                                {log.quantity} {log.unit}
                              </span>
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
                            <span className="font-mono text-sm font-bold text-white">
                              {log.calories_kcal} kcal
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenEditFoodLog(log)}
                                aria-label="Editar alimento"
                                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                data-testid={`delete-food-log-${log.id}`}
                                onClick={() => onDeleteFoodLog(log.id)}
                                aria-label="Eliminar alimento"
                                className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
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
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Objetivos Nutricionales Diarios</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Las metas se muestran como estimaciones ajustables y cuentan con alertas de seguridad ante recortes agresivos.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {calorieSafety.adjustableLabel}
              </span>
            </div>

            {/* Safety Alert Banner if aggressive cut */}
            {calorieSafety.isAggressiveCut && (
              <div
                data-testid="nutrition-aggressive-cut-alert"
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  calorieSafety.severity === 'danger'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-1.5">
                  <p className="font-semibold">{calorieSafety.warningMessage}</p>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTarget({
                        ...nutritionTarget,
                        calories_kcal: Math.max(calorieSafety.safeMinimumKcal, Math.round(estimatedTDEE * 0.8)),
                        calculated_at: currentDate,
                      })
                    }
                    className="px-2.5 py-1 rounded bg-emerald-500 text-zinc-950 font-bold text-[11px] cursor-pointer"
                  >
                    Ajustar a déficit seguro ({Math.max(calorieSafety.safeMinimumKcal, Math.round(estimatedTDEE * 0.8))} kcal)
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Calorías Objetivo (kcal/día)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="50"
                  value={nutritionTarget.calories_kcal}
                  onChange={(e) =>
                    onUpdateTarget({
                      ...nutritionTarget,
                      calories_kcal: parseInt(e.target.value) || 2400,
                      calculated_at: currentDate,
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-base font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    Proteína (g)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="5"
                    value={nutritionTarget.protein_g}
                    onChange={(e) =>
                      onUpdateTarget({
                        ...nutritionTarget,
                        protein_g: parseInt(e.target.value) || 180,
                        calculated_at: currentDate,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                    {nutritionTarget.protein_g * 4} kcal
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-sky-400 mb-1">
                    Carbohidratos (g)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="5"
                    value={nutritionTarget.carbohydrates_g}
                    onChange={(e) =>
                      onUpdateTarget({
                        ...nutritionTarget,
                        carbohydrates_g: parseInt(e.target.value) || 260,
                        calculated_at: currentDate,
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                  />
                  <span className="text-[10px] text-zinc-400 block mt-1 font-mono">
                    {nutritionTarget.carbohydrates_g * 4} kcal
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1">
                    Grasas (g)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="5"
                    value={nutritionTarget.fat_g}
                    onChange={(e) =>
                      onUpdateTarget({
                        ...nutritionTarget,
                        fat_g: parseInt(e.target.value) || 70,
                        calculated_at: currentDate,
                      })
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
                </span>
              </div>
            </div>
          </div>

          {/* Metabolic Estimation (Mifflin-St Jeor) with Interactive Tooltips */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Estimación Metabólica (Mifflin–St Jeor)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Pulsa en los términos técnicos para ver su explicación científica sencilla.
                </p>
              </div>
              <div className="flex gap-1.5">
                {(['bmr', 'mifflin', 'tdee'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === k ? null : k)}
                    className="px-2 py-1 rounded-full bg-zinc-950 border border-zinc-700 text-[10px] font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span className="uppercase">{k}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeTooltip && EDUCATIONAL_TOOLTIPS[activeTooltip] && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/40 text-xs text-zinc-200 space-y-1">
                <strong className="text-emerald-400 block">
                  {EDUCATIONAL_TOOLTIPS[activeTooltip].title}
                </strong>
                <p>{EDUCATIONAL_TOOLTIPS[activeTooltip].shortDescription}</p>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {EDUCATIONAL_TOOLTIPS[activeTooltip].scientificContext}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">
                    Metabolismo Basal (BMR)
                  </span>
                  <span className="text-[10px] text-zinc-400">Gasto vital en reposo absoluto</span>
                </div>
                <span className="text-lg font-bold font-mono text-white">{bmr} kcal</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">
                    Gasto Total Estimado (TDEE)
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    BMR × factor de actividad diaria
                  </span>
                </div>
                <span className="text-lg font-bold font-mono text-cyan-400">
                  {estimatedTDEE} kcal
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-300 font-medium block">
                    Déficit / Superávit Teórico
                  </span>
                  <span className="text-[10px] text-zinc-400">TDEE estimado - Objetivo actual</span>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {estimatedDeficit > 0
                    ? `-${estimatedDeficit} kcal (Déficit)`
                    : `+${Math.abs(estimatedDeficit)} kcal (Superávit)`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FOOD LIBRARY WITH VERIFIED VS COMMUNITY BADGES */}
      {activeTab === 'food_library' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Base de Datos de Alimentos Verificados y de Comunidad</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Diferenciación visual entre productos con tabla nutricional verificada y registros manuales/comunidad.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateCustomFood}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Nuevo Alimento</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {foods.map((food) => {
              const isVerified =
                food.data_source_badge === 'verified' || food.source === 'verified';
              const isFav = favoriteIds.includes(food.id) || Boolean(food.is_favorite);

              return (
                <div
                  key={food.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const next = StorageService.toggleFavoriteFood(food.id);
                            setFavoriteIds(next);
                          }}
                          className={`cursor-pointer ${
                            isFav ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                        <h4 className="text-xs font-semibold text-white">{food.name}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {food.brand && (
                          <span className="text-[10px] text-zinc-400">{food.brand}</span>
                        )}
                        <span
                          className={`inline-flex items-center gap-0.5 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            isVerified
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isVerified ? (
                            <>
                              <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                            </>
                          ) : (
                            <>
                              <Users className="w-2.5 h-2.5" /> Comunidad / Manual
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-300">
                      {food.serving_size}
                      {food.serving_unit}
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
              );
            })}
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
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Abrir Importador</span>
            </button>
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
            `¡Éxito! Se importaron ${count} alimentos (${prov}). ${
              skipped > 0 ? `${skipped} duplicados omitidos.` : ''
            }`
          );
        }}
      />
    </div>
  );
};
