/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import {
  WorkoutSession,
  WorkoutRoutine,
  Exercise,
  WorkoutSet,
  WorkoutExerciseLog,
} from '../../types';
import {
  calculateEpley1RM,
  calculateSetVolume,
  checkDoubleProgression,
} from '../../utils/calculations';
import {
  Check,
  Plus,
  Trash2,
  Timer,
  Sparkles,
  History,
  SkipForward,
  RefreshCw,
  HelpCircle,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import {
  getPreviousExercisePerformance,
  EDUCATIONAL_TOOLTIPS,
} from '../../utils/auditAndRetentionUtils';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: WorkoutSession) => void;
  routines: WorkoutRoutine[];
  exercisesCatalog: Exercise[];
  previousSessions?: WorkoutSession[];
  initialSession?: WorkoutSession | null;
  initialRoutineId?: string;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSaveSession,
  routines,
  exercisesCatalog,
  previousSessions = [],
  initialSession,
  initialRoutineId,
}) => {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(
    initialRoutineId || routines[0]?.id || ''
  );
  const [exercisesLogs, setExercisesLogs] = useState<WorkoutExerciseLog[]>([]);
  const [rpe, setRpe] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(65);
  const [showRirTooltip, setShowRirTooltip] = useState<boolean>(false);
  const [swappingExerciseIdx, setSwappingExerciseIdx] = useState<number | null>(null);
  const [showSummaryStep, setShowSummaryStep] = useState<boolean>(false);

  // Rest Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const startRestTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  // Initialize or load session
  useEffect(() => {
    setShowSummaryStep(false);
    setSwappingExerciseIdx(null);
    if (initialSession) {
      setSelectedRoutineId(initialSession.routine_id || routines[0]?.id || '');
      setExercisesLogs(initialSession.exercises);
      setRpe(initialSession.perceived_rpe || 8);
      setNotes(initialSession.notes || '');
      setDurationMinutes(initialSession.duration_minutes || 60);
    } else {
      const targetRoutineId = initialRoutineId || selectedRoutineId || routines[0]?.id || '';
      setSelectedRoutineId(targetRoutineId);
      const routine = routines.find((r) => r.id === targetRoutineId) || routines[0];
      if (routine) {
        const prefilled: WorkoutExerciseLog[] = routine.exercises.map((re, index) => {
          const exInfo = exercisesCatalog.find((e) => e.id === re.exercise_id);
          const prevPerf = getPreviousExercisePerformance(re.exercise_id, previousSessions);
          const defaultWeight =
            prevPerf.found && prevPerf.sets[0]
              ? prevPerf.sets[0].weight_kg
              : re.suggested_weight_kg || 20;

          const initialSets: WorkoutSet[] = Array.from({ length: re.target_sets }).map(
            (_, sIdx) => ({
              id: `set-${Date.now()}-${index}-${sIdx}`,
              set_number: sIdx + 1,
              weight_kg: defaultWeight,
              repetitions:
                prevPerf.found && prevPerf.sets[sIdx]
                  ? prevPerf.sets[sIdx].repetitions
                  : re.target_reps_max,
              rir: re.suggested_rir ?? 2,
              is_warmup: false,
              completed: sIdx === 0,
            })
          );

          return {
            id: `wel-${Date.now()}-${index}`,
            exercise_id: re.exercise_id,
            exercise_name_snapshot: exInfo?.name || 'Ejercicio',
            primary_muscle: exInfo?.primary_muscle || 'pecho',
            order: index + 1,
            skipped: false,
            sets: initialSets,
          };
        });
        setExercisesLogs(prefilled);
      }
      setRpe(8);
      setNotes('');
      setDurationMinutes(65);
    }
  }, [initialSession, initialRoutineId, isOpen]);

  const handleRoutineChange = (routineId: string) => {
    setSelectedRoutineId(routineId);
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const prefilled: WorkoutExerciseLog[] = routine.exercises.map((re, index) => {
      const exInfo = exercisesCatalog.find((e) => e.id === re.exercise_id);
      const prevPerf = getPreviousExercisePerformance(re.exercise_id, previousSessions);
      const defaultWeight =
        prevPerf.found && prevPerf.sets[0]
          ? prevPerf.sets[0].weight_kg
          : re.suggested_weight_kg || 20;

      const initialSets: WorkoutSet[] = Array.from({ length: re.target_sets }).map((_, sIdx) => ({
        id: `set-${Date.now()}-${index}-${sIdx}`,
        set_number: sIdx + 1,
        weight_kg: defaultWeight,
        repetitions: re.target_reps_max,
        rir: re.suggested_rir ?? 2,
        is_warmup: false,
        completed: sIdx === 0,
      }));

      return {
        id: `wel-${Date.now()}-${index}`,
        exercise_id: re.exercise_id,
        exercise_name_snapshot: exInfo?.name || 'Ejercicio',
        primary_muscle: exInfo?.primary_muscle || 'pecho',
        order: index + 1,
        skipped: false,
        sets: initialSets,
      };
    });
    setExercisesLogs(prefilled);
  };

  const handleUpdateSet = (
    exIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: any
  ) => {
    const updated = [...exercisesLogs];
    updated[exIndex].sets[setIndex] = {
      ...updated[exIndex].sets[setIndex],
      [field]: value,
    };
    setExercisesLogs(updated);
  };

  const handleToggleSkipExercise = (exIndex: number) => {
    const updated = [...exercisesLogs];
    updated[exIndex] = {
      ...updated[exIndex],
      skipped: !updated[exIndex].skipped,
    };
    setExercisesLogs(updated);
  };

  const handleSwapExerciseInSession = (exIndex: number, newExerciseId: string) => {
    const newEx = exercisesCatalog.find((e) => e.id === newExerciseId);
    if (!newEx) return;
    const updated = [...exercisesLogs];
    updated[exIndex] = {
      ...updated[exIndex],
      exercise_id: newEx.id,
      exercise_name_snapshot: newEx.name,
      primary_muscle: newEx.primary_muscle,
      skipped: false,
    };
    setExercisesLogs(updated);
    setSwappingExerciseIdx(null);
  };

  const handleAddSet = (exIndex: number) => {
    const updated = [...exercisesLogs];
    const sets = updated[exIndex].sets;
    const lastSet = sets[sets.length - 1];
    sets.push({
      id: `set-${Date.now()}`,
      set_number: sets.length + 1,
      weight_kg: lastSet ? lastSet.weight_kg : 20,
      repetitions: lastSet ? lastSet.repetitions : 10,
      rir: 2,
      is_warmup: false,
      completed: true,
    });
    setExercisesLogs(updated);
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    const updated = [...exercisesLogs];
    updated[exIndex].sets.splice(setIndex, 1);
    updated[exIndex].sets.forEach((s, idx) => {
      s.set_number = idx + 1;
    });
    setExercisesLogs(updated);
  };

  const handleAddExerciseToSession = (exerciseId: string) => {
    const ex = exercisesCatalog.find((e) => e.id === exerciseId);
    if (!ex) return;
    const newExLog: WorkoutExerciseLog = {
      id: `wel-${Date.now()}`,
      exercise_id: ex.id,
      exercise_name_snapshot: ex.name,
      primary_muscle: ex.primary_muscle,
      order: exercisesLogs.length + 1,
      skipped: false,
      sets: [
        {
          id: `set-${Date.now()}-1`,
          set_number: 1,
          weight_kg: 20,
          repetitions: 10,
          rir: 2,
          is_warmup: false,
          completed: true,
        },
      ],
    };
    setExercisesLogs([...exercisesLogs, newExLog]);
  };

  const handleRemoveExercise = (exIndex: number) => {
    const updated = [...exercisesLogs];
    updated.splice(exIndex, 1);
    setExercisesLogs(updated);
  };

  // Calculate session metrics
  let totalVolume = 0;
  let totalEffectiveSets = 0;
  let skippedCount = 0;
  let best1RMInSession = 0;

  exercisesLogs.forEach((ex) => {
    if (ex.skipped) {
      skippedCount++;
      return;
    }
    ex.sets.forEach((s) => {
      if (!s.is_warmup && s.completed) {
        totalVolume += calculateSetVolume(s.weight_kg, s.repetitions, s.is_warmup);
        totalEffectiveSets++;
        const e1rm = calculateEpley1RM(s.weight_kg, s.repetitions);
        if (e1rm > best1RMInSession) best1RMInSession = e1rm;
      }
    });
  });

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId);

  const handleConfirmAndSave = () => {
    const activeExercises = exercisesLogs.filter((ex) => !ex.skipped);
    const session: WorkoutSession = {
      id: initialSession ? initialSession.id : `ws-${Date.now()}`,
      routine_id: selectedRoutineId,
      routine_name: currentRoutine?.name || 'Sesión personalizada',
      started_at: initialSession?.started_at || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: durationMinutes,
      status: 'completed',
      perceived_rpe: rpe,
      notes: notes.trim() || undefined,
      exercises: activeExercises.length > 0 ? activeExercises : exercisesLogs,
    };
    onSaveSession(session);
    setShowSummaryStep(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        showSummaryStep
          ? 'Resumen de Entrenamiento Completado'
          : initialSession
          ? 'Editar Sesión de Entrenamiento'
          : 'Entrenamiento Activo PPL — Sobrecarga Progresiva'
      }
      subtitle="Registra series en vivo (peso, reps, RIR), consulta tu marca anterior, salta o cambia ejercicios y usa el temporizador."
      maxWidth="3xl"
    >
      {showSummaryStep ? (
        <div
          data-testid="workout-finish-summary-view"
          className="space-y-5 p-2"
        >
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-zinc-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Trophy className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-lg font-bold text-white">
              ¡Excelente trabajo en {currentRoutine?.name || 'tu sesión'}!
            </h3>
            <p className="text-xs text-zinc-300">
              Revisa las métricas finales de sobrecarga progresiva antes de guardar en tu historial.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                Volumen Total
              </span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {totalVolume.toLocaleString()} kg
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                Series Efectivas
              </span>
              <span className="text-lg font-bold font-mono text-emerald-400">
                {totalEffectiveSets}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                Mejor 1RM Est.
              </span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {best1RMInSession} kg
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                Ejercicios Saltados
              </span>
              <span className="text-lg font-bold font-mono text-zinc-300">
                {skippedCount}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Desglose por Ejercicio
            </h4>
            {exercisesLogs.map((ex) => {
              const completedSets = ex.sets.filter((s) => s.completed && !s.is_warmup);
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-900 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        ex.skipped ? 'text-zinc-500' : 'text-emerald-400'
                      }`}
                    />
                    <span className={ex.skipped ? 'line-through text-zinc-500' : 'text-white font-semibold'}>
                      {ex.exercise_name_snapshot}
                    </span>
                  </div>
                  <span className="font-mono text-zinc-400">
                    {ex.skipped
                      ? 'Saltado'
                      : completedSets
                          .map((s) => `${s.weight_kg}kg×${s.repetitions}@RIR${s.rir ?? 2}`)
                          .join(', ')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowSummaryStep(false)}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 cursor-pointer"
            >
              ← Volver a Editar Series
            </button>
            <button
              type="button"
              data-testid="confirm-save-workout-btn"
              onClick={handleConfirmAndSave}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm cursor-pointer"
            >
              Confirmar y Guardar Sesión
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Controls: Routine Picker & Live Rest Timer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <div className="flex items-center gap-2">
              <label htmlFor="routine-select" className="text-xs font-medium text-zinc-400">
                Rutina activa:
              </label>
              <select
                id="routine-select"
                value={selectedRoutineId}
                onChange={(e) => handleRoutineChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.split})
                  </option>
                ))}
              </select>
            </div>

            {/* Rest Timer */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-white">
                <Timer className="w-4 h-4 text-amber-400" />
                <span data-testid="active-workout-timer-display">
                  {Math.floor(timerSeconds / 60)}:
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[60, 90, 120, 180].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => startRestTimer(sec)}
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-mono cursor-pointer"
                  >
                    {sec}s
                  </button>
                ))}
                {isTimerRunning && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(0);
                    }}
                    className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold cursor-pointer"
                  >
                    Parar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Metrics bar + RIR Educational Tooltip Trigger */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">
                Volumen Total
              </span>
              <span className="text-base font-bold font-mono text-cyan-400">
                {totalVolume.toLocaleString()} kg·reps
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">
                Series Efectivas
              </span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {totalEffectiveSets}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => setShowRirTooltip(!showRirTooltip)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>¿Qué es RIR?</span>
              </button>
              <span className="text-[10px] text-zinc-400">Intensidad 0–4</span>
            </div>
          </div>

          {showRirTooltip && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/40 text-xs text-zinc-200 space-y-1">
              <strong className="text-emerald-400 block">
                {EDUCATIONAL_TOOLTIPS.rir.title}
              </strong>
              <p>{EDUCATIONAL_TOOLTIPS.rir.shortDescription}</p>
              <p className="text-[11px] text-zinc-400 font-mono">
                {EDUCATIONAL_TOOLTIPS.rir.scientificContext}
              </p>
            </div>
          )}

          {/* Exercises List */}
          <div className="space-y-4">
            {exercisesLogs.map((exLog, exIdx) => {
              const routineEx = currentRoutine?.exercises.find(
                (re) => re.exercise_id === exLog.exercise_id
              );
              const targetMax = routineEx?.target_reps_max || 10;
              const progression = checkDoubleProgression(exLog.sets, targetMax, 2.5);
              const prevPerf = getPreviousExercisePerformance(
                exLog.exercise_id,
                previousSessions
              );

              return (
                <div
                  key={exLog.id}
                  className={`p-4 rounded-xl border space-y-3 transition-opacity ${
                    exLog.skipped
                      ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 text-[11px] font-mono flex items-center justify-center text-zinc-300 font-bold">
                        {exIdx + 1}
                      </span>
                      <h3
                        className={`text-sm font-semibold ${
                          exLog.skipped ? 'line-through text-zinc-500' : 'text-white'
                        }`}
                      >
                        {exLog.exercise_name_snapshot}
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {exLog.primary_muscle}
                      </span>
                    </div>

                    {/* Session Controls: Swap Exercise, Skip Exercise, Remove */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSwappingExerciseIdx(
                            swappingExerciseIdx === exIdx ? null : exIdx
                          )
                        }
                        className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 flex items-center gap-1 cursor-pointer"
                        title="Cambiar este ejercicio por otro en vivo"
                      >
                        <RefreshCw className="w-3 h-3 text-cyan-400" />
                        <span>Cambiar</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`skip-exercise-btn-${exIdx}`}
                        onClick={() => handleToggleSkipExercise(exIdx)}
                        className={`px-2 py-1 rounded border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                          exLog.skipped
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <SkipForward className="w-3 h-3" />
                        <span>{exLog.skipped ? 'Reactivar' : 'Saltar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Quitar ejercicio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Live Swap Exercise Selector */}
                  {swappingExerciseIdx === exIdx && (
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-cyan-500/30 flex items-center gap-2">
                      <span className="text-xs text-cyan-300 font-semibold whitespace-nowrap">
                        Reemplazar por:
                      </span>
                      <select
                        defaultValue={exLog.exercise_id}
                        onChange={(e) =>
                          handleSwapExerciseInSession(exIdx, e.target.value)
                        }
                        className="w-full px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs text-white"
                      >
                        {exercisesCatalog.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.primary_muscle} - {e.equipment})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Previous Session Progressive Overload Reference Banner */}
                  <div
                    data-testid={`prev-overload-banner-${exIdx}`}
                    className="px-3 py-2 rounded-lg bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2 flex-wrap text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-zinc-300 font-medium">
                        Marca anterior ({prevPerf.lastSessionDate || 'Referencia'}):
                      </span>
                      <span className="font-mono font-bold text-cyan-300">
                        {prevPerf.summaryBadge}
                      </span>
                    </div>
                    {prevPerf.best1RM > 0 && (
                      <span className="text-[11px] font-mono text-amber-400">
                        Mejor 1RM: {prevPerf.best1RM} kg
                      </span>
                    )}
                  </div>

                  {/* Double progression alert if eligible */}
                  {!exLog.skipped && progression.shouldProgress && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{progression.suggestionMessage}</span>
                    </div>
                  )}

                  {/* Sets Table */}
                  {!exLog.skipped && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-zinc-500 text-[10px] border-b border-zinc-800">
                              <th className="pb-1.5 w-10">SERIE</th>
                              <th className="pb-1.5 w-20">PESO (kg)</th>
                              <th className="pb-1.5 w-20">REPS</th>
                              <th className="pb-1.5 w-16">RIR (0-4)</th>
                              <th className="pb-1.5 w-24">TIPO</th>
                              <th className="pb-1.5 w-24">1RM EST.</th>
                              <th className="pb-1.5 w-12 text-center">LISTO</th>
                              <th className="pb-1.5 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900">
                            {exLog.sets.map((set, sIdx) => {
                              const estimated1RM = calculateEpley1RM(
                                set.weight_kg,
                                set.repetitions
                              );
                              return (
                                <tr
                                  key={set.id}
                                  className={set.completed ? 'bg-emerald-950/10' : ''}
                                >
                                  <td className="py-1.5 font-mono text-zinc-400">
                                    {set.set_number}
                                  </td>
                                  <td className="py-1.5">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      step="0.5"
                                      value={set.weight_kg}
                                      onChange={(e) =>
                                        handleUpdateSet(
                                          exIdx,
                                          sIdx,
                                          'weight_kg',
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 px-1.5 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </td>
                                  <td className="py-1.5">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      step="1"
                                      value={set.repetitions}
                                      onChange={(e) =>
                                        handleUpdateSet(
                                          exIdx,
                                          sIdx,
                                          'repetitions',
                                          parseInt(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 px-1.5 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                                    />
                                  </td>
                                  <td className="py-1.5">
                                    <select
                                      value={set.rir ?? 2}
                                      onChange={(e) =>
                                        handleUpdateSet(
                                          exIdx,
                                          sIdx,
                                          'rir',
                                          parseInt(e.target.value)
                                        )
                                      }
                                      className="px-1 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-zinc-300"
                                    >
                                      <option value="0">0 (Fallo)</option>
                                      <option value="1">1</option>
                                      <option value="2">2</option>
                                      <option value="3">3</option>
                                      <option value="4">4+</option>
                                    </select>
                                  </td>
                                  <td className="py-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSet(
                                          exIdx,
                                          sIdx,
                                          'is_warmup',
                                          !set.is_warmup
                                        )
                                      }
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase cursor-pointer ${
                                        set.is_warmup
                                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          : 'bg-zinc-800 text-zinc-300'
                                      }`}
                                    >
                                      {set.is_warmup ? 'Calent.' : 'Efectiva'}
                                    </button>
                                  </td>
                                  <td className="py-1.5 font-mono text-[11px] text-zinc-400">
                                    {estimated1RM > 0 ? `${estimated1RM} kg` : '-'}
                                  </td>
                                  <td className="py-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextState = !set.completed;
                                        handleUpdateSet(
                                          exIdx,
                                          sIdx,
                                          'completed',
                                          nextState
                                        );
                                        if (nextState) {
                                          startRestTimer(routineEx?.rest_seconds || 90);
                                        }
                                      }}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors cursor-pointer ${
                                        set.completed
                                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                                          : 'bg-zinc-800 text-zinc-500 hover:text-white'
                                      }`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                  </td>
                                  <td className="py-1.5">
                                    {exLog.sets.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSet(exIdx, sIdx)}
                                        className="text-zinc-600 hover:text-rose-400 p-0.5 cursor-pointer"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handleAddSet(exIdx)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir serie</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add another exercise selector */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <label
              htmlFor="add-exercise-select"
              className="text-xs text-zinc-400 whitespace-nowrap"
            >
              Añadir ejercicio en vivo:
            </label>
            <select
              id="add-exercise-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddExerciseToSession(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200"
            >
              <option value="" disabled>
                -- Elige un ejercicio del catálogo --
              </option>
              {exercisesCatalog.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.primary_muscle} - {e.equipment})
                </option>
              ))}
            </select>
          </div>

          {/* Session completion details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <div>
              <label
                htmlFor="session-duration"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Duración total (minutos)
              </label>
              <input
                id="session-duration"
                type="number"
                inputMode="numeric"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="session-rpe"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Esfuerzo percibido RPE de la sesión:{' '}
                <span className="text-amber-400 font-mono font-bold">{rpe} / 10</span>
              </label>
              <input
                id="session-rpe"
                type="range"
                min="1"
                max="10"
                value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="session-notes"
                className="block text-xs font-medium text-zinc-300 mb-1"
              >
                Notas de la sesión
              </label>
              <input
                id="session-notes"
                type="text"
                placeholder="Sensaciones, molestias articulares, congestión..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              data-testid="finish-workout-review-btn"
              onClick={() => setShowSummaryStep(true)}
              className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer"
            >
              Ver Resumen y Completar Entrenamiento →
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
