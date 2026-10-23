/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  BarChart3,
  Scale,
  Utensils,
  Dumbbell,
  Crown,
  Flame,
  CalendarRange,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import {
  WeighIn,
  FoodLog,
  WorkoutSession,
  ActivityLog,
  NutritionTarget,
  DailyHabits,
} from '../../types';
import {
  calculateMonthlyConsistencyChartData,
  MonthlyConsistencyDailyBar,
  MonthlyConsistencyWeeklyBar,
} from '../../utils/auditAndRetentionUtils';

interface MonthlyConsistencyChartWidgetProps {
  currentDate: string;
  weighIns: WeighIn[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  nutritionTarget: NutritionTarget;
  habits: DailyHabits;
  onNavigateToTab: (tab: string) => void;
}

type ChartViewMode = 'daily' | 'weekly';
type PillarFilter = 'all' | 'pesajes' | 'comidas' | 'entrenamientos';

export const MonthlyConsistencyChartWidget: React.FC<MonthlyConsistencyChartWidgetProps> = ({
  currentDate,
  weighIns,
  foodLogs,
  workoutSessions,
  activityLogs,
  nutritionTarget,
  habits,
  onNavigateToTab,
}) => {
  const [viewMode, setViewMode] = useState<ChartViewMode>('daily');
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');

  const chartAnalytics = useMemo(
    () =>
      calculateMonthlyConsistencyChartData({
        currentDate,
        weighIns,
        foodLogs,
        workoutSessions,
        activityLogs,
        nutritionTarget,
        habits,
        days: 30,
      }),
    [
      currentDate,
      weighIns,
      foodLogs,
      workoutSessions,
      activityLogs,
      nutritionTarget,
      habits,
    ]
  );

  const { dailyBars, weeklyBars, summary } = chartAnalytics;

  const showPesajes = pillarFilter === 'all' || pillarFilter === 'pesajes';
  const showComidas = pillarFilter === 'all' || pillarFilter === 'comidas';
  const showEntrenamientos = pillarFilter === 'all' || pillarFilter === 'entrenamientos';

  const renderDailyTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: MonthlyConsistencyDailyBar }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const day = payload[0].payload;

