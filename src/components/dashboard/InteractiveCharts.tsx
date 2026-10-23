/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { WeighIn, BodyMeasurement, FoodLog, WorkoutSession, ActivityLog } from '../../types';
import { calculateMoving7DayAverages } from '../../utils/calculations';

interface InteractiveChartsProps {
  weighIns: WeighIn[];
  measurements: BodyMeasurement[];
  foodLogs: FoodLog[];
  workoutSessions: WorkoutSession[];
  activityLogs: ActivityLog[];
  calorieTarget: number;
  proteinTarget: number;
}

type TimeRange = '7d' | '30d' | '90d' | '180d' | 'all';
type ChartTab = 'weight' | 'waist' | 'calories' | 'macros' | 'volume' | 'steps';

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({
  weighIns,
  measurements,
  foodLogs,
  workoutSessions,
  activityLogs,
  calorieTarget,
  proteinTarget,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('weight');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Filter cutoff date
  const cutoffDate = useMemo(() => {
    if (timeRange === 'all') return '1970-01-01';
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 180;
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return past.toISOString().split('T')[0];
  }, [timeRange]);

  // Weight series with 7-day rolling average
  const weightData = useMemo(() => {
    const seriesWithAvg = calculateMoving7DayAverages(weighIns);
    return seriesWithAvg.filter((item) => item.date >= cutoffDate);
  }, [weighIns, cutoffDate]);

  // Waist circumference series
  const waistData = useMemo(() => {
    return measurements
      .filter((m) => m.measured_at >= cutoffDate)
      .map((m) => ({
        date: m.measured_at,
        waist: m.waist_cm,
        chest: m.chest_cm,
        arm: m.arm_flexed_cm,
      }));
  }, [measurements, cutoffDate]);

  // Daily nutrition aggregation
  const nutritionDailyData = useMemo(() => {
    const map: Record<string, { date: string; calories: number; protein: number; carbs: number; fat: number }> = {};
    foodLogs.forEach((log) => {
      const d = log.consumed_at;
      if (!map[d]) {
        map[d] = { date: d, calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      map[d].calories += log.calories_kcal;
      map[d].protein += log.protein_g;
      map[d].carbs += log.carbohydrates_g;
      map[d].fat += log.fat_g;
    });
    return Object.values(map)
      .filter((item) => item.date >= cutoffDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [foodLogs, cutoffDate]);

  // Daily Steps data
  const stepsData = useMemo(() => {
    return activityLogs
      .filter((a) => a.activity_date >= cutoffDate)
      .map((a) => ({
        date: a.activity_date,
        steps: a.steps,
      }));
  }, [activityLogs, cutoffDate]);

  // Weekly Workout Volume
  const volumeData = useMemo(() => {
    const list = workoutSessions.map((s) => {
      let vol = 0;
      s.exercises.forEach((ex) => {
        ex.sets.forEach((st) => {
          if (!st.is_warmup && st.completed) {
            vol += st.weight_kg * st.repetitions;
          }
        });
      });
      return {
        date: s.started_at.split('T')[0],
        routine: s.routine_name,
        volumeKg: Math.round(vol),
      };
    });
    return list.filter((item) => item.date >= cutoffDate);
  }, [workoutSessions, cutoffDate]);

  const tabs: Array<{ id: ChartTab; label: string }> = [
    { id: 'weight', label: 'Peso y Media Móvil' },
    { id: 'waist', label: 'Cintura y Perímetros' },
    { id: 'calories', label: 'Calorías vs Objetivo' },
    { id: 'macros', label: 'Macronutrientes' },
    { id: 'volume', label: 'Volumen Entreno' },
    { id: 'steps', label: 'Pasos Diarios' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      {/* Header with Subtabs & Time Ranges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time range buttons */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 self-start lg:self-auto">
          {(['7d', '30d', '90d', '180d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                timeRange === range
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-72 w-full pt-2">
        {activeTab === 'weight' && (
          weightData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay pesajes registrados en el período seleccionado ({timeRange.toUpperCase()}).</span>
              <span className="text-[11px] text-zinc-600">Añade pesajes diarios para visualizar la media móvil de 7 días.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#71717a" fontSize={11} tickLine={false} unit="kg" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any, name: any) => [
                  `${value} kg`,
                  name === 'weight' ? 'Peso Diario' : 'Media Móvil 7d',
                ]}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (value === 'weight' ? 'Peso Diario (kg)' : 'Promedio 7 Días (kg)')}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={{ r: 3, fill: '#38bdf8' }}
                activeDot={{ r: 5 }}
                name="weight"
              />
              <Line
                type="monotone"
                dataKey="movingAvg7d"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                name="movingAvg7d"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          )
        )}

        {activeTab === 'waist' && (
          waistData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay perímetros corporales registrados en este período.</span>
              <span className="text-[11px] text-zinc-600">Registra cintura y cuello para seguir la tendencia de recomposición.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={waistData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#71717a" fontSize={11} tickLine={false} unit="cm" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any, name: any) => [`${value} cm`, name === 'waist' ? 'Cintura' : name === 'chest' ? 'Pecho' : 'Brazo flex.']}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="waist" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Cintura" />
              <Line type="monotone" dataKey="chest" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 3 }} name="Pecho" />
              <Line type="monotone" dataKey="arm" stroke="#06b6d4" strokeWidth={1.5} dot={{ r: 3 }} name="Brazo" />
            </LineChart>
          </ResponsiveContainer>
          )
        )}

        {activeTab === 'calories' && (
          nutritionDailyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay registro de comidas en este período.</span>
              <span className="text-[11px] text-zinc-600">Registra tus alimentos para comparar la ingesta con el objetivo.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionDailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit="kcal" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any) => [`${value} kcal`, 'Consumidas']}
              />
              <ReferenceLine y={calorieTarget} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Meta: ${calorieTarget} kcal`, fill: '#10b981', fontSize: 11 }} />
              <Bar dataKey="calories" fill="#0284c7" radius={[4, 4, 0, 0]} name="Calorías (kcal)" />
            </BarChart>
          </ResponsiveContainer>
          )
        )}

        {activeTab === 'macros' && (
          nutritionDailyData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay desglose de macronutrientes disponible.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutritionDailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit="g" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any, name: any) => [`${value} g`, name === 'protein' ? 'Proteína' : name === 'carbs' ? 'Carbohidratos' : 'Grasas']}
              />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine y={proteinTarget} stroke="#10b981" strokeDasharray="2 2" />
              <Bar dataKey="protein" fill="#10b981" name="Proteínas (g)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="carbs" fill="#38bdf8" name="Carbohidratos (g)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="fat" fill="#f59e0b" name="Grasas (g)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          )
        )}

        {activeTab === 'volume' && (
          volumeData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay sesiones de entrenamiento completadas en este período.</span>
              <span className="text-[11px] text-zinc-600">Inicia una rutina para acumular volumen de carga efectivo.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} unit="kg" />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any) => [`${value.toLocaleString()} kg·reps`, 'Volumen Efectivo']}
              />
              <Bar dataKey="volumeKg" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Carga Total (kg)" />
            </BarChart>
          </ResponsiveContainer>
          )
        )}

        {activeTab === 'steps' && (
          stepsData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-xs text-zinc-500 space-y-1">
              <span>No hay registros de pasos para este rango temporal.</span>
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stepsData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#f4f4f5', fontSize: '12px' }}
                formatter={(value: any) => [`${Number(value).toLocaleString()} pasos`, 'Actividad']}
              />
              <ReferenceLine y={5000} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Meta: 5.000', fill: '#f59e0b', fontSize: 10 }} />
              <Bar dataKey="steps" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Pasos" />
            </BarChart>
          </ResponsiveContainer>
          )
        )}
      </div>
    </div>
  );
};
