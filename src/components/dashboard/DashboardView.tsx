/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Scale,
  Flame,
  Dumbbell,
  Footprints,
  Moon,
  Trophy,
  CheckCircle2,
  Circle,
  TrendingDown,
  Ruler,
  Zap,
  Bell,
  Download,
  Calendar,
  Eye,
  BarChart3,
  HeartPulse,
  Sparkles,
} from 'lucide-react';
import { MetricCard } from './MetricCard';
import { WeeklyAnalysisBanner } from './WeeklyAnalysisBanner';
import { InteractiveCharts } from './InteractiveCharts';
import { StreakCounterWidget } from './StreakCounterWidget';
import { MonthlyConsistencyChartWidget } from './MonthlyConsistencyChartWidget';
import { DeficitHealthWidget } from './DeficitHealthWidget';
import { FourWeekBodyEvolutionWidget } from './FourWeekBodyEvolutionWidget';
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
  PushReminderConfig,
} from '../../types';
import { calculateWeeklyAverage, calculateLoggingStreak } from '../../utils/calculations';
import {
  calculateWeeklyDashboardSummary,
  getStreakGamificationState,
  evaluateDeficitHealth,
  evaluateMealPushNotifications,
  MealPushSlotStatus,
} from '../../utils/auditAndRetentionUtils';
import { StorageService } from '../../services/storage';

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
  const [dashboardMode, setDashboardMode] = useState<'minimalist' | 'detailed'>('detailed');
  const [simulateOrangeDeficit, setSimulateOrangeDeficit] = useState(false);
  const [reminders, setReminders] = useState<PushReminderConfig>(() =>
    StorageService.getPushReminders()
  );
  const [reminderSavedBanner, setReminderSavedBanner] = useState<string | null>(null);
  const [activePushPreview, setActivePushPreview] = useState<MealPushSlotStatus | null>(null);

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

  const caloriesRemaining = nutritionTarget.calories_kcal - todayCalories;
  const proteinRemaining = Math.max(0, Math.round(nutritionTarget.protein_g - todayProtein));
  const caloriePercent = Math.min(
    100,
    Math.round((todayCalories / nutritionTarget.calories_kcal) * 100)
  );

  // Today's weigh-in & workout status
  const todayWeighIn = weighIns.find((w) => w.measured_at.startsWith(currentDate));
  const todayWorkout = workoutSessions.find(
    (s) => s.started_at.startsWith(currentDate) && s.status === 'completed'
  );

  // Today's activity
  const todayActivity = activityLogs.find((a) => a.activity_date === currentDate);
  const todaySteps = todayActivity ? todayActivity.steps : 0;

  // Workouts completed
  const recentWorkouts = workoutSessions.filter((s) => s.status === 'completed');

  // Sleep & RHR
  const latestRecovery = recoveryLogs[recoveryLogs.length - 1];

  // Streak & Gamification (Duolingo style)
  const streakDays = calculateLoggingStreak(weighIns, foodLogs, currentDate);
  const streakGamification = getStreakGamificationState(streakDays);

  // Weekly Summary Report
  const weeklySummary = calculateWeeklyDashboardSummary(
    currentDate,
    weighIns,
    foodLogs,
    workoutSessions,
    nutritionTarget
  );

  // Salud de Déficit (FoodLog consecutive exceeded days check)
  const deficitEvalLogs = simulateOrangeDeficit
    ? [
        ...foodLogs.filter((l) => {
          const d0 = currentDate;
          const base = new Date(`${currentDate}T12:00:00Z`).getTime();
          const d1 = new Date(base - 86400000).toISOString().slice(0, 10);
          const d2 = new Date(base - 2 * 86400000).toISOString().slice(0, 10);
          const k = l.consumed_at.slice(0, 10);
          return k !== d0 && k !== d1 && k !== d2;
        }),
        {
          id: 'sim-d2',
          consumed_at: new Date(new Date(`${currentDate}T12:00:00Z`).getTime() - 2 * 86400000)
            .toISOString()
            .slice(0, 10),
          meal_type: 'cena' as const,
          food_id: 'food-2',
          food_name_snapshot: 'Simulación Exceso D-2',
          quantity: 500,
          unit: 'g' as const,
          preparation_state: 'cooked' as const,
          calories_kcal: nutritionTarget.calories_kcal + 280,
          protein_g: nutritionTarget.protein_g,
          carbohydrates_g: nutritionTarget.carbohydrates_g,
          fat_g: nutritionTarget.fat_g,
          fiber_g: 30,
        },
        {
          id: 'sim-d1',
          consumed_at: new Date(new Date(`${currentDate}T12:00:00Z`).getTime() - 86400000)
            .toISOString()
            .slice(0, 10),
          meal_type: 'cena' as const,
          food_id: 'food-2',
          food_name_snapshot: 'Simulación Exceso D-1',
          quantity: 500,
          unit: 'g' as const,
          preparation_state: 'cooked' as const,
          calories_kcal: nutritionTarget.calories_kcal + 340,
          protein_g: nutritionTarget.protein_g,
          carbohydrates_g: nutritionTarget.carbohydrates_g,
          fat_g: nutritionTarget.fat_g,
          fiber_g: 30,
        },
        {
          id: 'sim-d0',
          consumed_at: currentDate,
          meal_type: 'cena' as const,
          food_id: 'food-2',
          food_name_snapshot: 'Simulación Exceso Hoy',
          quantity: 500,
          unit: 'g' as const,
          preparation_state: 'cooked' as const,
          calories_kcal: nutritionTarget.calories_kcal + 240,
          protein_g: nutritionTarget.protein_g,
          carbohydrates_g: nutritionTarget.carbohydrates_g,
          fat_g: nutritionTarget.fat_g,
          fiber_g: 30,
        },
      ]
    : foodLogs;

  const liveDeficitHealth = evaluateDeficitHealth({
    foodLogs: deficitEvalLogs,
    targetCaloriesKcal: nutritionTarget.calories_kcal,
    currentDate,
    windowDays: 7,
  });

  // Evaluación de Notificaciones Push de Comidas (Desayuno, Almuerzo, Merienda y Cena)
  const mealPushEvaluation = evaluateMealPushNotifications({
    config: reminders,
    foodLogs,
    currentDate,
    nutritionTarget,
  });

  const handleUpdateReminder = (patch: Partial<PushReminderConfig>) => {
    const next = { ...reminders, ...patch };
    setReminders(next);
    StorageService.savePushReminders(next);
    setReminderSavedBanner('Preferencias de notificaciones push actualizadas.');
    setTimeout(() => setReminderSavedBanner(null), 2500);
  };

  const handleTriggerMealPushNotification = (slot: MealPushSlotStatus) => {
    setActivePushPreview(slot);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(slot.pushTitle, {
            body: slot.pushMessage,
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              new Notification(slot.pushTitle, { body: slot.pushMessage });
            }
          });
        }
      } catch {
        // Fallback to in-app push notification toast in restricted iframe
      }
    }
  };

  const handleQuickExportAllData = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      version: 'BodyTrack_Pro_Beta_v2',
      profile: StorageService.getProfile(),
      goal: StorageService.getGoal(),
      nutritionTarget,
      weighIns,
      measurements,
      foodLogs,
      workoutSessions,
      activityLogs,
      recoveryLogs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bodytrack-pro-backup-${currentDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Pending actions for today (3-second glance)
  const pendingTodayItems: Array<{ label: string; tab: string }> = [];
  if (!todayWeighIn) pendingTodayItems.push({ label: 'Pesaje matutino', tab: 'weight' });
  if (todayFoodLogs.length === 0) {
    pendingTodayItems.push({ label: 'Registrar comidas de hoy', tab: 'nutrition' });
  } else if (proteinRemaining > 15) {
    pendingTodayItems.push({
      label: `Completar ${proteinRemaining}g de proteína`,
      tab: 'nutrition',
    });
  }
  if (!todayWorkout) {
    pendingTodayItems.push({ label: 'Sesión de entrenamiento PPL', tab: 'workout' });
  }

  const habitList: Array<{ key: keyof DailyHabits; label: string; desc: string }> = [
    { key: 'weigh_in_done', label: 'Pesaje en ayunas', desc: 'Registrado al despertar' },
    {
      key: 'protein_goal_met',
      label: `Meta de proteína (${nutritionTarget.protein_g}g)`,
      desc: 'Construcción y protección muscular',
    },
    {
      key: 'meals_logged',
      label: 'Registro de comidas',
      desc: 'Desayuno, almuerzo, merienda y cena',
    },
    {
      key: 'workout_done',
      label: 'Entrenamiento programado',
      desc: 'Sesión PPL completada',
    },
    {
      key: 'steps_goal_met',
      label: 'Objetivo de pasos (5.000+)',
      desc: 'Actividad NEAT cotidiana',
    },
    {
      key: 'sleep_7h_plus',
      label: 'Descanso reparador (7h+)',
      desc: 'Recuperación del sistema nervioso',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Bar: Minimalist Quick-Read Mode Toggle + Duolingo Streak Pill + Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              data-testid="dashboard-mode-minimalist-btn"
              onClick={() => setDashboardMode('minimalist')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                dashboardMode === 'minimalist'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Rápida (Móvil 3s)</span>
            </button>
            <button
              type="button"
              data-testid="dashboard-mode-detailed-btn"
              onClick={() => setDashboardMode('detailed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                dashboardMode === 'detailed'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard Completo</span>
            </button>
          </div>

          <span className="text-xs text-zinc-400 hidden lg:inline">
            Diseño de lectura rápida: nutrición del día, pendientes y estado de entrenamiento.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="dashboard-export-json-btn"
            onClick={handleQuickExportAllData}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Descargar copia completa de tus datos (JSON)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar Historial</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('reports')}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-emerald-400 transition-colors cursor-pointer"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* 3-Second Minimalist Mobile Quick-Read Card (Always visible at top for instant clarity) */}
      <div
        data-testid="minimalist-quick-summary-card"
        className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Resumen de Lectura Rápida ({currentDate})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            3 preguntas clave en 3 segundos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. ¿Cómo va la nutrición del día? */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-400">
                1. ¿Cómo va tu nutrición hoy?
              </span>
              <Flame className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-white">{todayCalories}</span>
              <span className="text-xs text-zinc-400 font-mono">
                / {nutritionTarget.calories_kcal} kcal ({caloriePercent}%)
              </span>
            </div>
            <p className="text-xs text-zinc-300">
              Proteína:{' '}
              <strong className="text-white font-mono">
                {Math.round(todayProtein)}g / {nutritionTarget.protein_g}g
              </strong>{' '}
              ({proteinRemaining > 0 ? `Faltan ${proteinRemaining}g` : 'Meta lograda ✓'})
            </p>
            <div
              data-testid="quick-summary-deficit-health-pill"
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold flex items-center justify-between ${
                liveDeficitHealth.isOrangeAlert
                  ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                  : liveDeficitHealth.status === 'caution'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
              }`}
            >
              <span>Salud de Déficit:</span>
              <span>
                {liveDeficitHealth.isOrangeAlert
                  ? `¡Alerta! ${liveDeficitHealth.consecutiveExceededDays}d en exceso`
                  : liveDeficitHealth.consecutiveExceededDays > 0
                  ? `${liveDeficitHealth.consecutiveExceededDays}/2d sobre meta`
                  : 'Óptima (0d exceso)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('nutrition')}
              className="w-full py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors cursor-pointer"
            >
              Ir a Nutrición / Escanear →
            </button>
          </div>

          {/* 2. ¿Qué falta registrar hoy? */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-amber-400">
                2. ¿Qué falta registrar hoy?
              </span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            {pendingTodayItems.length === 0 ? (
              <div className="py-2 text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Todo el registro clave de hoy está al día!</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingTodayItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigateToTab(item.tab)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 flex items-center justify-between cursor-pointer"
                  >
                    <span>• {item.label}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Registrar →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. ¿Cuál es el estado del entrenamiento? */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-cyan-400">
                3. Estado del Entrenamiento
              </span>
              <Dumbbell className="w-4 h-4 text-cyan-400" />
            </div>
            {todayWorkout ? (
              <>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Completado: {todayWorkout.routine_name}</span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  {todayWorkout.duration_minutes || 60} min • RPE {todayWorkout.perceived_rpe || 8}
                  /10
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-white">
                  Sesión PPL lista para iniciar
                </div>
                <p className="text-xs text-zinc-400">
                  {weeklySummary.workoutsCompleted} sesiones completadas en los últimos 7 días.
                </p>
              </>
            )}
            <button
              type="button"
              onClick={() => onNavigateToTab('workout')}
              className="w-full py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {todayWorkout ? 'Ver Historial PPL →' : 'Iniciar Entrenamiento Activo →'}
            </button>
          </div>
        </div>
      </div>

      {/* Indicador de Salud de Déficit (Resalta en naranja si excede el objetivo calórico > 2 días seguidos en FoodLog) */}
      <DeficitHealthWidget
        currentDate={currentDate}
        foodLogs={foodLogs}
        nutritionTarget={nutritionTarget}
        onNavigateToTab={onNavigateToTab}
        simulateOrangeStreak={simulateOrangeDeficit}
        onToggleSimulateOrange={() => setSimulateOrangeDeficit((prev) => !prev)}
      />

      {/* Gráfico de Líneas de Evolución Corporal (Últimas 4 Semanas: Peso kg vs % Grasa Corporal) */}
      <FourWeekBodyEvolutionWidget
        currentDate={currentDate}
        weighIns={weighIns}
        measurements={measurements}
        goal={goal}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Gamified Streak Counter, Consecutive Registration History & Meta Diaria Indicator */}
      <StreakCounterWidget
        currentDate={currentDate}
        weighIns={weighIns}
        foodLogs={foodLogs}
        workoutSessions={workoutSessions}
        activityLogs={activityLogs}
        nutritionTarget={nutritionTarget}
        habits={habits}
        onToggleHabit={onToggleHabit}
        onNavigateToTab={onNavigateToTab}
        onOpenQuickLog={onOpenQuickLog}
      />

      {/* Monthly Bar Chart for Data Logging Consistency (Pesajes, Comidas, Entrenamientos) */}
      <MonthlyConsistencyChartWidget
        currentDate={currentDate}
        weighIns={weighIns}
        foodLogs={foodLogs}
        workoutSessions={workoutSessions}
        activityLogs={activityLogs}
        nutritionTarget={nutritionTarget}
        habits={habits}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Weekly Summary Report Row */}
      <div>
        {/* Weekly Summary Report Card */}
        <div
          data-testid="weekly-summary-report-card"
          className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Reporte de Resumen Semanal ({weeklySummary.periodLabel})</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Promedios calóricos, consistencia de registro, tendencia de peso y volumen PPL.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              {weeklySummary.consistencyScorePct}% consistencia
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                Promedio Kcal
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {weeklySummary.avgCaloriesKcal} kcal
              </span>
              <span className="text-[10px] text-emerald-400 font-mono block">
                {weeklySummary.avgProteinG}g Prot
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                Días Registrados
              </span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {weeklySummary.daysNutritionLogged} / 7 días
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {weeklySummary.daysWeighedIn}/7 pesajes
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                Evolución Peso
              </span>
              <span className="text-sm font-bold font-mono text-cyan-400">
                {weeklySummary.weightTrendDeltaKg !== null
                  ? `${weeklySummary.weightTrendDeltaKg > 0 ? '+' : ''}${
                      weeklySummary.weightTrendDeltaKg
                    } kg`
                  : 'Estable'}
              </span>
              <span className="text-[10px] text-zinc-400 block">Media móvil</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">
                Volumen Entreno
              </span>
              <span className="text-sm font-bold font-mono text-amber-400">
                {weeklySummary.totalWorkoutVolumeKg.toLocaleString()} kg
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block">
                {weeklySummary.workoutsCompleted} sesiones ({weeklySummary.totalEffectiveSets}{' '}
                series)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Analytics View Sections */}
      {dashboardMode === 'detailed' && (
        <>
          {/* Smart Weekly Analysis Banner */}
          <WeeklyAnalysisBanner
            latestReview={latestReview}
            weighInsCount={past7DaysWeighIns.length}
            nutritionLogsCount={todayFoodLogs.length > 0 ? 7 : 6}
            onOpenReviewModal={onOpenReviewModal}
          />

          {/* Primary KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              title="PESO MÁS RECIENTE"
              value={latestWeighIn ? latestWeighIn.weight_kg : '--'}
              unit="kg"
              secondaryText={
                latestWeighIn ? `Medido: ${latestWeighIn.measured_at}` : 'Sin datos'
              }
              badge={
                totalChangeFromStart < 0
                  ? { text: `${totalChangeFromStart} kg inicio`, type: 'positive' }
                  : { text: `+${totalChangeFromStart} kg inicio`, type: 'neutral' }
              }
              icon={Scale}
              accentColor="cyan"
              onClick={() => onNavigateToTab('weight')}
            />

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

            <MetricCard
              title="CALORÍAS HOY"
              value={todayCalories}
              unit={`/ ${nutritionTarget.calories_kcal} kcal`}
              secondaryText={`${
                caloriesRemaining >= 0
                  ? `${caloriesRemaining} kcal restantes`
                  : `${Math.abs(caloriesRemaining)} kcal de exceso`
              }`}
              badge={{
                text: `${caloriePercent}% meta`,
                type: caloriePercent <= 105 ? 'positive' : 'warning',
              }}
              icon={Flame}
              accentColor="emerald"
              onClick={() => onNavigateToTab('nutrition')}
            />

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

            <MetricCard
              title="SUEÑO Y FC REPOSO"
              value={latestRecovery ? `${latestRecovery.sleep_hours}h` : '7.8h'}
              secondaryText={
                latestRecovery?.resting_heart_rate_bpm
                  ? `FC Reposo: ${latestRecovery.resting_heart_rate_bpm} bpm`
                  : latestRecovery
                  ? `Calidad: ${latestRecovery.sleep_quality}/5`
                  : 'Buen descanso'
              }
              badge={{ text: 'Recuperado', type: 'positive' }}
              icon={latestRecovery?.resting_heart_rate_bpm ? HeartPulse : Moon}
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
        </>
      )}

      {/* Daily Habits & Push Reminders Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                <span>Hábitos Diarios y Consistencia ({currentDate})</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pequeñas acciones diarias acumuladas que impulsan la recomposición corporal.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              {habitList.filter((h) => habits[h.key] === true).length} / {habitList.length}{' '}
              completados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {habitList.map((h) => {
              const isCompleted = habits[h.key] === true;
              return (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => onToggleHabit(h.key)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
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
                    <span
                      className={`text-xs font-semibold block ${
                        isCompleted ? 'text-emerald-300' : 'text-zinc-200'
                      }`}
                    >
                      {h.label}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">{h.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Push Notifications Configurator: Desayuno, Almuerzo, Merienda y Cena + Pesaje/PPL */}
        <div
          data-testid="push-reminders-card"
          className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white">
                  Notificaciones Push de Comidas
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Desayuno · Almuerzo · Merienda · Cena ({mealPushEvaluation.loggedMealsCount}/4 registradas hoy)
                </span>
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                data-testid="push-master-toggle"
                checked={reminders.enabled}
                onChange={(e) => handleUpdateReminder({ enabled: e.target.checked })}
                className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
              />
              <span className="text-[11px] font-semibold">Activas</span>
            </label>
          </div>

          {reminderSavedBanner && (
            <div
              data-testid="push-saved-banner"
              className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300"
            >
              {reminderSavedBanner}
            </div>
          )}

          {/* Active Push Notification Toast Preview */}
          {activePushPreview && (
            <div
              data-testid="active-push-notification-toast"
              className="p-3 rounded-xl bg-zinc-950 border border-amber-500/50 space-y-2 shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  data-testid="active-push-toast-title"
                  className="text-xs font-bold text-amber-300"
                >
                  {activePushPreview.pushTitle}
                </span>
                <button
                  type="button"
                  data-testid="close-push-toast-btn"
                  onClick={() => setActivePushPreview(null)}
                  className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
              <p
                data-testid="active-push-toast-message"
                className="text-[11px] text-zinc-300 leading-relaxed"
              >
                {activePushPreview.pushMessage}
              </p>
              <button
                type="button"
                data-testid="active-push-toast-cta"
                onClick={() => onNavigateToTab('nutrition')}
                className="w-full py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
              >
                {activePushPreview.ctaLabel}
              </button>
            </div>
          )}

          {/* 4 Meal Push Notification Slots: Desayuno, Almuerzo, Merienda, Cena */}
          <div className="space-y-2 text-xs">
            {mealPushEvaluation.slots.map((slot) => {
              const toggleFieldMap: Record<string, keyof PushReminderConfig> = {
                desayuno: 'breakfast_enabled',
                almuerzo: 'lunch_enabled',
                merienda: 'snack_enabled',
                cena: 'dinner_enabled',
              };
              const timeFieldMap: Record<string, keyof PushReminderConfig> = {
                desayuno: 'breakfast_time',
                almuerzo: 'lunch_time',
                merienda: 'snack_time',
                cena: 'dinner_time',
              };

              const toggleKey = toggleFieldMap[slot.mealType];
              const timeKey = timeFieldMap[slot.mealType];

              return (
                <div
                  key={slot.mealType}
                  data-testid={`push-slot-${slot.mealType}`}
                  className={`p-2.5 rounded-xl border transition-colors space-y-1.5 ${
                    slot.status === 'pending_alert'
                      ? 'bg-zinc-950 border-amber-500/40'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-zinc-100 font-semibold cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        data-testid={`push-toggle-${slot.mealType}`}
                        checked={slot.enabled}
                        onChange={(e) =>
                          handleUpdateReminder({ [toggleKey]: e.target.checked })
                        }
                        className="rounded accent-emerald-500 cursor-pointer shrink-0"
                      />
                      <span>Aviso de {slot.label}</span>
                    </label>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="time"
                        data-testid={`push-time-${slot.mealType}`}
                        value={slot.scheduledTime}
                        onChange={(e) =>
                          handleUpdateReminder({ [timeKey]: e.target.value })
                        }
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 font-mono text-[11px] text-white"
                      />
                      <button
                        type="button"
                        data-testid={`push-test-btn-${slot.mealType}`}
                        onClick={() => handleTriggerMealPushNotification(slot)}
                        className="px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[10px] font-bold text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
                        title={`Probar notificación push de ${slot.label}`}
                      >
                        Probar Push
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pl-5">
                    <span
                      className={
                        slot.isLoggedToday
                          ? 'text-emerald-400 font-mono'
                          : slot.status === 'pending_alert'
                          ? 'text-amber-300 font-mono'
                          : 'text-zinc-500 font-mono'
                      }
                    >
                      {slot.statusBadgeText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Action: Trigger Next Pending Meal Push Notification */}
          {mealPushEvaluation.nextPendingSlot && (
            <button
              type="button"
              data-testid="push-send-pending-meal-btn"
              onClick={() =>
                mealPushEvaluation.nextPendingSlot &&
                handleTriggerMealPushNotification(mealPushEvaluation.nextPendingSlot)
              }
              className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Enviar Push de próxima comida ({mealPushEvaluation.nextPendingSlot.label} ·{' '}
              {mealPushEvaluation.nextPendingSlot.scheduledTime})
            </button>
          )}

          {/* Secondary Reminders: Pesaje en ayunas & Entrenamiento PPL */}
          <div className="pt-2 border-t border-zinc-800 space-y-2 text-xs">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Otros Recordatorios Diarios
            </span>
            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(reminders.weigh_in_reminder ?? reminders.remind_weigh_in)}
                  onChange={(e) =>
                    handleUpdateReminder({
                      weigh_in_reminder: e.target.checked,
                      remind_weigh_in: e.target.checked,
                    })
                  }
                  className="rounded accent-emerald-500"
                />
                <span>Pesaje en ayunas</span>
              </label>
              <input
                type="time"
                value={reminders.weigh_in_time}
                onChange={(e) => handleUpdateReminder({ weigh_in_time: e.target.value })}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 font-mono text-[11px] text-white"
              />
            </div>

            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(reminders.workout_reminder ?? reminders.remind_workout)}
                  onChange={(e) =>
                    handleUpdateReminder({
                      workout_reminder: e.target.checked,
                      remind_workout: e.target.checked,
                    })
                  }
                  className="rounded accent-emerald-500"
                />
                <span>Entrenamiento PPL</span>
              </label>
              <input
                type="time"
                value={reminders.workout_time}
                onChange={(e) => handleUpdateReminder({ workout_time: e.target.value })}
                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 font-mono text-[11px] text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
