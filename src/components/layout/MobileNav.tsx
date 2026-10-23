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
  LineChart,
  Menu,
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface MobileNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenMoreMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMoreMenu,
}) => {
  const quickTabs: Array<{ id: NavTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
    { id: 'weight', label: 'Peso', icon: Scale },
    { id: 'nutrition', label: 'Macros', icon: Utensils },
    { id: 'workout', label: 'Entreno', icon: Dumbbell },
    { id: 'review', label: 'Revisión', icon: LineChart },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 px-2 py-1.5 flex items-center justify-around"
      aria-label="Navegación móvil inferior"
    >
      {quickTabs.map((t) => {
        const Icon = t.icon;
        const isActive = currentTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTab(t.id)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>{t.label}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onOpenMoreMenu}
        aria-label="Abrir más módulos de navegación"
        className="flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-zinc-200"
      >
        <Menu className="w-5 h-5 mb-0.5 text-zinc-400" />
        <span>Más</span>
      </button>
    </nav>
  );
};
