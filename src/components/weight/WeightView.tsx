/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WeighIn, BodyMeasurement, PhysicalGoal, UserProfile } from '../../types';
import { calculateWeeklyAverage, calculateMoving7DayAverages, calculateUSNavyBodyFat, calculateBodyComposition } from '../../utils/calculations';
import { Scale, Plus, Edit2, Trash2, Info, Ruler, Sparkles, TrendingDown, Target, Calculator } from 'lucide-react';

interface WeightViewProps {
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  goal: PhysicalGoal;
  profile: UserProfile;
  onOpenAddWeighIn: () => void;
  onOpenEditWeighIn: (w: WeighIn) => void;
  onDeleteWeighIn: (id: string) => void;
  onOpenAddMeasurement: () => void;
  onOpenEditMeasurement: (m: BodyMeasurement) => void;
  onDeleteMeasurement: (id: string) => void;
  onUpdateGoal: (g: PhysicalGoal) => void;
}

export const WeightView: React.FC<WeightViewProps> = ({
  weighIns,
  measurements,
  goal,
  profile,
  onOpenAddWeighIn,
  onOpenEditWeighIn,
  onDeleteWeighIn,
  onOpenAddMeasurement,
  onOpenEditMeasurement,
  onDeleteMeasurement,
  onUpdateGoal,
}) => {
  const [subTab, setSubTab] = useState<'weigh_ins' | 'measurements' | 'goals'>('weigh_ins');

  // Sorted weigh-ins ascending and descending for display
  const sortedAsc = [...weighIns].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  const sortedDesc = [...weighIns].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());

  const latestWeighIn = sortedAsc[sortedAsc.length - 1];
  const initialWeighIn = sortedAsc[0];

  const current7d = calculateWeeklyAverage(sortedAsc.slice(-7));
  const prev7d = calculateWeeklyAverage(sortedAsc.slice(-14, -7));

  const totalDeltaKg = latestWeighIn && initialWeighIn ? Number((latestWeighIn.weight_kg - initialWeighIn.weight_kg).toFixed(2)) : 0;
  const totalDeltaPct = initialWeighIn ? Number(((totalDeltaKg / initialWeighIn.weight_kg) * 100).toFixed(2)) : 0;
  const weeklyRateKg = current7d.average !== null && prev7d.average !== null ? Number((current7d.average - prev7d.average).toFixed(2)) : null;

  // Latest measurement & Navy Body Fat
  const latestMeas = measurements[measurements.length - 1];
  const navyBf = latestMeas && latestMeas.neck_cm
    ? calculateUSNavyBodyFat(profile.sex_for_equations, profile.height_cm, latestMeas.waist_cm, latestMeas.neck_cm, latestMeas.hip_cm)
    : null;
  const bodyComp = navyBf !== null && latestWeighIn ? calculateBodyComposition(latestWeighIn.weight_kg, navyBf) : null;

  return (
    <div className="space-y-6">
      {/* View Header with Sub-tabs & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            <span>Peso y Composición Corporal</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Seguimiento de peso en ayunas, medias móviles semanales, perímetros y estimación de grasa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setSubTab('weigh_ins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'weigh_ins' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Pesajes ({weighIns.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('measurements')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'measurements' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Medidas ({measurements.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('goals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                subTab === 'goals' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Objetivos
            </button>
          </div>

          {subTab === 'weigh_ins' ? (
            <button
              type="button"
              onClick={onOpenAddWeighIn}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Pesaje</span>
            </button>
          ) : subTab === 'measurements' ? (
            <button
              type="button"
              onClick={onOpenAddMeasurement}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm shadow-amber-500/20 active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Añadir Medida</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Summary KPI Cards for Weight */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Peso Actual</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white">{latestWeighIn ? latestWeighIn.weight_kg : '--'}</span>
            <span className="text-xs text-zinc-400 font-semibold">kg</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block font-mono">
            {totalDeltaKg < 0 ? `${totalDeltaKg} kg (${totalDeltaPct}%)` : `+${totalDeltaKg} kg`}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Promedio 7 Días</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-400">{current7d.average ?? '--'}</span>
            <span className="text-xs text-zinc-400 font-semibold">kg</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            Basado en {current7d.count} pesajes
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Ritmo Semanal</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {weeklyRateKg !== null ? `${weeklyRateKg > 0 ? '+' : ''}${weeklyRateKg}` : '--'}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">kg/sem</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">
            Objetivo: ~0.4 kg/sem (0.5%)
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Grasa Estimada (Navy)</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-amber-400">
              {navyBf !== null ? `${navyBf}%` : '--'}
            </span>
            <span className="text-[10px] text-zinc-400 font-normal uppercase">(estimado)</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block font-mono">
            {bodyComp ? `${bodyComp.leanMassKg}kg libre grasa` : 'Añadir cintura y cuello'}
          </span>
        </div>
      </div>

      {/* Scientific Education Banner */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 space-y-1">
          <span className="font-semibold text-white block">Guía de Interpretación de Peso y Fluctaciones Hídricas:</span>
          <p className="text-zinc-400 leading-relaxed">
            Nunca tomes una pesada individual como reflejo de ganancia o pérdida de tejido graso. 1 gramo de glucógeno muscular almacena entre 3 y 4 gramos de agua. Comidas saladas, cortisol por estrés o inflamación tras entrenamientos intensos (DOMS) retienen agua extracelular. <strong>El indicador verídico de recomposición es el descenso continuo de la media móvil semanal junto a la reducción de cintura y la preservación de cargas en el gimnasio.</strong>
          </p>
        </div>
      </div>

      {/* SUBTAB 1: WEIGH-INS LIST */}
      {subTab === 'weigh_ins' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Historial de Pesajes Diarios</h3>
            <span className="text-xs text-zinc-400">{weighIns.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 text-[11px]">
                  <th className="px-4 py-2.5">FECHA</th>
                  <th className="px-4 py-2.5">PESO</th>
                  <th className="px-4 py-2.5">HORA</th>
                  <th className="px-4 py-2.5">CONDICIÓN</th>
                  <th className="px-4 py-2.5">CONTEXTO</th>
                  <th className="px-4 py-2.5">NOTAS</th>
                  <th className="px-4 py-2.5 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {sortedDesc.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-white">{w.measured_at}</td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-cyan-400">{w.weight_kg} kg</td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">{w.time_of_day || '--'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        w.fasting ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {w.fasting ? 'Ayunas' : 'No ayunas'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {w.context === 'salty_food' ? 'Comida salada' :
                       w.context === 'post_cheat_meal' ? 'Comida libre' :
                       w.context === 'post_workout' ? 'Post entreno duro' :
                       w.context === 'poor_sleep' ? 'Mal descanso' :
                       w.context === 'travel' ? 'Viaje' : 'Normal'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{w.notes || '--'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditWeighIn(w)}
                          aria-label={`Editar pesaje del ${w.measured_at}`}
                          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar pesaje de ${w.weight_kg} kg del ${w.measured_at}?`)) {
                              onDeleteWeighIn(w.id);
                            }
                          }}
                          aria-label={`Eliminar pesaje del ${w.measured_at}`}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: BODY MEASUREMENTS */}
      {subTab === 'measurements' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Historial de Perímetros Corporales</h3>
            <span className="text-xs text-zinc-400">{measurements.length} registros</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 text-[11px]">
                  <th className="px-4 py-2.5">FECHA</th>
                  <th className="px-4 py-2.5">CINTURA</th>
                  <th className="px-4 py-2.5">CUELLO</th>
                  <th className="px-4 py-2.5">PECHO</th>
                  <th className="px-4 py-2.5">CADERA</th>
                  <th className="px-4 py-2.5">BRAZO FLEX.</th>
                  <th className="px-4 py-2.5">MUSLO</th>
                  <th className="px-4 py-2.5">% GRASA (NAVY)</th>
                  <th className="px-4 py-2.5 text-right">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {[...measurements].reverse().map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-white">{m.measured_at}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{m.waist_cm} cm</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{m.neck_cm ? `${m.neck_cm} cm` : '--'}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{m.chest_cm ? `${m.chest_cm} cm` : '--'}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{m.hip_cm ? `${m.hip_cm} cm` : '--'}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{m.arm_flexed_cm ? `${m.arm_flexed_cm} cm` : '--'}</td>
                    <td className="px-4 py-3 font-mono text-zinc-300">{m.thigh_cm ? `${m.thigh_cm} cm` : '--'}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400 font-semibold">
                      {m.body_fat_percent ? `${m.body_fat_percent}%` : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditMeasurement(m)}
                          aria-label={`Editar medidas del ${m.measured_at}`}
                          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar medidas del ${m.measured_at}?`)) {
                              onDeleteMeasurement(m.id);
                            }
                          }}
                          aria-label={`Eliminar medidas del ${m.measured_at}`}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: GOALS SETTINGS */}
      {subTab === 'goals' && (
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5 max-w-2xl">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span>Configuración de Objetivos Físicos</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Los objetivos son metas orientativas que sirven para calibrar el ritmo de recomposición sin imponer pérdidas agresivas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Peso Objetivo (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={goal.target_weight_kg}
                  onChange={(e) => onUpdateGoal({ ...goal, target_weight_kg: parseFloat(e.target.value) || 78 })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Cintura Objetivo (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={goal.target_waist_cm || 80}
                  onChange={(e) => onUpdateGoal({ ...goal, target_waist_cm: parseFloat(e.target.value) || 80 })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Ritmo Semanal Deseado (% peso corporal/semana)
                </label>
                <select
                  value={goal.weekly_rate_percent}
                  onChange={(e) => onUpdateGoal({ ...goal, weekly_rate_percent: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                >
                  <option value="0.25">0.25% (~0.2 kg/sem) - Máxima preservación muscular</option>
                  <option value="0.5">0.50% (~0.4 kg/sem) - Ritmo recomendado de recomposición</option>
                  <option value="0.75">0.75% (~0.6 kg/sem) - Déficit moderado-alto</option>
                  <option value="1.0">1.00% (~0.85 kg/sem) - Límite superior conservador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Fecha Objetivo Opcional</label>
                <input
                  type="date"
                  value={goal.optional_target_date || ''}
                  onChange={(e) => onUpdateGoal({ ...goal, optional_target_date: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
