/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FeedbackType, FeedbackPriority } from '../../types/auth';
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Compass,
  Sparkles,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToken?: string;
  userEmail?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  userToken,
  userEmail,
}) => {
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [module, setModule] = useState<string>('Dashboard');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(5);
  const [canContact, setCanContact] = useState<boolean>(true);
  const [attachDiagnostics, setAttachDiagnostics] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (userToken) {
        headers['Authorization'] = `Bearer ${userToken}`;
      }

      const diagnostics = attachDiagnostics
        ? {
            browser: navigator.userAgent.substring(0, 80),
            screen: `${window.innerWidth}x${window.innerHeight}`,
            app_version: 'beta-1.0',
          }
        : undefined;

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          module,
          title,
          description,
          priority,
          satisfactionScore: satisfactionScore || undefined,
          canContact,
          diagnostics,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo enviar el comentario');
      }

      setTrackingId(data.tracking_id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTrackingId = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setTrackingId(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Feedback de la Beta Privada
              </h3>
              <p className="text-xs text-zinc-400">Tu opinión moldea las siguientes versiones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {trackingId ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-white">¡Muchas gracias por tu comentario!</h4>
              <p className="text-zinc-300 text-xs max-w-sm mx-auto">
                Tu reporte ha sido registrado de forma segura. El equipo de producto revisa cada entrada para priorizar las mejoras de la beta.
              </p>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between max-w-xs mx-auto">
                <div className="text-left">
                  <span className="text-[10px] text-zinc-500 block uppercase font-mono">Código de Seguimiento</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">{trackingId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all shadow-md"
                >
                  Volver a la Aplicación
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Feedback Type Tabs */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Tipo de Comentario</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setType('bug')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-semibold ${
                      type === 'bug'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>Error</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('suggestion')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-semibold ${
                      type === 'suggestion'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Sugerencia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('ux')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-semibold ${
                      type === 'ux'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Uso / UX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('feature')}
                    className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-semibold ${
                      type === 'feature'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nueva Idea</span>
                  </button>
                </div>
              </div>

              {/* Module selection & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Módulo Relacionado</label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Dashboard">Dashboard Principal</option>
                    <option value="Peso y Medidas">Peso y Medidas Corporales</option>
                    <option value="Nutrición y Macros">Nutrición y Déficit Calórico</option>
                    <option value="Entrenamiento PPL">Entrenamiento PPL & Cargas</option>
                    <option value="Fotos de Progreso">Fotos de Progreso</option>
                    <option value="Revisiones y Ajustes">Revisiones Semanales</option>
                    <option value="Integraciones">Integraciones Externas (Hevy, CSV)</option>
                    <option value="Otro">Otro / General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Prioridad Percibida</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as FeedbackPriority)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="low">Baja (Detalle cosmético o menor)</option>
                    <option value="medium">Media (Mejora deseable)</option>
                    <option value="high">Alta (Afecta el uso recurrente)</option>
                    <option value="critical">Crítica (Bloquea la funcionalidad)</option>
                  </select>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Título del comentario</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. El cálculo del RIR no se actualiza en la serie 3"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Descripción detallada</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explica qué sucedió, qué esperabas ver o cómo mejorarías esta experiencia..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Satisfaction Score (CSAT 1-5) */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">
                  ¿Cómo calificarías tu satisfacción general con la beta hasta ahora? (Opcional)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSatisfactionScore(star)}
                      className="p-1 text-zinc-500 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          satisfactionScore && satisfactionScore >= star
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-zinc-400 text-[11px] ml-2">
                    {satisfactionScore ? `${satisfactionScore} de 5 estrellas` : 'Sin calificación'}
                  </span>
                </div>
              </div>

              {/* Privacy Toggles & Disclosures */}
              <div className="space-y-2 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canContact}
                    onChange={(e) => setCanContact(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <span className="text-zinc-300">
                    Autorizo al equipo de BodyTrack Pro a contactarme por email ({userEmail || 'tu correo registrado'}) si necesitan clarificar este reporte.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-zinc-900">
                  <input
                    type="checkbox"
                    checked={attachDiagnostics}
                    onChange={(e) => setAttachDiagnostics(e.target.checked)}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <span className="text-zinc-400">
                    Adjuntar datos técnicos de entorno (navegador y resolución de pantalla).
                  </span>
                </label>

                <p className="text-[10px] text-zinc-500 flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Garantía de privacidad: Jamás se adjuntan fotografías, pesos, comidas ni medidas corporales.
                  </span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !description.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 active:scale-98 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Enviando...' : 'Enviar Feedback'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
