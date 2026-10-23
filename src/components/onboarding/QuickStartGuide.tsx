/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ActivityLevel, SexForEquations } from '../../types';
import { calculateMifflinStJeor, calculateTDEE } from '../../utils/calculations';
import {
  Scale,
  Flame,
  Plus,
  Sparkles,
  CheckCircle2,
  Info,
  MousePointerClick,
  ArrowUpRight,
  Target,
  Sliders,
  HelpCircle,
} from 'lucide-react';

export interface QuickStartGuideProps {
  weightKg: number;
  targetWeightKg: number;
  heightCm: number;
  age: number;
  sex: SexForEquations;
  activityLevel: ActivityLevel;
  weeklyRatePercent: number;
  autoApplyInitialSetup: boolean;
  onToggleAutoApply: (enabled: boolean) => void;
  onQuickActionSelect?: (action: 'weigh_in' | 'calories') => void;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  weightKg,
  targetWeightKg,
  heightCm,
  age,
  sex,
  activityLevel,
  weeklyRatePercent,
  autoApplyInitialSetup,
  onToggleAutoApply,
  onQuickActionSelect,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<'both' | 'weigh_in' | 'calories'>('both');

  // Calculate live Mifflin-St Jeor BMR, TDEE, and recommended calorie target
  const bmr = calculateMifflinStJeor(weightKg, heightCm, age, sex);
  const tdee = calculateTDEE(weightKg, heightCm, age, sex, activityLevel);
  const isDeficit = targetWeightKg < weightKg;
  const weeklyDeltaKg = (weightKg * weeklyRatePercent) / 100;
  const dailyCalorieDelta = Math.round((weeklyDeltaKg * 7700) / 7);
  const recommendedCalories = Math.max(
    1350,
    isDeficit ? tdee - dailyCalorieDelta : tdee + Math.min(350, dailyCalorieDelta)
  );
  const recommendedProteinG = Math.round(weightKg * 2.1);
  const recommendedFatG = Math.round(weightKg * 0.85);
  const recommendedCarbsG = Math.max(
    60,
    Math.round((recommendedCalories - (recommendedProteinG * 4 + recommendedFatG * 9)) / 4)
  );

  const showWeighInTooltip = activeTooltip === 'both' || activeTooltip === 'weigh_in';
  const showCaloriesTooltip = activeTooltip === 'both' || activeTooltip === 'calories';

