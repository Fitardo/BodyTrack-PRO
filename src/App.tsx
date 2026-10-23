/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StorageService } from './services/storage';
import { analytics } from './services/analytics';
import { AuthSession } from './types/auth';
import {
  UserProfile,
  PhysicalGoal,
  NutritionTarget,
  Food,
  FoodLog,
  Exercise,
  WorkoutRoutine,
  WorkoutSession,
  WeighIn,
  BodyMeasurement,
  ActivityLog,
  RecoveryLog,
  ProgressPhoto,
  WeeklyReview,
  DailyHabits,
  MealCategory,
} from './types';
import { calculateLoggingStreak } from './utils/calculations';
import { ShieldCheck, Sparkles, MessageSquarePlus, KeyRound, Compass } from 'lucide-react';

// Layout
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';

// Modals
import { Modal } from './components/common/Modal';
import { QuickActionModal } from './components/dashboard/QuickActionModal';
import { WeighInModal } from './components/weight/WeighInModal';
import { MeasurementModal } from './components/weight/MeasurementModal';
import { FoodLogModal } from './components/nutrition/FoodLogModal';
import { CustomFoodModal } from './components/nutrition/CustomFoodModal';
import { ActiveWorkoutModal } from './components/workout/ActiveWorkoutModal';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingWizard, OnboardingQuickStartResult } from './components/onboarding/OnboardingWizard';
import { FeedbackModal } from './components/feedback/FeedbackModal';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { WeightView } from './components/weight/WeightView';
import { NutritionView } from './components/nutrition/NutritionView';
import { WorkoutView } from './components/workout/WorkoutView';
import { ActivityView } from './components/activity/ActivityView';
import { PhotosView } from './components/photos/PhotosView';
import { WeeklyReviewView } from './components/analysis/WeeklyReviewView';
import { ReportsView } from './components/reports/ReportsView';
import { ProfileView } from './components/profile/ProfileView';
import { IntegrationsView } from './components/settings/IntegrationsView';
import { AdminDashboardView } from './components/admin/AdminDashboardView';

