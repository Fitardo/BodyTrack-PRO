/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { WeighIn } from '../../types';
import { Info, AlertTriangle, HelpCircle, Minus, Plus, Calendar } from 'lucide-react';
import {
  ANTHROPOMETRIC_BOUNDS,
  stepMetric,
  validateManualDateInput,
  EDUCATIONAL_TOOLTIPS,
} from '../../utils/auditAndRetentionUtils';

interface WeighInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weighIn: WeighIn) => void;
  initialWeighIn?: WeighIn | null;
  defaultDate?: string;
}

export const WeighInModal: React.FC<WeighInModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialWeighIn,
  defaultDate,
}) => {
  const [weightKg, setWeightKg] = useState<string>('80');
  const [date, setDate] = useState<string>('');
  const [manualDateMode, setManualDateMode] = useState<boolean>(false);
  const [time, setTime] = useState<string>('07:30');
  const [fasting, setFasting] = useState<boolean>(true);
  const [context, setContext] = useState<WeighIn['context']>('normal');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showMovingAvgTooltip, setShowMovingAvgTooltip] = useState<boolean>(false);

  useEffect(() => {
    if (initialWeighIn) {
      setWeightKg(String(initialWeighIn.weight_kg));
      setDate(initialWeighIn.measured_at.split('T')[0]);
      setTime(initialWeighIn.time_of_day || '07:30');
      setFasting(initialWeighIn.fasting);
      setContext(initialWeighIn.context || 'normal');
      setNotes(initialWeighIn.notes || '');
    } else {
      setWeightKg('82.5');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('07:30');
      setFasting(true);
      setContext('normal');
      setNotes('');
    }
    setError('');
  }, [initialWeighIn, defaultDate, isOpen]);

  const numericWeight = parseFloat(weightKg) || 80;

  const handleStepWeight = (delta: number) => {
    const next = stepMetric('weight_kg', numericWeight, delta);
    setWeightKg(String(next));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightKg.replace(',', '.'));
    if (
      isNaN(val) ||
      val < ANTHROPOMETRIC_BOUNDS.weight_kg.min ||
      val > ANTHROPOMETRIC_BOUNDS.weight_kg.max
    ) {
      setError(
        `Por favor introduce un peso válido entre ${ANTHROPOMETRIC_BOUNDS.weight_kg.min} kg y ${ANTHROPOMETRIC_BOUNDS.weight_kg.max} kg.`
      );
      return;
    }

    const dateCheck = validateManualDateInput(date);
    if (!dateCheck.valid || !dateCheck.isoDate) {
      setError(dateCheck.error || 'Introduce una fecha válida.');
      return;
    }

    const newRecord: WeighIn = {
      id: initialWeighIn ? initialWeighIn.id : `w-${Date.now()}`,
      measured_at: dateCheck.isoDate,
      weight_kg: Number(val.toFixed(2)),
      fasting,
      time_of_day: time,
      context,
      notes: notes.trim() || undefined,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialWeighIn ? 'Editar Registro de Peso' : 'Nuevo Pesaje Matutino'}
      subtitle="Recomendación: pesarse en ayunas tras ir al baño para máxima consistencia."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Weight Input with Mobile Decimal Keyboard + Unrestricted Slider & Steppers */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label htmlFor="weighin-weight" className="block text-xs font-bold text-zinc-200">
              Peso corporal (kg) <span className="text-emerald-400">*</span>
            </label>
            <span className="text-[10px] font-mono text-zinc-400">
              Rango libre: {ANTHROPOMETRIC_BOUNDS.weight_kg.min}–{ANTHROPOMETRIC_BOUNDS.weight_kg.max} kg
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStepWeight(-0.5)}
              aria-label="Restar 0.5 kg"
              className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              id="weighin-weight"
              data-testid="weighin-weight-input"
              type="number"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              step="0.1"
              min={ANTHROPOMETRIC_BOUNDS.weight_kg.min}
              max={ANTHROPOMETRIC_BOUNDS.weight_kg.max}
              placeholder="Ej: 84.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-base font-bold text-center focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleStepWeight(0.5)}
              aria-label="Sumar 0.5 kg"
              className="p-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <input
            type="range"
            data-testid="weighin-weight-slider"
            min={ANTHROPOMETRIC_BOUNDS.weight_kg.min}
            max={ANTHROPOMETRIC_BOUNDS.weight_kg.max}
            step="0.5"
            value={Math.min(
              ANTHROPOMETRIC_BOUNDS.weight_kg.max,
              Math.max(ANTHROPOMETRIC_BOUNDS.weight_kg.min, numericWeight)
            )}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="weighin-date" className="block text-xs font-medium text-zinc-300">
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
                id="weighin-date"
                data-testid="weighin-date-manual"
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
                id="weighin-date"
                data-testid="weighin-date-input"
                type="date"
                min="2020-01-01"
                max="2030-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            )}
          </div>

          <div>
            <label htmlFor="weighin-time" className="block text-xs font-medium text-zinc-300 mb-1">
              Hora de pesaje
            </label>
            <input
              id="weighin-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id="fasting-check"
            type="checkbox"
            checked={fasting}
            onChange={(e) => setFasting(e.target.checked)}
            className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
          />
          <label htmlFor="fasting-check" className="text-xs font-medium text-zinc-300 cursor-pointer">
            Pesaje en ayunas (antes de comer o beber)
          </label>
        </div>

        <div>
          <label htmlFor="weighin-context" className="block text-xs font-medium text-zinc-300 mb-1">
            Contexto del pesaje
          </label>
          <select
            id="weighin-context"
            value={context}
            onChange={(e) => setContext(e.target.value as any)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="normal">Condición normal habitual</option>
            <option value="salty_food">Comida con alto sodio anoche (posible retención)</option>
            <option value="post_cheat_meal">Comida libre / superávit agudo</option>
            <option value="post_workout">Tras entreno exigente de fuerza (inflamación muscular)</option>
            <option value="poor_sleep">Descanso deficiente / estrés</option>
            <option value="travel">Viaje / cambio de rutina</option>
          </select>
        </div>

        <div>
          <label htmlFor="weighin-notes" className="block text-xs font-medium text-zinc-300 mb-1">
            Observaciones opcionales
          </label>
          <input
            id="weighin-notes"
            type="text"
            placeholder="Ej: hidratación alta, sensación de ligereza..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Scientific Context Explainer + Interactive Tooltip */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Info className="w-3.5 h-3.5" />
              <span>¿Por qué fluctúa el peso de un día a otro?</span>
            </div>
            <button
              type="button"
              onClick={() => setShowMovingAvgTooltip(!showMovingAvgTooltip)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>¿Qué es la Media móvil?</span>
            </button>
          </div>
          {showMovingAvgTooltip && (
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-cyan-500/30 text-zinc-200 text-[11px] space-y-1">
              <strong className="text-cyan-400 block">
                {EDUCATIONAL_TOOLTIPS.moving_average.title}
              </strong>
              <p>{EDUCATIONAL_TOOLTIPS.moving_average.shortDescription}</p>
              <p className="text-zinc-400 font-mono text-[10px]">
                {EDUCATIONAL_TOOLTIPS.moving_average.scientificContext}
              </p>
            </div>
          )}
          <p className="leading-relaxed">
            Una subida de 0,5–1 kg en 24h <strong>no es grasa</strong>. Corresponde a oscilaciones de agua corporal por sodio, glucógeno muscular (1g glucógeno retiene ~3g de agua) y tránsito digestivo. Observa siempre la <strong>media móvil de 7 días</strong>.
          </p>
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
            data-testid="save-weighin-btn"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            Guardar Pesaje
          </button>
        </div>
      </form>
    </Modal>
  );
};
