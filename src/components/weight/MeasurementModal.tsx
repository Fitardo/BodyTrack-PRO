/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { BodyMeasurement, UserProfile } from '../../types';
import { calculateUSNavyBodyFat, calculateBodyComposition } from '../../utils/calculations';
import { Calculator, Minus, Plus, Calendar } from 'lucide-react';
import {
  ANTHROPOMETRIC_BOUNDS,
  stepMetric,
  validateManualDateInput,
} from '../../utils/auditAndRetentionUtils';

interface MeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meas: BodyMeasurement) => void;
  profile: UserProfile;
  initialMeasurement?: BodyMeasurement | null;
  defaultDate?: string;
  currentWeightKg: number;
}

export const MeasurementModal: React.FC<MeasurementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  profile,
  initialMeasurement,
  defaultDate,
  currentWeightKg,
}) => {
  const [date, setDate] = useState<string>('');
  const [manualDateMode, setManualDateMode] = useState<boolean>(false);
  const [waist, setWaist] = useState<string>('');
  const [neck, setNeck] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [hip, setHip] = useState<string>('');
  const [armRelaxed, setArmRelaxed] = useState<string>('');
  const [armFlexed, setArmFlexed] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');
  const [calf, setCalf] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialMeasurement) {
      setDate(initialMeasurement.measured_at);
      setWaist(String(initialMeasurement.waist_cm));
      setNeck(initialMeasurement.neck_cm ? String(initialMeasurement.neck_cm) : '');
      setChest(initialMeasurement.chest_cm ? String(initialMeasurement.chest_cm) : '');
      setHip(initialMeasurement.hip_cm ? String(initialMeasurement.hip_cm) : '');
      setArmRelaxed(initialMeasurement.arm_relaxed_cm ? String(initialMeasurement.arm_relaxed_cm) : '');
      setArmFlexed(initialMeasurement.arm_flexed_cm ? String(initialMeasurement.arm_flexed_cm) : '');
      setThigh(initialMeasurement.thigh_cm ? String(initialMeasurement.thigh_cm) : '');
      setCalf(initialMeasurement.calf_cm ? String(initialMeasurement.calf_cm) : '');
      setNotes(initialMeasurement.notes || '');
    } else {
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setWaist('86.8');
      setNeck('39.2');
      setChest('104.5');
      setHip('100.5');
      setArmRelaxed('37.2');
      setArmFlexed('38.8');
      setThigh('60.8');
      setCalf('38.5');
      setNotes('');
    }
    setError('');
  }, [initialMeasurement, defaultDate, isOpen]);

  const parsedWaist = parseFloat(waist);
  const parsedNeck = parseFloat(neck);
  const parsedHip = parseFloat(hip);

  const estimatedNavyBF =
    !isNaN(parsedWaist) && !isNaN(parsedNeck)
      ? calculateUSNavyBodyFat(profile.sex_for_equations, profile.height_cm, parsedWaist, parsedNeck, parsedHip)
      : null;

  const bodyComp =
    estimatedNavyBF !== null ? calculateBodyComposition(currentWeightKg, estimatedNavyBF) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isNaN(parsedWaist) ||
      parsedWaist < ANTHROPOMETRIC_BOUNDS.waist_cm.min ||
      parsedWaist > ANTHROPOMETRIC_BOUNDS.waist_cm.max
    ) {
      setError(
        `Por favor introduce un perímetro de cintura válido (${ANTHROPOMETRIC_BOUNDS.waist_cm.min} - ${ANTHROPOMETRIC_BOUNDS.waist_cm.max} cm).`
      );
      return;
    }

    const dateCheck = validateManualDateInput(date);
    if (!dateCheck.valid || !dateCheck.isoDate) {
      setError(dateCheck.error || 'Introduce una fecha válida.');
      return;
    }

    const newRecord: BodyMeasurement = {
      id: initialMeasurement ? initialMeasurement.id : `bm-${Date.now()}`,
      measured_at: dateCheck.isoDate,
      waist_cm: Number(parsedWaist.toFixed(1)),
      neck_cm: !isNaN(parsedNeck) ? Number(parsedNeck.toFixed(1)) : undefined,
      chest_cm: !isNaN(parseFloat(chest)) ? Number(parseFloat(chest).toFixed(1)) : undefined,
      hip_cm: !isNaN(parsedHip) ? Number(parsedHip.toFixed(1)) : undefined,
      arm_relaxed_cm: !isNaN(parseFloat(armRelaxed)) ? Number(parseFloat(armRelaxed).toFixed(1)) : undefined,
      arm_flexed_cm: !isNaN(parseFloat(armFlexed)) ? Number(parseFloat(armFlexed).toFixed(1)) : undefined,
      thigh_cm: !isNaN(parseFloat(thigh)) ? Number(parseFloat(thigh).toFixed(1)) : undefined,
      calf_cm: !isNaN(parseFloat(calf)) ? Number(parseFloat(calf).toFixed(1)) : undefined,
      body_fat_percent: estimatedNavyBF ?? undefined,
      body_fat_method: estimatedNavyBF !== null ? 'U.S. Navy (Antropométrica)' : undefined,
      is_estimate: true,
      notes: notes.trim() || undefined,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialMeasurement ? 'Editar Medidas Corporales' : 'Registrar Medidas Corporales'}
      subtitle="Mide siempre en las mismas referencias anatómicas sin tensar en exceso la cinta métrica."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="meas-date" className="block text-xs font-medium text-zinc-300">
              Fecha de medición <span className="text-emerald-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => setManualDateMode(!manualDateMode)}
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3 h-3" />
              <span>{manualDateMode ? 'Usar calendario' : 'Escribir fecha'}</span>
            </button>
          </div>
          {manualDateMode ? (
            <input
              id="meas-date"
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD o DD/MM/AAAA"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          ) : (
            <input
              id="meas-date"
              type="date"
              min="2020-01-01"
              max="2030-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          )}
        </div>

        {/* Priority: Waist & Neck for Recomposition & Navy formula */}
        <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-emerald-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              Medidas clave para Recomposición & Fórmula Marina
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              Rango cintura: {ANTHROPOMETRIC_BOUNDS.waist_cm.min}–{ANTHROPOMETRIC_BOUNDS.waist_cm.max} cm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="meas-waist" className="block text-xs font-medium text-zinc-300">
                Cintura umbilical (cm) <span className="text-emerald-400">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setWaist(String(stepMetric('waist_cm', parsedWaist || 80, -0.5)))
                  }
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  id="meas-waist"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={ANTHROPOMETRIC_BOUNDS.waist_cm.min}
                  max={ANTHROPOMETRIC_BOUNDS.waist_cm.max}
                  placeholder="Ej: 86.8"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm text-center focus:outline-none focus:border-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    setWaist(String(stepMetric('waist_cm', parsedWaist || 80, 0.5)))
                  }
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="range"
                min={ANTHROPOMETRIC_BOUNDS.waist_cm.min}
                max={ANTHROPOMETRIC_BOUNDS.waist_cm.max}
                step="0.5"
                value={Math.min(
                  ANTHROPOMETRIC_BOUNDS.waist_cm.max,
                  Math.max(ANTHROPOMETRIC_BOUNDS.waist_cm.min, parsedWaist || 85)
                )}
                onChange={(e) => setWaist(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="meas-neck" className="block text-xs font-medium text-zinc-300">
                Cuello (cm)
              </label>
              <input
                id="meas-neck"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={ANTHROPOMETRIC_BOUNDS.neck_cm.min}
                max={ANTHROPOMETRIC_BOUNDS.neck_cm.max}
                placeholder="Ej: 39.2"
                value={neck}
                onChange={(e) => setNeck(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Navy calculation live badge */}
          {estimatedNavyBF !== null && bodyComp && (
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 text-[11px] block">Grasa Corporal Estimada (U.S. Navy):</span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {estimatedNavyBF}% <span className="text-[10px] uppercase text-zinc-400 font-normal">(estimado)</span>
                </span>
              </div>
              <div className="text-right text-[11px] text-zinc-300 font-mono">
                <div>Masa Grasa: <span className="text-white font-semibold">{bodyComp.fatMassKg} kg</span></div>
                <div>Masa Libre Grasa: <span className="text-emerald-400 font-semibold">{bodyComp.leanMassKg} kg</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary anatomical circumferences */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="meas-chest" className="block text-xs font-medium text-zinc-400 mb-1">Pecho (cm)</label>
            <input
              id="meas-chest"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="104.5"
              value={chest}
              onChange={(e) => setChest(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="meas-hip" className="block text-xs font-medium text-zinc-400 mb-1">Cadera (cm)</label>
            <input
              id="meas-hip"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="100.5"
              value={hip}
              onChange={(e) => setHip(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="meas-arm-flexed" className="block text-xs font-medium text-zinc-400 mb-1">Brazo Flexionado (cm)</label>
            <input
              id="meas-arm-flexed"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="38.8"
              value={armFlexed}
              onChange={(e) => setArmFlexed(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="meas-arm-relaxed" className="block text-xs font-medium text-zinc-400 mb-1">Brazo Relajado (cm)</label>
            <input
              id="meas-arm-relaxed"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="37.2"
              value={armRelaxed}
              onChange={(e) => setArmRelaxed(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="meas-thigh" className="block text-xs font-medium text-zinc-400 mb-1">Muslo medio (cm)</label>
            <input
              id="meas-thigh"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="60.8"
              value={thigh}
              onChange={(e) => setThigh(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>

          <div>
            <label htmlFor="meas-calf" className="block text-xs font-medium text-zinc-400 mb-1">Pantorrilla (cm)</label>
            <input
              id="meas-calf"
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="38.5"
              value={calf}
              onChange={(e) => setCalf(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label htmlFor="meas-notes" className="block text-xs font-medium text-zinc-300 mb-1">Notas de la medición</label>
          <input
            id="meas-notes"
            type="text"
            placeholder="Ej: medición tomada al despertar en ayunas"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            data-testid="save-measurement-btn"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            Guardar Medidas
          </button>
        </div>
      </form>
    </Modal>
  );
};
