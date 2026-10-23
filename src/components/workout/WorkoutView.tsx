/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  WorkoutRoutine,
  WorkoutSession,
  Exercise,
  WorkoutRoutineExercise,
} from '../../types';
import { calculateEpley1RM } from '../../utils/calculations';
import {
  Dumbbell,
  Play,
  Trophy,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import {
  auditPPLRoutinesCoherence,
  getPreviousExercisePerformance,
} from '../../utils/auditAndRetentionUtils';

interface WorkoutViewProps {
  routines: WorkoutRoutine[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  onStartSession: (routineId?: string) => void;
  onEditSession: (session: WorkoutSession) => void;
  onDeleteSession: (id: string) => void;
  onUpdateRoutine: (routine: WorkoutRoutine) => void;
  onSaveExercise?: (exercise: Exercise) => void;
}

export const WorkoutView: React.FC<WorkoutViewProps> = ({
  routines,
  exercises,
  sessions,
  onStartSession,
  onEditSession,
  onDeleteSession,
  onUpdateRoutine,
  onSaveExercise,
}) => {
  const [activeTab, setActiveTab] = useState<'routines' | 'history' | 'catalog'>('routines');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');

  // Routine editing state
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);

  // Custom exercise creation state
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState<boolean>(false);
  const [newExName, setNewExName] = useState<string>('');
  const [newExMuscle, setNewExMuscle] = useState<Exercise['primary_muscle']>('pecho');
  const [newExPattern, setNewExPattern] = useState<Exercise['movement_pattern']>(
    'empuje_horizontal'
  );
  const [newExEquipment, setNewExEquipment] = useState<Exercise['equipment']>('peso_corporal');
  const [newExInstructions, setNewExInstructions] = useState<string>('');

  // Exercise 1RM Calculator interactive tool
  const [calcWeight, setCalcWeight] = useState<number>(80);
  const [calcReps, setCalcReps] = useState<number>(8);
  const estimated1RM = calculateEpley1RM(calcWeight, calcReps);

  const filteredExercises = exercises.filter((ex) =>
    selectedMuscleFilter === 'all' ? true : ex.primary_muscle === selectedMuscleFilter
  );

  // Run PPL A/B Rotation Coherence Audit
  const pplAudit = auditPPLRoutinesCoherence(routines);

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs & Start Workout CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-emerald-400" />
            <span>Entrenamiento de Fuerza — Push / Pull / Legs (A/B)</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Modo Entrenamiento Activo con sobrecarga progresiva en vivo, auditoría de rotación A/B y catálogo personalizado.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('routines')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'routines'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Rutinas PPL ({routines.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Historial Sesiones ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-zinc-800 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Catálogo & Personalizados ({exercises.length})
            </button>
          </div>

          <button
            type="button"
            data-testid="start-active-workout-btn"
            onClick={() => onStartSession()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current stroke-none" />
            <span>Entrenamiento Activo</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PPL ROUTINES CARDS + ROTATION COHERENCE AUDIT */}
      {activeTab === 'routines' && (
        <div className="space-y-5">
          {/* PPL Rotation A/B Coherence Audit Banner */}
          <div
            data-testid="ppl-coherence-audit-card"
            className={`p-4 rounded-2xl border space-y-3 ${
              pplAudit.isCoherent
                ? 'bg-zinc-900 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {pplAudit.isCoherent ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Auditoría de Coherencia y Rotación PPL (A / B)
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Push: {pplAudit.weeklySetsBySplit.Push} series/sem
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Pull: {pplAudit.weeklySetsBySplit.Pull} series/sem
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Legs: {pplAudit.weeklySetsBySplit.Legs} series/sem
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-300">{pplAudit.recommendation}</p>
            {pplAudit.warnings.length > 0 && (
              <ul className="list-disc pl-5 text-[11px] text-amber-300 space-y-1">
                {pplAudit.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routines.map((routine) => {
              const splitColor =
                routine.split === 'Push'
                  ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                  : routine.split === 'Pull'
                  ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-amber-400 border-amber-500/30 bg-amber-500/10';

              return (
                <div
                  key={routine.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${splitColor}`}
                      >
                        {routine.split}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-zinc-400 font-mono">
                          {routine.exercises.length} ejercicios
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRoutine(JSON.parse(JSON.stringify(routine)))
                          }
                          aria-label={`Editar rutina ${routine.name}`}
                          className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                          title="Editar rutina"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white">{routine.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2">{routine.description}</p>
                  </div>

                  {/* Exercises Preview with Previous Overload Snapshot */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                    {routine.exercises.slice(0, 4).map((re, idx) => {
                      const exInfo = exercises.find((e) => e.id === re.exercise_id);
                      const prevPerf = getPreviousExercisePerformance(
                        re.exercise_id,
                        sessions
                      );
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs text-zinc-300">
                            <span className="truncate pr-2 font-medium">
                              {exInfo?.name || 'Ejercicio'}
                            </span>
                            <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                              {re.target_sets} × {re.target_reps_min}-{re.target_reps_max}
                            </span>
                          </div>
                          {prevPerf.found && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                              <History className="w-2.5 h-2.5" />
                              <span>Última vez: {prevPerf.summaryBadge}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {routine.exercises.length > 4 && (
                      <span className="text-[11px] text-zinc-400 italic block">
                        +{routine.exercises.length - 4} ejercicios más...
                      </span>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      data-testid={`start-routine-${routine.id}`}
                      onClick={() => onStartSession(routine.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 font-semibold text-xs text-zinc-200 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                      <span>Iniciar {routine.name}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: WORKOUT SESSIONS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs">
              No hay entrenamientos guardados. ¡Inicia uno ahora con el botón superior!
            </div>
          ) : (
            sessions.map((sess) => {
              let sessionVol = 0;
              sess.exercises.forEach((ex) => {
                ex.sets.forEach((s) => {
                  if (!s.is_warmup && s.completed) {
                    sessionVol += s.weight_kg * s.repetitions;
                  }
                });
              });

              return (
                <div
                  key={sess.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">{sess.routine_name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Completado
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono mt-0.5 block">
                        {sess.started_at.split('T')[0]} &bull; {sess.duration_minutes || 60}{' '}
                        minutos &bull; RPE: {sess.perceived_rpe || 8}/10
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                          Volumen
                        </span>
                        <span className="text-sm font-bold font-mono text-cyan-400">
                          {sessionVol.toLocaleString()} kg
                        </span>
                      </div>

                      <div className="flex items-center gap-1 border-l border-zinc-800 pl-3">
                        <button
                          type="button"
                          onClick={() => onEditSession(sess)}
                          aria-label="Editar sesión"
                          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          data-testid={`delete-workout-session-${sess.id}`}
                          onClick={() => onDeleteSession(sess.id)}
                          aria-label="Eliminar sesión"
                          className="p-1.5 text-zinc-400 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Exercises and sets in session */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {sess.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs space-y-1"
                      >
                        <span className="font-semibold text-white truncate block">
                          {ex.exercise_name_snapshot}
                        </span>
                        <div className="text-zinc-400 font-mono text-[11px] space-x-1.5">
                          {ex.sets.map((s, sidx) => (
                            <span
                              key={sidx}
                              className={
                                s.is_warmup
                                  ? 'text-amber-500/80'
                                  : 'text-emerald-400 font-semibold'
                              }
                            >
                              {s.weight_kg}k×{s.repetitions}@RIR{s.rir ?? 2}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {sess.notes && (
                    <p className="text-xs text-zinc-400 italic pt-1 border-t border-zinc-800/40">
                      &ldquo;{sess.notes}&rdquo;
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 3: EXERCISES CATALOG & CUSTOM EXERCISES (CALISTHENICS / MACHINES) */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Epley 1RM Calculator Interactive Tool */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Calculadora de 1RM Estimado (Fórmula de Epley)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Calcula tu repetición máxima teórica a partir del peso y repeticiones logradas con buena técnica: <em>1RM = Peso × (1 + Reps / 30)</em>.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Carga utilizada (kg)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="2.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Repeticiones completadas
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="1"
                  max="15"
                  value={calcReps}
                  onChange={(e) => setCalcReps(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase font-semibold">
                    1RM Estimado
                  </span>
                  <span className="text-xl font-bold font-mono text-amber-400">
                    {estimated1RM} kg
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-normal uppercase">
                  (estimación)
                </span>
              </div>
            </div>
          </div>

          {/* Muscle group filter pills & New Custom Exercise Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                'all',
                'pecho',
                'espalda',
                'hombros',
                'cuadriceps',
                'isquiosurales',
                'biceps',
                'triceps',
              ].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMuscleFilter(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                    selectedMuscleFilter === m
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {m === 'all' ? 'Todos los músculos' : m}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="open-create-custom-exercise-btn"
              onClick={() => setIsCreateExerciseOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Ejercicio Personalizado (Calistenia / Máquina)</span>
            </button>
          </div>

          {/* Exercises list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-white">{ex.name}</h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300">
                    {ex.equipment.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="text-emerald-400 capitalize">{ex.primary_muscle}</span>
                  <span>&bull;</span>
                  <span>{ex.movement_pattern.replace('_', ' ')}</span>
                </div>
                {ex.instructions && (
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {ex.instructions}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: EDIT ROUTINE */}
      {editingRoutine && (
        <Modal
          isOpen={true}
          onClose={() => setEditingRoutine(null)}
          title={`Editar Rutina: ${editingRoutine.name}`}
          subtitle="Modifica el título, split de entrenamiento y la programación de series/repeticiones"
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Nombre de la Rutina
                </label>
                <input
                  type="text"
                  value={editingRoutine.name}
                  onChange={(e) =>
                    setEditingRoutine({ ...editingRoutine, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Split</label>
                <select
                  value={editingRoutine.split}
                  onChange={(e) =>
                    setEditingRoutine({ ...editingRoutine, split: e.target.value as any })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                >
                  <option value="Push">Push</option>
                  <option value="Pull">Pull</option>
                  <option value="Legs">Legs</option>
                  <option value="Upper">Upper</option>
                  <option value="Lower">Lower</option>
                  <option value="Full Body">Full Body</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Descripción / Foco
              </label>
              <textarea
                value={editingRoutine.description}
                onChange={(e) =>
                  setEditingRoutine({ ...editingRoutine, description: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              />
            </div>

            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200">
                  Ejercicios de la Rutina ({editingRoutine.exercises.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    const firstEx = exercises[0];
                    if (!firstEx) return;
                    const newItem: WorkoutRoutineExercise = {
                      exercise_id: firstEx.id,
                      order: editingRoutine.exercises.length + 1,
                      target_sets: 3,
                      target_reps_min: 8,
                      target_reps_max: 12,
                      suggested_rir: 2,
                    };
                    setEditingRoutine({
                      ...editingRoutine,
                      exercises: [...editingRoutine.exercises, newItem],
                    });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Ejercicio</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {editingRoutine.exercises.map((rex, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <select
                        value={rex.exercise_id}
                        onChange={(e) => {
                          const updated = [...editingRoutine.exercises];
                          updated[idx] = { ...updated[idx], exercise_id: e.target.value };
                          setEditingRoutine({ ...editingRoutine, exercises: updated });
                        }}
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xs"
                      >
                        {exercises.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.primary_muscle})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 text-[11px]">Series:</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          value={rex.target_sets}
                          onChange={(e) => {
                            const updated = [...editingRoutine.exercises];
                            updated[idx] = {
                              ...updated[idx],
                              target_sets: parseInt(e.target.value) || 3,
                            };
                            setEditingRoutine({ ...editingRoutine, exercises: updated });
                          }}
                          className="w-12 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-center text-white text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-zinc-500 text-[11px]">Reps:</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={50}
                          value={rex.target_reps_min}
                          onChange={(e) => {
                            const updated = [...editingRoutine.exercises];
                            updated[idx] = {
                              ...updated[idx],
                              target_reps_min: parseInt(e.target.value) || 8,
                            };
                            setEditingRoutine({ ...editingRoutine, exercises: updated });
                          }}
                          className="w-12 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-center text-white text-xs font-mono"
                        />
                        <span className="text-zinc-600">-</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={50}
                          value={rex.target_reps_max}
                          onChange={(e) => {
                            const updated = [...editingRoutine.exercises];
                            updated[idx] = {
                              ...updated[idx],
                              target_reps_max: parseInt(e.target.value) || 12,
                            };
                            setEditingRoutine({ ...editingRoutine, exercises: updated });
                          }}
                          className="w-12 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-center text-white text-xs font-mono"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingRoutine.exercises.filter(
                            (_, i) => i !== idx
                          );
                          setEditingRoutine({ ...editingRoutine, exercises: updated });
                        }}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Quitar de rutina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingRoutine(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editingRoutine) {
                    onUpdateRoutine(editingRoutine);
                    setEditingRoutine(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Guardar Rutina
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CREATE CUSTOM EXERCISE */}
      {isCreateExerciseOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateExerciseOpen(false)}
          title="Crear Ejercicio Personalizado (Calistenia, Máquinas o Peso Libre)"
          subtitle="Añade variantes específicas (ej. Muscle-up, Fondos lastrados, Pendulum Squat) a tu biblioteca."
          maxWidth="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newExName.trim()) return;
              const created: Exercise = {
                id: `custom-ex-${Date.now()}`,
                name: newExName.trim(),
                primary_muscle: newExMuscle,
                secondary_muscles: [],
                movement_pattern: newExPattern,
                equipment: newExEquipment,
                instructions: newExInstructions.trim(),
              };
              if (onSaveExercise) {
                onSaveExercise(created);
              }
              setNewExName('');
              setNewExInstructions('');
              setIsCreateExerciseOpen(false);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nombre del Ejercicio
              </label>
              <input
                type="text"
                data-testid="custom-exercise-name-input"
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                placeholder="Ej. Dominadas Supinas Lastradas / Fondos en Anillas"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Músculo Principal
                </label>
                <select
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs capitalize"
                >
                  <option value="pecho">Pecho</option>
                  <option value="espalda">Espalda</option>
                  <option value="hombros">Hombros</option>
                  <option value="cuadriceps">Cuádriceps</option>
                  <option value="isquiosurales">Isquiosurales</option>
                  <option value="gluteos">Glúteos</option>
                  <option value="pantorrillas">Pantorrillas</option>
                  <option value="biceps">Bíceps</option>
                  <option value="triceps">Tríceps</option>
                  <option value="abdomen">Abdomen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Patrón de Movimiento
                </label>
                <select
                  value={newExPattern}
                  onChange={(e) => setNewExPattern(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                >
                  <option value="empuje_horizontal">Empuje Horizontal</option>
                  <option value="empuje_vertical">Empuje Vertical</option>
                  <option value="traccion_horizontal">Tracción Horizontal</option>
                  <option value="traccion_vertical">Tracción Vertical</option>
                  <option value="patron_rodilla">Patrón Rodilla</option>
                  <option value="patron_cadera">Patrón Cadera</option>
                  <option value="aislamiento">Aislamiento</option>
                  <option value="core">Core</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Equipamiento / Modalidad
                </label>
                <select
                  value={newExEquipment}
                  onChange={(e) => setNewExEquipment(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                >
                  <option value="peso_corporal">Calistenia / Peso Corporal</option>
                  <option value="barra">Barra</option>
                  <option value="mancuernas">Mancuernas</option>
                  <option value="maquina">Máquina</option>
                  <option value="polea">Polea</option>
                  <option value="kettlebell">Kettlebell</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Indicaciones Técnicas / Cues
              </label>
              <textarea
                value={newExInstructions}
                onChange={(e) => setNewExInstructions(e.target.value)}
                placeholder="Puntos clave de ejecución, rango de movimiento y posición..."
                rows={2}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsCreateExerciseOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="save-custom-exercise-btn"
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-bold hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Guardar Ejercicio
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
