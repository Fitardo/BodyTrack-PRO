/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserProfile,
  PhysicalGoal,
  ActivityLevel,
  SexForEquations,
  UnitSystem,
  GoalType,
} from '../../types';
import { calculateMifflinStJeor, calculateTDEE } from '../../utils/calculations';
import {
  ONBOARDING_UNIT_OPTIONS,
  ONBOARDING_GOAL_OPTIONS,
  validateOnboardingCompletion,
  getUnitLabel,
  getGoalLabel,
} from '../../utils/onboardingValidation';
import { QuickStartGuide } from './QuickStartGuide';
import {
  Sparkles,
  Dumbbell,
  Scale,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  HelpCircle,
  Info,
  MousePointerClick,
  AlertCircle,
  Ruler,
  Target,
  UserCheck,
} from 'lucide-react';

export interface OnboardingQuickStartResult {
  autoApplyInitialSetup: boolean;
  initialWeightKg: number;
  recommendedCalories: number;
  recommendedProteinG: number;
  recommendedCarbsG: number;
  recommendedFatG: number;
  selectedUnit: UnitSystem;
  selectedGoal: GoalType;
  launchAction?: 'weigh_in' | 'calories';
}

interface OnboardingWizardProps {
  isOpen: boolean;
  userEmail?: string;
  initialProfile: UserProfile;
  initialGoal: PhysicalGoal;
  onComplete: (
    updatedProfile: UserProfile,
    updatedGoal: PhysicalGoal,
    enabledModules: Record<string, boolean>,
    quickStartResult?: OnboardingQuickStartResult
  ) => void;
  onClose?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  initialProfile,
  initialGoal,
  onComplete,
  onClose,
}) => {
  const [step, setStep] = useState<number>(1);
  const [showQuickStartDrawer, setShowQuickStartDrawer] = useState<boolean>(false);
  const [autoApplyInitialSetup, setAutoApplyInitialSetup] = useState<boolean>(true);
  const [activeFieldTooltip, setActiveFieldTooltip] = useState<'weigh_in' | 'calories' | null>('weigh_in');

  // User profile & personalized name state (defaults to Santiago Quinteros)
  const [name, setName] = useState<string>(initialProfile.name || 'Santiago Quinteros');
  const [age, setAge] = useState<number>(initialProfile.age || 24);
  const [sex, setSex] = useState<SexForEquations>(initialProfile.sex_for_equations || 'male');
  const [heightCm, setHeightCm] = useState<number>(initialProfile.height_cm || 175);
  const [weightKg, setWeightKg] = useState<number>(initialProfile.initial_weight_kg || 85.0);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile.activity_level || 'moderate'
  );

  // Required validated selections: Unit of Measurement & Primary Goal
  // Starts empty ('') so the wizard explicitly validates that the user selects both before finishing
  const [selectedUnit, setSelectedUnit] = useState<UnitSystem | ''>(
    initialProfile.unit_system || ''
  );
  const [selectedGoal, setSelectedGoal] = useState<GoalType | ''>(
    initialGoal.primary_goal || ''
  );
  const [validationAttempted, setValidationAttempted] = useState<boolean>(false);

  // Goals numeric parameters
  const [goalRate, setGoalRate] = useState<number>(initialGoal.weekly_rate_percent || 0.5);
  const [targetWeight, setTargetWeight] = useState<number>(initialGoal.target_weight_kg || 78);

  // Granular metrics opt-in
  const [trackWeighIn, setTrackWeighIn] = useState<boolean>(true);
  const [trackNutrition, setTrackNutrition] = useState<boolean>(true);
  const [trackWorkouts, setTrackWorkouts] = useState<boolean>(true);
  const [trackMeasurements, setTrackMeasurements] = useState<boolean>(true);
  const [trackPhotos, setTrackPhotos] = useState<boolean>(false); // strictly opt-in
  const [trackActivity, setTrackActivity] = useState<boolean>(true);

  // Terms agreement
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState<boolean>(false);

  if (!isOpen) return null;

  // Run pure validation logic
  const validation = validateOnboardingCompletion({
    userName: name,
    unitOfMeasure: selectedUnit,
    primaryGoal: selectedGoal,
    acceptedTerms,
    acceptedPrivacy,
  });

  // Live metabolic calculations for tooltips & quick start
  const bmr = calculateMifflinStJeor(weightKg, heightCm, age, sex);
  const tdee = calculateTDEE(weightKg, heightCm, age, sex, activityLevel);
  const isDeficit = selectedGoal === 'muscle_gain' ? false : targetWeight <= weightKg;
  const weeklyDeltaKg = (weightKg * goalRate) / 100;
  const dailyCalorieDelta = Math.round((weeklyDeltaKg * 7700) / 7);
  const recommendedCalories =
    selectedGoal === 'maintenance'
      ? tdee
      : Math.max(
          1350,
          isDeficit ? tdee - dailyCalorieDelta : tdee + Math.min(350, dailyCalorieDelta)
        );
  const recommendedProteinG = Math.round(weightKg * 2.1);
  const recommendedFatG = Math.round(weightKg * 0.85);
  const recommendedCarbsG = Math.max(
    60,
    Math.round((recommendedCalories - (recommendedProteinG * 4 + recommendedFatG * 9)) / 4)
  );

  const handleSelectGoal = (goalId: GoalType, recommendedRate: number) => {
    setSelectedGoal(goalId);
    setGoalRate(recommendedRate);
  };

  const handleNextStep = () => {
    if (step === 2 && !validation.isUnitSelected) {
      setValidationAttempted(true);
      return;
    }
    if (step === 3 && !validation.isGoalSelected) {
      setValidationAttempted(true);
      return;
    }
    setValidationAttempted(false);
    setStep((prev) => Math.min(5, prev + 1));
  };

  const handleFinish = (launchAction?: 'weigh_in' | 'calories') => {
    setValidationAttempted(true);

    if (!validation.canFinish || !selectedUnit || !selectedGoal) {
      return;
    }

    const updatedProfile: UserProfile = {
      ...initialProfile,
      name: validation.formattedDisplayName,
      age: Number(age),
      sex_for_equations: sex,
      height_cm: Number(heightCm),
      initial_weight_kg: Number(weightKg),
      activity_level: activityLevel,
      unit_system: selectedUnit,
      updated_at: new Date().toISOString(),
    };

    const updatedGoal: PhysicalGoal = {
      ...initialGoal,
      primary_goal: selectedGoal,
      target_weight_kg: Number(targetWeight),
      weekly_rate_percent: Number(goalRate),
    };

    const enabledModules = {
      weigh_in: trackWeighIn,
      nutrition: trackNutrition,
      workout: trackWorkouts,
      measurements: trackMeasurements,
      photos: trackPhotos,
      activity: trackActivity,
    };

    onComplete(updatedProfile, updatedGoal, enabledModules, {
      autoApplyInitialSetup,
      initialWeightKg: Number(weightKg),
      recommendedCalories,
      recommendedProteinG,
      recommendedCarbsG,
      recommendedFatG,
      selectedUnit,
      selectedGoal,
      launchAction,
    });
  };

  const renderUnitSelector = () => (
    <div className="space-y-2" data-testid="unit-selector-group">
      <div className="flex items-center justify-between">
        <label className="font-bold text-white flex items-center gap-1.5 text-xs">
          <Ruler className="w-3.5 h-3.5 text-emerald-400" />
          <span>1. Selecciona tu Unidad de Medida (Obligatorio)</span>
        </label>
        <span
          className={`text-[11px] font-semibold ${
            validation.isUnitSelected ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {validation.isUnitSelected ? 'Unidad seleccionada' : 'Requerido para finalizar'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ONBOARDING_UNIT_OPTIONS.map((option) => {
          const isActive = selectedUnit === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedUnit(option.id)}
              data-testid={`select-unit-${option.id}`}
              aria-pressed={isActive}
              className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-xs block text-white">{option.label}</span>
                <span className="text-[11px] text-zinc-400 block leading-snug">
                  {option.description}
                </span>
              </div>
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-700'
                }`}
              />
            </button>
          );
        })}
      </div>
      {validationAttempted && !validation.isUnitSelected && (
        <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validation.errors.unitOfMeasure}</span>
        </p>
      )}
    </div>
  );

  const renderPrimaryGoalSelector = () => (
    <div className="space-y-2" data-testid="goal-selector-group">
      <div className="flex items-center justify-between">
        <label className="font-bold text-white flex items-center gap-1.5 text-xs">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span>2. Selecciona tu Objetivo Principal (Obligatorio)</span>
        </label>
        <span
          className={`text-[11px] font-semibold ${
            validation.isGoalSelected ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {validation.isGoalSelected ? 'Objetivo seleccionado' : 'Requerido para finalizar'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ONBOARDING_GOAL_OPTIONS.map((option) => {
          const isActive = selectedGoal === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectGoal(option.id, option.recommendedRatePercent)}
              data-testid={`select-goal-${option.id}`}
              aria-pressed={isActive}
              className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-0.5">
                <span className="font-bold text-xs block text-white">{option.label}</span>
                <span className="text-[11px] text-zinc-400 block leading-snug">
                  {option.description}
                </span>
              </div>
              <CheckCircle2
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-700'
                }`}
              />
            </button>
          );
        })}
      </div>
      {validationAttempted && !validation.isGoalSelected && (
        <p className="text-[11px] text-rose-400 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{validation.errors.primaryGoal}</span>
        </p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Step Progress Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              Paso {step} de 5
            </span>
            <span
              className="text-xs text-zinc-200 font-semibold"
              data-testid="onboarding-header-greeting"
            >
              {validation.welcomeMessage}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowQuickStartDrawer((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 ${
                showQuickStartDrawer
                  ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm shadow-emerald-500/20'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>Guía de Inicio Rápido</span>
            </button>

            {/* Interactive Step Navigation Buttons */}
            <div className="flex gap-1" role="tablist" aria-label="Pasos de configuración">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  aria-label={`Ir al paso ${s}`}
                  className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center ${
                    s === step
                      ? 'bg-emerald-500 text-zinc-950'
                      : s < step
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] font-semibold"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-zinc-300">
          {/* Personalized Welcome Banner Always Visible at Top of Wizard */}
          <div
            className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            data-testid="onboarding-welcome-banner"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2
                  id="onboarding-welcome-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight"
                >
                  {validation.welcomeMessage}
                </h2>
                <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                  {validation.welcomeSubtitle}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex flex-col gap-1 text-[11px] text-zinc-400 font-mono bg-zinc-950/80 px-3 py-2 rounded-xl border border-zinc-800">
              <span>
                Unidad: <strong className="text-emerald-400">{getUnitLabel(selectedUnit)}</strong>
              </span>
              <span>
                Objetivo: <strong className="text-emerald-400">{getGoalLabel(selectedGoal)}</strong>
              </span>
            </div>
          </div>

          {/* Expandable Quick Start Guide Drawer when toggled on steps 2-4 */}
          {showQuickStartDrawer && step !== 1 && step !== 5 && (
            <QuickStartGuide
              weightKg={weightKg}
              targetWeightKg={targetWeight}
              heightCm={heightCm}
              age={age}
              sex={sex}
              activityLevel={activityLevel}
              weeklyRatePercent={goalRate}
              autoApplyInitialSetup={autoApplyInitialSetup}
              onToggleAutoApply={setAutoApplyInitialSetup}
            />
          )}

          {/* STEP 1: WELCOME, NAME PERSONALIZATION, CORE SELECTIONS & QUICK START GUIDE */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Editable Name Input right on Welcome Screen */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <label
                  htmlFor="onboarding-user-name-input"
                  className="block font-bold text-white text-xs"
                >
                  Tu Nombre o Alias para darte la bienvenida
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="onboarding-user-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Santiago Quinteros"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Saludo activo: {validation.welcomeMessage}</span>
                  </span>
                </div>
              </div>

              {/* Direct Required Selections: Unit of Measurement & Primary Goal */}
              <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 space-y-4">
                {renderUnitSelector()}
                <div className="border-t border-zinc-800/80 pt-3">{renderPrimaryGoalSelector()}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Medias Semanales de Peso</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Filtra las fluctuaciones de agua y glucógeno para revelar la tendencia real.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                    <span>Entrenamientos PPL & RIR</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Registro de series efectivas, cálculo de 1RM con Epley y reglas de progresión doble.
                  </p>
                </div>
              </div>

              {/* Integrated Quick Start Guide Component with Visual Tooltips */}
              <QuickStartGuide
                weightKg={weightKg}
                targetWeightKg={targetWeight}
                heightCm={heightCm}
                age={age}
                sex={sex}
                activityLevel={activityLevel}
                weeklyRatePercent={goalRate}
                autoApplyInitialSetup={autoApplyInitialSetup}
                onToggleAutoApply={setAutoApplyInitialSetup}
              />
            </div>
          )}

          {/* STEP 2: PROFILE CONFIG & UNIT OF MEASUREMENT WITH CONTEXTUAL WEIGH-IN TOOLTIP */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Configura tu Perfil Fisiológico y Unidades de Medida
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Estos datos alimentan las ecuaciones de Mifflin-St Jeor y la estimación de masa magra de la U.S. Navy.
                </p>
              </div>

              {/* Unit of Measurement Selector */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                {renderUnitSelector()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Nombre o Alias</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Santiago Quinteros"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Sexo biológico (para fórmulas)
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as SexForEquations)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="male">Masculino (+5 kcal fórmula MSJ)</option>
                    <option value="female">Femenino (-161 kcal fórmula MSJ)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Edad (años)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Math.max(14, parseInt(e.target.value) || 20))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Estatura ({selectedUnit === 'imperial' ? 'cm · eq. in' : 'cm'})
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Math.max(120, parseInt(e.target.value) || 170))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <span>
                        Peso actual de partida ({selectedUnit === 'imperial' ? 'kg · eq. lb' : 'kg'})
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveFieldTooltip(activeFieldTooltip === 'weigh_in' ? null : 'weigh_in')
                      }
                      className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-500/20"
                    >
                      <HelpCircle className="w-3 h-3" />
                      <span>Tooltip Primer Pesaje</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(parseFloat(e.target.value) || 75)}
                    className="w-full bg-zinc-950 border border-emerald-500/50 rounded-xl p-2.5 text-white font-bold focus:outline-hidden focus:border-emerald-400"
                  />

                  {/* Contextual Visual Tooltip for First Weigh-in */}
                  {activeFieldTooltip === 'weigh_in' && (
                    <div
                      role="tooltip"
                      className="mt-2 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-[11px] text-emerald-100 relative shadow-lg"
                    >
                      <div className="-top-1.5 left-8 w-3 h-3 bg-emerald-950 border-t border-l border-emerald-500/40 rotate-45 absolute" />
                      <div className="flex items-start gap-2">
                        <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white block">
                            Guía Rápida: Tu Primer Pesaje ({weightKg.toFixed(1)} kg)
                          </span>
                          <p className="text-emerald-200/90 mt-0.5">
                            Este valor servirá como tu punto cero. Una vez en la app, usa el botón{' '}
                            <strong className="text-white">«+ Registro → Registrar Peso»</strong> cada
                            mañana en ayunas para alimentar la curva de tendencia EMA de 7 días.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Nivel de Actividad Diaria
                  </label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="sedentary">Sedentario (Oficina / poco movimiento, x1.2)</option>
                    <option value="light">Ligero (1-3 días entreno ligero, x1.375)</option>
                    <option value="moderate">Moderado (3-5 días pesas o deporte, x1.55)</option>
                    <option value="heavy">Intenso (6-7 días entrenamiento intenso, x1.725)</option>
                    <option value="athlete">Atleta / Doble sesión o trabajo físico, x1.9</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRIMARY GOAL & CALORIE TARGET WITH CONTEXTUAL CALORIE TOOLTIP */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Define tu Objetivo Principal y Meta de Calorías
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Elige tu objetivo principal para ajustar automáticamente el déficit o superávit calórico recomendado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActiveFieldTooltip(activeFieldTooltip === 'calories' ? null : 'calories')
                  }
                  className="shrink-0 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-amber-500/20"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Tooltip Calorías</span>
                </button>
              </div>

              {/* Primary Goal Selector */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                {renderPrimaryGoalSelector()}
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">
                    Peso Objetivo Deseado (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 75)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white font-bold text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-zinc-300">
                      Ritmo semanal recomendado: {goalRate}% del peso corporal
                    </label>
                    <span className="text-[11px] text-emerald-400 font-bold tabular-nums">
                      ~{((weightKg * goalRate) / 100).toFixed(2)} kg/semana
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={goalRate}
                    onChange={(e) => setGoalRate(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>0.2% (Conservador)</span>
                    <span className="text-emerald-400 font-bold">0.5% (Óptimo recomposición)</span>
                    <span>1.0% (Agresivo)</span>
                  </div>
                </div>

                {/* Contextual Visual Tooltip for Calorie Target Configuration */}
                <div
                  role="tooltip"
                  className="relative p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-100 shadow-lg space-y-2"
                >
                  <div className="-top-1.5 left-10 w-3 h-3 bg-amber-950 border-t border-l border-amber-500/40 rotate-45 absolute" />
                  <div className="flex items-start gap-2.5">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-white block">
                        Guía Rápida: Configuración de tu Objetivo de Calorías ({recommendedCalories} kcal)
                      </span>
                      <p className="text-amber-200/90 leading-relaxed">
                        Tu gasto energético total (TDEE) estimado es de{' '}
                        <strong className="text-white">{tdee} kcal</strong> (BMR: {bmr} kcal). Para
                        avanzar hacia <strong className="text-white">{getGoalLabel(selectedGoal)}</strong>,
                        configura tu objetivo en{' '}
                        <strong className="text-amber-300">{recommendedCalories} kcal/día</strong> desde{' '}
                        <strong className="text-white">Nutrición → Editar Objetivo</strong>.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-amber-300">
                        <span>Proteína: {recommendedProteinG}g</span>
                        <span aria-hidden="true">·</span>
                        <span>Carbos: {recommendedCarbsG}g</span>
                        <span aria-hidden="true">·</span>
                        <span>Grasas: {recommendedFatG}g</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: GRANULAR TRACKING METRICS */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Selecciona qué datos deseas registrar
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Elige con total libertad. No estás obligado a registrar información que no desees. Puedes cambiar esto en cualquier momento desde Ajustes.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackWeighIn}
                    onChange={(e) => setTrackWeighIn(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-white block">Pesajes Diarios en Ayunas</span>
                    <span className="text-[11px] text-zinc-400">
                      Recomendado para calcular la media móvil semanal de 7 días y filtrar fluctuaciones hídricas.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackWorkouts}
                    onChange={(e) => setTrackWorkouts(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-white block">Entrenamientos PPL y Sobrecarga</span>
                    <span className="text-[11px] text-zinc-400">
                      Registro de ejercicios, series, repeticiones, cargas y RIR/RPE.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackNutrition}
                    onChange={(e) => setTrackNutrition(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-white block">Comidas, Calorías y Macronutrientes</span>
                    <span className="text-[11px] text-zinc-400">
                      Registro de alimentos consumidos con desglose de Proteínas, Carbohidratos y Grasas.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackMeasurements}
                    onChange={(e) => setTrackMeasurements(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-white block">Medidas Corporales (Cintura, Cuello, etc.)</span>
                    <span className="text-[11px] text-zinc-400">
                      Perímetro abdominal para calcular el porcentaje de grasa corporal según fórmula U.S. Navy.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={trackPhotos}
                    onChange={(e) => setTrackPhotos(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>Fotografías de Progreso (Opcional)</span>
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      100% privado en tu dispositivo. Jamás se hacen públicas ni se indexan en servidores.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: VALIDATION CHECKLIST + QUICK START GUIDE + PRIVACY, GOVERNANCE & TERMS */}
          {step === 5 && (
            <div className="space-y-4">
              {/* Mandatory Validation Summary & Interactive Selectors before Finishing */}
              <div
                className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3.5"
                data-testid="onboarding-final-validation-box"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Verificación de Requisitos para {validation.formattedDisplayName}
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Asegúrate de haber seleccionado al menos una unidad de medida y un objetivo principal antes de finalizar.
                    </p>
                  </div>
                  {(selectedUnit || selectedGoal) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUnit('');
                        setSelectedGoal('');
                        setValidationAttempted(true);
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                    >
                      Restablecer selección
                    </button>
                  )}
                </div>

                {renderUnitSelector()}
                <div className="border-t border-zinc-800/80 pt-3">{renderPrimaryGoalSelector()}</div>
              </div>

              {/* Interactive Quick Start Guide with Visual Tooltips */}
              <QuickStartGuide
                weightKg={weightKg}
                targetWeightKg={targetWeight}
                heightCm={heightCm}
                age={age}
                sex={sex}
                activityLevel={activityLevel}
                weeklyRatePercent={goalRate}
                autoApplyInitialSetup={autoApplyInitialSetup}
                onToggleAutoApply={setAutoApplyInitialSetup}
                onQuickActionSelect={(action) => {
                  handleFinish(action);
                }}
              />

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2 text-white font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Transparencia de Datos y Consentimiento Informado</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Aislamiento por Usuario:</strong> Cada cuenta dispone de su propio espacio de almacenamiento seguro (<code className="text-emerald-400">bt_userId_*</code>).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-white">Derecho de Portabilidad y Olvido:</strong> Puedes exportar todo tu historial en JSON o borrar tu cuenta y datos en cualquier momento desde Perfil.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="text-xs text-zinc-300">
                    Acepto las condiciones de uso de la beta privada y me comprometo a compartir feedback constructivo.
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="text-xs text-zinc-300">
                    He leído y acepto la Política de Privacidad y el tratamiento de mis datos de composición corporal.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Validation Feedback Alert Banner */}
          {validation.summaryMessage && (validationAttempted || step === 5) && (
            <div
              role="alert"
              data-testid="onboarding-validation-alert"
              className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">{validation.summaryMessage}</span>
                <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-0.5">
                  {!validation.isUnitSelected && (
                    <li>Selecciona una unidad de medida (Sistema Métrico kg/cm o Imperial lb/in).</li>
                  )}
                  {!validation.isGoalSelected && (
                    <li>Selecciona un objetivo principal (ej. Recomposición Corporal).</li>
                  )}
                  {step === 5 && !validation.areTermsAccepted && (
                    <li>Marca las dos casillas de condiciones de uso y política de privacidad.</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <div className="text-[11px] text-zinc-400 hidden sm:block">
              Configurando cuenta de <strong className="text-white">{validation.formattedDisplayName}</strong>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {step < 5 && (
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
              >
                Ir a Finalizar (Paso 5)
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-98"
              >
                <span>Continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinish()}
                data-testid="onboarding-finish-btn"
                className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  validation.canFinish
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-98'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-rose-500/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Comenzar mi Beta en BodyTrack Pro</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
