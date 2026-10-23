import React from 'react';
import { Activity, Plus, Moon, Sun, ShieldCheck, MessageSquarePlus, LogOut, UserCheck, KeyRound } from 'lucide-react';
import { AuthUser } from '../../types/auth';

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
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-tight font-mono">BODYTRACK</span>
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
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
        {/* Date Selector */}
        <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300">
          <label htmlFor="nav-date" className="text-zinc-400 mr-1.5 hidden md:inline">Fecha:</label>
          <input
            id="nav-date"
            type="date"
            value={currentDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-white border-0 focus:outline-none focus:ring-0 text-xs cursor-pointer"
          />
        </div>

        {/* Feedback Button */}
        {onOpenFeedback && (
          <button
            type="button"
            onClick={onOpenFeedback}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors"
            title="Enviar comentario o reportar incidencia"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Feedback Beta</span>
          </button>
        )}

        {/* Security / Offline Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400" title="Almacenamiento local privado en navegador. No se envían fotos ni datos personales a terceros.">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Privado & Aislado</span>
        </div>

        {/* User Account / Auth Status */}
        {currentUser ? (
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1 pr-2">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                currentUser.role === 'admin'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}
            >
              {currentUser.role}
            </span>
            <span className="text-xs text-zinc-200 font-semibold max-w-[100px] truncate hidden sm:inline" title={currentUser.name}>
              {currentUser.name}
            </span>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                title="Cerrar sesión"
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 text-xs font-semibold transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Acceso Beta</span>
            </button>
          )
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-200" />}
        </button>

        {/* Quick Log Action */}
        <button
          type="button"
          onClick={onOpenQuickLog}
          aria-label="Registrar hoy"
          className="flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs tracking-wide shadow-sm shadow-emerald-500/20 active:scale-98 transition-all shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline ml-1">Registrar hoy</span>
        </button>
      </div>
    </header>
  );
};
