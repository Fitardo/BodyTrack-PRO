/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Scale,
  Flame,
  Dumbbell,
  Footprints,
  Moon,
  Sparkles,
  Trophy,
  CheckCircle2,
  Circle,
  TrendingDown,
  TrendingUp,
  Minus,
  Ruler,
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { WeeklyAnalysisBanner } from './WeeklyAnalysisBanner';
import { InteractiveCharts } from './InteractiveCharts';
import {
  WeighIn,
  BodyMeasurement,
  FoodLog,
  WorkoutSession,
  ActivityLog,
  RecoveryLog,
  NutritionTarget,
  PhysicalGoal,
  DailyHabits,
  WeeklyReview,
} from '../../types';
import { calculateWeeklyAverage } from '../../utils/calculations';

interface DashboardViewProps {
  currentDate: string;
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  recoveryLogs: RecoveryLog[];
  nutritionTarget: NutritionTarget;
  goal: PhysicalGoal;
  habits: DailyHabits;
  onToggleHabit: (habitKey: keyof DailyHabits) => void;
  latestReview?: WeeklyReview;
  onOpenQuickLog: () => void;
  onOpenReviewModal: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentDate,
  weighIns,
  measurements,
  foodLogs,
  workoutSessions,
  activityLogs,
  recoveryLogs,
  nutritionTarget,
  goal,
  habits,
  onToggleHabit,
  latestReview,
  onOpenQuickLog,
  onOpenReviewModal,
  onNavigateToTab,
}) => {
  // Sort weigh-ins ascending
  const sortedWeighIns = [...weighIns].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
  const latestWeighIn = sortedWeighIns[sortedWeighIns.length - 1];
  const initialWeighIn = sortedWeighIns[0];

  // 7-day average for current week
  const past7DaysWeighIns = sortedWeighIns.slice(-7);
  const current7dStats = calculateWeeklyAverage(past7DaysWeighIns);

  // Previous 7-day average (days -14 to -7)
  const prev7DaysWeighIns = sortedWeighIns.slice(-14, -7);
  const prev7dStats = calculateWeeklyAverage(prev7DaysWeighIns);

  const weeklyDiff =
    current7dStats.average !== null && prev7dStats.average !== null
      ? Number((current7dStats.average - prev7dStats.average).toFixed(2))
      : null;

  const totalChangeFromStart =
    latestWeighIn && initialWeighIn
      ? Number((latestWeighIn.weight_kg - initialWeighIn.weight_kg).toFixed(2))
      : 0;

  // Latest Measurement
  const latestMeas = measurements[measurements.length - 1];
  const initialMeas = measurements[0];
  const waistDiff =
    latestMeas && initialMeas
      ? Number((latestMeas.waist_cm - initialMeas.waist_cm).toFixed(1))
      : 0;

  // Today's nutrition
  const todayFoodLogs = foodLogs.filter((l) => l.consumed_at === currentDate);
  const todayCalories = todayFoodLogs.reduce((acc, curr) => acc + curr.calories_kcal, 0);
  const todayProtein = todayFoodLogs.reduce((acc, curr) => acc + curr.protein_g, 0);
  const todayCarbs = todayFoodLogs.reduce((acc, curr) => acc + curr.carbohydrates_g, 0);
  const todayFat = todayFoodLogs.reduce((acc, curr) => acc + curr.fat_g, 0);

  const caloriesRemaining = nutritionTarget.calories_kcal - todayCalories;
  const caloriePercent = Math.min(100, Math.round((todayCalories / nutritionTarget.calories_kcal) * 100));

  // Today's activity
  const todayActivity = activityLogs.find((a) => a.activity_date === currentDate);
  const todaySteps = todayActivity ? todayActivity.steps : 0;

  // Workouts completed this week (last 7 days)
  const recentWorkouts = workoutSessions.filter((s) => s.status === 'completed');

  // Sleep
  const latestRecovery = recoveryLogs[recoveryLogs.length - 1];

  const habitList: Array<{ key: keyof DailyHabits; label: string; desc: string }> = [
    { key: 'weigh_in_done', label: 'Pesaje en ayunas', desc: 'Registrado al despertar' },
    { key: 'protein_goal_met', label: 'Meta de proteína (180g)', desc: 'Construcción y protección muscular' },
    { key: 'meals_logged', label: 'Registro de comidas', desc: 'Desayuno, almuerzo, merienda y cena' },
    { key: 'workout_done', label: 'Entrenamiento programado', desc: 'Sesión PPL completada' },
    { key: 'steps_goal_met', label: 'Objetivo de pasos (5.000+)', desc: 'Actividad NEAT cotidiana' },
    { key: 'sleep_7h_plus', label: 'Descanso reparador (7h+)', desc: 'Recuperación del sistema nervioso' },
  ];

  return (
    <div className="space-y-6">
      {/* Smart Weekly Analysis Banner */}
      <WeeklyAnalysisBanner
        latestReview={latestReview}
        weighInsCount={past7DaysWeighIns.length}
        nutritionLogsCount={todayFoodLogs.length > 0 ? 7 : 6}
        onOpenReviewModal={onOpenReviewModal}
      />

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Weight */}
        <MetricCard
          title="PESO MÁS RECIENTE"
          value={latestWeighIn ? latestWeighIn.weight_kg : '--'}
          unit="kg"
          secondaryText={latestWeighIn ? `Medido: ${latestWeighIn.measured_at}` : 'Sin datos'}
          badge={
            totalChangeFromStart < 0
              ? { text: `${totalChangeFromStart} kg inicio`, type: 'positive' }
              : { text: `+${totalChangeFromStart} kg inicio`, type: 'neutral' }
          }
          icon={Scale}
          accentColor="cyan"
          onClick={() => onNavigateToTab('weight')}
        />

        {/* 7-day Avg Weight */}
        <MetricCard
          title="PROMEDIO 7 DÍAS"
          value={current7dStats.average ?? '--'}
          unit="kg"
          secondaryText={
            weeklyDiff !== null
              ? `${weeklyDiff > 0 ? '+' : ''}${weeklyDiff} kg vs sem anterior`
              : 'Evaluando tendencia'
          }
          badge={
            weeklyDiff !== null && weeklyDiff <= -0.25 && weeklyDiff >= -0.75
              ? { text: 'Ritmo óptimo', type: 'positive' }
              : weeklyDiff !== null && weeklyDiff < -0.75
              ? { text: 'Pérdida rápida', type: 'warning' }
              : { text: 'Estable', type: 'info' }
          }
          icon={TrendingDown}
          accentColor="emerald"
          onClick={() => onNavigateToTab('weight')}
        />

        {/* Waist Circumference */}
        <MetricCard
          title="CINTURA UMBILICAL"
          value={latestMeas ? latestMeas.waist_cm : '--'}
          unit="cm"
          secondaryText={`Objetivo: ${goal.target_waist_cm || 80} cm`}
          badge={
            waistDiff < 0
              ? { text: `${waistDiff} cm desde inicio`, type: 'positive' }
              : { text: 'Estable', type: 'neutral' }
          }
          icon={Ruler}
          accentColor="amber"
          onClick={() => onNavigateToTab('weight')}
        />

        {/* Calories Today */}
        <MetricCard
          title="CALORÍAS HOY"
          value={todayCalories}
          unit={`/ ${nutritionTarget.calories_kcal} kcal`}
          secondaryText={`${caloriesRemaining >= 0 ? `${caloriesRemaining} kcal restantes` : `${Math.abs(caloriesRemaining)} kcal de exceso`}`}
          badge={{ text: `${caloriePercent}% meta`, type: caloriePercent <= 105 ? 'positive' : 'warning' }}
          icon={Flame}
          accentColor="emerald"
          onClick={() => onNavigateToTab('nutrition')}
        />

        {/* Protein Today */}
        <MetricCard
          title="PROTEÍNA HOY"
          value={Math.round(todayProtein)}
          unit={`/ ${nutritionTarget.protein_g} g`}
          secondaryText={`${Math.round(todayProtein * 4)} kcal derivadas`}
          badge={{
            text: todayProtein >= nutritionTarget.protein_g ? 'Cumplido' : 'En progreso',
            type: todayProtein >= nutritionTarget.protein_g ? 'positive' : 'neutral',
          }}
          icon={Dumbbell}
          accentColor="emerald"
          onClick={() => onNavigateToTab('nutrition')}
        />

        {/* Steps Today */}
        <MetricCard
          title="PASOS HOY"
          value={todaySteps.toLocaleString()}
          unit="pasos"
          secondaryText="Meta inicial: 5.000 pasos"
          badge={{
            text: todaySteps >= 5000 ? 'Meta alcanzada' : 'Actividad moderada',
            type: todaySteps >= 5000 ? 'positive' : 'info',
          }}
          icon={Footprints}
          accentColor="cyan"
          onClick={() => onNavigateToTab('activity')}
        />

        {/* Workouts this week */}
        <MetricCard
          title="ENTRENAMIENTO SEMANAL"
          value={recentWorkouts.length}
          unit="sesiones"
          secondaryText="Frecuencia objetivo: 5-6 días"
          badge={{ text: 'PPL en curso', type: 'positive' }}
          icon={Dumbbell}
          accentColor="violet"
          onClick={() => onNavigateToTab('workout')}
        />

        {/* Sleep & Recovery */}
        <MetricCard
          title="SUEÑO Y DESCANSO"
          value={latestRecovery ? `${latestRecovery.sleep_hours}h` : '7.8h'}
          secondaryText={latestRecovery ? `Calidad: ${latestRecovery.sleep_quality}/5 estrellas` : 'Buen descanso'}
          badge={{ text: 'Recuperado', type: 'positive' }}
          icon={Moon}
          accentColor="violet"
          onClick={() => onNavigateToTab('activity')}
        />
      </div>

      {/* Interactive Analytics Charts */}
      <InteractiveCharts
        weighIns={weighIns}
        measurements={measurements}
        foodLogs={foodLogs}
        workoutSessions={workoutSessions}
        activityLogs={activityLogs}
        calorieTarget={nutritionTarget.calories_kcal}
        proteinTarget={nutritionTarget.protein_g}
      />

      {/* Daily Habits & Consistency Section */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Hábitos Diarios y Consistencia ({currentDate})</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pequeñas acciones diarias acumuladas que impulsan la recomposición corporal sin castigos.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            {habitList.filter((h) => habits[h.key] === true).length} / {habitList.length} completados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {habitList.map((h) => {
            const isCompleted = habits[h.key] === true;
            return (
              <button
                key={h.key}
                type="button"
                onClick={() => onToggleHabit(h.key)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className={`text-xs font-semibold block ${isCompleted ? 'text-emerald-300' : 'text-zinc-200'}`}>
                    {h.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 block">{h.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
