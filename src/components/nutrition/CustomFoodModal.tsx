/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Food } from '../../types';
import { calculateMacroCalories } from '../../utils/calculations';
import { AlertTriangle, Barcode, ShieldCheck } from 'lucide-react';

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (food: Food) => void;
}

export const CustomFoodModal: React.FC<CustomFoodModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [barcode, setBarcode] = useState<string>('');
  const [servingSize, setServingSize] = useState<string>('100');
  const [servingUnit, setServingUnit] = useState<string>('g');
  const [servingWeightG, setServingWeightG] = useState<string>('100');
  const [prepState, setPrepState] = useState<'raw' | 'cooked' | 'na'>('raw');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [fiber, setFiber] = useState<string>('');
  const [badgeType, setBadgeType] = useState<'verified' | 'community'>('community');
  const [error, setError] = useState<string>('');

  const pNum = parseFloat(protein) || 0;
  const cNum = parseFloat(carbs) || 0;
  const fNum = parseFloat(fat) || 0;
  const { totalKcal } = calculateMacroCalories(pNum, cNum, fNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Introduce un nombre para el alimento.');
      return;
    }
    const servSize = parseFloat(servingSize);
    if (isNaN(servSize) || servSize <= 0) {
      setError('Introduce una porción válida.');
      return;
    }

    const newFood: Food = {
      id: `food-custom-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.trim() || undefined,
      serving_size: servSize,
      serving_unit: servingUnit,
      serving_weight_g: parseFloat(servingWeightG) || 100,
      preparation_state: prepState,
      calories_kcal: totalKcal,
      protein_g: Number(pNum.toFixed(1)),
      carbohydrates_g: Number(cNum.toFixed(1)),
      fat_g: Number(fNum.toFixed(1)),
      fiber_g: parseFloat(fiber) || 0,
      source: 'custom',
      data_source_badge: badgeType,
    };

    onSave(newFood);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir Alimento a la Base de Datos"
      subtitle="Introduce los datos nutricionales oficiales de la etiqueta por porción o por 100g."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="food-name" className="block text-xs font-medium text-zinc-300 mb-1">
            Nombre del alimento <span className="text-emerald-400">*</span>
          </label>
          <input
            id="food-name"
            type="text"
            placeholder="Ej: Lentejas cocidas, Atún en lata al natural..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="food-brand" className="block text-xs font-medium text-zinc-300 mb-1">
              Marca (opcional)
            </label>
            <input
              id="food-brand"
              type="text"
              placeholder="Ej: La Campagnola, Casero..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="food-barcode" className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-emerald-400" />
              <span>Código de barras EAN-13 (opcional)</span>
            </label>
            <input
              id="food-barcode"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 7791337601125"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label htmlFor="food-serving" className="block text-xs font-medium text-zinc-300 mb-1">
              Porción base
            </label>
            <input
              id="food-serving"
              type="number"
              inputMode="decimal"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label htmlFor="food-unit" className="block text-xs font-medium text-zinc-300 mb-1">
              Unidad
            </label>
            <select
              id="food-unit"
              value={servingUnit}
              onChange={(e) => setServingUnit(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="g">Gramos (g)</option>
              <option value="ml">Mililitros (ml)</option>
              <option value="unidad">Unidad</option>
              <option value="porción">Porción</option>
            </select>
          </div>

          <div>
            <label htmlFor="food-weight-eq" className="block text-xs font-medium text-zinc-300 mb-1">
              Equiv. en gramos
            </label>
            <input
              id="food-weight-eq"
              type="number"
              inputMode="decimal"
              value={servingWeightG}
              onChange={(e) => setServingWeightG(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="food-prep" className="block text-xs font-medium text-zinc-300 mb-1">
              Estado de preparación
            </label>
            <select
              id="food-prep"
              value={prepState}
              onChange={(e) => setPrepState(e.target.value as any)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="raw">Crudo / en seco</option>
              <option value="cooked">Cocido / hervido / plancha</option>
              <option value="na">No aplica (bebida/snack)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Origen del dato</span>
            </label>
            <select
              value={badgeType}
              onChange={(e) => setBadgeType(e.target.value as 'verified' | 'community')}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="community">Comunidad / Ingreso Manual</option>
              <option value="verified">Etiqueta Oficial Verificada</option>
            </select>
          </div>
        </div>

        {/* Nutritional Information per portion */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">
              Nutrientes por cada {servingSize} {servingUnit}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">{totalKcal} kcal</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label htmlFor="food-p" className="block text-[11px] text-zinc-400 mb-0.5">Proteína (g)</label>
              <input
                id="food-p"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="food-c" className="block text-[11px] text-zinc-400 mb-0.5">Carbos (g)</label>
              <input
                id="food-c"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="food-f" className="block text-[11px] text-zinc-400 mb-0.5">Grasas (g)</label>
              <input
                id="food-f"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="food-fib" className="block text-[11px] text-zinc-400 mb-0.5">Fibra (g)</label>
              <input
                id="food-fib"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="0"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white font-mono"
              />
            </div>
          </div>
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
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            Guardar en Biblioteca
          </button>
        </div>
      </form>
    </Modal>
  );
};
