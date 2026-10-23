/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthSession } from '../../types/auth';
import {
  Lock,
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  HelpCircle,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (session: AuthSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('BETA-PRO-2026');
  const [inviteValidating, setInviteValidating] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<{ valid: boolean; message: string } | null>(null);

  // Recovery fields
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteStatus(null);
      return;
    }
    setInviteValidating(true);
    try {
      const res = await fetch(`/api/auth/validate-invite?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setInviteStatus({ valid: true, message: data.notes || 'Invitación válida' });
      } else {
        setInviteStatus({ valid: false, message: data.message || 'Código inválido' });
      }
    } catch {
      setInviteStatus(null);
    } finally {
      setInviteValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Credenciales incorrectas');
        }
        onAuthSuccess(data.session);
        onClose();
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name, inviteCode }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Error al registrar la cuenta');
        }
        onAuthSuccess(data.session);
        onClose();
      } else if (mode === 'recover') {
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
          setSuccessMsg('Se ha generado un código de recuperación. Ingresa tu nueva contraseña.');
        } else {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: recoveryToken, newPassword }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error al restablecer contraseña');
          }
          setSuccessMsg('Contraseña actualizada. Ahora puedes iniciar sesión.');
          setMode('login');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (type: 'admin' | 'tester') => {
    if (type === 'admin') {
      setEmail('admin@bodytrack.pro');
      setPassword('BodyTrackAdmin2026!');
      setMode('login');
    } else {
      setEmail('beta.tester@bodytrack.pro');
      setPassword('BetaTester2026!');
      setMode('login');
    }
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                BodyTrack Pro
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  BETA PRIVADA
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Acceso exclusivo mediante invitación</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-950/80 border-b border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'login' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              validateInviteCode(inviteCode);
            }}
            className={`py-2 rounded-lg transition-colors ${
              mode === 'register' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Registro con Invitación
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Código de Invitación</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setInviteCode(val);
                      validateInviteCode(val);
                    }}
                    placeholder="BETA-PRO-2026"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-white font-mono uppercase focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                {inviteStatus && (
                  <p
                    className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
                      inviteStatus.valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {inviteStatus.valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{inviteStatus.message}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre o alias"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>
            </>
          )}

          {mode !== 'recover' || !recoverySent ? (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ejemplo.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          ) : null}

          {mode === 'recover' && recoverySent && (
            <>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Token de Recuperación</label>
                <input
                  type="text"
                  required
                  value={recoveryToken}
                  onChange={(e) => setRecoveryToken(e.target.value)}
                  placeholder="Token recibido"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nueva Contraseña (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-white"
                />
              </div>
            </>
          )}

          {mode !== 'recover' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-300 font-semibold">Contraseña</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recover');
                      setErrorMsg(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-1.5 mt-2"
          >
            <span>
              {loading
                ? 'Verificando...'
                : mode === 'login'
                ? 'Iniciar Sesión en Beta'
                : mode === 'register'
                ? 'Completar Registro con Invitación'
                : recoverySent
                ? 'Guardar Nueva Contraseña'
                : 'Generar Código de Recuperación'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Accounts Quick-Select for Review */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800/80 space-y-2 text-[11px]">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="flex items-center gap-1 font-semibold text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Accesos rápidos para evaluación:</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-left border border-zinc-800 text-zinc-300 transition-colors"
            >
              <span className="font-bold text-white block">Rol: Administrador</span>
              <span className="text-[10px] text-zinc-500 font-mono">admin@bodytrack.pro</span>
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('tester')}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-left border border-zinc-800 text-zinc-300 transition-colors"
            >
              <span className="font-bold text-white block">Rol: Evaluador Beta</span>
              <span className="text-[10px] text-zinc-500 font-mono">beta.tester@bodytrack.pro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
