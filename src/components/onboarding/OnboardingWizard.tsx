/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import {
  ANTHROPOMETRIC_BOUNDS,
  clampMetric,
  stepMetric,
  EDUCATIONAL_TOOLTIPS,
  evaluateCalorieTargetSafety,
} from '../../utils/auditAndRetentionUtils';
import { WorkspaceInitMode } from '../../utils/workspaceMode';
import { QuickStartGuide } from './QuickStartGuide';
import {
  Activity,
  Sparkles,
  Dumbbell,
  Scale,
  Flame,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Info,
  MousePointerClick,
  AlertCircle,
  Ruler,
  Target,
  UserCheck,
  Sun,
  Moon,
  Database,
  Compass,
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
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  workspaceMode?: WorkspaceInitMode;
  onSwitchToDemoMode?: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  initialProfile,
  initialGoal,
  onComplete,
  onClose,
  theme = 'dark',
  onToggleTheme,
  workspaceMode = 'zero',
  onSwitchToDemoMode,
}) => {
  const [step, setStep] = useState<number>(1);
  const [showQuickStartDrawer, setShowQuickStartDrawer] = useState<boolean>(false);
  const [autoApplyInitialSetup, setAutoApplyInitialSetup] = useState<boolean>(true);
  const [activeFieldTooltip, setActiveFieldTooltip] = useState<'weigh_in' | 'calories' | null>('weigh_in');
  const [activeEduTooltip, setActiveEduTooltip] = useState<'bmr' | 'mifflin' | 'moving_average' | null>('mifflin');

  // User profile & personalized name state (defaults to Santiago Quinteros)
  const [name, setName] = useState<string>(initialProfile.name || 'Santiago Quinteros');
  const [age, setAge] = useState<number>(initialProfile.age || 24);
  const [sex, setSex] = useState<SexForEquations>(initialProfile.sex_for_equations || 'male');
  const [heightCm, setHeightCm] = useState<number>(initialProfile.height_cm || 175);
  const [weightKg, setWeightKg] = useState<number>(initialProfile.initial_weight_kg || 85.0);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile.activity_level || 'moderate'
  );

  // Sync name when initialProfile changes (e.g. when starting from 0 with a custom name)
  useEffect(() => {
    if (initialProfile.name) {
      setName(initialProfile.name);
    }
  }, [initialProfile.name]);

  // Required validated selections: Unit of Measurement & Primary Goal
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
      : selectedGoal === 'muscle_gain'
      ? tdee + Math.max(250, Math.min(450, dailyCalorieDelta))
      : Math.max(
          1200,
          isDeficit ? tdee - dailyCalorieDelta : tdee + Math.min(350, dailyCalorieDelta)
        );
  const calorieSafety = evaluateCalorieTargetSafety(
    recommendedCalories,
    bmr,
    tdee,
    sex,
    '2026-10-22'
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
    if (goalId === 'muscle_gain' && targetWeight <= weightKg) {
      setTargetWeight(Number((weightKg + 4).toFixed(1)));
    } else if (goalId === 'fat_loss' && targetWeight >= weightKg) {
      setTargetWeight(Number(Math.max(45, weightKg - 5).toFixed(1)));
    }
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

  const stepLabels = [
    { num: 1, title: '1. Bienvenida y Metas' },
    { num: 2, title: '2. Perfil y Unidades' },
    { num: 3, title: '3. Calorías y Ritmo' },
    { num: 4, title: '4. Datos a Registrar' },
    { num: 5, title: '5. Verificación Final' },
  ];

  const renderUnitSelector = () => (
    <div className="space-y-2.5" data-testid="unit-selector-group">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
          <Ruler className="w-4 h-4 text-emerald-400" />
          <span>1. Selecciona tu Unidad de Medida (Obligatorio)</span>
        </label>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
            validation.isUnitSelected
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}
        >
          {validation.isUnitSelected ? '✓ Unidad seleccionada' : 'Requerido para finalizar'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ONBOARDING_UNIT_OPTIONS.map((option) => {
          const isActive = selectedUnit === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedUnit(option.id)}
              data-testid={`select-unit-${option.id}`}
              aria-pressed={isActive}
              className={`p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1">
                <span className="font-bold text-sm block text-white">{option.label}</span>
                <span className="text-xs text-zinc-400 block leading-relaxed">
                  {option.description}
                </span>
              </div>
              <CheckCircle2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-600'
                }`}
              />
            </button>
          );
        })}
      </div>
      {validationAttempted && !validation.isUnitSelected && (
        <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validation.errors.unitOfMeasure}</span>
        </p>
      )}
    </div>
  );

  const renderPrimaryGoalSelector = () => (
    <div className="space-y-2.5" data-testid="goal-selector-group">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="font-bold text-white flex items-center gap-2 text-xs sm:text-sm">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>2. Selecciona tu Objetivo Principal (Obligatorio)</span>
        </label>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
            validation.isGoalSelected
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}
        >
          {validation.isGoalSelected ? '✓ Objetivo seleccionado' : 'Requerido para finalizar'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ONBOARDING_GOAL_OPTIONS.map((option) => {
          const isActive = selectedGoal === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelectGoal(option.id, option.recommendedRatePercent)}
              data-testid={`select-goal-${option.id}`}
              aria-pressed={isActive}
              className={`p-4 rounded-xl border-2 text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="space-y-1">
                <span className="font-bold text-sm block text-white">{option.label}</span>
                <span className="text-xs text-zinc-400 block leading-relaxed">
                  {option.description}
                </span>
              </div>
              <CheckCircle2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isActive ? 'text-emerald-400' : 'text-zinc-600'
                }`}
              />
            </button>
          );
        })}
      </div>
      {validationAttempted && !validation.isGoalSelected && (
        <p className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validation.errors.primaryGoal}</span>
        </p>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-zinc-950 text-zinc-100 flex flex-col animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-welcome-title"
      data-testid="fullscreen-onboarding-wizard"
    >
      {/* Full-Screen Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-base tracking-tight font-mono">
                BODYTRACK PRO
              </span>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                Onboarding en Grande · Paso {step} de 5
              </span>
              {workspaceMode === 'zero' && (
                <span className="text-[11px] font-bold text-cyan-400 px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30">
                  Cuenta desde 0 (Lienzo Limpio)
                </span>
              )}
            </div>
            <span
              className="text-xs text-zinc-300 font-semibold block mt-0.5"
              data-testid="onboarding-header-greeting"
            >
              {validation.welcomeMessage} — Configura tu espacio personal
            </span>
          </div>
        </div>

        {/* Right Controls: Step Pills, Quick Start Guide, Theme Toggle, Close */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Interactive Step Navigation Buttons */}
          <div className="flex gap-1" role="tablist" aria-label="Pasos de configuración">
            {stepLabels.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                aria-label={`Ir al paso ${s.num}`}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  s.num === step
                    ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                    : s.num < step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                <span>{s.num}</span>
                <span className="hidden xl:inline">{s.title.split('.')[1]}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowQuickStartDrawer((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              showQuickStartDrawer
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-sm'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>Guía de Inicio Rápido</span>
          </button>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              data-testid="onboarding-theme-toggle-btn"
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Modo Oscuro</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cerrar Vista
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Screen Two-Column Body */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT / MAIN WIZARD COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Personalized Welcome Banner Always Visible at Top of Wizard */}
            <div
              className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
              data-testid="onboarding-welcome-banner"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="onboarding-welcome-title"
                    className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                  >
                    {validation.welcomeMessage}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                    {validation.welcomeSubtitle}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-1.5 text-xs text-zinc-300 font-mono bg-zinc-950 px-3.5 py-2.5 rounded-xl border border-zinc-800">
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
              <div className="space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
                {/* Editable Name Input right on Welcome Screen */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                  <label
                    htmlFor="onboarding-user-name-input"
                    className="block font-bold text-white text-sm"
                  >
                    Tu Nombre o Alias para darte la bienvenida
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="onboarding-user-name-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Santiago Quinteros"
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:outline-hidden focus:border-emerald-500"
                    />
                    <span className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <Sparkles className="w-4 h-4" />
                      <span>Saludo activo: {validation.welcomeMessage}</span>
                    </span>
                  </div>
                </div>

                {/* Direct Required Selections: Unit of Measurement & Primary Goal */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-5">
                  {renderUnitSelector()}
                  <div className="border-t border-zinc-800 pt-4">{renderPrimaryGoalSelector()}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span>Medias Semanales de Peso</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Filtra las fluctuaciones de agua y glucógeno para revelar la tendencia real de 7 días.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Dumbbell className="w-4 h-4 text-blue-400" />
                      <span>Entrenamientos PPL & RIR</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
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

            {/* STEP 2: PROFILE CONFIG, UNRESTRICTED SLIDERS, GOALS & EDUCATIONAL TOOLTIPS */}
            {step === 2 && (
              <div className="space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Configura tu Perfil Fisiológico, Unidades y Objetivo
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                      Teclado numérico móvil habilitado y sliders de rango completo (100–230 cm, 30–250 kg).
                    </p>
                  </div>

                  {/* Interactive Educational Tooltips Bar (BMR, Fórmula de Mifflin, Media móvil) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['bmr', 'mifflin', 'moving_average'] as const).map((key) => {
                      const item = EDUCATIONAL_TOOLTIPS[key];
                      const active = activeEduTooltip === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveEduTooltip(active ? null : key)}
                          data-testid={`edu-tooltip-btn-${key}`}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                            active
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                              : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-cyan-500/50'
                          }`}
                        >
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {key === 'bmr'
                              ? '¿Qué es BMR?'
                              : key === 'mifflin'
                              ? 'Fórmula de Mifflin'
                              : 'Media móvil'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expanded Educational Tooltip Card */}
                {activeEduTooltip && (
                  <div
                    role="tooltip"
                    data-testid="edu-tooltip-panel"
                    className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {EDUCATIONAL_TOOLTIPS[activeEduTooltip].term} —{' '}
                        <span className="text-cyan-300">
                          {EDUCATIONAL_TOOLTIPS[activeEduTooltip].shortTitle}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveEduTooltip(null)}
                        className="text-zinc-400 hover:text-white font-bold px-1.5"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-zinc-200 leading-relaxed">
                      {EDUCATIONAL_TOOLTIPS[activeEduTooltip].simpleExplanation}
                    </p>
                    <p className="text-cyan-300 font-semibold">
                      Consejo práctico: {EDUCATIONAL_TOOLTIPS[activeEduTooltip].practicalTip}
                    </p>
                  </div>
                )}

                {/* Unit of Measurement Selector */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                  {renderUnitSelector()}
                  <div className="border-t border-zinc-800 pt-4">
                    {renderPrimaryGoalSelector()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <label className="block font-bold text-zinc-200 mb-1.5">Nombre o Alias</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Santiago Quinteros"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-zinc-200 mb-1.5">
                      Sexo biológico (para fórmulas)
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as SexForEquations)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="male">Masculino (+5 kcal fórmula MSJ)</option>
                      <option value="female">Femenino (-161 kcal fórmula MSJ)</option>
                    </select>
                  </div>

                  {/* Age with mobile numeric keyboard & unrestricted slider (14-100) */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="onboarding-age-input" className="font-bold text-zinc-200">
                        Edad (años)
                      </label>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        Rango: {ANTHROPOMETRIC_BOUNDS.age.min}–{ANTHROPOMETRIC_BOUNDS.age.max} años
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir edad"
                        onClick={() =>
                          setAge((prev) =>
                            stepMetric(prev, -1, ANTHROPOMETRIC_BOUNDS.age.min, ANTHROPOMETRIC_BOUNDS.age.max, 0)
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        id="onboarding-age-input"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={ANTHROPOMETRIC_BOUNDS.age.min}
                        max={ANTHROPOMETRIC_BOUNDS.age.max}
                        value={age}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          if (!Number.isNaN(raw)) {
                            setAge(Math.max(1, Math.min(110, raw)));
                          }
                        }}
                        onBlur={() =>
                          setAge((prev) =>
                            clampMetric(prev, ANTHROPOMETRIC_BOUNDS.age.min, ANTHROPOMETRIC_BOUNDS.age.max, 0)
                          )
                        }
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-center text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar edad"
                        onClick={() =>
                          setAge((prev) =>
                            stepMetric(prev, 1, ANTHROPOMETRIC_BOUNDS.age.min, ANTHROPOMETRIC_BOUNDS.age.max, 0)
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      aria-label="Slider de edad"
                      min={ANTHROPOMETRIC_BOUNDS.age.min}
                      max={ANTHROPOMETRIC_BOUNDS.age.max}
                      step={1}
                      value={clampMetric(age, ANTHROPOMETRIC_BOUNDS.age.min, ANTHROPOMETRIC_BOUNDS.age.max, 0)}
                      onChange={(e) => setAge(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Height with mobile numeric keyboard & unrestricted slider (100-230 cm) */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="onboarding-height-input" className="font-bold text-zinc-200">
                        Estatura ({selectedUnit === 'imperial' ? 'cm · eq. in' : 'cm'})
                      </label>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        {ANTHROPOMETRIC_BOUNDS.heightCm.min}–{ANTHROPOMETRIC_BOUNDS.heightCm.max} cm
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir estatura"
                        onClick={() =>
                          setHeightCm((prev) =>
                            stepMetric(
                              prev,
                              -1,
                              ANTHROPOMETRIC_BOUNDS.heightCm.min,
                              ANTHROPOMETRIC_BOUNDS.heightCm.max,
                              0
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        id="onboarding-height-input"
                        type="number"
                        inputMode="decimal"
                        min={ANTHROPOMETRIC_BOUNDS.heightCm.min}
                        max={ANTHROPOMETRIC_BOUNDS.heightCm.max}
                        value={heightCm}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (!Number.isNaN(raw)) {
                            setHeightCm(raw);
                          }
                        }}
                        onBlur={() =>
                          setHeightCm((prev) =>
                            clampMetric(
                              prev,
                              ANTHROPOMETRIC_BOUNDS.heightCm.min,
                              ANTHROPOMETRIC_BOUNDS.heightCm.max,
                              0
                            )
                          )
                        }
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-center text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar estatura"
                        onClick={() =>
                          setHeightCm((prev) =>
                            stepMetric(
                              prev,
                              1,
                              ANTHROPOMETRIC_BOUNDS.heightCm.min,
                              ANTHROPOMETRIC_BOUNDS.heightCm.max,
                              0
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      aria-label="Slider de estatura"
                      min={ANTHROPOMETRIC_BOUNDS.heightCm.min}
                      max={ANTHROPOMETRIC_BOUNDS.heightCm.max}
                      step={1}
                      value={clampMetric(
                        heightCm,
                        ANTHROPOMETRIC_BOUNDS.heightCm.min,
                        ANTHROPOMETRIC_BOUNDS.heightCm.max,
                        0
                      )}
                      onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  {/* Weight with mobile decimal keyboard & unrestricted slider (30-250 kg) */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <label htmlFor="onboarding-weight-input" className="font-bold text-zinc-200">
                        Peso inicial ({selectedUnit === 'imperial' ? 'kg · eq. lb' : 'kg'})
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveFieldTooltip(activeFieldTooltip === 'weigh_in' ? null : 'weigh_in')
                        }
                        className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-emerald-500/25 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Tooltip Pesaje</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir peso"
                        onClick={() =>
                          setWeightKg((prev) =>
                            stepMetric(
                              prev,
                              -0.5,
                              ANTHROPOMETRIC_BOUNDS.weightKg.min,
                              ANTHROPOMETRIC_BOUNDS.weightKg.max,
                              1
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        id="onboarding-weight-input"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min={ANTHROPOMETRIC_BOUNDS.weightKg.min}
                        max={ANTHROPOMETRIC_BOUNDS.weightKg.max}
                        value={weightKg}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (!Number.isNaN(raw)) {
                            setWeightKg(raw);
                          }
                        }}
                        onBlur={() =>
                          setWeightKg((prev) =>
                            clampMetric(
                              prev,
                              ANTHROPOMETRIC_BOUNDS.weightKg.min,
                              ANTHROPOMETRIC_BOUNDS.weightKg.max,
                              1
                            )
                          )
                        }
                        className="flex-1 bg-zinc-900 border-2 border-emerald-500/50 rounded-xl p-2.5 text-center text-white font-mono font-bold focus:outline-hidden focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar peso"
                        onClick={() =>
                          setWeightKg((prev) =>
                            stepMetric(
                              prev,
                              0.5,
                              ANTHROPOMETRIC_BOUNDS.weightKg.min,
                              ANTHROPOMETRIC_BOUNDS.weightKg.max,
                              1
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      aria-label="Slider de peso inicial"
                      min={ANTHROPOMETRIC_BOUNDS.weightKg.min}
                      max={ANTHROPOMETRIC_BOUNDS.weightKg.max}
                      step={0.5}
                      value={clampMetric(
                        weightKg,
                        ANTHROPOMETRIC_BOUNDS.weightKg.min,
                        ANTHROPOMETRIC_BOUNDS.weightKg.max,
                        1
                      )}
                      onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />

                    {/* Contextual Visual Tooltip for First Weigh-in */}
                    {activeFieldTooltip === 'weigh_in' && (
                      <div
                        role="tooltip"
                        className="mt-2 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-100 relative shadow-lg"
                      >
                        <div className="flex items-start gap-2.5">
                          <Scale className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-white block">
                              Guía Rápida: Tu Primer Pesaje ({weightKg.toFixed(1)} kg)
                            </span>
                            <p className="text-emerald-200/90 mt-1 leading-relaxed">
                              Este valor servirá como tu punto cero para la{' '}
                              <strong className="text-white">Media Móvil de 7 días</strong>.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <label className="block font-bold text-zinc-200">
                      Nivel de Actividad Diaria
                    </label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                    >
                      <option value="sedentary">Sedentario (Oficina / poco movimiento, x1.2)</option>
                      <option value="light">Ligero (1-3 días entreno ligero, x1.375)</option>
                      <option value="moderate">Moderado (3-5 días pesas o deporte, x1.55)</option>
                      <option value="heavy">Intenso (6-7 días entrenamiento intenso, x1.725)</option>
                      <option value="athlete">Atleta / Doble sesión o trabajo físico, x1.9</option>
                    </select>
                    <p className="text-[11px] text-zinc-400">
                      BMR estimado: <strong className="text-white font-mono">{bmr} kcal</strong> · TDEE:{' '}
                      <strong className="text-emerald-400 font-mono">{tdee} kcal</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PRIMARY GOAL, ADJUSTABLE CALORIE ESTIMATE & AGGRESSIVE CUT SAFETY ALERT */}
            {step === 3 && (
              <div className="space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Define tu Objetivo Principal y Meta Calórica Ajustable
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                      Soporta pérdida de grasa, recomposición o{' '}
                      <strong className="text-emerald-400">Aumento de masa muscular (Superávit calórico)</strong>.
                    </p>
                  </div>
                  <span
                    className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg"
                    data-testid="calorie-estimate-badge"
                  >
                    Estimación ajustable · Calculada el {calorieSafety.calculatedAtDate}
                  </span>
                </div>

                {/* Primary Goal Selector */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  {renderPrimaryGoalSelector()}
                </div>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="onboarding-target-weight-input" className="font-bold text-zinc-200">
                        Peso Objetivo Deseado (kg)
                      </label>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        {ANTHROPOMETRIC_BOUNDS.weightKg.min}–{ANTHROPOMETRIC_BOUNDS.weightKg.max} kg
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTargetWeight((prev) =>
                            stepMetric(
                              prev,
                              -0.5,
                              ANTHROPOMETRIC_BOUNDS.weightKg.min,
                              ANTHROPOMETRIC_BOUNDS.weightKg.max,
                              1
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        id="onboarding-target-weight-input"
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min={ANTHROPOMETRIC_BOUNDS.weightKg.min}
                        max={ANTHROPOMETRIC_BOUNDS.weightKg.max}
                        value={targetWeight}
                        onChange={(e) => {
                          const raw = parseFloat(e.target.value);
                          if (!Number.isNaN(raw)) setTargetWeight(raw);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-center text-white font-mono font-bold text-base focus:outline-hidden focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setTargetWeight((prev) =>
                            stepMetric(
                              prev,
                              0.5,
                              ANTHROPOMETRIC_BOUNDS.weightKg.min,
                              ANTHROPOMETRIC_BOUNDS.weightKg.max,
                              1
                            )
                          )
                        }
                        className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-mono font-bold text-white cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <input
                      type="range"
                      min={ANTHROPOMETRIC_BOUNDS.weightKg.min}
                      max={ANTHROPOMETRIC_BOUNDS.weightKg.max}
                      step={0.5}
                      value={clampMetric(
                        targetWeight,
                        ANTHROPOMETRIC_BOUNDS.weightKg.min,
                        ANTHROPOMETRIC_BOUNDS.weightKg.max,
                        1
                      )}
                      onChange={(e) => setTargetWeight(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-zinc-200">
                        Ritmo semanal ({selectedGoal === 'muscle_gain' ? 'Superávit' : 'Cambio'}): {goalRate}% del peso corporal
                      </label>
                      <span className="text-xs text-emerald-400 font-bold tabular-nums font-mono">
                        ~{((weightKg * goalRate) / 100).toFixed(2)} kg/semana
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ANTHROPOMETRIC_BOUNDS.goalRatePercent.min}
                      max={ANTHROPOMETRIC_BOUNDS.goalRatePercent.max}
                      step={ANTHROPOMETRIC_BOUNDS.goalRatePercent.step}
                      value={goalRate}
                      onChange={(e) => setGoalRate(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>0.15% (Suave)</span>
                      <span className="text-emerald-400 font-bold">0.35%–0.5% (Zona Óptima)</span>
                      <span>1.2% (Agresivo — Alerta)</span>
                    </div>
                  </div>

                  {/* Calorie Safety Alert Banner if aggressive cut */}
                  {calorieSafety.isAggressiveCut && (
                    <div
                      role="alert"
                      data-testid="aggressive-calorie-cut-alert"
                      className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-100 space-y-2"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-bold text-white text-sm block">
                            {calorieSafety.headline}
                          </span>
                          <p className="text-rose-200/90 leading-relaxed">
                            {calorieSafety.explanation}
                          </p>
                          <button
                            type="button"
                            onClick={() => setGoalRate(0.5)}
                            className="mt-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-white font-bold text-xs cursor-pointer"
                          >
                            Ajustar a ritmo seguro recomendado (0.5% semanal · {calorieSafety.recommendedSafeFloorKcal} kcal)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contextual Visual Tooltip for Calorie Target Configuration */}
                  <div
                    role="tooltip"
                    className="relative p-4 rounded-xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-100 shadow-lg space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <Flame className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1.5">
                        <span className="font-bold text-white text-sm block">
                          Estimación Ajustable ({recommendedCalories} kcal/día · Calculada el {calorieSafety.calculatedAtDate})
                        </span>
                        <p className="text-amber-200/90 leading-relaxed">
                          {calorieSafety.explanation} Tu BMR (Mifflin-St Jeor) es de{' '}
                          <strong className="text-white">{bmr} kcal</strong> y tu TDEE estimado es de{' '}
                          <strong className="text-white">{tdee} kcal</strong>.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs font-bold text-amber-300">
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
              <div className="space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Selecciona qué datos deseas registrar
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                    Elige con total libertad. No estás obligado a registrar información que no desees. Puedes cambiar esto en cualquier momento desde Ajustes.
                  </p>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={trackWeighIn}
                      onChange={(e) => setTrackWeighIn(e.target.checked)}
                      className="mt-1 accent-emerald-500 rounded w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-white block">Pesajes Diarios en Ayunas</span>
                      <span className="text-xs text-zinc-400">
                        Recomendado para calcular la media móvil semanal de 7 días y filtrar fluctuaciones hídricas.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={trackWorkouts}
                      onChange={(e) => setTrackWorkouts(e.target.checked)}
                      className="mt-1 accent-emerald-500 rounded w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-white block">Entrenamientos PPL y Sobrecarga</span>
                      <span className="text-xs text-zinc-400">
                        Registro de ejercicios, series, repeticiones, cargas y RIR/RPE.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={trackNutrition}
                      onChange={(e) => setTrackNutrition(e.target.checked)}
                      className="mt-1 accent-emerald-500 rounded w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-white block">Comidas, Calorías y Macronutrientes</span>
                      <span className="text-xs text-zinc-400">
                        Registro de alimentos consumidos con desglose de Proteínas, Carbohidratos y Grasas.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={trackMeasurements}
                      onChange={(e) => setTrackMeasurements(e.target.checked)}
                      className="mt-1 accent-emerald-500 rounded w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-white block">Medidas Corporales (Cintura, Cuello, etc.)</span>
                      <span className="text-xs text-zinc-400">
                        Perímetro abdominal para calcular el porcentaje de grasa corporal según fórmula U.S. Navy.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={trackPhotos}
                      onChange={(e) => setTrackPhotos(e.target.checked)}
                      className="mt-1 accent-emerald-500 rounded w-4 h-4"
                    />
                    <div>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span>Fotografías de Progreso (Opcional)</span>
                      </span>
                      <span className="text-xs text-zinc-400">
                        100% privado en tu dispositivo. Jamás se hacen públicas ni se indexan en servidores.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 5: VALIDATION CHECKLIST + QUICK START GUIDE + PRIVACY, GOVERNANCE & TERMS */}
            {step === 5 && (
              <div className="space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-md">
                {/* Mandatory Validation Summary & Interactive Selectors before Finishing */}
                <div
                  className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4"
                  data-testid="onboarding-final-validation-box"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Verificación de Requisitos para {validation.formattedDisplayName}
                      </h4>
                      <p className="text-xs text-zinc-400">
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
                        className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                      >
                        Restablecer selección
                      </button>
                    )}
                  </div>

                  {renderUnitSelector()}
                  <div className="border-t border-zinc-800 pt-4">{renderPrimaryGoalSelector()}</div>
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

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
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

                <div className="space-y-3 pt-1">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="accent-emerald-500 rounded w-4 h-4"
                    />
                    <span className="text-xs sm:text-sm font-medium text-zinc-200">
                      Acepto las condiciones de uso de la beta privada y me comprometo a compartir feedback constructivo.
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="accent-emerald-500 rounded w-4 h-4"
                    />
                    <span className="text-xs sm:text-sm font-medium text-zinc-200">
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
                className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-white block">{validation.summaryMessage}</span>
                  <ul className="list-disc list-inside text-xs text-rose-200/90 space-y-0.5">
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

            {/* Wizard Bottom Navigation Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>
              ) : (
                <div className="text-xs text-zinc-400 hidden sm:block">
                  Configurando cuenta de <strong className="text-white">{validation.formattedDisplayName}</strong>
                </div>
              )}

              <div className="flex items-center gap-2.5 ml-auto">
                {step < 5 && (
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  >
                    Ir a Finalizar (Paso 5)
                  </button>
                )}

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                  >
                    <span>Continuar al Paso {step + 1}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleFinish()}
                    data-testid="onboarding-finish-btn"
                    className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      validation.canFinish
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
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

          {/* RIGHT / PERSISTENT LIVE SUMMARY COLUMN (4 cols) */}
          <aside className="lg:col-span-4 space-y-5 sticky top-24">
            {/* Live Validation & Readiness Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Estado de tu Onboarding</span>
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Paso {step}/5
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-zinc-300 font-semibold">Bienvenida</span>
                  <span className="font-bold text-emerald-400 truncate max-w-[160px]">
                    {validation.formattedDisplayName}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-zinc-300 font-semibold">1. Unidad de Medida</span>
                  <span
                    className={`font-bold font-mono ${
                      validation.isUnitSelected ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {validation.isUnitSelected ? getUnitLabel(selectedUnit) : 'Pendiente'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-zinc-300 font-semibold">2. Objetivo Principal</span>
                  <span
                    className={`font-bold ${
                      validation.isGoalSelected ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {validation.isGoalSelected ? getGoalLabel(selectedGoal) : 'Pendiente'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-zinc-300 font-semibold">3. Privacidad Beta</span>
                  <span
                    className={`font-bold ${
                      validation.areTermsAccepted ? 'text-emerald-400' : 'text-zinc-400'
                    }`}
                  >
                    {validation.areTermsAccepted ? 'Aceptado' : 'En Paso 5'}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Metabolic & Macro Preview Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-md">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Cálculo Metabólico en Vivo</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ecuación Mifflin-St Jeor según tus parámetros actuales
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block">Tasa Basal (BMR)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {bmr} kcal
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-400 block">Mantenimiento (TDEE)</span>
                  <span className="text-base font-bold text-white font-mono">
                    {tdee} kcal
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Meta Calórica Recomendada</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {recommendedCalories} kcal
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Proteína</span>
                    <strong className="text-emerald-400">{recommendedProteinG}g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Carbos</span>
                    <strong className="text-amber-400">{recommendedCarbsG}g</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block">Grasas</span>
                    <strong className="text-cyan-400">{recommendedFatG}g</strong>
                  </div>
                </div>
              </div>

              {onSwitchToDemoMode && (
                <button
                  type="button"
                  onClick={onSwitchToDemoMode}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  <span>Prefiero Cargar los Datos de Prueba (22 días)</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
