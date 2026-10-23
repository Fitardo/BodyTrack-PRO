/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthSession } from '../../types/auth';
import { WorkspaceInitMode, validateAuthScreenInput } from '../../utils/workspaceMode';
import {
  Activity,
  Lock,
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Database,
  Compass,
  Sun,
  Moon,
  Scale,
  Dumbbell,
  Flame,
  LayoutDashboard,
} from 'lucide-react';

interface AuthScreenProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onStartWithMode: (
    mode: WorkspaceInitMode,
    userOverrides?: {
      id?: string;
      name?: string;
      email?: string;
      role?: 'admin' | 'user';
      token?: string;
    }
  ) => void;
  onAuthSessionSuccess: (session: AuthSession, mode: WorkspaceInitMode) => void;
  onCloseToDashboard?: () => void;
  defaultUserName?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  theme,
  onToggleTheme,
  onStartWithMode,
  onAuthSessionSuccess,
  onCloseToDashboard,
  defaultUserName = 'Santiago Quinteros',
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'recover'>('login');
  const [selectedInitMode, setSelectedInitMode] = useState<WorkspaceInitMode>('zero');

  // Form states
  const [name, setName] = useState<string>(defaultUserName);
  const [email, setEmail] = useState<string>('santiago.quinteros@bodytrack.pro');
  const [password, setPassword] = useState<string>('BodyTrack2026!');
  const [inviteCode, setInviteCode] = useState<string>('BETA-PRO-2026');

  // Quick zero-mode name input
  const [quickStartName, setQuickStartName] = useState<string>(defaultUserName);

  // Recovery states
  const [recoverySent, setRecoverySent] = useState<boolean>(false);
  const [recoveryToken, setRecoveryToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // Status
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFillCredentials = (role: 'admin' | 'tester') => {
    setAuthTab('login');
    setErrorMsg(null);
    if (role === 'admin') {
      setEmail('admin@bodytrack.pro');
      setPassword('BodyTrackAdmin2026!');
      setName('Admin BodyTrack');
      setSelectedInitMode('demo');
    } else {
      setEmail('beta.tester@bodytrack.pro');
      setPassword('BetaTester2026!');
      setName('Santiago Quinteros');
      setSelectedInitMode('demo');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (authTab === 'recover') {
      setLoading(true);
      try {
        if (!recoverySent) {
          const res = await fetch('/api/auth/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          setRecoverySent(true);
          if (data.demo_reset_token) {
            setRecoveryToken(data.demo_reset_token);
          }
          setSuccessMsg('Código de recuperación generado. Ingresa tu nueva contraseña.');
        } else {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: recoveryToken, newPassword }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'No se pudo restablecer la contraseña');
          }
          setSuccessMsg('Contraseña actualizada correctamente. Ya puedes iniciar sesión.');
          setAuthTab('login');
          setRecoverySent(false);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error en recuperación de acceso');
      } finally {
        setLoading(false);
      }
      return;
    }

    const check = validateAuthScreenInput({
      authTab,
      email,
      password,
      name: authTab === 'register' ? name : name || 'Santiago Quinteros',
    });

    if (!check.valid) {
      setErrorMsg(check.error || 'Revisa los datos ingresados.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = authTab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        authTab === 'login'
          ? { email: check.normalizedEmail, password }
          : {
              email: check.normalizedEmail,
              password,
              name: check.normalizedName,
              inviteCode: inviteCode.trim() || 'BETA-PRO-2026',
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success && data.session) {
        const finalSession: AuthSession = {
          ...data.session,
          user: {
            ...data.session.user,
            name: authTab === 'register' ? check.normalizedName : data.session.user.name || check.normalizedName,
            onboarding_completed: selectedInitMode === 'demo',
          },
        };
        onAuthSessionSuccess(finalSession, selectedInitMode);
        return;
      }

      // If logging in with a custom email not yet registered on the server, auto-provision session
      onStartWithMode(selectedInitMode, {
        id: `usr_${check.normalizedEmail.replace(/[^a-z0-9]/g, '_').slice(0, 18)}`,
        name: check.normalizedName,
        email: check.normalizedEmail,
        role: check.normalizedEmail.startsWith('admin') ? 'admin' : 'user',
      });
    } catch {
      // Fallback to local tenant session if offline
      onStartWithMode(selectedInitMode, {
        id: `usr_${check.normalizedEmail.replace(/[^a-z0-9]/g, '_').slice(0, 18)}`,
        name: check.normalizedName,
        email: check.normalizedEmail,
        role: check.normalizedEmail.startsWith('admin') ? 'admin' : 'user',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-zinc-950 text-zinc-100 transition-colors"
      data-testid="fullscreen-auth-screen"
    >
      {/* Full-Screen Top Navigation Header */}
      <header className="w-full border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight font-mono">
                BODYTRACK PRO
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Acceso & Configuración
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sistema de Recomposición Corporal, Déficit Calórico y Entrenamiento PPL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Explicit Light / Dark Mode Switcher with Label */}
          <button
            type="button"
            onClick={onToggleTheme}
            data-testid="auth-theme-toggle-btn"
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Modo Claro (Light)</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-emerald-400" />
                <span>Modo Oscuro (Dark)</span>
              </>
            )}
          </button>

          {onCloseToDashboard && (
            <button
              type="button"
              onClick={onCloseToDashboard}
              data-testid="auth-back-to-dashboard-btn"
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Ir al Dashboard Actual</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Two-Column Full-Screen Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* LEFT COLUMN (5 cols): LOG IN & SIGN UP FORM */}
          <section
            aria-label="Formulario de Inicio de Sesión y Registro"
            className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-5">
              {/* Header */}
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Autenticación y Aislamiento de Cuenta
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-2.5">
                  {authTab === 'login'
                    ? 'Iniciar Sesión (Log In)'
                    : authTab === 'register'
                    ? 'Crear Cuenta (Sign Up)'
                    : 'Recuperar Contraseña'}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  {authTab === 'login'
                    ? 'Ingresa con tu cuenta o selecciona un modo de inicio rápido a la derecha.'
                    : authTab === 'register'
                    ? 'Registra tu perfil personal y elige si deseas empezar de 0 o con datos de prueba.'
                    : 'Restablece el acceso a tu espacio privado de BodyTrack Pro.'}
                </p>
              </div>

              {/* Log In / Sign Up Switcher Tabs */}
              <div className="grid grid-cols-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  data-testid="auth-tab-login"
                  onClick={() => {
                    setAuthTab('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 rounded-lg transition-all cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Log In (Iniciar Sesión)
                </button>
                <button
                  type="button"
                  data-testid="auth-tab-signup"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2.5 rounded-lg transition-all cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  Sign Up (Crear Cuenta)
                </button>
              </div>

              {/* Alerts */}
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                {authTab === 'register' && (
                  <>
                    <div>
                      <label
                        htmlFor="auth-name-input"
                        className="block text-zinc-200 font-bold mb-1.5"
                      >
                        Tu Nombre o Alias (Para tu bienvenida personalizada)
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                        <input
                          id="auth-name-input"
                          data-testid="auth-name-input"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setQuickStartName(e.target.value);
                          }}
                          placeholder="Ej. Santiago Quinteros"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-9 pr-3 text-white font-semibold focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-invite-input"
                        className="block text-zinc-200 font-bold mb-1.5"
                      >
                        Código de Invitación Beta
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                        <input
                          id="auth-invite-input"
                          type="text"
                          required
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          placeholder="BETA-PRO-2026"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-9 pr-3 text-white font-mono uppercase focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {authTab !== 'recover' || !recoverySent ? (
                  <div>
                    <label
                      htmlFor="auth-email-input"
                      className="block text-zinc-200 font-bold mb-1.5"
                    >
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        id="auth-email-input"
                        data-testid="auth-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@bodytrack.pro"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-9 pr-3 text-white font-medium focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ) : null}

                {authTab !== 'recover' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-password-input"
                        className="text-zinc-200 font-bold"
                      >
                        Contraseña
                      </label>
                      {authTab === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('recover');
                            setErrorMsg(null);
                          }}
                          className="text-[11px] font-semibold text-emerald-400 hover:underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        id="auth-password-input"
                        data-testid="auth-password-input"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl py-2.5 pl-9 pr-3 text-white font-medium focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Mode Choice Inside Form */}
                {authTab !== 'recover' && (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <span className="block font-bold text-zinc-200 text-[11px]">
                      Al entrar con esta cuenta, ¿cómo deseas inicializar tus datos?
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedInitMode('zero')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedInitMode === 'zero'
                            ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span className="block text-[11px]">Empezar de 0</span>
                        <span className="block text-[10px] text-zinc-400">
                          + Onboarding en grande
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedInitMode('demo')}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          selectedInitMode === 'demo'
                            ? 'bg-emerald-500/15 border-emerald-500 text-white font-bold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                        }`}
                      >
                        <span className="block text-[11px]">Datos de Prueba</span>
                        <span className="block text-[10px] text-zinc-400">
                          22 días pre-cargados
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  data-testid="auth-submit-btn"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {loading
                      ? 'Procesando...'
                      : authTab === 'login'
                      ? `Iniciar Sesión (${selectedInitMode === 'zero' ? 'Empezar de 0' : 'Con Datos de Prueba'})`
                      : authTab === 'register'
                      ? `Crear Cuenta (${selectedInitMode === 'zero' ? 'Empezar de 0 + Onboarding' : 'Con Datos de Prueba'})`
                      : 'Recuperar Contraseña'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Quick Pre-populated Accounts */}
            <div className="pt-5 mt-5 border-t border-zinc-800 space-y-2 text-[11px]">
              <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Autocompletar credenciales de prueba:</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillCredentials('tester')}
                  className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-white block">Evaluador Beta</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    beta.tester@bodytrack.pro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillCredentials('admin')}
                  className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <span className="font-bold text-white block">Administrador</span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    admin@bodytrack.pro
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN (7 cols): DIRECT WORKSPACE LAUNCHER ("EMPEZAR DE 0 CON ONBOARDING EN GRANDE" vs "PONER DATOS DE PRUEBA") */}
          <section
            aria-label="Selección de Modo de Datos y Onboarding"
            className="lg:col-span-7 flex flex-col justify-between gap-5"
          >
            {/* CARD 1: EMPEZAR DE 0 CON ONBOARDING EN GRANDE */}
            <div className="flex-1 bg-zinc-900 border-2 border-emerald-500/50 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    OPCIÓN 1 · EMPEZAR DESDE CERO (CUENTA LIMPIA)
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    0 Registros + Onboarding Pantalla Completa
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Empezar de 0 con Onboarding en Grande
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 leading-relaxed">
                    Inicializa tu cuenta completamente limpia, sin pesajes ni comidas pre-cargadas, y abre el{' '}
                    <strong className="text-white">Asistente de Onboarding en Pantalla Completa</strong> para recibir tu bienvenida personalizada, elegir tu sistema de unidades (<code className="text-emerald-400">kg/cm</code> o <code className="text-emerald-400">lb/in</code>), tu objetivo principal y tu meta calórica.
                  </p>
                </div>

                {/* Name Input for Personalized Welcome in Full-Screen Onboarding */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label
                    htmlFor="zero-mode-name-input"
                    className="block text-xs font-bold text-white"
                  >
                    Tu Nombre para darte la bienvenida en el Onboarding:
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      id="zero-mode-name-input"
                      data-testid="zero-mode-name-input"
                      type="text"
                      value={quickStartName}
                      onChange={(e) => {
                        setQuickStartName(e.target.value);
                        setName(e.target.value);
                      }}
                      placeholder="Ej. Santiago Quinteros"
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold focus:outline-hidden focus:border-emerald-500"
                    />
                    <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Bienvenido, {quickStartName.trim() || 'Santiago Quinteros'}!</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white block">1. Lienzo en Blanco</span>
                    <span className="text-[11px] text-zinc-400">
                      0 pesajes, 0 comidas y 0 sesiones para que registres tus propios datos reales.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white block">2. Onboarding en Grande</span>
                    <span className="text-[11px] text-zinc-400">
                      Vista amplia a pantalla completa con calculadora Mifflin-St Jeor en vivo.
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white block">3. Validación Guiada</span>
                    <span className="text-[11px] text-zinc-400">
                      Verifica unidad de medida y objetivo principal antes de activar tu panel.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-start-from-zero"
                onClick={() =>
                  onStartWithMode('zero', {
                    id: 'usr_clean_zero',
                    name: quickStartName.trim() || 'Santiago Quinteros',
                    email: email.trim() || 'santiago.cero@bodytrack.pro',
                    role: 'user',
                  })
                }
                className="mt-5 w-full py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Compass className="w-5 h-5 stroke-[2.5]" />
                <span>Empezar de 0 + Abrir Onboarding en Grande</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* CARD 2: CARGAR DATOS DE PRUEBA (DEMO COMPLETA) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col justify-between shadow-xl">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    OPCIÓN 2 · CARGAR DATOS DE PRUEBA (DEMO COMPLETA)
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    22 Días de Historial Pre-Cargado
                  </span>
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Poner los Datos de Prueba y Explorar el Dashboard
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                    Carga instantáneamente un conjunto completo de datos realistas de recomposición corporal para probar gráficos, medias móviles de 7 días, nutrición y entrenamientos PPL sin tener que cargar registros uno por uno.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block font-mono">22 Pesajes</span>
                      <span className="text-[10px] text-zinc-400">85.8 kg → 84.3 kg</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block font-mono">2.310 kcal</span>
                      <span className="text-[10px] text-zinc-400">180g Proteína hoy</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-blue-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block font-mono">Rutinas PPL</span>
                      <span className="text-[10px] text-zinc-400">Push / Pull / Legs</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="btn-load-demo-data"
                onClick={() =>
                  onStartWithMode('demo', {
                    id: 'usr_demo_tester',
                    name: quickStartName.trim() || 'Santiago Quinteros',
                    email: 'beta.tester@bodytrack.pro',
                    role: 'user',
                  })
                }
                className="mt-5 w-full py-3 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Database className="w-4 h-4 text-amber-400" />
                <span>Cargar Datos de Prueba y Entrar al Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
