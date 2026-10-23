/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { FoodLog, NutritionTarget } from '../../types';
import { evaluateDeficitHealth } from '../../utils/auditAndRetentionUtils';

interface DeficitHealthWidgetProps {
  currentDate: string;
  foodLogs: FoodLog[];
  nutritionTarget: NutritionTarget;
  onNavigateToTab: (tab: any) => void;
  simulateOrangeStreak?: boolean;
  onToggleSimulateOrange?: () => void;
}

export const DeficitHealthWidget: React.FC<DeficitHealthWidgetProps> = ({
  currentDate,
  foodLogs,
  nutritionTarget,
  onNavigateToTab,
  simulateOrangeStreak: controlledSimulate,
  onToggleSimulateOrange,
}) => {
  const [internalSimulate, setInternalSimulate] = useState(false);
  const simulateOrangeStreak =
    controlledSimulate !== undefined ? controlledSimulate : internalSimulate;
  const handleToggleSimulate = () => {
    if (onToggleSimulateOrange) {
      onToggleSimulateOrange();
    } else {
      setInternalSimulate((prev) => !prev);
    }
  };

  const effectiveFoodLogs = useMemo(() => {
    if (!simulateOrangeStreak) return foodLogs;

    // Build a 3-day consecutive surplus simulation ending on currentDate based on FoodLog entries
    const parseBase = new Date(`${currentDate}T12:00:00Z`);
    const shiftDate = (daysDelta: number) => {
      const d = new Date(parseBase.getTime() + daysDelta * 86400000);
      return d.toISOString().slice(0, 10);
    };

    const day0 = currentDate;
    const dayMinus1 = shiftDate(-1);
    const dayMinus2 = shiftDate(-2);
    const blockedDates = new Set([day0, dayMinus1, dayMinus2]);

    const filteredLogs = foodLogs.filter(
      (log) => !blockedDates.has(log.consumed_at.slice(0, 10))
    );

    const target = nutritionTarget.calories_kcal || 2400;

    const simulatedSurplusLogs: FoodLog[] = [
      {
        id: 'sim-surplus-d2',
        consumed_at: dayMinus2,
        consumed_time: '21:00',
        meal_type: 'cena',
        food_id: 'food-2',
        food_name_snapshot: 'Registro diario completo (+280 kcal exceso)',
        quantity: 500,
        unit: 'g',
        preparation_state: 'cooked',
        calories_kcal: target + 280,
        protein_g: nutritionTarget.protein_g,
        carbohydrates_g: nutritionTarget.carbohydrates_g + 45,
        fat_g: nutritionTarget.fat_g + 10,
        fiber_g: 32,
      },
      {
        id: 'sim-surplus-d1',
        consumed_at: dayMinus1,
        consumed_time: '21:30',
        meal_type: 'cena',
        food_id: 'food-2',
        food_name_snapshot: 'Registro diario completo (+340 kcal exceso)',
        quantity: 520,
        unit: 'g',
        preparation_state: 'cooked',
        calories_kcal: target + 340,
        protein_g: nutritionTarget.protein_g,
        carbohydrates_g: nutritionTarget.carbohydrates_g + 55,
        fat_g: nutritionTarget.fat_g + 12,
        fiber_g: 30,
      },
      {
        id: 'sim-surplus-d0',
        consumed_at: day0,
        consumed_time: '21:15',
        meal_type: 'cena',
        food_id: 'food-2',
        food_name_snapshot: 'Registro diario completo (+240 kcal exceso)',
        quantity: 490,
        unit: 'g',
        preparation_state: 'cooked',
        calories_kcal: target + 240,
        protein_g: nutritionTarget.protein_g,
        carbohydrates_g: nutritionTarget.carbohydrates_g + 40,
        fat_g: nutritionTarget.fat_g + 8,
        fiber_g: 31,
      },
    ];

    return [...filteredLogs, ...simulatedSurplusLogs];
  }, [foodLogs, simulateOrangeStreak, currentDate, nutritionTarget]);

  const assessment = useMemo(
    () =>
      evaluateDeficitHealth({
        foodLogs: effectiveFoodLogs,
        targetCaloriesKcal: nutritionTarget.calories_kcal,
        currentDate,
        windowDays: 7,
      }),
    [effectiveFoodLogs, nutritionTarget.calories_kcal, currentDate]
  );

  const isOrange = assessment.isOrangeAlert;
  const isCaution = assessment.status === 'caution';

  return (
    <div
      data-testid="deficit-health-indicator-card"
      data-status={assessment.status}
      data-orange-alert={isOrange ? 'true' : 'false'}
      className={`p-5 rounded-2xl border transition-all space-y-4 ${
        isOrange
          ? 'bg-gradient-to-br from-orange-950/60 via-zinc-900 to-zinc-950 border-orange-500/70 shadow-lg shadow-orange-500/10'
          : isCaution
          ? 'bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 border-amber-500/40'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isOrange
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                : isCaution
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isOrange ? (
              <ShieldAlert className="w-5 h-5 text-orange-400" />
            ) : isCaution ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Indicador de Salud de Déficit (FoodLog)
              </span>
              <span
                data-testid="deficit-health-badge"
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                  isOrange
                    ? 'bg-orange-500 text-zinc-950 border-orange-400'
                    : isCaution
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {assessment.badgeText}
              </span>
              {simulateOrangeStreak && (
                <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] font-mono text-orange-300">
                  Vista previa &gt;2 días
                </span>
              )}
            </div>

            <h3
              data-testid="deficit-health-headline"
              className={`text-base font-bold mt-1 ${
                isOrange
                  ? 'text-orange-300'
                  : isCaution
                  ? 'text-amber-200'
                  : 'text-white'
              }`}
            >
              {assessment.headline}
            </h3>
            <p className="text-xs text-zinc-300 mt-0.5">{assessment.subheadline}</p>
          </div>
        </div>

        {/* Controls: Simulate >2 Consecutive Surplus Days + Go to Nutrition */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          <button
            type="button"
            data-testid="deficit-health-simulate-orange-btn"
            onClick={handleToggleSimulate}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              simulateOrangeStreak
                ? 'bg-zinc-950 hover:bg-zinc-800 border-orange-500/50 text-orange-300'
                : 'bg-zinc-950 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
            }`}
            title="Alternar simulación de >2 días seguidos superando el objetivo calórico"
          >
            {simulateOrangeStreak ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                <span>Ver FoodLog Actual</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                <span>Simular &gt;2 días exceso</span>
              </>
            )}
          </button>

          <button
            type="button"
            data-testid="deficit-health-open-nutrition-btn"
            onClick={() => onNavigateToTab('nutrition')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isOrange
                ? 'bg-orange-500 hover:bg-orange-400 text-zinc-950 border-orange-400'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span>Ajustar FoodLog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          className={`p-3 rounded-xl border ${
            isOrange
              ? 'bg-orange-950/40 border-orange-500/50'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Días Seguidos Excedidos
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              data-testid="deficit-health-consecutive-days"
              className={`text-lg font-bold font-mono ${
                isOrange
                  ? 'text-orange-400'
                  : isCaution
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {assessment.consecutiveExceededDays} días
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              (umbral naranja: &gt;2d)
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            isOrange
              ? 'bg-orange-950/40 border-orange-500/50'
              : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Superávit en Racha Activa
          </span>
          <span
            data-testid="deficit-health-surplus-kcal"
            className={`text-lg font-bold font-mono block mt-0.5 ${
              isOrange
                ? 'text-orange-300'
                : assessment.accumulatedSurplusKcalInStreak > 0
                ? 'text-amber-300'
                : 'text-zinc-200'
            }`}
          >
            {assessment.accumulatedSurplusKcalInStreak > 0
              ? `+${assessment.accumulatedSurplusKcalInStreak} kcal`
              : '0 kcal'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Días en Meta (Últ. 7d)
          </span>
          <span className="text-lg font-bold font-mono text-emerald-400 block mt-0.5">
            {assessment.withinTargetDaysCountInWindow} / {assessment.loggedDaysCountInWindow} días
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Promedio vs Objetivo
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold font-mono text-white">
              {assessment.averageDailyKcalInWindow}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              / {assessment.targetCaloriesKcal} kcal
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day FoodLog Caloric Adherence Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Flame
              className={`w-3.5 h-3.5 ${
                isOrange ? 'text-orange-400' : 'text-emerald-400'
              }`}
            />
            <span>Historial de Balance Calórico (Últimos 7 días de FoodLog)</span>
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Objetivo diario: {assessment.targetCaloriesKcal} kcal
          </span>
        </div>

        <div
          data-testid="deficit-health-7d-strip"
          className="grid grid-cols-7 gap-1.5 sm:gap-2"
        >
          {assessment.dailyBreakdown.map((day) => {
            const isToday = day.date === currentDate;
            const pct = Math.min(
              130,
              Math.round((day.caloriesKcal / assessment.targetCaloriesKcal) * 100)
            );

            return (
              <div
                key={day.date}
                data-testid={`deficit-day-cell-${day.date}`}
                data-exceeded={day.exceededTarget ? 'true' : 'false'}
                className={`p-2 rounded-xl border flex flex-col justify-between transition-all ${
                  day.isPartOfOrangeStreak
                    ? 'bg-orange-500/20 border-orange-500 text-orange-200'
                    : day.exceededTarget
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                    : day.hasLogs
                    ? 'bg-zinc-950 border-zinc-800 text-zinc-200'
                    : 'bg-zinc-950/50 border-zinc-900 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold truncate">
                    {day.shortLabel}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-mono uppercase px-1 rounded bg-zinc-800 text-zinc-300">
                      Hoy
                    </span>
                  )}
                </div>

                {/* Mini visual bar */}
                <div className="my-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      day.isPartOfOrangeStreak
                        ? 'bg-orange-500'
                        : day.exceededTarget
                        ? 'bg-amber-400'
                        : day.hasLogs
                        ? 'bg-emerald-500'
                        : 'bg-zinc-700'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div>
                  <span className="text-[11px] font-mono font-bold block">
                    {day.hasLogs ? `${day.caloriesKcal} kcal` : 'Sin reg.'}
                  </span>
                  <span
                    className={`text-[10px] font-mono block ${
                      day.isPartOfOrangeStreak
                        ? 'text-orange-300 font-bold'
                        : day.exceededTarget
                        ? 'text-amber-300'
                        : day.hasLogs
                        ? 'text-emerald-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {!day.hasLogs
                      ? '--'
                      : day.deltaKcal > 0
                      ? `+${day.deltaKcal} kcal`
                      : `${day.deltaKcal} kcal`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Recommendation Footer */}
      <div
        data-testid="deficit-health-recommendation-box"
        className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
          isOrange
            ? 'bg-orange-500/15 border-orange-500/50 text-orange-200'
            : isCaution
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
        }`}
      >
        {isOrange ? (
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-bold">
            {isOrange
              ? 'Acción Correctiva Recomendada: '
              : 'Estado del Déficit Calórico: '}
          </span>
          <span>{assessment.recommendation}</span>
        </div>
      </div>
    </div>
  );
};
