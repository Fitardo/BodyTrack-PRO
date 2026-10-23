/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Modal } from '../common/Modal';
import { Scale, Utensils, Dumbbell, Footprints, Camera } from 'lucide-react';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'weigh_in' | 'food_log' | 'workout' | 'steps' | 'photo') => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const actions = [
    {
      id: 'weigh_in' as const,
      title: 'Registrar Pesaje Matutino',
      desc: 'Introduce tu peso en ayunas y contexto (sodio, descanso, etc.)',
      icon: Scale,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      id: 'food_log' as const,
      title: 'Registrar Alimento / Comida',
      desc: 'Desayuno, almuerzo, merienda o cena con cálculo de macros',
      icon: Utensils,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'workout' as const,
      title: 'Iniciar Sesión de Entrenamiento',
      desc: 'Rutina Push/Pull/Legs con series, peso, RIR y descansos',
      icon: Dumbbell,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'steps' as const,
      title: 'Registrar Pasos y Cardio',
      desc: 'Pasos diarios acumulados y minutos de actividad cardiovascular',
      icon: Footprints,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    },
    {
      id: 'photo' as const,
      title: 'Subir Fotografía de Progreso',
      desc: 'Guardado privado en navegador para comparación antes / después',
      icon: Camera,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registro Rápido Diario"
      subtitle="Elige qué dato deseas registrar para el día de hoy"
      maxWidth="md"
    >
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={() => {
                onClose();
                onSelectAction(act.id);
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 transition-all text-left active:scale-[0.99] group"
            >
              <div className={`p-2.5 rounded-xl border ${act.color} shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-white block group-hover:text-emerald-400 transition-colors">
                  {act.title}
                </span>
                <span className="text-xs text-zinc-400 block truncate">{act.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
