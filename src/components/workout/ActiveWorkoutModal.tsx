/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { WorkoutSession, WorkoutRoutine, Exercise, WorkoutSet, WorkoutExerciseLog } from '../../types';
import { calculateEpley1RM, calculateSetVolume, checkDoubleProgression } from '../../utils/calculations';
import { Play, Check, Plus, Trash2, Timer, Sparkles, AlertCircle, Flame } from 'lucide-react';

interface ActiveWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: WorkoutSession) => void;
  routines: WorkoutRoutine[];
  exercisesCatalog: Exercise[];
  initialSession?: WorkoutSession | null;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  isOpen,
  onClose,
  onSaveSession,
  routines,
  exercisesCatalog,
  initialSession,
}) => {
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(routines[0]?.id || '');
  const [exercisesLogs, setExercisesLogs] = useState<WorkoutExerciseLog[]>([]);
  const [rpe, setRpe] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(65);

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
    if (initialSession) {
      setSelectedRoutineId(initialSession.routine_id || routines[0]?.id || '');
      setExercisesLogs(initialSession.exercises);
      setRpe(initialSession.perceived_rpe || 8);
      setNotes(initialSession.notes || '');
      setDurationMinutes(initialSession.duration_minutes || 60);
    } else {
      // Build from selected routine
      const routine = routines.find((r) => r.id === selectedRoutineId) || routines[0];
      if (routine) {
        const prefilled: WorkoutExerciseLog[] = routine.exercises.map((re, index) => {
          const exInfo = exercisesCatalog.find((e) => e.id === re.exercise_id);
          const initialSets: WorkoutSet[] = Array.from({ length: re.target_sets }).map((_, sIdx) => ({
            id: `set-${Date.now()}-${index}-${sIdx}`,
            set_number: sIdx + 1,
            weight_kg: re.suggested_weight_kg || 0,
            repetitions: re.target_reps_max,
            rir: re.suggested_rir ?? 2,
            is_warmup: sIdx === 0 && re.suggested_weight_kg ? true : false,
            completed: false,
          }));

          return {
            id: `wel-${Date.now()}-${index}`,
            exercise_id: re.exercise_id,
            exercise_name_snapshot: exInfo?.name || 'Ejercicio',
            primary_muscle: exInfo?.primary_muscle || 'pecho',
            order: index + 1,
            sets: initialSets,
          };
        });
        setExercisesLogs(prefilled);
      }
      setRpe(8);
      setNotes('');
      setDurationMinutes(65);
    }
  }, [initialSession, selectedRoutineId, routines, exercisesCatalog, isOpen]);

  const handleRoutineChange = (routineId: string) => {
    setSelectedRoutineId(routineId);
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const prefilled: WorkoutExerciseLog[] = routine.exercises.map((re, index) => {
      const exInfo = exercisesCatalog.find((e) => e.id === re.exercise_id);
      const initialSets: WorkoutSet[] = Array.from({ length: re.target_sets }).map((_, sIdx) => ({
        id: `set-${Date.now()}-${index}-${sIdx}`,
        set_number: sIdx + 1,
        weight_kg: re.suggested_weight_kg || 0,
        repetitions: re.target_reps_max,
        rir: re.suggested_rir ?? 2,
        is_warmup: sIdx === 0 && re.suggested_weight_kg ? true : false,
        completed: false,
      }));

      return {
        id: `wel-${Date.now()}-${index}`,
        exercise_id: re.exercise_id,
        exercise_name_snapshot: exInfo?.name || 'Ejercicio',
        primary_muscle: exInfo?.primary_muscle || 'pecho',
        order: index + 1,
        sets: initialSets,
      };
    });
    setExercisesLogs(prefilled);
  };

  const handleUpdateSet = (exIndex: number, setIndex: number, field: keyof WorkoutSet, value: any) => {
    const updated = [...exercisesLogs];
    updated[exIndex].sets[setIndex] = {
      ...updated[exIndex].sets[setIndex],
      [field]: value,
    };
    setExercisesLogs(updated);
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
      completed: false,
    });
    setExercisesLogs(updated);
  };

  const handleRemoveSet = (exIndex: number, setIndex: number) => {
    const updated = [...exercisesLogs];
    updated[exIndex].sets.splice(setIndex, 1);
    // Renumber sets
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
      sets: [
        {
          id: `set-${Date.now()}-1`,
          set_number: 1,
          weight_kg: 20,
          repetitions: 10,
          rir: 2,
          is_warmup: false,
          completed: false,
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
  exercisesLogs.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (!s.is_warmup && s.completed) {
        totalVolume += calculateSetVolume(s.weight_kg, s.repetitions, s.is_warmup);
        totalEffectiveSets++;
      }
    });
  });

  const currentRoutine = routines.find((r) => r.id === selectedRoutineId);

  const handleFinish = () => {
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
      exercises: exercisesLogs,
    };
    onSaveSession(session);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialSession ? 'Editar Sesión de Entrenamiento' : 'Sesión de Entrenamiento PPL'}
      subtitle="Registra series efectivas, RIR y volumen para monitorizar sobrecarga progresiva."
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Top Controls: Routine Picker & Live Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center gap-2">
            <label htmlFor="routine-select" className="text-xs font-medium text-zinc-400">Rutina:</label>
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-700 font-mono text-xs text-white">
              <Timer className="w-4 h-4 text-amber-400" />
              <span>
                {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => startRestTimer(90)}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-mono"
              >
                90s
              </button>
              <button
                type="button"
                onClick={() => startRestTimer(120)}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-mono"
              >
                120s
              </button>
              <button
                type="button"
                onClick={() => startRestTimer(180)}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 font-mono"
              >
                180s
              </button>
            </div>
          </div>
        </div>

        {/* Live Metrics bar */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">Volumen Total</span>
            <span className="text-base font-bold font-mono text-cyan-400">{totalVolume.toLocaleString()} kg·reps</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">Series Efectivas</span>
            <span className="text-base font-bold font-mono text-emerald-400">{totalEffectiveSets}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 block uppercase tracking-wider font-semibold">Duración</span>
            <span className="text-base font-bold font-mono text-amber-400">{durationMinutes} min</span>
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          {exercisesLogs.map((exLog, exIdx) => {
            // Check double progression suggestion
            const routineEx = currentRoutine?.exercises.find((re) => re.exercise_id === exLog.exercise_id);
            const targetMax = routineEx?.target_reps_max || 10;
            const progression = checkDoubleProgression(exLog.sets, targetMax, 2.5);

            return (
              <div key={exLog.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-800 text-[11px] font-mono flex items-center justify-center text-zinc-300 font-bold">
                      {exIdx + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{exLog.exercise_name_snapshot}</h3>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {exLog.primary_muscle}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExercise(exIdx)}
                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                    title="Quitar ejercicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Double progression alert if eligible */}
                {progression.shouldProgress && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{progression.suggestionMessage}</span>
                  </div>
                )}

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] border-b border-zinc-800">
                        <th className="pb-1.5 w-10">SERIE</th>
                        <th className="pb-1.5 w-20">PESO (kg)</th>
                        <th className="pb-1.5 w-20">REPETICIONES</th>
                        <th className="pb-1.5 w-16">RIR (0-4)</th>
                        <th className="pb-1.5 w-24">TIPO</th>
                        <th className="pb-1.5 w-24">1RM EST.</th>
                        <th className="pb-1.5 w-12 text-center">LISTO</th>
                        <th className="pb-1.5 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {exLog.sets.map((set, sIdx) => {
                        const estimated1RM = calculateEpley1RM(set.weight_kg, set.repetitions);
                        return (
                          <tr key={set.id} className={set.completed ? 'bg-emerald-950/10' : ''}>
                            <td className="py-1.5 font-mono text-zinc-400">{set.set_number}</td>
                            <td className="py-1.5">
                              <input
                                type="number"
                                step="0.5"
                                value={set.weight_kg}
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, sIdx, 'weight_kg', parseFloat(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-1.5">
                              <input
                                type="number"
                                step="1"
                                value={set.repetitions}
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, sIdx, 'repetitions', parseInt(e.target.value) || 0)
                                }
                                className="w-16 px-1.5 py-1 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-1.5">
                              <select
                                value={set.rir ?? 2}
                                onChange={(e) =>
                                  handleUpdateSet(exIdx, sIdx, 'rir', parseInt(e.target.value))
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
                                onClick={() => handleUpdateSet(exIdx, sIdx, 'is_warmup', !set.is_warmup)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
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
                                  handleUpdateSet(exIdx, sIdx, 'completed', nextState);
                                  if (nextState) {
                                    startRestTimer(routineEx?.rest_seconds || 90);
                                  }
                                }}
                                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
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
                                  className="text-zinc-600 hover:text-rose-400 p-0.5"
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
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir serie</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add another exercise selector */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <label htmlFor="add-exercise-select" className="text-xs text-zinc-400 whitespace-nowrap">Añadir otro ejercicio:</label>
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
            <label htmlFor="session-duration" className="block text-xs font-medium text-zinc-300 mb-1">Duración total (minutos)</label>
            <input
              id="session-duration"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs"
            />
          </div>

          <div>
            <label htmlFor="session-rpe" className="block text-xs font-medium text-zinc-300 mb-1">
              Esfuerzo percibido RPE de la sesión: <span className="text-amber-400 font-mono font-bold">{rpe} / 10</span>
            </label>
            <input
              id="session-rpe"
              type="range"
              min="1"
              max="10"
              value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="session-notes" className="block text-xs font-medium text-zinc-300 mb-1">Notas de la sesión</label>
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
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
          >
            Guardar Borrador y Salir
          </button>
          <button
            type="button"
            onClick={handleFinish}
            className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm shadow-emerald-500/20"
          >
            Completar Entrenamiento
          </button>
        </div>
      </div>
    </Modal>
  );
};
