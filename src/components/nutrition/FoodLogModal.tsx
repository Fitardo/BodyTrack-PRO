/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Food, FoodLog, MealCategory } from '../../types';
import { calculateMacroCalories } from '../../utils/calculations';
import { Search, Plus, AlertTriangle, Sparkles } from 'lucide-react';

interface FoodLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: FoodLog) => void;
  onOpenCreateCustomFood: () => void;
  foods: Food[];
  initialLog?: FoodLog | null;
  defaultDate?: string;
  defaultMealType?: MealCategory;
}

export const FoodLogModal: React.FC<FoodLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenCreateCustomFood,
  foods,
  initialLog,
  defaultDate,
  defaultMealType = 'almuerzo',
}) => {
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('13:00');
  const [mealType, setMealType] = useState<MealCategory>(defaultMealType);
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('100');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (initialLog) {
      setDate(initialLog.consumed_at);
      setTime(initialLog.consumed_time || '13:00');
      setMealType(initialLog.meal_type);
      setSelectedFoodId(initialLog.food_id || '');
      setQuantity(String(initialLog.quantity));
      setNotes(initialLog.notes || '');
    } else {
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setMealType(defaultMealType);
      setSelectedFoodId(foods[0]?.id || '');
      setQuantity('100');
      setNotes('');
    }
    setSearchQuery('');
    setError('');
  }, [initialLog, defaultDate, defaultMealType, foods, isOpen]);

  const selectedFood = foods.find((f) => f.id === selectedFoodId) || foods[0];

  const qty = parseFloat(quantity) || 0;
  const ratio = selectedFood ? qty / selectedFood.serving_size : 0;

  const calculatedP = selectedFood ? Number((selectedFood.protein_g * ratio).toFixed(1)) : 0;
  const calculatedC = selectedFood ? Number((selectedFood.carbohydrates_g * ratio).toFixed(1)) : 0;
  const calculatedF = selectedFood ? Number((selectedFood.fat_g * ratio).toFixed(1)) : 0;
  const calculatedFiber = selectedFood ? Number(((selectedFood.fiber_g || 0) * ratio).toFixed(1)) : 0;

  const { totalKcal } = calculateMacroCalories(calculatedP, calculatedC, calculatedF);

  const filteredFoods = foods.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.brand && f.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) {
      setError('Selecciona un alimento de la lista.');
      return;
    }
    if (qty <= 0) {
      setError('Introduce una cantidad mayor a cero.');
      return;
    }

    const log: FoodLog = {
      id: initialLog ? initialLog.id : `fl-${Date.now()}`,
      consumed_at: date,
      consumed_time: time,
      meal_type: mealType,
      food_id: selectedFood.id,
      food_name_snapshot: selectedFood.name,
      brand_snapshot: selectedFood.brand,
      quantity: qty,
      unit: selectedFood.serving_unit,
      preparation_state: selectedFood.preparation_state,
      calories_kcal: totalKcal,
      protein_g: calculatedP,
      carbohydrates_g: calculatedC,
      fat_g: calculatedF,
      fiber_g: calculatedFiber,
      notes: notes.trim() || undefined,
    };

    onSave(log);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialLog ? 'Editar Registro de Alimento' : 'Registrar Comida / Alimento'}
      subtitle="Guarda un registro exacto en gramos para mantener la fiabilidad del balance calórico."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="log-mealtype" className="block text-xs font-medium text-zinc-300 mb-1">
              Comida <span className="text-emerald-400">*</span>
            </label>
            <select
              id="log-mealtype"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealCategory)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="desayuno">Desayuno</option>
              <option value="almuerzo">Almuerzo</option>
              <option value="merienda">Merienda</option>
              <option value="cena">Cena</option>
              <option value="colacion">Colación / Snack</option>
            </select>
          </div>

          <div>
            <label htmlFor="log-date" className="block text-xs font-medium text-zinc-300 mb-1">
              Fecha <span className="text-emerald-400">*</span>
            </label>
            <input
              id="log-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label htmlFor="log-time" className="block text-xs font-medium text-zinc-300 mb-1">
              Hora
            </label>
            <input
              id="log-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Food Search & Picker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-zinc-300">
              Seleccionar Alimento de la Base de Datos <span className="text-emerald-400">*</span>
            </label>
            <button
              type="button"
              onClick={onOpenCreateCustomFood}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear nuevo alimento</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en la biblioteca (ej: pollo, arroz, avena...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick food list selector */}
          <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-zinc-800 p-1.5 bg-zinc-950/80">
            {filteredFoods.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                No se encontraron alimentos. Pulsa en "Crear nuevo alimento" para agregarlo.
              </div>
            ) : (
              filteredFoods.map((f) => {
                const isSelected = selectedFood?.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFoodId(f.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{f.name}</span>
                      {f.brand && <span className="text-zinc-500 ml-1.5 text-[11px]">({f.brand})</span>}
                      {f.preparation_state && f.preparation_state !== 'na' && (
                        <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                          {f.preparation_state === 'raw' ? 'crudo' : 'cocido'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400">
                      {f.calories_kcal} kcal / {f.serving_size}{f.serving_unit}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Quantity and Realtime Macro Preview */}
        {selectedFood && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label htmlFor="log-qty" className="block text-xs font-medium text-zinc-300 mb-1">
                  Cantidad consumida ({selectedFood.serving_unit}) <span className="text-emerald-400">*</span>
                </label>
                <input
                  id="log-qty"
                  type="number"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Total Calorías</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {totalKcal} <span className="text-xs text-zinc-400 font-normal">kcal</span>
                </span>
              </div>
            </div>

            {/* Calculated Macros Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-center text-xs">
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-emerald-400 font-semibold block">Proteína</span>
                <span className="text-sm font-bold font-mono text-white">{calculatedP} g</span>
                <span className="text-[10px] text-zinc-500 block font-mono">{(calculatedP * 4).toFixed(0)} kcal</span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-sky-400 font-semibold block">Carbohidratos</span>
                <span className="text-sm font-bold font-mono text-white">{calculatedC} g</span>
                <span className="text-[10px] text-zinc-500 block font-mono">{(calculatedC * 4).toFixed(0)} kcal</span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-amber-400 font-semibold block">Grasas</span>
                <span className="text-sm font-bold font-mono text-white">{calculatedF} g</span>
                <span className="text-[10px] text-zinc-500 block font-mono">{(calculatedF * 9).toFixed(0)} kcal</span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-semibold block">Fibra</span>
                <span className="text-sm font-bold font-mono text-white">{calculatedFiber} g</span>
                <span className="text-[10px] text-zinc-500 block font-mono">-</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="log-notes" className="block text-xs font-medium text-zinc-300 mb-1">
            Notas opcionales
          </label>
          <input
            id="log-notes"
            type="text"
            placeholder="Ej: pesado en crudo antes de cocinar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs focus:outline-none focus:border-emerald-500"
          />
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
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            {initialLog ? 'Guardar Cambios' : 'Añadir al Diario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
