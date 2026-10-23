import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Moon,
  Sun,
  ShieldCheck,
  MessageSquarePlus,
  LogOut,
  KeyRound,
  Wifi,
  WifiOff,
  Calendar,
} from 'lucide-react';
import { AuthUser } from '../../types/auth';
import { validateManualDateInput } from '../../utils/auditAndRetentionUtils';

interface NavbarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenQuickLog: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser?: AuthUser | null;
  onOpenFeedback?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onDateChange,
  onOpenQuickLog,
  theme,
  onToggleTheme,
  currentUser,
  onOpenFeedback,
  onOpenAuth,
  onLogout,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [manualDateText, setManualDateText] = useState<string>(currentDate);
  const [isManualDateMode, setIsManualDateMode] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    setManualDateText(currentDate);
  }, [currentDate]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleManualDateBlur = () => {
    const check = validateManualDateInput(manualDateText);
    if (check.valid && check.isoDate) {
      setDateError(null);
      onDateChange(check.isoDate);
      setManualDateText(check.isoDate);
    } else {
      setDateError(check.error || 'Fecha inválida');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight font-mono">
              BODYTRACK
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 block -mt-0.5 font-sans">
            Recomposición Corporal
          </span>
        </div>
      </div>

      {/* Date & Beta Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        {/* Mobile + Desktop Date Selector with Manual Entry Toggle */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 gap-1.5 relative">
          <button
            type="button"
            onClick={() => {
              setIsManualDateMode(!isManualDateMode);
              setDateError(null);
            }}
            data-testid="navbar-toggle-manual-date"
            title="Alternar entre selector calendario e ingreso manual (YYYY-MM-DD / DD/MM/AAAA)"
            className="text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Fecha:</span>
          </button>

          {isManualDateMode ? (
            <input
              id="nav-date-manual"
              data-testid="nav-date-manual-input"
              type="text"
              inputMode="numeric"
              placeholder="YYYY-MM-DD o DD/MM/AAAA"
              value={manualDateText}
              onChange={(e) => setManualDateText(e.target.value)}
              onBlur={handleManualDateBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualDateBlur();
              }}
              className="w-28 bg-zinc-950 text-white border border-zinc-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 text-xs font-mono"
            />
          ) : (
            <input
              id="nav-date"
              data-testid="nav-date-picker"
              type="date"
              min="2020-01-01"
              max="2030-12-31"
              value={currentDate}
              onChange={(e) => {
                const check = validateManualDateInput(e.target.value);
                if (check.valid && check.isoDate) {
                  setDateError(null);
                  onDateChange(check.isoDate);
                }
              }}
              className="bg-transparent text-white border-0 focus:outline-none focus:ring-0 text-xs font-mono cursor-pointer"
            />
          )}

          {dateError && (
            <span className="absolute -bottom-5 left-0 text-[10px] text-rose-400 bg-zinc-950 border border-rose-500/30 px-1.5 py-0.5 rounded whitespace-nowrap z-50">
              {dateError}
            </span>
          )}
        </div>

        {/* Feedback Button */}
        {onOpenFeedback && (
          <button
            type="button"
            onClick={onOpenFeedback}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
            title="Enviar comentario o reportar incidencia"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Feedback</span>
          </button>
        )}

        {/* Security / Offline Architecture Status Badge */}
        <div
          data-testid="navbar-offline-status-badge"
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
            isOnline
              ? 'bg-zinc-900 border-zinc-800 text-zinc-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}
          title="Modo Offline-First activo: CRUD 100% persistente en almacenamiento local aislado con cola de sincronización."
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local + Sync Activo</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Offline Activo</span>
            </>
          )}
        </div>

        {/* User Account / Full-Screen Auth Trigger */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 pr-2">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                currentUser.role === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {currentUser.role}
            </span>
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-xs text-white font-bold max-w-[120px] truncate hidden sm:inline hover:underline cursor-pointer"
              title="Abrir pantalla de cuenta / cambiar modo"
            >
              {currentUser.name}
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-zinc-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                title="Cerrar sesión y volver a pantalla Log In / Sign Up"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          onOpenAuth && (
            <button
              type="button"
              onClick={onOpenAuth}
              data-testid="navbar-open-auth-btn"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Log In / Sign Up</span>
            </button>
          )
        )}

        {/* Explicit Theme Toggle with High-Contrast Label */}
        <button
          type="button"
          onClick={onToggleTheme}
          data-testid="navbar-theme-toggle-btn"
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className="px-2.5 py-1.5 text-zinc-200 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden lg:inline">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">Modo Oscuro</span>
            </>
          )}
        </button>

        {/* Quick Log Action */}
        <button
          type="button"
          onClick={onOpenQuickLog}
          aria-label="Registrar hoy"
          className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs tracking-wide shadow-sm shadow-emerald-500/20 active:scale-98 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline ml-1">Registrar hoy</span>
        </button>
      </div>
    </header>
  );
};
