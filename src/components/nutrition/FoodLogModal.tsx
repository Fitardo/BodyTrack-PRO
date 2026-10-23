/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Food, FoodLog, MealCategory, FrequentMeal } from '../../types';
import {
  Search,
  Plus,
  AlertTriangle,
  Barcode,
  Camera,
  Star,
  ShieldCheck,
  Users,
  Zap,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  calculateFlexibleFoodMacros,
  BARCODE_PRODUCTS_DB,
  findFoodByBarcode,
  FlexibleFoodUnit,
} from '../../utils/auditAndRetentionUtils';
import { StorageService } from '../../services/storage';

interface FoodLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: FoodLog) => void;
  onOpenCreateCustomFood: () => void;
  foods: Food[];
  initialLog?: FoodLog | null;
  defaultDate?: string;
  defaultMealType?: MealCategory;
  onFoodsChange?: () => void;
}

type SearchFilterType = 'all' | 'branded' | 'generic' | 'favorites' | 'frequent_meals';

export const FoodLogModal: React.FC<FoodLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenCreateCustomFood,
  foods,
  initialLog,
  defaultDate,
  defaultMealType = 'almuerzo',
  onFoodsChange,
}) => {
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('13:00');
  const [mealType, setMealType] = useState<MealCategory>(defaultMealType);
  const [selectedFoodId, setSelectedFoodId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterType>('all');
  const [quantity, setQuantity] = useState<string>('100');
  const [selectedUnit, setSelectedUnit] = useState<FlexibleFoodUnit>('g');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [frequentMeals, setFrequentMeals] = useState<FrequentMeal[]>([]);

  // Barcode Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [scannerStatus, setScannerStatus] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setFavoriteIds(StorageService.getFavoriteFoodIds());
    setFrequentMeals(StorageService.getFrequentMeals());
    if (initialLog) {
      setDate(initialLog.consumed_at);
      setTime(initialLog.consumed_time || '13:00');
      setMealType(initialLog.meal_type);
      setSelectedFoodId(initialLog.food_id || '');
      setQuantity(String(initialLog.quantity));
      const u = initialLog.unit === 'ml' ? 'ml' : initialLog.unit === 'porción' || initialLog.unit === 'unidad' ? 'porción' : 'g';
      setSelectedUnit(u);
      setNotes(initialLog.notes || '');
    } else {
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime(new Date().toTimeString().slice(0, 5));
      setMealType(defaultMealType);
      setSelectedFoodId(foods[0]?.id || '');
      setQuantity('100');
      setSelectedUnit('g');
      setNotes('');
    }
    setSearchQuery('');
    setActiveFilter('all');
    setError('');
    stopCameraStream();
    setIsScannerOpen(false);
  }, [initialLog, defaultDate, defaultMealType, foods, isOpen]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startCameraScanner = async () => {
    setIsScannerOpen(true);
    setScannerStatus('Iniciando cámara para escanear EAN-13 / UPC...');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScannerStatus('Cámara activa. Apunta al código de barras o selecciona un código verificado abajo.');
      } else {
        setScannerStatus('Cámara no disponible en este navegador. Usa el lector rápido de códigos EAN-13 abajo.');
      }
    } catch {
      setScannerStatus('Permiso de cámara no concedido o entorno sin cámara. Usa el lector EAN-13 directo abajo.');
    }
  };

  const handleBarcodeLookup = (codeToSearch: string) => {
    const found = findFoodByBarcode(codeToSearch, foods);
    if (found) {
      setSelectedFoodId(found.id);
      if (found.serving_unit === 'ml') {
        setSelectedUnit('ml');
        setQuantity(String(found.serving_size));
      } else if (found.serving_unit === 'unidad' || found.serving_unit === 'porción') {
        setSelectedUnit('porción');
        setQuantity('1');
      } else {
        setSelectedUnit('g');
        setQuantity(String(found.serving_size));
      }
      setScannerStatus(`¡Producto detectado!: ${found.name} (${found.brand || 'Verificado'})`);
      stopCameraStream();
      setTimeout(() => setIsScannerOpen(false), 600);
    } else {
      setScannerStatus(`Código ${codeToSearch} no encontrado. Puedes crearlo con "Crear nuevo alimento".`);
    }
  };

  const handleUnitChange = (newUnit: FlexibleFoodUnit) => {
    setSelectedUnit(newUnit);
    if (newUnit === 'porción') {
      setQuantity('1');
    } else if (newUnit === 'ml') {
      setQuantity('200');
    } else {
      setQuantity('100');
    }
  };

  const handleToggleFavorite = (foodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageService.toggleFavoriteFood(foodId);
    setFavoriteIds(updated);
    if (onFoodsChange) onFoodsChange();
  };

  const handleLogFrequentMeal = (meal: FrequentMeal) => {
    meal.items.forEach((item, idx) => {
      const foodObj = foods.find((f) => f.id === item.food_id);
      const macros = foodObj
        ? calculateFlexibleFoodMacros(foodObj, item.quantity, item.unit)
        : {
            calories_kcal: item.calories_kcal,
            protein_g: item.protein_g,
            carbohydrates_g: item.carbohydrates_g,
            fat_g: item.fat_g,
            fiber_g: 2,
          };

      const log: FoodLog = {
        id: `fl-freq-${Date.now()}-${idx}`,
        consumed_at: date,
        consumed_time: time,
        meal_type: meal.meal_type || mealType,
        food_id: item.food_id,
        food_name_snapshot: item.food_name,
        quantity: item.quantity,
        unit: item.unit,
        calories_kcal: macros.calories_kcal,
        protein_g: macros.protein_g,
        carbohydrates_g: macros.carbohydrates_g,
        fat_g: macros.fat_g,
        fiber_g: macros.fiber_g,
        notes: `Comida frecuente: ${meal.name}`,
      };
      onSave(log);
    });
    onClose();
  };

  const selectedFood = foods.find((f) => f.id === selectedFoodId) || foods[0];
  const qty = parseFloat(quantity) || 0;

  const flexMacros = selectedFood
    ? calculateFlexibleFoodMacros(selectedFood, qty, selectedUnit)
    : { calories_kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: 0, normalizedGrams: 0 };

  const filteredFoods = foods.filter((f) => {
    const matchesQuery =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.brand && f.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.barcode && f.barcode.includes(searchQuery));

    if (!matchesQuery) return false;
    if (activeFilter === 'branded') return Boolean(f.brand && f.brand !== 'Genérico');
    if (activeFilter === 'generic') return !f.brand || f.brand === 'Genérico';
    if (activeFilter === 'favorites') return favoriteIds.includes(f.id) || Boolean(f.is_favorite);
    return true;
  });

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
      unit: selectedUnit,
      preparation_state: selectedFood.preparation_state,
      calories_kcal: flexMacros.calories_kcal,
      protein_g: flexMacros.protein_g,
      carbohydrates_g: flexMacros.carbohydrates_g,
      fat_g: flexMacros.fat_g,
      fiber_g: flexMacros.fiber_g,
      notes: notes.trim() || undefined,
    };

    onSave(log);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCameraStream();
        onClose();
      }}
      title={initialLog ? 'Editar Registro de Alimento' : 'Registrar Comida / Escáner Ágil'}
      subtitle="Escanea códigos de barras, filtra por marcas/favoritos o cambia entre gramos (g), mililitros (ml) y porciones."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Meal Type, Date & Time */}
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

        {/* Barcode Scanner Bar */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                Escáner de Código de Barras (EAN-13 / Cámara)
              </span>
            </div>
            <button
              type="button"
              data-testid="toggle-barcode-scanner-btn"
              onClick={() => {
                if (isScannerOpen) {
                  stopCameraStream();
                  setIsScannerOpen(false);
                } else {
                  startCameraScanner();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isScannerOpen ? 'Cerrar Escáner' : 'Escanear Producto'}</span>
            </button>
          </div>

          {isScannerOpen && (
            <div className="p-3 rounded-xl bg-zinc-900 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-emerald-300">
                <span>{scannerStatus}</span>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsScannerOpen(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <video
                ref={videoRef}
                className="w-full h-28 object-cover rounded-lg bg-zinc-950 border border-zinc-800"
                muted
                playsInline
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="barcode-manual-input"
                  placeholder="Introduce código EAN-13 (ej: 7791337601125)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono"
                />
                <button
                  type="button"
                  data-testid="barcode-lookup-btn"
                  onClick={() => handleBarcodeLookup(barcodeInput)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  Impactar Macros
                </button>
              </div>

              {/* Quick Verified Barcode Buttons for Testing & Fast Demo */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                  Productos con código de barras verificado (1 clic para escanear):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {BARCODE_PRODUCTS_DB.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      data-testid={`scan-sample-${prod.barcode}`}
                      onClick={() => handleBarcodeLookup(prod.barcode || '')}
                      className="px-2 py-1 rounded-md bg-zinc-950 hover:bg-emerald-500/20 border border-zinc-800 hover:border-emerald-500/40 text-[11px] text-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Barcode className="w-3 h-3 text-emerald-400" />
                      <span>{prod.name}</span>
                      <span className="text-[10px] font-mono text-zinc-400">({prod.barcode})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter Tabs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'Todos' },
                  { id: 'branded', label: 'Marcas' },
                  { id: 'generic', label: 'Genéricos' },
                  { id: 'favorites', label: '★ Favoritos' },
                  { id: 'frequent_meals', label: '⚡ Comidas Frecuentes' },
                ] as Array<{ id: SearchFilterType; label: string }>
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`food-filter-${tab.id}`}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onOpenCreateCustomFood}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear alimento</span>
            </button>
          </div>

          {activeFilter === 'frequent_meals' ? (
            <div className="space-y-2 max-h-48 overflow-y-auto p-2 rounded-xl bg-zinc-950 border border-zinc-800">
              <p className="text-[11px] text-zinc-400">
                Registra un combo completo de alimentos habituales (ej. desayuno completo o post-entreno) en un solo clic:
              </p>
              {frequentMeals.map((meal) => {
                const totalKcal = meal.items.reduce((acc, i) => acc + i.calories_kcal, 0);
                const totalProt = meal.items.reduce((acc, i) => acc + i.protein_g, 0);
                return (
                  <div
                    key={meal.id}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-white">{meal.name}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {meal.meal_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {meal.items.map((i) => `${i.food_name} (${i.quantity}${i.unit})`).join(' + ')}
                      </p>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {totalKcal} kcal • {totalProt.toFixed(1)}g Proteína
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid={`log-frequent-meal-${meal.id}`}
                      onClick={() => handleLogFrequentMeal(meal)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Registrar Combo
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, marca o código EAN-13..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick food list selector */}
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-zinc-800 p-1.5 bg-zinc-950/80">
                {filteredFoods.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-500">
                    No se encontraron alimentos en este filtro.
                  </div>
                ) : (
                  filteredFoods.map((f) => {
                    const isSelected = selectedFood?.id === f.id;
                    const isFav = favoriteIds.includes(f.id) || Boolean(f.is_favorite);
                    const isVerified = f.data_source_badge === 'verified' || f.source === 'verified';

                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedFoodId(f.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium'
                            : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(f.id, e)}
                            title="Marcar/desmarcar favorito"
                            className={`cursor-pointer ${
                              isFav ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          </button>

                          <div className="truncate">
                            <span className="font-semibold">{f.name}</span>
                            {f.brand && (
                              <span className="text-zinc-400 ml-1.5 text-[11px]">({f.brand})</span>
                            )}
                            {/* Database Verification Badge */}
                            <span
                              className={`ml-1.5 inline-flex items-center gap-0.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                isVerified
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isVerified ? (
                                <>
                                  <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                                </>
                              ) : (
                                <>
                                  <Users className="w-2.5 h-2.5" /> Comunidad
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-[11px] text-zinc-400 shrink-0 ml-2">
                          {f.calories_kcal} kcal / {f.serving_size}
                          {f.serving_unit}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Quantity, Flexible Unit Switcher (g / ml / porción) and Realtime Macro Preview */}
        {selectedFood && activeFilter !== 'frequent_meals' && (
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label htmlFor="log-qty" className="block text-xs font-medium text-zinc-300 mb-1">
                  Cantidad ({selectedUnit}) <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="log-qty"
                    data-testid="food-log-quantity-input"
                    type="number"
                    inputMode="decimal"
                    step={selectedUnit === 'porción' ? '0.5' : '5'}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-28 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-base font-bold focus:outline-none focus:border-emerald-500"
                    required
                  />

                  {/* Unit Flexibility Switcher */}
                  <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-700">
                    {(['g', 'ml', 'porción'] as FlexibleFoodUnit[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        data-testid={`unit-switch-${u}`}
                        onClick={() => handleUnitChange(u)}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                          selectedUnit === u
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {u === 'g' ? 'g (Gramos)' : u === 'ml' ? 'ml' : 'Porción'}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                  Equivalencia calculada: ~{flexMacros.normalizedGrams}g netos
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Total Calorías</span>
                <span
                  data-testid="food-log-calculated-kcal"
                  className="text-2xl font-bold font-mono text-emerald-400"
                >
                  {flexMacros.calories_kcal}{' '}
                  <span className="text-xs text-zinc-400 font-normal">kcal</span>
                </span>
              </div>
            </div>

            {/* Calculated Macros Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-center text-xs">
              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-emerald-400 font-semibold block">Proteína</span>
                <span className="text-sm font-bold font-mono text-white">
                  {flexMacros.protein_g} g
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">
                  {(flexMacros.protein_g * 4).toFixed(0)} kcal
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-sky-400 font-semibold block">Carbohidratos</span>
                <span className="text-sm font-bold font-mono text-white">
                  {flexMacros.carbohydrates_g} g
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">
                  {(flexMacros.carbohydrates_g * 4).toFixed(0)} kcal
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-amber-400 font-semibold block">Grasas</span>
                <span className="text-sm font-bold font-mono text-white">
                  {flexMacros.fat_g} g
                </span>
                <span className="text-[10px] text-zinc-500 block font-mono">
                  {(flexMacros.fat_g * 9).toFixed(0)} kcal
                </span>
              </div>

              <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-semibold block">Fibra</span>
                <span className="text-sm font-bold font-mono text-white">
                  {flexMacros.fiber_g} g
                </span>
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
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            data-testid="save-food-log-btn"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            {initialLog ? 'Guardar Cambios' : 'Añadir al Diario'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
