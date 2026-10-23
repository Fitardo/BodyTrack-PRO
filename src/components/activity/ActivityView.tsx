/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActivityLog, RecoveryLog } from '../../types';
import { Footprints, Moon, HeartPulse, Plus, Check, Star, AlertCircle } from 'lucide-react';

interface ActivityViewProps {
  currentDate: string;
  activityLogs: ActivityLog[];
  recoveryLogs: RecoveryLog[];
  onSaveActivity: (log: ActivityLog) => void;
  onSaveRecovery: (log: RecoveryLog) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  currentDate,
  activityLogs,
  recoveryLogs,
  onSaveActivity,
  onSaveRecovery,
}) => {
  const currentActivity = activityLogs.find((a) => a.activity_date === currentDate) || {
    id: `act-${currentDate}`,
    activity_date: currentDate,
    steps: 6500,
    distance_km: 4.8,
    cardio_minutes: 0,
    cardio_type: 'caminata' as const,
    intensity: 'baja' as const,
  };

  const currentRecovery = recoveryLogs.find((r) => r.recorded_at === currentDate) || {
    id: `rec-${currentDate}`,
    recorded_at: currentDate,
    sleep_hours: 7.5,
    sleep_quality: 4,
    fatigue: 2,
    soreness: 2,
    energy: 4,
    hunger: 2,
    stress: 2,
  };

  const [steps, setSteps] = useState<number>(currentActivity.steps);
  const [distanceKm, setDistanceKm] = useState<number>(currentActivity.distance_km || 4.8);
  const [cardioMinutes, setCardioMinutes] = useState<number>(currentActivity.cardio_minutes || 0);
  const [cardioType, setCardioType] = useState<ActivityLog['cardio_type']>(currentActivity.cardio_type || 'caminata');
  const [intensity, setIntensity] = useState<ActivityLog['intensity']>(currentActivity.intensity || 'baja');

  const [sleepHours, setSleepHours] = useState<number>(currentRecovery.sleep_hours);
  const [sleepQuality, setSleepQuality] = useState<number>(currentRecovery.sleep_quality);
  const [fatigue, setFatigue] = useState<number>(currentRecovery.fatigue);
  const [soreness, setSoreness] = useState<number>(currentRecovery.soreness);
  const [energy, setEnergy] = useState<number>(currentRecovery.energy);
  const [hunger, setHunger] = useState<number>(currentRecovery.hunger);
  const [stress, setStress] = useState<number>(currentRecovery.stress);

  const [savedMessage, setSavedMessage] = useState<string>('');

  useEffect(() => {
    const act = activityLogs.find((a) => a.activity_date === currentDate);
    if (act) {
      setSteps(act.steps);
      setDistanceKm(act.distance_km || 4.8);
      setCardioMinutes(act.cardio_minutes || 0);
      setCardioType(act.cardio_type || 'caminata');
      setIntensity(act.intensity || 'baja');
    }
    const rec = recoveryLogs.find((r) => r.recorded_at === currentDate);
    if (rec) {
      setSleepHours(rec.sleep_hours);
      setSleepQuality(rec.sleep_quality);
      setFatigue(rec.fatigue);
      setSoreness(rec.soreness);
      setEnergy(rec.energy);
      setHunger(rec.hunger);
      setStress(rec.stress);
    }
  }, [currentDate, activityLogs, recoveryLogs]);

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveActivity({
      id: currentActivity.id,
      activity_date: currentDate,
      steps,
      distance_km: distanceKm,
      cardio_minutes: cardioMinutes,
      cardio_type: cardioType,
      intensity,
    });

    onSaveRecovery({
      id: currentRecovery.id,
      recorded_at: currentDate,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      fatigue,
      soreness,
      energy,
      hunger,
      stress,
    });

    setSavedMessage('¡Registro de actividad y recuperación actualizado con éxito!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // Recent 7 days average steps
  const past7DaysActs = activityLogs.slice(-7);
  const avgSteps7d = past7DaysActs.length > 0
    ? Math.round(past7DaysActs.reduce((acc, curr) => acc + curr.steps, 0) / past7DaysActs.length)
    : steps;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Footprints className="w-5 h-5 text-emerald-400" />
            <span>Actividad y Recuperación Subjetiva</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Control de pasos, gasto no asociado al ejercicio (NEAT), horas de descanso y marcadores de fatiga.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
            Fecha: {currentDate}
          </span>
        </div>
      </div>

      {savedMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Pasos Diarios</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-white">{steps.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">
            Meta inicial: 5.000 pasos
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Promedio 7 Días</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-cyan-400">{avgSteps7d.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Pasos / día</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Horas de Sueño</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-violet-400">{sleepHours}h</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Calidad: {sleepQuality}/5</span>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-[11px] text-zinc-400 block font-medium">Energía Percibida</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-amber-400">{energy} / 5</span>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 block">Fatiga: {fatigue}/5</span>
        </div>
      </div>

      <form onSubmit={handleSaveAll} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity & Cardio Box */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <span>Registro de Actividad Física y Cardio</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-steps" className="block text-xs font-medium text-zinc-300 mb-1">Pasos Diarios Acumulados</label>
              <input
                id="act-steps"
                type="number"
                step="100"
                value={steps}
                onChange={(e) => {
                  const s = parseInt(e.target.value) || 0;
                  setSteps(s);
                  setDistanceKm(Number(((s * 0.75) / 1000).toFixed(2)));
                }}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="act-dist" className="block text-xs font-medium text-zinc-300 mb-1">Distancia Estimada (km)</label>
              <input
                id="act-dist"
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label htmlFor="act-cardio-min" className="block text-xs font-medium text-zinc-300 mb-1">Cardio (minutos)</label>
              <input
                id="act-cardio-min"
                type="number"
                step="5"
                value={cardioMinutes}
                onChange={(e) => setCardioMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-xs"
              />
            </div>

            <div>
              <label htmlFor="act-cardio-type" className="block text-xs font-medium text-zinc-300 mb-1">Tipo de Cardio</label>
              <select
                id="act-cardio-type"
                value={cardioType}
                onChange={(e) => setCardioType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs"
              >
                <option value="caminata">Caminata al aire libre</option>
                <option value="ciclismo">Ciclismo / Estática</option>
                <option value="carrera">Trote / Carrera</option>
                <option value="natacion">Natación</option>
                <option value="hiit">HIIT / Circuitos</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label htmlFor="act-intensity" className="block text-xs font-medium text-zinc-300 mb-1">Intensidad</label>
              <select
                id="act-intensity"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs"
              >
                <option value="baja">Baja (conversacional)</option>
                <option value="moderada">Moderada (zona 2)</option>
                <option value="alta">Alta (alta frecuencia)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subjective Recovery Box */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-violet-400" />
            <span>Marcadores de Recuperación Subjetiva</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rec-sleep-hours" className="block text-xs font-medium text-zinc-300 mb-1">Horas de Sueño</label>
              <input
                id="rec-sleep-hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="rec-sleep-quality" className="block text-xs font-medium text-zinc-300 mb-1">Calidad del Sueño (1-5)</label>
              <select
                id="rec-sleep-quality"
                value={sleepQuality}
                onChange={(e) => setSleepQuality(parseInt(e.target.value))}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs"
              >
                <option value="1">1 - Pésima / Despertares continuos</option>
                <option value="2">2 - Mala / Poco descanso</option>
                <option value="3">3 - Regular</option>
                <option value="4">4 - Buena y reparadora</option>
                <option value="5">5 - Excelente / Energía al 100%</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800">
            <div>
              <label htmlFor="rec-fatigue" className="block text-xs font-medium text-zinc-400 mb-1">Fatiga general (1-5)</label>
              <input
                id="rec-fatigue"
                type="range"
                min="1"
                max="5"
                value={fatigue}
                onChange={(e) => setFatigue(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[11px] font-mono text-zinc-400 block text-center">{fatigue} / 5</span>
            </div>

            <div>
              <label htmlFor="rec-soreness" className="block text-xs font-medium text-zinc-400 mb-1">Dolor muscular DOMS</label>
              <input
                id="rec-soreness"
                type="range"
                min="1"
                max="5"
                value={soreness}
                onChange={(e) => setSoreness(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <span className="text-[11px] font-mono text-zinc-400 block text-center">{soreness} / 5</span>
            </div>

            <div>
              <label htmlFor="rec-energy" className="block text-xs font-medium text-zinc-400 mb-1">Nivel de energía</label>
              <input
                id="rec-energy"
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-[11px] font-mono text-emerald-400 block text-center font-bold">{energy} / 5</span>
            </div>

            <div>
              <label htmlFor="rec-hunger" className="block text-xs font-medium text-zinc-400 mb-1">Apetito / Hambre</label>
              <input
                id="rec-hunger"
                type="range"
                min="1"
                max="5"
                value={hunger}
                onChange={(e) => setHunger(parseInt(e.target.value))}
                className="w-full accent-sky-500"
              />
              <span className="text-[11px] font-mono text-zinc-400 block text-center">{hunger} / 5</span>
            </div>

            <div>
              <label htmlFor="rec-stress" className="block text-xs font-medium text-zinc-400 mb-1">Estrés percibido</label>
              <input
                id="rec-stress"
                type="range"
                min="1"
                max="5"
                value={stress}
                onChange={(e) => setStress(parseInt(e.target.value))}
                className="w-full accent-rose-500"
              />
              <span className="text-[11px] font-mono text-zinc-400 block text-center">{stress} / 5</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors shadow-md shadow-emerald-500/20 active:scale-98"
          >
            Guardar Registros de Actividad y Recuperación
          </button>
        </div>
      </form>
    </div>
  );
};