  return (
    <div
      className="rounded-2xl bg-zinc-950 border border-emerald-500/30 p-4 sm:p-5 space-y-4 shadow-xl shadow-emerald-950/20"
      data-testid="quick-start-guide"
    >
      {/* Header & Interactive Tooltip Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
            <MousePointerClick className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-tight">
                Guía de Inicio Rápido
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Tooltips Interactivos
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Explora cómo registrar tu primer pesaje y configurar tus objetivos calóricos al entrar al panel.
            </p>
          </div>
        </div>

        {/* Tooltip View Selector */}
        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTooltip('both')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
              activeTooltip === 'both'
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Ver Ambos (2)
          </button>
          <button
            type="button"
            onClick={() => setActiveTooltip('weigh_in')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              activeTooltip === 'weigh_in'
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>1. Pesaje</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTooltip('calories')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              activeTooltip === 'calories'
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>2. Calorías</span>
          </button>
        </div>
      </div>

      {/* Interactive Annotated UI Cards with Visual Tooltips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* CARD 1: FIRST WEIGH-IN WITH VISUAL TOOLTIP */}
        <div
          onClick={() => setActiveTooltip('weigh_in')}
          className={`relative rounded-xl p-3.5 border transition-all cursor-pointer ${
            showWeighInTooltip
              ? 'bg-zinc-900/90 border-emerald-500/60 ring-1 ring-emerald-500/30'
              : 'bg-zinc-900/40 border-zinc-800/70 opacity-65 hover:opacity-100'
          }`}
          data-testid="quickstart-card-weighin"
        >
          {/* Step Badge & Pulsing Hotspot */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Paso Clave 1 · Primer Pesaje
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Barra Superior / Peso</span>
          </div>

          {/* Simulated UI Target Element */}
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">
                  Peso Inicial en Ayunas
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Base: {weightKg.toFixed(1)} kg → Meta: {targetWeightKg.toFixed(1)} kg
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center gap-1 shadow-sm shadow-emerald-500/30">
              <Plus className="w-3 h-3 stroke-[2.5]" />
              Registrar
            </span>
          </div>

          {/* Visual Floating Tooltip Callout */}
          {showWeighInTooltip && (
            <div
              role="tooltip"
              data-testid="tooltip-weighin"
              className="relative mt-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 p-3 text-[11px] text-emerald-100 shadow-lg"
            >
              {/* Tooltip Arrow pointing up to the simulated button */}
              <div className=" -top-1.5 right-6 w-3 h-3 bg-emerald-950 border-t border-l border-emerald-500/40 rotate-45 absolute" />
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-white">
                    ¿Cómo registrar tu primer pesaje?
                  </p>
                  <p className="text-emerald-200/90 leading-relaxed">
                    Pulsa el botón <strong className="text-white">«+ Registro»</strong> en la esquina superior derecha (o entra a <strong className="text-white">Peso y Cintura</strong>) e introduce tu peso en ayunas (<strong className="text-emerald-300">{weightKg.toFixed(1)} kg</strong>).
                  </p>
                  <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-emerald-300/90 border-t border-emerald-500/20">
                    <span>Activa el cálculo de Media Móvil (EMA 7d)</span>
                    {onQuickActionSelect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickActionSelect('weigh_in');
                        }}
                        className="underline font-bold text-emerald-300 hover:text-white flex items-center gap-0.5"
                      >
                        <span>Probar al iniciar</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: CALORIE TARGET CONFIGURATION WITH VISUAL TOOLTIP */}
        <div
          onClick={() => setActiveTooltip('calories')}
          className={`relative rounded-xl p-3.5 border transition-all cursor-pointer ${
            showCaloriesTooltip
              ? 'bg-zinc-900/90 border-amber-500/60 ring-1 ring-amber-500/30'
              : 'bg-zinc-900/40 border-zinc-800/70 opacity-65 hover:opacity-100'
          }`}
          data-testid="quickstart-card-calories"
        >
          {/* Step Badge & Pulsing Hotspot */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Paso Clave 2 · Objetivo de Calorías
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">Módulo Nutrición</span>
          </div>

          {/* Simulated UI Target Element */}
          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">
                  Meta: {recommendedCalories} kcal / día
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  P: {recommendedProteinG}g · C: {recommendedCarbsG}g · G: {recommendedFatG}g
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950 font-bold text-[10px] flex items-center gap-1 shadow-sm shadow-amber-500/30">
              <Sliders className="w-3 h-3 stroke-[2.5]" />
              Ajustar
            </span>
          </div>

          {/* Visual Floating Tooltip Callout */}
          {showCaloriesTooltip && (
            <div
              role="tooltip"
              data-testid="tooltip-calories"
              className="relative mt-2 rounded-xl bg-amber-950/50 border border-amber-500/40 p-3 text-[11px] text-amber-100 shadow-lg"
            >
              {/* Tooltip Arrow pointing up to the simulated button */}
              <div className="-top-1.5 right-6 w-3 h-3 bg-amber-950 border-t border-l border-amber-500/40 rotate-45 absolute" />
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-bold text-white">
                    ¿Cómo configurar tus objetivos de calorías?
                  </p>
                  <p className="text-amber-200/90 leading-relaxed">
                    En la pestaña <strong className="text-white">«Nutrición»</strong>, pulsa <strong className="text-white">«Editar Objetivo»</strong>. Según tu TDEE estimado (<strong className="text-amber-300">{tdee} kcal</strong>), te sugerimos <strong className="text-amber-300">{recommendedCalories} kcal</strong> ({isDeficit ? `-${dailyCalorieDelta}` : `+${Math.min(350, dailyCalorieDelta)}`} kcal/día).
                  </p>
                  <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-amber-300/90 border-t border-amber-500/20">
                    <span>Fórmula Mifflin-St Jeor (BMR: {bmr} kcal)</span>
                    {onQuickActionSelect && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickActionSelect('calories');
                        }}
                        className="underline font-bold text-amber-300 hover:text-white flex items-center gap-0.5"
                      >
                        <span>Ir a Nutrición</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Configure Toggle Footer */}
      <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="flex items-start sm:items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={autoApplyInitialSetup}
            onChange={(e) => onToggleAutoApply(e.target.checked)}
            className="mt-0.5 sm:mt-0 accent-emerald-500 rounded"
          />
          <span className="text-[11px] text-zinc-200">
            <strong className="text-emerald-400">Inicio Rápido Automático:</strong> Registrar mi primer pesaje (<strong className="text-white">{weightKg.toFixed(1)} kg</strong>) y aplicar mi meta de <strong className="text-white">{recommendedCalories} kcal</strong> al finalizar este asistente.
          </span>
        </label>
        <span className="text-[10px] text-zinc-400 font-mono shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          Recomendado
        </span>
      </div>
    </div>
  );
};
