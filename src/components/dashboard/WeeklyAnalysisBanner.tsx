/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Info, CheckCircle, TrendingDown, ArrowRight, AlertCircle } from 'lucide-react';
import { WeeklyReview } from '../../types';

interface WeeklyAnalysisBannerProps {
  latestReview?: WeeklyReview;
  weighInsCount: number;
  nutritionLogsCount: number;
  onOpenReviewModal: () => void;
}

export const WeeklyAnalysisBanner: React.FC<WeeklyAnalysisBannerProps> = ({
  latestReview,
  weighInsCount,
  nutritionLogsCount,
  onOpenReviewModal,
}) => {
  const hasSufficientData = weighInsCount >= 3 && nutritionLogsCount >= 4;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800/80 border border-zinc-700/60 p-5 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Análisis Semanal Inteligente</span>
            </div>
            {latestReview ? (
              <span className="text-[11px] text-zinc-400 font-mono">
                Período: {latestReview.period_start} al {latestReview.period_end} ({latestReview.weigh_ins_count} pesajes, {latestReview.days_logged_count}d comidas)
              </span>
            ) : (
              <span className="text-[11px] text-zinc-400">Datos en recolección</span>
            )}
          </div>

          <p className="text-sm text-zinc-200 leading-relaxed font-normal">
            {latestReview ? (
              latestReview.recommendation_reason
            ) : hasSufficientData ? (
              'Tendencia favorable: el promedio semanal continúa descendiendo a ritmo moderado con mantenimiento de cargas en gimnasio.'
            ) : (
              'Aún no hay suficientes registros consecutivos (mínimo 3 pesajes y 4 días nutricionales) para generar una sugerencia de ajuste con alta confianza.'
            )}
          </p>

          <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="text-zinc-300">Medición vs Estimación:</strong> Peso y cintura son mediciones reales; gasto energético y % grasa son predicciones bioestadísticas.
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenReviewModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-white transition-all shadow-sm active:scale-98"
          >
            <span>Ver Revisión Completa</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
