'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { getCampaigns, createCampaign, updateCampaign, toggleCampaignActive, deleteCampaign, toggleAgentPaused, getAgency } from '../actions';
import { DEFAULT_CAMPAIGNS } from '@/lib/defaults';
import { Campaign } from '@/lib/shared';
import { Megaphone, Plus, Trash2, Edit3, Power, Zap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const PLACEHOLDER_RE = /\[(COMPLETAR|CONFIRMAR)\b/i;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEFAULT_CAMPAIGNS);
  const [agentPaused, setAgentPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // New campaign form state
  const [newName, setNewName] = useState('');
  const [newTrigger, setNewTrigger] = useState('');
  const [newContext, setNewContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit campaign form state
  const [editName, setEditName] = useState('');
  const [editTrigger, setEditTrigger] = useState('');
  const [editContext, setEditContext] = useState('');

  async function loadData() {
    const list = await getCampaigns();
    setCampaigns(list);

    const ag = await getAgency('serstorm');
    if (ag) {
      setAgentPaused(!!ag.agent_paused);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePause = async () => {
    const newStatus = !agentPaused;
    setAgentPaused(newStatus);
    await toggleAgentPaused('00000000-0000-0000-0000-000000000001', newStatus);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTrigger.trim() || !newContext.trim()) return;

    setSubmitting(true);
    const res = await createCampaign({
      name: newName,
      trigger_text: newTrigger,
      context: newContext,
    });

    if (res.success && res.campaign) {
      setCampaigns((prev) => [res.campaign, ...prev]);
      setNewName('');
      setNewTrigger('');
      setNewContext('');
      setShowCreateModal(false);
    }
    setSubmitting(false);
  };

  const handleStartEdit = (camp: Campaign) => {
    setEditingCampaignId(camp.id);
    setEditName(camp.name);
    setEditTrigger(camp.trigger_text);
    setEditContext(camp.context);
  };

  const handleSaveEdit = async (campaignId: string) => {
    await updateCampaign(campaignId, {
      name: editName,
      trigger_text: editTrigger,
      context: editContext,
    });

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, name: editName, trigger_text: editTrigger, context: editContext }
          : c
      )
    );
    setEditingCampaignId(null);
  };

  const handleToggleActive = async (camp: Campaign) => {
    const nextActive = !camp.active;
    setCampaigns((prev) =>
      prev.map((c) => (c.id === camp.id ? { ...c, active: nextActive } : c))
    );
    await toggleCampaignActive(camp.id, nextActive);
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('¿Estás seguro de que querés eliminar esta campaña?')) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    await deleteCampaign(campaignId);
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar agentPaused={agentPaused} onTogglePause={handleTogglePause} />

      <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Click to WhatsApp Ads</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Campañas Publicitarias</h1>
            <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
              Cuando un cliente potencial hace clic en un anuncio de Meta (Facebook/Instagram Ads) o Google Ads,
              el mensaje inicial viene con un texto predeterminado. Si contiene el <strong>disparador</strong> de una
              campaña activa, la IA asume automáticamente el contexto y la oferta de esa campaña específica.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Campaña</span>
          </button>
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  <span>Crear Nueva Campaña Click-to-WhatsApp</span>
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Nombre de la Campaña
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Hoteles & Cabañas: Aumento de Reservas Directas"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Texto Disparador (Frase que viene prefijada en el anuncio de WhatsApp)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Hola, vi el anuncio sobre aumento de reservas directas para hoteles"
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    No importa si el usuario borra mayúsculas o signos; la IA detecta la coincidencia semántica y exacta.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Contexto de la Campaña (Instrucciones específicas y oferta para la IA)
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Detallá a quién va dirigida esta promo, qué propuesta de valor se ofrece, dolores que ataca y hacia qué auditoría/enlace conduce..."
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/30"
                  >
                    {submitting ? 'Guardando...' : 'Crear Campaña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm">Cargando campañas publicitarias...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto">
            <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-200 font-semibold text-sm">No hay campañas cargadas</h3>
            <p className="text-slate-500 text-xs mt-1 mb-4">
              Creá tu primera campaña de anuncios para que la IA atienda a los leads con el contexto exacto de cada anuncio.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-medium"
            >
              Crear primera campaña
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {campaigns.map((camp) => {
              const isEditing = editingCampaignId === camp.id;
              const hasPlaceholder = PLACEHOLDER_RE.test(camp.context);

              return (
                <div
                  key={camp.id}
                  className={`bg-slate-900/80 border rounded-2xl p-6 transition-all shadow-sm ${
                    camp.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/40 opacity-75'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Disparador (Texto exacto/palabras clave)</label>
                        <input
                          type="text"
                          value={editTrigger}
                          onChange={(e) => setEditTrigger(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Contexto & Oferta</label>
                        <textarea
                          rows={4}
                          value={editContext}
                          onChange={(e) => setEditContext(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-2">
                        <button
                          onClick={() => setEditingCampaignId(null)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(camp.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Guardar Cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-slate-100 text-base">{camp.name}</h3>
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border flex items-center space-x-1 ${
                                camp.active
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  camp.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                }`}
                              />
                              <span>{camp.active ? 'Activa' : 'Pausada'}</span>
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 text-xs text-slate-400 pt-1">
                            <span className="flex items-center space-x-1 text-amber-400 font-medium bg-amber-950/40 border border-amber-800/30 px-2 py-0.5 rounded-md">
                              <Zap className="w-3 h-3" />
                              <span>Disparador:</span>
                            </span>
                            <code className="text-slate-300 font-mono text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              &ldquo;{camp.trigger_text}&rdquo;
                            </code>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleActive(camp)}
                            className={`p-2 rounded-lg text-xs transition-colors border ${
                              camp.active
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                            title={camp.active ? 'Pausar campaña' : 'Activar campaña'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(camp)}
                            className="p-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Editar campaña"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(camp.id)}
                            className="p-2 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
                            title="Eliminar campaña"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Warning if placeholder tags remain */}
                      {hasPlaceholder && (
                        <div className="mt-3 p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl flex items-start space-x-2 text-xs text-amber-300">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                          <p>
                            Quedaron marcas <strong>[COMPLETAR: ...]</strong> o <strong>[CONFIRMAR: ...]</strong> sin reemplazar.
                            El agente tomará esas partes como datos faltantes y derivará a un asesor humano.
                          </p>
                        </div>
                      )}

                      {/* Context Preview */}
                      <div className="mt-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Contexto e Instrucciones de la Campaña:
                        </span>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {camp.context}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
