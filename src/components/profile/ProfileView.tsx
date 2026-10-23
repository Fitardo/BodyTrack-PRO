/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, ActivityLevel, SexForEquations } from '../../types';
import { StorageService } from '../../services/storage';
import { UserCog, Save, RotateCcw, ShieldAlert, CheckCircle, BookOpen, Info } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSaveMessage('¡Perfil y parámetros metabólicos actualizados con éxito!');
    setTimeout(() => setSaveMessage(''), 3500);
  };

  const handleReset = () => {
    if (confirm('¿Restablecer todos los datos a la configuración inicial de prueba? Esto reiniciará la base de datos local.')) {
      StorageService.resetToInitialSeed();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCog className="w-5 h-5 text-emerald-400" />
            <span>Perfil de Usuario y Parámetros Metabólicos</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Edita tus variables biológicas, split de entrenamiento y preferencias sin tocar código.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 text-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer Datos de Prueba</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Demographics */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Variables Biológicas y Antropométricas</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium text-zinc-300 mb-1">Nombre</label>
              <input
                id="prof-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                required
              />
            </div>

            <div>
              <label htmlFor="prof-age" className="block text-xs font-medium text-zinc-300 mb-1">Edad (años)</label>
              <input
                id="prof-age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 24 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                required
              />
            </div>

            <div>
              <label htmlFor="prof-sex" className="block text-xs font-medium text-zinc-300 mb-1">Sexo (ecuaciones metabólicas)</label>
              <select
                id="prof-sex"
                value={formData.sex_for_equations}
                onChange={(e) => setFormData({ ...formData, sex_for_equations: e.target.value as SexForEquations })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs"
              >
                <option value="male">Masculino (+5 en Mifflin-St Jeor)</option>
                <option value="female">Femenino (-161 en Mifflin-St Jeor)</option>
              </select>
            </div>

            <div>
              <label htmlFor="prof-height" className="block text-xs font-medium text-zinc-300 mb-1">Estatura (cm)</label>
              <input
                id="prof-height"
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || 175 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800">
            <div>
              <label htmlFor="prof-weight" className="block text-xs font-medium text-zinc-300 mb-1">Peso Inicial Basal (kg)</label>
              <input
                id="prof-weight"
                type="number"
                step="0.1"
                value={formData.initial_weight_kg}
                onChange={(e) => setFormData({ ...formData, initial_weight_kg: parseFloat(e.target.value) || 85 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                required
              />
            </div>

            <div>
              <label htmlFor="prof-activity" className="block text-xs font-medium text-zinc-300 mb-1">Nivel de Actividad Cotidiana</label>
              <select
                id="prof-activity"
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as ActivityLevel })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 text-xs"
              >
                <option value="sedentary">Sedentario (factor 1.2) - Trabajo de oficina</option>
                <option value="light">Ligero (factor 1.375) - 1-3 días de actividad</option>
                <option value="moderate">Moderado (factor 1.55) - 3-5 días activos</option>
                <option value="heavy">Pesado (factor 1.725) - 6-7 días activos</option>
                <option value="athlete">Atleta / Físico intenso (factor 1.9)</option>
              </select>
            </div>

            <div>
              <label htmlFor="prof-tz" className="block text-xs font-medium text-zinc-300 mb-1">Zona Horaria</label>
              <input
                id="prof-tz"
                type="text"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Training & Split Preferences */}
        <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-semibold text-white">Programación del Entrenamiento y Hábitos</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="prof-freq" className="block text-xs font-medium text-zinc-300 mb-1">Frecuencia Objetivo (días/sem)</label>
              <select
                id="prof-freq"
                value={formData.training_frequency}
                onChange={(e) => setFormData({ ...formData, training_frequency: parseInt(e.target.value) || 6 })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              >
                <option value="3">3 días por semana</option>
                <option value="4">4 días por semana</option>
                <option value="5">5 días por semana</option>
                <option value="6">6 días por semana (PPL x 2)</option>
              </select>
            </div>

            <div>
              <label htmlFor="prof-split" className="block text-xs font-medium text-zinc-300 mb-1">Sistema de Entrenamiento</label>
              <input
                id="prof-split"
                type="text"
                value={formData.preferred_training_split}
                onChange={(e) => setFormData({ ...formData, preferred_training_split: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              />
            </div>

            <div>
              <label htmlFor="prof-diet" className="block text-xs font-medium text-zinc-300 mb-1">Preferencias Dietéticas</label>
              <input
                id="prof-diet"
                type="text"
                value={formData.dietary_preferences}
                onChange={(e) => setFormData({ ...formData, dietary_preferences: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Evidence-Based Guide Callout */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-emerald-500/20 space-y-3">
          <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Fundamentos de Recomposición Corporal Basada en Evidencia</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-zinc-400 leading-relaxed">
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <strong className="text-white block mb-1">1. Déficit Calórico Moderado</strong>
              Un recorte moderado (10-20% por debajo del mantenimiento o ~300-500 kcal) permite perder grasa minimizando la pérdida de masa muscular y evitando letargo.
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <strong className="text-white block mb-1">2. Proteína Alta (1.8 - 2.2 g/kg)</strong>
              La ingesta de 180g de proteína protege el tejido magro, maximiza la síntesis proteica muscular (MPS) y proporciona alta saciedad diaria.
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <strong className="text-white block mb-1">3. Sobrecarga Progresiva</strong>
              El entrenamiento de fuerza en split Push/Pull/Legs asegura estímulo mecánico suficiente para retener la fuerza o ganar hipertrofia incluso en balance negativo.
            </div>
          </div>
        </div>

        {/* Privacy, Portability & GDPR Governance Card */}
        <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Privacidad, Exportación y Derecho al Olvido (GDPR)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Tienes control absoluto sobre tus registros. Puedes descargar una copia completa de tus datos corporales, entrenamientos y comidas en formato JSON estándar, o solicitar la eliminación total e irreversible de tu cuenta y datos.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const data = StorageService.exportCurrentUserData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bodytrack_export_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <span>Exportar Todos Mis Datos (JSON)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('¿Estás seguro de que deseas eliminar permanentemente tus registros y datos corporales? Esta acción es irreversible.')) {
                  StorageService.purgeCurrentUserData();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <span>Eliminar Mis Datos y Purgar Cuenta</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración del Perfil</span>
          </button>
        </div>
      </form>
    </div>
  );
};
