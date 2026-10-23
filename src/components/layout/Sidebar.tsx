/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Scale,
  Utensils,
  Dumbbell,
  Footprints,
  Camera,
  LineChart,
  FileText,
  UserCog,
  CheckCircle2,
  Link2,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'weight'
  | 'nutrition'
  | 'workout'
  | 'activity'
  | 'photos'
  | 'review'
  | 'reports'
  | 'integrations'
  | 'profile'
  | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  streakCount: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  streakCount,
  isAdmin = false,
}) => {
  const navItems: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'weight', label: 'Peso y Medidas', icon: Scale },
    { id: 'nutrition', label: 'Nutrición y Macros', icon: Utensils },
    { id: 'workout', label: 'Entrenamiento PPL', icon: Dumbbell },
    { id: 'activity', label: 'Actividad y Recuperación', icon: Footprints },
    { id: 'photos', label: 'Fotos de Progreso', icon: Camera },
    { id: 'review', label: 'Revisión y Ajustes', icon: LineChart },
    { id: 'reports', label: 'Informes y Exportación', icon: FileText },
    { id: 'integrations', label: 'Integraciones', icon: Link2 },
    { id: 'profile', label: 'Perfil y Metas', icon: UserCog },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Panel Admin Beta', icon: ShieldCheck });
  }

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-950 p-4 shrink-0 justify-between">
      <div className="space-y-6">
        {/* Habit Streak pill */}
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Consistencia</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {streakCount} {streakCount === 1 ? 'día' : 'días'}
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (streakCount / 7) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-400 mt-1">Registros diarios completos</p>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1" aria-label="Navegación principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-800/90 text-white shadow-xs font-semibold border-l-2 border-emerald-500 pl-2.5'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-zinc-800 text-[11px] text-zinc-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Zona horaria</span>
          <span className="text-zinc-400 font-mono text-[10px]">Catamarca (ART)</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Ecuación basal</span>
          <span className="text-zinc-400 text-[10px]">Mifflin–St Jeor</span>
        </div>
      </div>
    </aside>
  );
};
