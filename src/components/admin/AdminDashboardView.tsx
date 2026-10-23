/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AuthUser,
  InviteCode,
  BetaFeedbackItem,
  AdminAnalyticsSummary,
  FeedbackStatus,
} from '../../types/auth';
import {
  ShieldAlert,
  Users,
  KeyRound,
  MessageSquare,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Ban,
  Activity,
  Star,
  ShieldCheck,
  Server,
  Lock,
} from 'lucide-react';

interface AdminDashboardViewProps {
  currentUser: AuthUser;
  token: string;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  token,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'invites' | 'users' | 'feedback' | 'health'>('analytics');

  // Data states
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [feedbackList, setFeedbackList] = useState<BetaFeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Invite form
  const [newCode, setNewCode] = useState<string>('');
  const [newMaxUses, setNewMaxUses] = useState<number>(10);
  const [newNotes, setNewNotes] = useState<string>('');
  const [inviteGenerating, setInviteGenerating] = useState<boolean>(false);

  // Status update message
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (currentUser.role !== 'admin') {
    return (
      <div className="p-8 text-center bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Acceso Restringido</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Esta vista está reservada exclusivamente para el rol de Administrador de la Beta Privada.
        </p>
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, invitesRes, usersRes, feedbackRes] = await Promise.all([
        fetch('/api/admin/analytics/summary', { headers }),
        fetch('/api/admin/invites', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/feedback', { headers }),
      ]);

      if (summaryRes.ok) {
        const d = await summaryRes.json();
        setSummary(d.summary);
      }
      if (invitesRes.ok) {
        const d = await invitesRes.json();
        setInvites(d.invites || []);
      }
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsersList(d.users || []);
      }
      if (feedbackRes.ok) {
        const d = await feedbackRes.json();
        setFeedbackList(d.feedbacks || []);
      }
    } catch (err: any) {
      setErrorMsg('Error al consultar datos administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteGenerating(true);
    try {
      const res = await fetch('/api/admin/invites/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customCode: newCode || undefined,
          maxUses: newMaxUses,
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setNewCode('');
      setNewNotes('');
      setActionSuccessMsg(`Código ${data.invite.code} creado exitosamente.`);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar código.');
    } finally {
      setInviteGenerating(false);
    }
  };

  const handleRevokeInvite = async (code: string) => {
    try {
      const res = await fetch('/api/admin/invites/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        setActionSuccessMsg(`Código ${code} revocado.`);
        loadData();
      }
    } catch {
      setErrorMsg('Error al revocar el código.');
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch('/api/admin/users/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(data.message);
        loadData();
      } else {
        setErrorMsg(data.error || 'No se pudo cambiar el estado.');
      }
    } catch {
      setErrorMsg('Error al cambiar el estado del usuario.');
    }
  };

  const handleUpdateFeedbackStatus = async (feedbackId: string, status: FeedbackStatus) => {
    try {
      await fetch('/api/admin/feedback/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedbackId, status }),
      });
      loadData();
    } catch {
      setErrorMsg('Error al actualizar feedback.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Panel de Control de la Beta Privada</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Admin
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Supervisión técnica, analítica agregada y gestión ética de participantes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Cupo Invitados</span>
            <span className="text-xl font-bold text-white mt-1 block">
              {summary.total_invited} <span className="text-xs text-zinc-500">plazas</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Tasa Activación</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">
              {summary.activation_rate_pct}%
            </span>
            <span className="text-[10px] text-zinc-500">{summary.total_activated} con onboarding</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Activos Semanales (WAU)</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">
              {summary.weekly_active_users}
            </span>
            <span className="text-[10px] text-zinc-500">en últimos 7 días</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Retención D7 / D28</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">
              {summary.retention_d7_pct}% <span className="text-xs text-zinc-500">/ {summary.retention_d28_pct}%</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Satisfacción (CSAT)</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block flex items-center gap-1">
              {summary.average_csat}
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </span>
            <span className="text-[10px] text-zinc-500">escala 1 a 5</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block font-medium">Errores Reportados</span>
            <span className={`text-xl font-bold mt-1 block ${summary.open_bugs_count > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
              {summary.open_bugs_count} <span className="text-xs text-zinc-500">abiertos</span>
            </span>
          </div>
        </div>
      )}

      {/* Subtabs Selector */}
      <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'analytics' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analítica de Producto</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invites')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'invites' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Códigos de Invitación ({invites.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'users' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Participantes ({usersList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'feedback' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comentarios ({feedbackList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            activeTab === 'health' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Salud del Sistema</span>
        </button>
      </div>

      {/* SUBTAB 1: PRODUCT ANALYTICS */}
      {activeTab === 'analytics' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Module Adoption Card */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Adopción y Uso por Módulo</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Frecuencia relativa de interacciones por funcionalidad en la última semana.
              </p>

              <div className="space-y-2.5 pt-2">
                {Object.entries(summary.module_adoption || {}).map(([mod, count]) => {
                  const maxVal = Math.max(...Object.values(summary.module_adoption), 1);
                  const pct = Math.round((count / maxVal) * 100);
                  return (
                    <div key={mod} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-300 font-medium capitalize">{mod}</span>
                        <span className="text-zinc-400 font-mono">{count} eventos</span>
                      </div>
                      <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Methodology & Formulas Card */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs text-zinc-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Metodología y Fórmulas de Medición</span>
              </h3>
              <div className="space-y-2.5 text-[11px] text-zinc-400">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-white block">Tasa de Activación:</strong>
                  <code>(Usuarios con Onboarding completado / Total usuarios registrados) × 100</code>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-white block">Usuarios Activos Semanales (WAU):</strong>
                  <code>Usuarios únicos con al menos 1 registro o vista en la ventana de 7 días.</code>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-white block">Retención de Cohorte (D7 / D28):</strong>
                  <code>(Usuarios activos en el día 7 o 28 / Usuarios activados en cohorte) × 100</code>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80">
                  <strong className="text-white block">Aislamiento de Privacidad en Analítica:</strong>
                  <span>Está técnicamente prohibido incluir pesos (kg), perímetros corporales, alimentos o contraseñas en los eventos analíticos.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: INVITES MANAGEMENT */}
      {activeTab === 'invites' && (
        <div className="space-y-5">
          {/* Create new invite form */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Generar Nuevo Código de Invitación</span>
            </h3>
            <form onSubmit={handleGenerateInvite} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Código (Opcional)</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="AUTO O EJ. VIP-ALFA-10"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Usos Máximos</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 1)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-zinc-400 mb-1 font-medium">Notas o Destinatario</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Ej. Grupo de atletas de fuerza PPL"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-white"
                  />
                  <button
                    type="submit"
                    disabled={inviteGenerating}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs whitespace-nowrap"
                  >
                    {inviteGenerating ? 'Creando...' : 'Crear Código'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Invites list table */}
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900">
            <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              Invitaciones Activas y Revocadas
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/40 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3 font-medium">Código</th>
                    <th className="p-3 font-medium">Usos</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium">Notas</th>
                    <th className="p-3 font-medium">Fecha</th>
                    <th className="p-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {invites.map((inv) => (
                    <tr key={inv.code} className="hover:bg-zinc-800/40">
                      <td className="p-3 font-mono font-bold text-emerald-400">{inv.code}</td>
                      <td className="p-3">
                        <span className="font-semibold text-white">{inv.uses_count}</span> / {inv.max_uses}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            inv.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {inv.status === 'active' ? 'Activo' : 'Revocado'}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 max-w-[200px] truncate">{inv.notes || '—'}</td>
                      <td className="p-3 text-zinc-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        {inv.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.code)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors"
                          >
                            Revocar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>
              <strong>Gobernanza de Datos Privados:</strong> Por diseño de seguridad, este panel no muestra ni permite consultar pesos, medidas corporales ni fotografías privadas de los participantes.
            </span>
          </div>

          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900">
            <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              Cuentas Registradas en la Beta
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/40 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3 font-medium">ID Usuario</th>
                    <th className="p-3 font-medium">Nombre</th>
                    <th className="p-3 font-medium">Email Protegido</th>
                    <th className="p-3 font-medium">Rol</th>
                    <th className="p-3 font-medium">Invitación</th>
                    <th className="p-3 font-medium">Onboarding</th>
                    <th className="p-3 font-medium">Estado</th>
                    <th className="p-3 font-medium text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/40">
                      <td className="p-3 font-mono text-[11px] text-zinc-400">{u.id}</td>
                      <td className="p-3 font-semibold text-white">{u.name}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">{u.email}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-emerald-400">{u.invite_code_used}</td>
                      <td className="p-3">
                        {u.onboarding_completed ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold">Pendiente</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              u.status === 'active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspender' : 'Reactivar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: FEEDBACK TRIAGE */}
      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900">
            <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
              Bandeja de Triage de Comentarios y Errores
            </div>
            <div className="divide-y divide-zinc-800 text-xs">
              {feedbackList.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No hay comentarios registrados todavía.</div>
              ) : (
                feedbackList.map((item) => (
                  <div key={item.id} className="p-4 space-y-2 hover:bg-zinc-800/30 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-400">{item.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.type === 'bug'
                              ? 'bg-rose-500/20 text-rose-300'
                              : item.type === 'suggestion'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="text-zinc-400 font-semibold">• {item.module}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-[11px]">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value as FeedbackStatus)}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-white"
                        >
                          <option value="new">Nuevo</option>
                          <option value="investigating">En Investigación</option>
                          <option value="resolved">Resuelto</option>
                          <option value="dismissed">Descartado</option>
                        </select>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                    <p className="text-zinc-300 text-xs leading-relaxed">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Prioridad: <strong className="text-white capitalize">{item.priority}</strong></span>
                      {item.satisfaction_score && (
                        <span className="flex items-center gap-1 text-amber-400">
                          CSAT: {item.satisfaction_score} <Star className="w-3 h-3 fill-amber-400" />
                        </span>
                      )}
                      <span>Contacto: {item.can_contact ? (
                        <span className="text-emerald-400 font-semibold">{item.user_email || 'Autorizado'}</span>
                      ) : (
                        <span className="text-zinc-500">No contactar</span>
                      )}</span>
                      {item.diagnostics && (
                        <span className="text-zinc-500 font-mono text-[10px]">
                          {item.diagnostics.browser} ({item.diagnostics.screen})
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Estado Técnico de Servicios</span>
            </h3>
            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Servidor Express (API REST)</span>
                  <span className="text-[11px] text-zinc-500">Puerto 3000 • Node.js runtime</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ONLINE
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Módulo Hevy Vault (Server-Side)</span>
                  <span className="text-[11px] text-zinc-500">Claves resguardadas sin exposición client-side</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SEGURO
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Ingestor Health Connect</span>
                  <span className="text-[11px] text-zinc-500">Validación de paquetes JSON on-device</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LISTO
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                <div>
                  <span className="font-semibold text-white block">Tubería de Analítica Desidentificada</span>
                  <span className="text-[11px] text-zinc-500">Filtro de exclusión de datos corporales activo</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PROTEGIDO
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 text-xs text-zinc-300">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Procedimiento de Respuesta a Incidentes (SOP)</span>
            </h3>
            <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed">
              <p>
                <strong>1. Detección y Aislamiento:</strong> Si un participante reporta un fallo o intento de acceso anómalo, la sesión se revoca instantáneamente desde la pestaña "Participantes" con el botón <em>Suspender</em>.
              </p>
              <p>
                <strong>2. Revocación de Claves:</strong> Las claves de proveedores externos (Hevy) pueden ser purgadas inmediatamente desde la sección <em>Integraciones</em> sin reiniciar el servicio.
              </p>
              <p>
                <strong>3. Notificación a Participantes:</strong> En caso de incidencia crítica, los usuarios con permiso de contacto autorizado ({feedbackList.filter((f) => f.can_contact).length} registrados) recibirán comunicación directa.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
