/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  CheckCircle2,
  Circle,
  Sparkles,
  Scale,
  Dumbbell,
  Utensils,
  Award,
  Zap,
  Calendar,
  ArrowRight,
  ShieldCheck,
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
  calculateStreakHistoryAndDailyGoal,
  DailyGoalQuestItem,
} from '../../utils/auditAndRetentionUtils';

interface StreakCounterWidgetProps {
  currentDate: string;
  weighIns: WeighIn[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  nutritionTarget: NutritionTarget;
  habits: DailyHabits;
  onToggleHabit: (habitKey: keyof DailyHabits) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenQuickLog: () => void;
}

export const StreakCounterWidget: React.FC<StreakCounterWidgetProps> = ({
  currentDate,
  weighIns,
  foodLogs,
  workoutSessions,
  activityLogs,
  nutritionTarget,
  habits,
  onToggleHabit,
  onNavigateToTab,
  onOpenQuickLog,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(currentDate);

  const streakData = calculateStreakHistoryAndDailyGoal({
    currentDate,
    weighIns,
    foodLogs,
    workoutSessions,
    activityLogs,
    nutritionTarget,
    habits,
    historyDays: 14,
  });

  const {
    currentStreak,
    bestStreak,
    totalActiveDaysInWindow,
    totalDailyGoalsMetInWindow,
    totalStreakXp,
    gamification,
    consecutiveHistory,
    getDailyGoalForDate,
  } = streakData;

  const activeDayGoal = getDailyGoalForDate(selectedDate);
  const selectedDayRecord =
    consecutiveHistory.find((d) => d.date === selectedDate) ||
    consecutiveHistory[consecutiveHistory.length - 1];

  const isViewingToday = selectedDayRecord.date === currentDate;

  // SVG Ring Math for Gamified "Meta Diaria" Indicator
  const ringRadius = 34;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (activeDayGoal.completionPercent / 100) * ringCircumference;

  const handleQuestToggleOrNavigate = (quest: DailyGoalQuestItem) => {
    if (isViewingToday) {
      if (quest.id === 'weigh_in' && !quest.completed) {
        onToggleHabit('weigh_in_done');
        return;
      }
      if (quest.id === 'nutrition' && !quest.completed) {
        onToggleHabit('meals_logged');
        return;
      }
      if (quest.id === 'workout_activity' && !quest.completed) {
        onToggleHabit('workout_done');
        return;
      }
    }
    onNavigateToTab(quest.targetTab);
  };

  const getQuestIcon = (id: DailyGoalQuestItem['id']) => {
    switch (id) {
      case 'nutrition':
        return Utensils;
      case 'weigh_in':
        return Scale;
      case 'workout_activity':
        return Dumbbell;
    }
  };

  return (
    <section
      data-testid="streak-gamification-card"
      aria-label="Visualización de Rachas y Meta Diaria Gamificada"
      className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-sm"
    >
      {/* Top Header: Flame Streak Counter + League + Total XP & Best Streak */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-3.5">
          <div
            data-testid="streak-counter-flame-badge"
            className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-zinc-950 flex flex-col items-center justify-center font-mono tabular-nums font-extrabold shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Flame className="w-5 h-5 fill-current" />
            <span className="text-sm leading-none mt-0.5">{currentStreak}d</span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-tight">
                Contador de Rachas y Meta Diaria
              </h3>
              <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {gamification.levelTitle}
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1">{gamification.motivationalMessage}</p>
          </div>
        </div>

        {/* Gamified Telemetry Pills: XP, Récord, Próximo Hito */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono tabular-nums flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300">XP:</span>
            <strong className="text-amber-400">{totalStreakXp.toLocaleString()}</strong>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono tabular-nums flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-300">Récord:</span>
            <strong className="text-emerald-400">{bestStreak}d</strong>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono tabular-nums text-amber-300 font-semibold">
            Meta hito: {gamification.nextMilestone}d
          </div>
        </div>
      </div>

      {/* Gamified "Meta Diaria" Indicator Card */}
      <div
        data-testid="daily-goal-gamified-indicator"
        className={`p-4 rounded-2xl border transition-all ${
          activeDayGoal.isDailyGoalMet
            ? 'bg-gradient-to-br from-emerald-950/40 via-zinc-950 to-zinc-950 border-emerald-500/40'
            : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Circular Progress Ring + Status Headline */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={ringRadius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-zinc-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={ringRadius}
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ${
                    activeDayGoal.isDailyGoalMet ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-extrabold font-mono tabular-nums text-white leading-none">
                  {activeDayGoal.completedQuestsCount}/{activeDayGoal.totalQuestsCount}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-emerald-400 font-bold mt-0.5">
                  {activeDayGoal.completionPercent}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  data-testid="daily-goal-status-badge"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border ${
                    activeDayGoal.isDailyGoalMet
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : activeDayGoal.completedQuestsCount === 1
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {activeDayGoal.isDailyGoalMet ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {activeDayGoal.isDailyGoalMet ? 'Meta Diaria Cumplida' : 'Meta Diaria en Progreso'}
                  </span>
                </span>

                <span className="text-xs font-mono tabular-nums text-amber-400 font-bold">
                  +{activeDayGoal.earnedXpToday} XP ({selectedDayRecord.shortLabel})
                </span>
              </div>

              <h4 className="text-sm font-bold text-white">{activeDayGoal.statusLabel}</h4>
              <p className="text-xs text-zinc-300">
                {activeDayGoal.isDailyGoalMet
                  ? '¡Excelente trabajo! Has asegurado tu racha del día y desbloqueado el bono de consistencia.'
                  : 'Completa al menos 2 de las 3 misiones clave del día para sellar tu Meta Diaria y ganar el bono de XP.'}
              </p>
            </div>
          </div>

          {/* Right: Quick Action Button */}
          <div className="flex items-center gap-2 shrink-0">
            {!isViewingToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(currentDate)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
              >
                Volver a Hoy ({currentDate})
              </button>
            )}
            <button
              type="button"
              data-testid="streak-quick-log-btn"
              onClick={onOpenQuickLog}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Registro Rápido (+XP)</span>
            </button>
          </div>
        </div>

        {/* 3 Gamified Daily Quests Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3.5 border-t border-zinc-800/80">
          {activeDayGoal.quests.map((quest) => {
            const Icon = getQuestIcon(quest.id);
            return (
              <div
                key={quest.id}
                data-testid={`daily-quest-${quest.id}`}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                  quest.completed
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-zinc-900/90 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        quest.completed
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block leading-snug">
                        {quest.title}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums text-amber-400 font-semibold">
                        +{quest.xp} XP
                      </span>
                    </div>
                  </div>
                  {quest.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">{quest.subtitle}</p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {isViewingToday && !quest.completed ? (
                    <button
                      type="button"
                      data-testid={`complete-quest-${quest.id}-btn`}
                      onClick={() => handleQuestToggleOrNavigate(quest)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Marcar Misión Cumplida</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab(quest.targetTab)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{quest.ctaLabel}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consecutive Registration History Timeline (Last 14 Days) */}
      <div data-testid="streak-history-timeline" className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Historial de Registros Consecutivos (Últimos 14 Días)
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-zinc-300">
            <span>
              Días activos: <strong className="text-emerald-400">{totalActiveDaysInWindow}/14</strong>
            </span>
            <span>
              Metas Diarias: <strong className="text-amber-400">{totalDailyGoalsMetInWindow}/14</strong>
            </span>
          </div>
        </div>

        {/* 14-Day Interactive Consecutive Strip */}
        <div className="grid grid-cols-7 xl:grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5">
          {consecutiveHistory.map((day) => {
            const isSelected = day.date === selectedDate;
            return (
              <button
                key={day.date}
                type="button"
                data-testid={`streak-history-day-${day.date}`}
                aria-label={`Historial ${day.shortLabel}: ${
                  day.dailyGoalMet
                    ? 'Meta Diaria Cumplida'
                    : day.isLogged
                    ? 'Registrado parcial'
                    : 'Sin registro'
                }`}
                onClick={() => setSelectedDate(day.date)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-between gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 bg-zinc-800 border-emerald-400'
                    : day.dailyGoalMet
                    ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                    : day.isLogged
                    ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <span className="text-[10px] font-bold text-zinc-300 uppercase">
                  {day.dayInitial}
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-white">
                  {day.dayNumber}
                </span>

                {/* Status Flame / Check Icon */}
                <div className="my-0.5">
                  {day.dailyGoalMet ? (
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ) : day.isLogged ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-zinc-600" />
                  )}
                </div>

                {/* 3 Module Dots: Nutrición, Peso, Entreno */}
                <div className="flex items-center gap-1" title="Nutrición · Peso · Entreno">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      day.hasNutrition ? 'bg-emerald-400' : 'bg-zinc-700'
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      day.hasWeighIn ? 'bg-cyan-400' : 'bg-zinc-700'
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      day.hasWorkoutOrActivity ? 'bg-amber-400' : 'bg-zinc-700'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend & Milestone Progress Bar */}
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-zinc-300">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Meta Diaria Cumplida (2-3/3)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Nutrición</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Pesaje</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Entreno/Pasos</span>
              </span>
            </div>
            <span className="font-mono tabular-nums text-amber-300 font-semibold">
              Progreso al hito de {gamification.nextMilestone} días: {gamification.progressPercent}%
            </span>
          </div>

          <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${gamification.progressPercent}%` }}
            />
          </div>

          {/* Unlockable Streak Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {gamification.badges.map((b) => (
              <div
                key={b.id}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                  b.unlocked
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                }`}
              >
                <Award
                  className={`w-4 h-4 shrink-0 ${
                    b.unlocked ? 'text-amber-400' : 'text-zinc-600'
                  }`}
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold font-mono tabular-nums block">
                    {b.daysRequired} días
                  </span>
                  <span className="text-[10px] block truncate">{b.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
