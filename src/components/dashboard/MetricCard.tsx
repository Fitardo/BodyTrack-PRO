/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  secondaryText?: string;
  badge?: {
    text: string;
    type: 'positive' | 'negative' | 'neutral' | 'warning' | 'info';
  };
  icon?: LucideIcon;
  onClick?: () => void;
  accentColor?: 'emerald' | 'cyan' | 'amber' | 'violet' | 'zinc';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  secondaryText,
  badge,
  icon: Icon,
  onClick,
  accentColor = 'zinc',
}) => {
  const badgeColors = {
    positive: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    negative: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }[badge?.type || 'neutral'];

  const iconColors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    zinc: 'text-zinc-300 bg-zinc-800 border-zinc-700',
  }[accentColor];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 transition-all ${
        onClick ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border ${iconColors}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
        {unit && <span className="text-xs font-semibold text-zinc-400">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
        {secondaryText && (
          <span className="text-[11px] text-zinc-400 truncate">{secondaryText}</span>
        )}
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeColors}`}>
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};
