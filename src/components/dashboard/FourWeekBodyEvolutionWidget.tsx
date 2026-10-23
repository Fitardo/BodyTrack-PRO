/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Scale,
  Percent,
  TrendingDown,
  Layers,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { WeighIn, BodyMeasurement, PhysicalGoal } from '../../types';
import {
  calculateFourWeekBodyEvolutionData,
  BodyEvolutionPoint,
} from '../../utils/auditAndRetentionUtils';

interface FourWeekBodyEvolutionWidgetProps {
  currentDate: string;
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  goal: PhysicalGoal;
  onNavigateToTab: (tab: any) => void;
}

export type EvolutionMetricMode = 'weight' | 'body_fat' | 'dual';

export const FourWeekBodyEvolutionWidget: React.FC<FourWeekBodyEvolutionWidgetProps> = ({
  currentDate,
  weighIns,
  measurements,
  goal,
  onNavigateToTab,
}) => {
  const [metricMode, setMetricMode] = useState<EvolutionMetricMode>('weight');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const evolution = useMemo(
    () =>
      calculateFourWeekBodyEvolutionData({
        currentDate,
        weighIns,
        measurements,
        targetWeightKg: goal?.target_weight_kg,
        windowDays: 28,
      }),
    [currentDate, weighIns, measurements, goal?.target_weight_kg]
  );

  const { points, weightPoints, bodyFatPoints, weeklyBuckets, summary } = evolution;

  // Determine active point for the inspector bar
  const inspectedPoint: BodyEvolutionPoint | null = useMemo(() => {
    if (selectedDate) {
      const found = points.find((p) => p.date === selectedDate);
      if (found) return found;
    }
    if (metricMode === 'body_fat' && bodyFatPoints.length > 0) {
      return bodyFatPoints[bodyFatPoints.length - 1];
    }
    if (weightPoints.length > 0) {
      return weightPoints[weightPoints.length - 1];
    }
    return points[points.length - 1] ?? null;
  }, [selectedDate, points, weightPoints, bodyFatPoints, metricMode]);

  // SVG coordinate geometry
  const svgWidth = 820;
  const svgHeight = 250;
  const padLeft = 52;
  const padRight = 46;
  const padTop = 24;
  const padBottom = 38;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const totalDays = Math.max(1, points.length - 1);
  const getX = (dayIndex: number) => padLeft + (dayIndex / totalDays) * plotW;

  // Weight Y scale
  const weightMinBound =
    summary.minWeightKg !== null ? Math.floor((summary.minWeightKg - 0.6) * 2) / 2 : 75;
  const weightMaxBound =
    summary.maxWeightKg !== null ? Math.ceil((summary.maxWeightKg + 0.6) * 2) / 2 : 90;
  const weightSpan = Math.max(1, weightMaxBound - weightMinBound);
  const getWeightY = (val: number) =>
    padTop + plotH - ((val - weightMinBound) / weightSpan) * plotH;

  // Body Fat % Y scale
  const bfMinBound =
    summary.minBodyFatPct !== null ? Math.floor((summary.minBodyFatPct - 0.6) * 2) / 2 : 15;
  const bfMaxBound =
    summary.maxBodyFatPct !== null ? Math.ceil((summary.maxBodyFatPct + 0.6) * 2) / 2 : 28;
  const bfSpan = Math.max(1, bfMaxBound - bfMinBound);
  const getBfY = (val: number) => padTop + plotH - ((val - bfMinBound) / bfSpan) * plotH;

  // Build SVG polylines & paths
  const weightCoords = points
    .map((pt, idx) =>
      pt.weightKg !== null
        ? { x: getX(idx), y: getWeightY(pt.weightKg), pt, idx }
        : null
    )
    .filter((v): v is { x: number; y: number; pt: BodyEvolutionPoint; idx: number } => v !== null);

  const movingAvgCoords = points
    .map((pt, idx) =>
      pt.movingAvg7dKg !== null
        ? { x: getX(idx), y: getWeightY(pt.movingAvg7dKg), pt, idx }
        : null
    )
    .filter((v): v is { x: number; y: number; pt: BodyEvolutionPoint; idx: number } => v !== null);

  const bfMeasuredCoords = points
    .map((pt, idx) =>
      pt.bodyFatPct !== null
        ? { x: getX(idx), y: getBfY(pt.bodyFatPct), pt, idx }
        : null
    )
    .filter((v): v is { x: number; y: number; pt: BodyEvolutionPoint; idx: number } => v !== null);

  const weightLinePoints = weightCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const movingAvgLinePoints = movingAvgCoords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const bfLinePoints = bfMeasuredCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

  const weightAreaPath =
    weightCoords.length >= 2
      ? `M ${weightCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${weightCoords
          .map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(' L ')} L ${weightCoords[weightCoords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} Z`
      : '';

  const bfAreaPath =
    bfMeasuredCoords.length >= 2
      ? `M ${bfMeasuredCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${bfMeasuredCoords
          .map((c) => `${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(' L ')} L ${bfMeasuredCoords[bfMeasuredCoords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} Z`
      : '';

  // Y-axis ticks (4 horizontal grid lines)
  const yTicks = [0, 0.33, 0.67, 1].map((ratio) => {
    const y = padTop + plotH * (1 - ratio);
    const weightVal = (weightMinBound + ratio * weightSpan).toFixed(1);
    const bfVal = (bfMinBound + ratio * bfSpan).toFixed(1);
    return { y, weightVal, bfVal };
  });

  return (
    <section
      data-testid="four-week-body-evolution-widget"
      data-metric-mode={metricMode}
      aria-label="Evolución Corporal de las Últimas 4 Semanas"
      className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4"
    >
      {/* Header & Interactive Metric Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{evolution.periodLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-zinc-300">
              {summary.weightRecordsCount} pesajes
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-zinc-300">
              {summary.bodyFatRecordsCount} mediciones de % grasa
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            Evolución Corporal (Últimas 4 Semanas)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Tendencia lineal de 28 días con media móvil de 7 días y estimación antropométrica de grasa corporal.
          </p>
        </div>

        {/* Segmented Control to alternate between Weight, Body Fat %, and Dual */}
        <div
          data-testid="body-evolution-metric-toggle"
          className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 self-start lg:self-center"
        >
          <button
            type="button"
            data-testid="evolution-mode-weight-btn"
            onClick={() => setMetricMode('weight')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              metricMode === 'weight'
                ? 'bg-cyan-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Peso Corporal (kg)</span>
          </button>

          <button
            type="button"
            data-testid="evolution-mode-bodyfat-btn"
            onClick={() => setMetricMode('body_fat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              metricMode === 'body_fat'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>% Grasa Corporal</span>
          </button>

          <button
            type="button"
            data-testid="evolution-mode-dual-btn"
            onClick={() => setMetricMode('dual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              metricMode === 'dual'
                ? 'bg-emerald-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ambos</span>
          </button>
        </div>
      </div>

      {/* Top 4-Week KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            {metricMode === 'body_fat' ? '% Grasa Inicial → Actual' : 'Peso Inicial → Actual (4 sem)'}
          </span>
          {metricMode === 'body_fat' ? (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="evolution-kpi-primary-val"
                className="text-base font-bold font-mono text-white"
              >
                {summary.startBodyFatPct !== null && summary.latestBodyFatPct !== null
                  ? `${summary.startBodyFatPct}% → ${summary.latestBodyFatPct}%`
                  : 'Sin mediciones'}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="evolution-kpi-primary-val"
                className="text-base font-bold font-mono text-white"
              >
                {summary.startWeightKg !== null && summary.latestWeightKg !== null
                  ? `${summary.startWeightKg} → ${summary.latestWeightKg} kg`
                  : 'Sin pesajes'}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Cambio Acumulado (4 Semanas)
          </span>
          {metricMode === 'body_fat' ? (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="evolution-kpi-delta-val"
                className={`text-base font-bold font-mono ${
                  summary.bodyFatDelta4wPct !== null && summary.bodyFatDelta4wPct <= 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {summary.bodyFatDelta4wPct !== null
                  ? `${summary.bodyFatDelta4wPct > 0 ? '+' : ''}${summary.bodyFatDelta4wPct}%`
                  : '--'}
              </span>
              <span className="text-[11px] text-zinc-400">grasa est.</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                data-testid="evolution-kpi-delta-val"
                className={`text-base font-bold font-mono ${
                  summary.weightDelta4wKg !== null && summary.weightDelta4wKg <= 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {summary.weightDelta4wKg !== null
                  ? `${summary.weightDelta4wKg > 0 ? '+' : ''}${summary.weightDelta4wKg} kg`
                  : '--'}
              </span>
              {summary.weeklyWeightRateKg !== null && (
                <span className="text-[10px] font-mono text-zinc-400">
                  ({summary.weeklyWeightRateKg} kg/sem)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Media Móvil 7 Días Actual
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold font-mono text-cyan-400">
              {summary.latestMovingAvg7dKg !== null ? `${summary.latestMovingAvg7dKg} kg` : '--'}
            </span>
            <span className="text-[10px] text-zinc-400">tendencia real</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            % Grasa Corporal Actual
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-base font-bold font-mono text-amber-400">
              {summary.latestBodyFatPct !== null ? `${summary.latestBodyFatPct}%` : '--'}
            </span>
            {summary.latestWaistCm !== null && (
              <span className="text-[10px] font-mono text-zinc-400">
                (Cintura {summary.latestWaistCm} cm)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main 4-Week SVG Line Chart */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
        {/* Legend & Active Point Inspector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            {(metricMode === 'weight' || metricMode === 'dual') && (
              <>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                  <span>Peso Diario (kg)</span>
                </span>
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <span className="w-4 h-0.5 bg-emerald-400 inline-block" />
                  <span>Media Móvil 7d (kg)</span>
                </span>
              </>
            )}
            {(metricMode === 'body_fat' || metricMode === 'dual') && (
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>% Grasa Corporal (U.S. Navy / Bioimpedancia)</span>
              </span>
            )}
          </div>

          {inspectedPoint && (
            <div
              data-testid="evolution-selected-point-readout"
              className="text-xs font-mono text-zinc-300 flex items-center gap-2"
            >
              <span className="text-zinc-400">{inspectedPoint.shortLabel}</span>
              <span aria-hidden="true">·</span>
              {inspectedPoint.weightKg !== null && (
                <span className="text-cyan-400 font-bold">{inspectedPoint.weightKg} kg</span>
              )}
              {inspectedPoint.movingAvg7dKg !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">
                    Media 7d: {inspectedPoint.movingAvg7dKg} kg
                  </span>
                </>
              )}
              {(inspectedPoint.bodyFatPct !== null ||
                inspectedPoint.interpolatedBodyFatPct !== null) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 font-bold">
                    Grasa:{' '}
                    {inspectedPoint.bodyFatPct !== null
                      ? `${inspectedPoint.bodyFatPct}%`
                      : `~${inspectedPoint.interpolatedBodyFatPct}%`}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Empty state check */}
        {(metricMode === 'weight' && !summary.hasWeightData) ||
        (metricMode === 'body_fat' && !summary.hasBodyFatData) ? (
          <div className="h-56 flex flex-col items-center justify-center text-center space-y-2">
            <TrendingDown className="w-6 h-6 text-zinc-500" />
            <p className="text-xs text-zinc-300 font-semibold">
              {metricMode === 'body_fat'
                ? 'No hay mediciones de porcentaje de grasa corporal en las últimas 4 semanas.'
                : 'No hay pesajes registrados en las últimas 4 semanas.'}
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab('weight')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-xs font-bold cursor-pointer"
            >
              Registrar medición en Peso y Medidas →
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              data-testid="four-week-evolution-svg"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-60 min-w-[560px] select-none"
            >
              <defs>
                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="bfAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 4 Weekly Background Columns */}
              {[0, 1, 2, 3].map((wIdx) => {
                const startDay = wIdx * 7;
                const endDay = Math.min(totalDays, (wIdx + 1) * 7);
                const x1 = getX(startDay);
                const x2 = getX(endDay);
                return (
                  <g key={`wk-bg-${wIdx}`}>
                    <rect
                      x={x1}
                      y={padTop}
                      width={Math.max(0, x2 - x1)}
                      height={plotH}
                      fill={wIdx % 2 === 0 ? '#18181b' : '#09090b'}
                      opacity={0.45}
                    />
                    <text
                      x={(x1 + x2) / 2}
                      y={padTop + 13}
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      Semana {wIdx + 1}
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Grid Lines & Y-Axis Labels */}
              {yTicks.map((t, i) => (
                <g key={`ytick-${i}`}>
                  <line
                    x1={padLeft}
                    y1={t.y}
                    x2={svgWidth - padRight}
                    y2={t.y}
                    stroke="#27272a"
                    strokeDasharray="3 3"
                  />
                  {/* Left Y-axis label */}
                  <text
                    x={padLeft - 8}
                    y={t.y + 3}
                    textAnchor="end"
                    fill={metricMode === 'body_fat' ? '#fbbf24' : '#38bdf8'}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {metricMode === 'body_fat' ? `${t.bfVal}%` : `${t.weightVal}kg`}
                  </text>

                  {/* Right Y-axis label when in dual mode */}
                  {metricMode === 'dual' && (
                    <text
                      x={svgWidth - padRight + 8}
                      y={t.y + 3}
                      textAnchor="start"
                      fill="#fbbf24"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {t.bfVal}%
                    </text>
                  )}
                </g>
              ))}

              {/* Weight Area, Daily Line & 7-Day Moving Average Line */}
              {(metricMode === 'weight' || metricMode === 'dual') && (
                <g data-testid="svg-weight-series">
                  {metricMode === 'weight' && weightAreaPath && (
                    <path d={weightAreaPath} fill="url(#weightAreaGrad)" />
                  )}

                  {movingAvgCoords.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.2"
                      strokeDasharray="5 4"
                      points={movingAvgLinePoints}
                    />
                  )}

                  {weightCoords.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                      points={weightLinePoints}
                    />
                  )}

                  {weightCoords.map((c) => {
                    const isSelected = inspectedPoint?.date === c.pt.date;
                    return (
                      <g
                        key={`w-dot-${c.pt.date}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedDate(c.pt.date)}
                        onMouseEnter={() => setSelectedDate(c.pt.date)}
                      >
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isSelected ? 5.5 : 3.2}
                          fill={isSelected ? '#ffffff' : '#22d3ee'}
                          stroke="#09090b"
                          strokeWidth="1.5"
                        />
                        <circle cx={c.x} cy={c.y} r={10} fill="transparent" />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Body Fat % Area, Line & Measured Points */}
              {(metricMode === 'body_fat' || metricMode === 'dual') && (
                <g data-testid="svg-bodyfat-series">
                  {metricMode === 'body_fat' && bfAreaPath && (
                    <path d={bfAreaPath} fill="url(#bfAreaGrad)" />
                  )}

                  {bfMeasuredCoords.length >= 2 && (
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      points={bfLinePoints}
                    />
                  )}

                  {bfMeasuredCoords.map((c) => {
                    const isSelected = inspectedPoint?.date === c.pt.date;
                    return (
                      <g
                        key={`bf-dot-${c.pt.date}`}
                        className="cursor-pointer"
                        onClick={() => setSelectedDate(c.pt.date)}
                        onMouseEnter={() => setSelectedDate(c.pt.date)}
                      >
                        <circle
                          cx={c.x}
                          cy={c.y}
                          r={isSelected ? 6 : 4.2}
                          fill={isSelected ? '#ffffff' : '#f59e0b'}
                          stroke="#09090b"
                          strokeWidth="1.5"
                        />
                        <text
                          x={c.x}
                          y={c.y - 9}
                          textAnchor="middle"
                          fill="#fcd34d"
                          fontSize="9.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {c.pt.bodyFatPct}%
                        </text>
                        <circle cx={c.x} cy={c.y} r={12} fill="transparent" />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* X-Axis Date Labels (every 4 days + final day) */}
              {points.map((pt, idx) => {
                if (idx % 4 !== 0 && idx !== points.length - 1) return null;
                return (
                  <text
                    key={`xlabel-${pt.date}`}
                    x={getX(idx)}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {pt.shortLabel}
                  </text>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* 4 Weekly Breakdown Cards (Semana 1 a Semana 4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {weeklyBuckets.map((wk) => (
          <div
            key={wk.weekIndex}
            data-testid={`evolution-week-bucket-${wk.weekIndex}`}
            className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-bold text-zinc-200">{wk.weekLabel}</span>
              <span className="font-mono text-[10px]">{wk.rangeLabel}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-zinc-400 block">Peso Prom.</span>
                <span className="text-xs font-bold font-mono text-cyan-400">
                  {wk.avgWeightKg !== null ? `${wk.avgWeightKg} kg` : '--'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block">% Grasa</span>
                <span className="text-xs font-bold font-mono text-amber-400">
                  {wk.avgBodyFatPct !== null ? `${wk.avgBodyFatPct}%` : '--'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Link to Weight & Body Measurements Module */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-zinc-400">
        <span>
          El cálculo de % de grasa corporal emplea el método U.S. Navy (cintura, cuello y altura) o mediciones directas.
        </span>
        <button
          type="button"
          onClick={() => onNavigateToTab('weight')}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Registrar pesaje o medición corporal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </section>
  );
};
