/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { WeighIn } from '../../types';
import { Info, AlertTriangle } from 'lucide-react';

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
  const [weightKg, setWeightKg] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('07:30');
  const [fasting, setFasting] = useState<boolean>(true);
  const [context, setContext] = useState<WeighIn['context']>('normal');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialWeighIn) {
      setWeightKg(String(initialWeighIn.weight_kg));
      setDate(initialWeighIn.measured_at.split('T')[0]);
      setTime(initialWeighIn.time_of_day || '07:30');
      setFasting(initialWeighIn.fasting);
      setContext(initialWeighIn.context || 'normal');
      setNotes(initialWeighIn.notes || '');
    } else {
      setWeightKg('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('07:30');
      setFasting(true);
      setContext('normal');
      setNotes('');
    }
    setError('');
  }, [initialWeighIn, defaultDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightKg);
    if (isNaN(val) || val <= 30 || val >= 300) {
      setError('Por favor introduce un peso válido entre 30 kg y 300 kg.');
      return;
    }
    if (!date) {
      setError('La fecha es obligatoria.');
      return;
    }

    const newRecord: WeighIn = {
      id: initialWeighIn ? initialWeighIn.id : `w-${Date.now()}`,
      measured_at: date,
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="weighin-weight" className="block text-xs font-medium text-zinc-300 mb-1">
              Peso (kg) <span className="text-emerald-400">*</span>
            </label>
            <input
              id="weighin-weight"
              type="number"
              step="0.05"
              placeholder="Ej: 84.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-base focus:outline-none focus:border-emerald-500"
              required
              autoFocus
            />
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

        <div>
          <label htmlFor="weighin-date" className="block text-xs font-medium text-zinc-300 mb-1">
            Fecha de medición <span className="text-emerald-400">*</span>
          </label>
          <input
            id="weighin-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            required
          />
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

        {/* Scientific Context Explainer */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Info className="w-3.5 h-3.5" />
            <span>¿Por qué fluctúa el peso de un día a otro?</span>
          </div>
          <p className="leading-relaxed">
            Una subida de 0,5–1 kg en 24h <strong>no es grasa</strong>. Corresponde a oscilaciones de agua corporal por sodio, glucógeno muscular (1g glucógeno retiene ~3g de agua) y tránsito digestivo. Observa siempre la <strong>media móvil de 7 días</strong>.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm shadow-emerald-500/20"
          >
            Guardar Pesaje
          </button>
        </div>
      </form>
    </Modal>
  );
};