    return (
      <div className="rounded-xl bg-zinc-950/95 border border-zinc-700 p-3 shadow-xl text-xs space-y-2 min-w-[210px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <span className="font-bold text-white">
            {day.shortLabel} ({day.axisLabel})
          </span>
          <span
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
              day.isPerfectCrown
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : day.dailyGoalMet
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : day.totalCompleted === 1
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {day.totalCompleted}/3 pilares
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Pesaje:
            </span>
            <span className="font-mono text-zinc-200">
              {day.pesajes === 1
                ? day.weightKg !== null
                  ? `${day.weightKg} kg`
                  : 'Registrado'
                : 'Sin registro'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Comidas:
            </span>
            <span className="font-mono text-zinc-200">
              {day.comidas === 1
                ? day.caloriesKcal > 0
                  ? `${day.caloriesKcal} kcal (${day.mealsCount} reg.)`
                  : 'Hábito cumplido'
                : 'Sin registro'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Entreno / NEAT:
            </span>
            <span className="font-mono text-zinc-200">
              {day.entrenamientos === 1
                ? day.workoutName
                  ? day.workoutName
                  : `${day.steps.toLocaleString()} pasos`
                : 'Sin registro'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderWeeklyTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: MonthlyConsistencyWeeklyBar }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const week = payload[0].payload;

    return (
      <div className="rounded-xl bg-zinc-950/95 border border-zinc-700 p-3 shadow-xl text-xs space-y-2 min-w-[220px]">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
          <span className="font-bold text-white">{week.weekLabel}</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
            {week.commitmentPct}% adherencia
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-medium">Pesajes registrados:</span>
            <span className="font-mono text-white">
              {week.pesajesCount}/{week.daysCount} días ({week.pesajesPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-medium">Comidas registradas:</span>
            <span className="font-mono text-white">
              {week.comidasCount}/{week.daysCount} días ({week.comidasPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-medium">Entrenos / NEAT:</span>
            <span className="font-mono text-white">
              {week.entrenamientosCount}/{week.daysCount} días ({week.entrenamientosPct}%)
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
            <span className="text-zinc-400">Metas Diarias (≥2/3):</span>
            <span className="font-mono text-emerald-300 font-bold">
              {week.dailyGoalsMetCount} días ({week.perfectDaysCount} coronas 3/3)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      data-testid="monthly-consistency-chart-widget"
      className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-lg"
    >
      {/* Top Header & Commitment Badge */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Gráfico Mensual de Consistencia de Registro
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] font-mono text-zinc-300">
              {summary.periodLabel}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Compromiso a largo plazo basado en el motor de rachas: pesajes matutinos, registro nutricional y sesiones de entrenamiento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            data-testid="monthly-commitment-score-badge"
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2"
          >
            <Flame className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] uppercase tracking-wider text-emerald-300/90 font-semibold block leading-none">
                {summary.commitmentLevelLabel}
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {summary.overallCommitmentPct}% compromiso 30d
              </span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div
            className="inline-flex rounded-xl bg-zinc-950 p-1 border border-zinc-800"
            role="group"
            aria-label="Modo de visualización del gráfico mensual"
          >
            <button
              type="button"
              data-testid="consistency-chart-mode-daily"
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              30 Días (Diario)
            </button>
            <button
              type="button"
              data-testid="consistency-chart-mode-weekly"
              onClick={() => setViewMode('weekly')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'weekly'
                  ? 'bg-emerald-500 text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              4 Semanas (Bloques)
            </button>
          </div>
        </div>
      </div>

      {/* 4 Pillar Consistency KPI Cards + Filter Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          data-testid="consistency-filter-pesajes"
          onClick={() =>
            setPillarFilter((prev) => (prev === 'pesajes' ? 'all' : 'pesajes'))
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            pillarFilter === 'pesajes'
              ? 'bg-cyan-500/15 border-cyan-400/60 ring-1 ring-cyan-400/30'
              : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Pesajes
            </span>
            <span className="text-xs font-mono font-bold text-cyan-300">
              {summary.pesajesConsistencyPct}%
            </span>
          </div>
          <p className="text-base font-bold font-mono text-white mt-1">
            {summary.pesajesDaysCount}
            <span className="text-xs text-zinc-400 font-normal">
              /{summary.windowDays} días
            </span>
          </p>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all"
              style={{ width: `${summary.pesajesConsistencyPct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          data-testid="consistency-filter-comidas"
          onClick={() =>
            setPillarFilter((prev) => (prev === 'comidas' ? 'all' : 'comidas'))
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            pillarFilter === 'comidas'
              ? 'bg-emerald-500/15 border-emerald-400/60 ring-1 ring-emerald-400/30'
              : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5" />
              Comidas
            </span>
            <span className="text-xs font-mono font-bold text-emerald-300">
              {summary.comidasConsistencyPct}%
            </span>
          </div>
          <p className="text-base font-bold font-mono text-white mt-1">
            {summary.comidasDaysCount}
            <span className="text-xs text-zinc-400 font-normal">
              /{summary.windowDays} días
            </span>
          </p>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${summary.comidasConsistencyPct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          data-testid="consistency-filter-entrenamientos"
          onClick={() =>
            setPillarFilter((prev) =>
              prev === 'entrenamientos' ? 'all' : 'entrenamientos'
            )
          }
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            pillarFilter === 'entrenamientos'
              ? 'bg-amber-500/15 border-amber-400/60 ring-1 ring-amber-400/30'
              : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" />
              Entrenamientos
            </span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {summary.entrenamientosConsistencyPct}%
            </span>
          </div>
          <p className="text-base font-bold font-mono text-white mt-1">
            {summary.entrenamientosDaysCount}
            <span className="text-xs text-zinc-400 font-normal">
              /{summary.windowDays} días
            </span>
          </p>
          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{ width: `${summary.entrenamientosConsistencyPct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          data-testid="consistency-filter-all"
          onClick={() => setPillarFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            pillarFilter === 'all'
              ? 'bg-zinc-800/90 border-zinc-600'
              : 'bg-zinc-950/90 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Metas Diarias (≥2/3)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {summary.perfectCrownDaysCount} coronas 3/3
            </span>
          </div>
          <p className="text-base font-bold font-mono text-white mt-1">
            {summary.dailyGoalsMetCount}
            <span className="text-xs text-zinc-400 font-normal">
              /{summary.windowDays} días cumplidos
            </span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 truncate">
            {pillarFilter === 'all'
              ? 'Mostrando los 3 pilares combinados'
              : 'Clic para volver a ver los 3 pilares'}
          </p>
        </button>
      </div>

      {/* Bar Chart Container */}
      <div
        data-testid="monthly-consistency-recharts-container"
        className="p-3.5 sm:p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-zinc-300 font-medium">
            <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {viewMode === 'daily'
                ? 'Frecuencia diaria de registros (0 a 3 pilares completados por día)'
                : 'Comparativa semanal de días registrados por módulo (sobre 7-8 días/semana)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {showPesajes && (
              <span className="inline-flex items-center gap-1.5 text-cyan-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                Pesajes
              </span>
            )}
            {showComidas && (
              <span className="inline-flex items-center gap-1.5 text-emerald-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Comidas
              </span>
            )}
            {showEntrenamientos && (
              <span className="inline-flex items-center gap-1.5 text-amber-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Entrenamientos
              </span>
            )}
          </div>
        </div>

        <div className="h-60 sm:h-68 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {viewMode === 'daily' ? (
              <BarChart
                key={`daily-${pillarFilter}`}
                data={dailyBars}
                margin={{ top: 10, right: 8, left: -22, bottom: 0 }}
                barCategoryGap="18%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="axisLabel"
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickLine={false}
                  domain={[0, 3]}
                  ticks={[0, 1, 2, 3]}
                  allowDecimals={false}
                />
                <Tooltip
                  content={renderDailyTooltip as never}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                />
                {pillarFilter === 'all' && (
                  <ReferenceLine
                    y={2}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.65}
                  />
                )}
                {showPesajes && (
                  <Bar
                    dataKey="pesajes"
                    name="Pesajes"
                    stackId="dailyConsistency"
                    fill="#22d3ee"
                    radius={
                      !showComidas && !showEntrenamientos
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                )}
                {showComidas && (
                  <Bar
                    dataKey="comidas"
                    name="Comidas"
                    stackId="dailyConsistency"
                    fill="#10b981"
                    radius={!showEntrenamientos ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                )}
                {showEntrenamientos && (
                  <Bar
                    dataKey="entrenamientos"
                    name="Entrenamientos"
                    stackId="dailyConsistency"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            ) : (
              <BarChart
                key={`weekly-${pillarFilter}`}
                data={weeklyBars}
                margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                barGap={6}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#27272a"
                  vertical={false}
                />
                <XAxis
                  dataKey="shortWeekLabel"
                  stroke="#71717a"
                  tick={{ fill: '#d4d4d8', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickLine={false}
                  domain={[0, 8]}
                  allowDecimals={false}
                />
                <Tooltip
                  content={renderWeeklyTooltip as never}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                />
                {showPesajes && (
                  <Bar
                    dataKey="pesajesCount"
                    name="Pesajes (días)"
                    fill="#22d3ee"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showComidas && (
                  <Bar
                    dataKey="comidasCount"
                    name="Comidas (días)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                )}
                {showEntrenamientos && (
                  <Bar
                    dataKey="entrenamientosCount"
                    name="Entrenamientos (días)"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Long-Term Commitment Insights & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-300">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Pilar más consistente:{' '}
              <strong className="text-white">{summary.strongestPillarLabel}</strong>
            </span>
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-400">
            Días activos en el mes:{' '}
            <strong className="text-zinc-200 font-mono">
              {summary.activeDaysCount}/{summary.windowDays}
            </strong>{' '}
            (Mejor racha: <strong className="text-amber-300 font-mono">{summary.bestStreak}d</strong>)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToTab('weight')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Pesaje</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('nutrition')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-zinc-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Comidas</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('workout')}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Entreno</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
};