export default function App() {
  const [currentDate, setCurrentDate] = useState<string>('2026-10-22');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>(StorageService.getTheme());

  // Beta Auth & Onboarding states
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => StorageService.getAuthSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  // Domain states
  const [profile, setProfile] = useState<UserProfile>(StorageService.getProfile());
  const [goal, setGoal] = useState<PhysicalGoal>(StorageService.getGoal());
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget>(StorageService.getNutritionTarget());
  const [foods, setFoods] = useState<Food[]>(StorageService.getFoods());
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>(StorageService.getFoodLogs());
  const [weighIns, setWeighIns] = useState<WeighIn[]>(StorageService.getWeighIns());
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(StorageService.getBodyMeasurements());
  const [exercises, setExercises] = useState<Exercise[]>(StorageService.getExercises());
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(StorageService.getRoutines());
  const [sessions, setSessions] = useState<WorkoutSession[]>(StorageService.getWorkoutSessions());
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(StorageService.getActivityLogs());
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>(StorageService.getRecoveryLogs());
  const [photos, setPhotos] = useState<ProgressPhoto[]>(StorageService.getProgressPhotos());
  const [reviews, setReviews] = useState<WeeklyReview[]>(StorageService.getWeeklyReviews());
  const [habits, setHabits] = useState<DailyHabits>(StorageService.getHabits(currentDate));

  // Modal visibility states
  const [isQuickLogOpen, setIsQuickLogOpen] = useState<boolean>(false);
  const [isWeighInModalOpen, setIsWeighInModalOpen] = useState<boolean>(false);
  const [editingWeighIn, setEditingWeighIn] = useState<WeighIn | null>(null);

  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState<boolean>(false);
  const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);

  const [isFoodLogModalOpen, setIsFoodLogModalOpen] = useState<boolean>(false);
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLog | null>(null);
  const [foodLogDefaultMeal, setFoodLogDefaultMeal] = useState<MealCategory>('almuerzo');

  const [isCustomFoodModalOpen, setIsCustomFoodModalOpen] = useState<boolean>(false);

  const [isActiveWorkoutModalOpen, setIsActiveWorkoutModalOpen] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<WorkoutSession | null>(null);

  const [isPhotoUploadTriggered, setIsPhotoUploadTriggered] = useState<boolean>(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState<boolean>(false);

  // Reload all tenant-isolated domain states
  const reloadTenantState = () => {
    setProfile(StorageService.getProfile());
    setGoal(StorageService.getGoal());
    setNutritionTarget(StorageService.getNutritionTarget());
    setFoods(StorageService.getFoods());
    setFoodLogs(StorageService.getFoodLogs());
    setWeighIns(StorageService.getWeighIns());
    setMeasurements(StorageService.getBodyMeasurements());
    setExercises(StorageService.getExercises());
    setRoutines(StorageService.getRoutines());
    setSessions(StorageService.getWorkoutSessions());
    setActivityLogs(StorageService.getActivityLogs());
    setRecoveryLogs(StorageService.getRecoveryLogs());
    setPhotos(StorageService.getProgressPhotos());
    setReviews(StorageService.getWeeklyReviews());
    setHabits(StorageService.getHabits(currentDate));
  };

  // Sync habits when date changes
  useEffect(() => {
    setHabits(StorageService.getHabits(currentDate));
  }, [currentDate]);

  // Track module navigation (privacy-preserving)
  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    analytics.track('module_visited', tab);
  };

  // Handle Auth Success
  const handleAuthSuccess = (session: AuthSession) => {
    StorageService.setAuthSession(session);
    setAuthSession(session);
    analytics.setUserId(session.user.id);
    reloadTenantState();
    setIsAuthModalOpen(false);
    analytics.track('auth_login_success', 'auth', { role: session.user.role });

    if (!session.user.onboarding_completed) {
      setIsOnboardingOpen(true);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (authSession?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authSession.token}` },
        });
      } catch (e) {}
    }
    StorageService.setAuthSession(null);
    setAuthSession(null);
    analytics.setUserId('usr_demo');
    reloadTenantState();
    if (currentTab === 'admin') {
      setCurrentTab('dashboard');
    }
  };

  // Handle Onboarding Completion
  const handleOnboardingComplete = async (
    updatedProfile: UserProfile,
    updatedGoal: PhysicalGoal,
    enabledModules: Record<string, boolean>,
    quickStartResult?: OnboardingQuickStartResult
  ) => {
    StorageService.updateProfile(updatedProfile);
    StorageService.updateGoal(updatedGoal);
    setProfile(updatedProfile);
    setGoal(updatedGoal);

    if (quickStartResult?.autoApplyInitialSetup) {
      const updatedTarget: NutritionTarget = {
        ...nutritionTarget,
        calories_kcal: quickStartResult.recommendedCalories,
        protein_g: quickStartResult.recommendedProteinG,
        carbohydrates_g: quickStartResult.recommendedCarbsG,
        fat_g: quickStartResult.recommendedFatG,
      };
      StorageService.updateNutritionTarget(updatedTarget);
      setNutritionTarget(updatedTarget);

      const initialWeighIn: WeighIn = {
        id: `w_onboarding_${Date.now()}`,
        measured_at: `${currentDate}T07:30:00`,
        weight_kg: quickStartResult.initialWeightKg,
        fasting: true,
        notes: 'Primer pesaje registrado desde Guía de Inicio Rápido (Onboarding)',
      };
      StorageService.saveWeighIn(initialWeighIn);
      setWeighIns(StorageService.getWeighIns());
    }

    if (authSession) {
      try {
        await fetch('/api/auth/complete-onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.token}`,
          },
          body: JSON.stringify({
            acceptedTerms: true,
            acceptedPrivacy: true,
            enabledModules,
          }),
        });
      } catch (e) {}

      const updatedSession: AuthSession = {
        ...authSession,
        user: {
          ...authSession.user,
          name: updatedProfile.name,
          onboarding_completed: true,
        },
      };
      StorageService.setAuthSession(updatedSession);
      setAuthSession(updatedSession);
    }

    analytics.track('onboarding_completed', 'onboarding', {
      modulesCount: Object.values(enabledModules).filter(Boolean).length,
      quickStartApplied: Boolean(quickStartResult?.autoApplyInitialSetup),
    });
    setIsOnboardingOpen(false);

    if (quickStartResult?.launchAction === 'weigh_in') {
      setEditingWeighIn(null);
      setIsWeighInModalOpen(true);
    } else if (quickStartResult?.launchAction === 'calories') {
      handleSelectTab('nutrition');
    }

    try {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Handle Theme Toggle
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    StorageService.setTheme(next);
  };

  // --- Weigh-in actions ---
  const handleSaveWeighIn = (w: WeighIn) => {
    StorageService.saveWeighIn(w);
    setWeighIns(StorageService.getWeighIns());
    const h = StorageService.getHabits(w.measured_at.split('T')[0]);
    h.weigh_in_done = true;
    StorageService.saveHabits(h);
    if (w.measured_at.split('T')[0] === currentDate) setHabits({ ...h });
    analytics.track('weigh_in_logged', 'weight');
  };

  const handleDeleteWeighIn = (id: string) => {
    StorageService.deleteWeighIn(id);
    setWeighIns(StorageService.getWeighIns());
  };

  // --- Measurement actions ---
  const handleSaveMeasurement = (m: BodyMeasurement) => {
    StorageService.saveBodyMeasurement(m);
    setMeasurements(StorageService.getBodyMeasurements());
    const h = StorageService.getHabits(m.measured_at);
    h.measurements_logged = true;
    StorageService.saveHabits(h);
    if (m.measured_at === currentDate) setHabits({ ...h });
    analytics.track('measurement_logged', 'weight');
  };

  const handleDeleteMeasurement = (id: string) => {
    StorageService.deleteBodyMeasurement(id);
    setMeasurements(StorageService.getBodyMeasurements());
  };

  // --- Food actions ---
  const handleSaveFoodLog = (log: FoodLog) => {
    StorageService.saveFoodLog(log);
    setFoodLogs(StorageService.getFoodLogs());
    const h = StorageService.getHabits(log.consumed_at);
    h.meals_logged = true;
    StorageService.saveHabits(h);
    if (log.consumed_at === currentDate) setHabits({ ...h });
    analytics.track('food_logged', 'nutrition', { meal_type: log.meal_type });
  };

  const handleDeleteFoodLog = (id: string) => {
    StorageService.deleteFoodLog(id);
    setFoodLogs(StorageService.getFoodLogs());
  };

  const handleSaveCustomFood = (f: Food) => {
    StorageService.saveFood(f);
    setFoods(StorageService.getFoods());
    analytics.track('custom_food_created', 'nutrition');
  };

  const handleBatchImportFoodLogs = (logs: FoodLog[], provider: string) => {
    const startTime = Date.now();
    const result = StorageService.batchImportFoodLogs(logs);
    const provKey = (provider === 'fitia' ? 'fitia' : 'myfitnesspal') as 'fitia' | 'myfitnesspal';
    const provName = provKey === 'fitia' ? 'Fitia Nutrición' : 'MyFitnessPal';

    StorageService.addSyncLog({
      id: `sync_food_${startTime}`,
      provider: provKey,
      provider_name: provName,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      status: 'success',
      records_imported: result.imported,
      records_updated: result.updated,
      records_skipped: result.skipped,
      duration_ms: Date.now() - startTime,
      details: `Importación CSV/JSON completada: ${result.imported} añadidos, ${result.updated} actualizados, ${result.skipped} omitidos.`,
    });
    StorageService.saveIntegrationConfig(provKey, {
      last_sync_at: new Date().toISOString(),
    });
    setFoodLogs(StorageService.getFoodLogs());
    analytics.track('csv_food_imported', 'nutrition', {
      provider: provKey,
      imported_count: result.imported,
    });
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch (e) {}
    return result;
  };

  // --- Workout actions ---
  const handleSaveWorkoutSession = (session: WorkoutSession) => {
    StorageService.saveWorkoutSession(session);
    setSessions(StorageService.getWorkoutSessions());
    const dateStr = session.started_at.split('T')[0];
    const h = StorageService.getHabits(dateStr);
    h.workout_done = true;
    StorageService.saveHabits(h);
    if (dateStr === currentDate) setHabits({ ...h });
    analytics.track('workout_logged', 'workout', { exercises_count: session.exercises.length });
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
  };

  const handleDeleteWorkoutSession = (id: string) => {
    StorageService.deleteWorkoutSession(id);
    setSessions(StorageService.getWorkoutSessions());
  };

  // --- Activity & Recovery actions ---
  const handleSaveActivity = (log: ActivityLog) => {
    StorageService.saveActivityLog(log);
    setActivityLogs(StorageService.getActivityLogs());
    if (log.steps >= 5000) {
      const h = StorageService.getHabits(log.activity_date);
      h.steps_goal_met = true;
      StorageService.saveHabits(h);
      if (log.activity_date === currentDate) setHabits({ ...h });
    }
    analytics.track('activity_logged', 'activity');
  };

  const handleSaveRecovery = (log: RecoveryLog) => {
    StorageService.saveRecoveryLog(log);
    setRecoveryLogs(StorageService.getRecoveryLogs());
    if (log.sleep_hours >= 7) {
      const h = StorageService.getHabits(log.recorded_at);
      h.sleep_7h_plus = true;
      StorageService.saveHabits(h);
      if (log.recorded_at === currentDate) setHabits({ ...h });
    }
    analytics.track('recovery_logged', 'activity');
  };

  // --- Photos ---
  const handleAddPhoto = (photo: ProgressPhoto) => {
    StorageService.saveProgressPhoto(photo);
    setPhotos(StorageService.getProgressPhotos());
    analytics.track('photo_added_local', 'photos');
  };

  const handleDeletePhoto = (id: string) => {
    StorageService.deleteProgressPhoto(id);
    setPhotos(StorageService.getProgressPhotos());
  };

  // --- Weekly Reviews ---
  const handleSaveReview = (review: WeeklyReview) => {
    StorageService.saveWeeklyReview(review);
    setReviews(StorageService.getWeeklyReviews());
    analytics.track('weekly_review_saved', 'review');
  };

  const handleApplyCalorieAdjustment = (newCalories: number) => {
    const updatedTarget: NutritionTarget = {
      ...nutritionTarget,
      calories_kcal: newCalories,
      carbohydrates_g: Math.round((newCalories - (180 * 4 + 70 * 9)) / 4),
    };
    StorageService.updateNutritionTarget(updatedTarget);
    setNutritionTarget(updatedTarget);
    analytics.track('calorie_adjustment_applied', 'review');
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // --- Habits toggle ---
  const handleToggleHabit = (key: keyof DailyHabits) => {
    const updated = {
      ...habits,
      [key]: !habits[key],
    };
    setHabits(updated);
    StorageService.saveHabits(updated);
  };

  // Quick Action selection router
  const handleSelectQuickAction = (action: 'weigh_in' | 'food_log' | 'workout' | 'steps' | 'photo') => {
    if (action === 'weigh_in') {
      setEditingWeighIn(null);
      setIsWeighInModalOpen(true);
    } else if (action === 'food_log') {
      setEditingFoodLog(null);
      setIsFoodLogModalOpen(true);
    } else if (action === 'workout') {
      setEditingSession(null);
      setIsActiveWorkoutModalOpen(true);
    } else if (action === 'steps') {
      handleSelectTab('activity');
    } else if (action === 'photo') {
      handleSelectTab('photos');
      setIsPhotoUploadTriggered(true);
    }
  };

  const streakDays = calculateLoggingStreak(weighIns, foodLogs, currentDate);
  const isAdmin = authSession?.user.role === 'admin';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${
      theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      {/* Top Navigation */}
      <Navbar
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onOpenQuickLog={() => setIsQuickLogOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentUser={authSession?.user || null}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          streakCount={streakDays}
          isAdmin={isAdmin}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Private Beta Control Strip & Personalized Welcome */}
            <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/30 border border-zinc-800/90 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Beta Privada v2.4
                </span>
                <p className="text-xs text-zinc-200" data-testid="app-welcome-greeting">
                  <strong className="text-emerald-400 font-bold">
                    ¡Bienvenido, {authSession?.user.name || profile.name || 'Santiago Quinteros'}!
                  </strong>{' '}
                  <span className="text-zinc-500">·</span>{' '}
                  {authSession ? (
                    <>
                      Sesión aislada ({authSession.user.email}) · Tenant{' '}
                      <code className="text-emerald-400 font-mono">bt_{authSession.user.id}_*</code>
                    </>
                  ) : (
                    <>
                      Unidad: <strong className="text-white">{profile.unit_system === 'imperial' ? 'lb / in' : 'kg / cm'}</strong> · Objetivo:{' '}
                      <strong className="text-white">
                        {goal.primary_goal === 'fat_loss'
                          ? 'Pérdida de Grasa'
                          : goal.primary_goal === 'muscle_gain'
                          ? 'Ganancia Muscular'
                          : goal.primary_goal === 'maintenance'
                          ? 'Mantenimiento'
                          : 'Recomposición Corporal'}
                      </strong>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsOnboardingOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Onboarding / Privacidad
                </button>
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 text-teal-400" />
                  Enviar Feedback
                </button>
                {isAdmin && currentTab !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleSelectTab('admin')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Panel Admin Beta
                  </button>
                )}
                {!authSession && (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Acceso / Invitación
                  </button>
                )}
              </div>
            </div>

            {currentTab === 'dashboard' && (
              <DashboardView
                currentDate={currentDate}
                weighIns={weighIns}
                measurements={measurements}
                foodLogs={foodLogs}
                workoutSessions={sessions}
                activityLogs={activityLogs}
                recoveryLogs={recoveryLogs}
                nutritionTarget={nutritionTarget}
                goal={goal}
                habits={habits}
                onToggleHabit={handleToggleHabit}
                latestReview={reviews[0]}
                onOpenQuickLog={() => setIsQuickLogOpen(true)}
                onOpenReviewModal={() => handleSelectTab('review')}
                onNavigateToTab={handleSelectTab}
              />
            )}

            {currentTab === 'weight' && (
              <WeightView
                weighIns={weighIns}
                measurements={measurements}
                goal={goal}
                profile={profile}
                onOpenAddWeighIn={() => {
                  setEditingWeighIn(null);
                  setIsWeighInModalOpen(true);
                }}
                onOpenEditWeighIn={(w) => {
                  setEditingWeighIn(w);
                  setIsWeighInModalOpen(true);
                }}
                onDeleteWeighIn={handleDeleteWeighIn}
                onOpenAddMeasurement={() => {
                  setEditingMeasurement(null);
                  setIsMeasurementModalOpen(true);
                }}
                onOpenEditMeasurement={(m) => {
                  setEditingMeasurement(m);
                  setIsMeasurementModalOpen(true);
                }}
                onDeleteMeasurement={handleDeleteMeasurement}
                onUpdateGoal={(newGoal) => {
                  StorageService.updateGoal(newGoal);
                  setGoal(newGoal);
                }}
              />
            )}

            {currentTab === 'nutrition' && (
              <NutritionView
                currentDate={currentDate}
                onDateChange={setCurrentDate}
                nutritionTarget={nutritionTarget}
                onUpdateTarget={(target) => {
                  StorageService.updateNutritionTarget(target);
                  setNutritionTarget(target);
                }}
                profile={profile}
                foods={foods}
                foodLogs={foodLogs}
                onOpenAddFoodLog={(mealType) => {
                  setEditingFoodLog(null);
                  setFoodLogDefaultMeal(mealType || 'almuerzo');
                  setIsFoodLogModalOpen(true);
                }}
                onOpenEditFoodLog={(log) => {
                  setEditingFoodLog(log);
                  setIsFoodLogModalOpen(true);
                }}
                onDeleteFoodLog={handleDeleteFoodLog}
                onOpenCreateCustomFood={() => setIsCustomFoodModalOpen(true)}
                onImportFoodLogs={handleBatchImportFoodLogs}
              />
            )}

            {currentTab === 'workout' && (
              <WorkoutView
                routines={routines}
                exercises={exercises}
                sessions={sessions}
                onStartSession={() => {
                  setEditingSession(null);
                  setIsActiveWorkoutModalOpen(true);
                }}
                onEditSession={(sess) => {
                  setEditingSession(sess);
                  setIsActiveWorkoutModalOpen(true);
                }}
                onDeleteSession={handleDeleteWorkoutSession}
                onUpdateRoutine={(rot) => {
                  StorageService.saveRoutine(rot);
                  setRoutines(StorageService.getRoutines());
                }}
                onSaveExercise={(ex) => {
                  StorageService.saveExercise(ex);
                  setExercises(StorageService.getExercises());
                }}
              />
            )}

            {currentTab === 'activity' && (
              <ActivityView
                currentDate={currentDate}
                activityLogs={activityLogs}
                recoveryLogs={recoveryLogs}
                onSaveActivity={handleSaveActivity}
                onSaveRecovery={handleSaveRecovery}
              />
            )}

            {currentTab === 'photos' && (
              <PhotosView
                photos={photos}
                weighIns={weighIns}
                measurements={measurements}
                onAddPhoto={handleAddPhoto}
                onDeletePhoto={handleDeletePhoto}
                autoOpenUpload={isPhotoUploadTriggered}
                onResetAutoOpenUpload={() => setIsPhotoUploadTriggered(false)}
              />
            )}

            {currentTab === 'review' && (
              <WeeklyReviewView
                reviews={reviews}
                weighIns={weighIns}
                foodLogs={foodLogs}
                measurements={measurements}
                nutritionTarget={nutritionTarget}
                profile={profile}
                onSaveReview={handleSaveReview}
                onApplyCalorieAdjustment={handleApplyCalorieAdjustment}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                profile={profile}
                weighIns={weighIns}
                measurements={measurements}
                foodLogs={foodLogs}
                workoutSessions={sessions}
                activityLogs={activityLogs}
                reviews={reviews}
                nutritionTarget={nutritionTarget}
              />
            )}

            {currentTab === 'integrations' && (
              <IntegrationsView
                onDataImported={() => {
                  setFoodLogs(StorageService.getFoodLogs());
                  setSessions(StorageService.getWorkoutSessions());
                  setWeighIns(StorageService.getWeighIns());
                  setMeasurements(StorageService.getBodyMeasurements());
                  setActivityLogs(StorageService.getActivityLogs());
                  setRecoveryLogs(StorageService.getRecoveryLogs());
                }}
              />
            )}

            {currentTab === 'profile' && (
              <ProfileView
                profile={profile}
                onUpdateProfile={(p) => {
                  StorageService.updateProfile(p);
                  setProfile(p);
                }}
              />
            )}

            {currentTab === 'admin' && authSession && (
              <AdminDashboardView
                currentUser={authSession.user}
                token={authSession.token}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenMoreMenu={() => setIsMobileMoreOpen(true)}
      />

      {/* Mobile "More" Drawer Modal */}
      <Modal
        isOpen={isMobileMoreOpen}
        onClose={() => setIsMobileMoreOpen(false)}
        title="Más Módulos de BodyTrack Pro"
        maxWidth="sm"
      >
        <div className="space-y-1.5 py-1">
          {[
            { id: 'integrations' as NavTab, label: 'Integraciones y Conectores' },
            { id: 'activity' as NavTab, label: 'Actividad y Recuperación' },
            { id: 'photos' as NavTab, label: 'Fotos de Progreso Físico' },
            { id: 'reports' as NavTab, label: 'Informes y Exportación CSV' },
            { id: 'profile' as NavTab, label: 'Perfil, Privacidad y Borrado RGPD' },
            ...(isAdmin ? [{ id: 'admin' as NavTab, label: 'Panel Admin Beta Privada' }] : []),
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                handleSelectTab(item.id);
                setIsMobileMoreOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold hover:bg-zinc-800 text-zinc-200 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </Modal>

      {/* Global Quick Action Modal */}
      <QuickActionModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        onSelectAction={handleSelectQuickAction}
      />

      {/* Weigh-in Modal */}
      <WeighInModal
        isOpen={isWeighInModalOpen}
        onClose={() => {
          setIsWeighInModalOpen(false);
          setEditingWeighIn(null);
        }}
        onSave={handleSaveWeighIn}
        initialWeighIn={editingWeighIn}
        defaultDate={currentDate}
      />

      {/* Body Measurement Modal */}
      <MeasurementModal
        isOpen={isMeasurementModalOpen}
        onClose={() => {
          setIsMeasurementModalOpen(false);
          setEditingMeasurement(null);
        }}
        onSave={handleSaveMeasurement}
        profile={profile}
        initialMeasurement={editingMeasurement}
        defaultDate={currentDate}
        currentWeightKg={weighIns[weighIns.length - 1]?.weight_kg || 84.3}
      />

      {/* Food Log Modal */}
      <FoodLogModal
        isOpen={isFoodLogModalOpen}
        onClose={() => {
          setIsFoodLogModalOpen(false);
          setEditingFoodLog(null);
        }}
        onSave={handleSaveFoodLog}
        onOpenCreateCustomFood={() => {
          setIsFoodLogModalOpen(false);
          setIsCustomFoodModalOpen(true);
        }}
        foods={foods}
        initialLog={editingFoodLog}
        defaultDate={currentDate}
        defaultMealType={foodLogDefaultMeal}
      />

      {/* Custom Food Creation Modal */}
      <CustomFoodModal
        isOpen={isCustomFoodModalOpen}
        onClose={() => setIsCustomFoodModalOpen(false)}
        onSave={handleSaveCustomFood}
      />

      {/* Active Workout Session Modal */}
      <ActiveWorkoutModal
        isOpen={isActiveWorkoutModalOpen}
        onClose={() => {
          setIsActiveWorkoutModalOpen(false);
          setEditingSession(null);
        }}
        onSaveSession={handleSaveWorkoutSession}
        routines={routines}
        exercisesCatalog={exercises}
        initialSession={editingSession}
      />

      {/* Private Beta Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Private Beta Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        userEmail={authSession?.user.email}
        initialProfile={profile}
        initialGoal={goal}
        onComplete={handleOnboardingComplete}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {/* Integrated Beta Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userToken={authSession?.token}
        userEmail={authSession?.user.email}
      />
    </div>
  );
}
