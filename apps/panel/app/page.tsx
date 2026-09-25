'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { sendMessage, toggleAi, toggleAgentPaused, getConversations, getMessages, getLead, getAgency } from './actions';
import { supabase } from '@/lib/supabase';
import { SerstormConversation, SerstormMessage, SerstormLead, ENTITY_TYPE_LABELS, PIPELINE_STAGE_LABELS } from '@serstorm/shared';
import { Bot, User, Send, CheckCheck, Clock, Sparkles, QrCode } from 'lucide-react';

export default function InboxPage() {
  const [conversations, setConversations] = useState<SerstormConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<SerstormConversation | null>(null);
  const [messages, setMessages] = useState<SerstormMessage[]>([]);
  const [lead, setLead] = useState<SerstormLead | null>(null);
  const [agency, setAgency] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [agentPaused, setAgentPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load conversations
  useEffect(() => {
    async function loadData() {
      const convs = await getConversations();
      if (convs && convs.length > 0) {
        setConversations(convs);
        if (!selectedConv) {
          setSelectedConv(convs[0]);
        }
      }

      const ag = await getAgency('serstorm');
      if (ag) {
        setAgency(ag);
        setAgentPaused(!!ag.agent_paused);
      }
      setLoading(false);
    }

    loadData();

    // Auto-refresh interval (every 3s)
    const interval = setInterval(() => {
      loadData();
      if (selectedConv?.id) {
        loadMessages(selectedConv.id);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  // Load messages for selected conversation
  async function loadMessages(convId: string) {
    const msgs = await getMessages(convId);
    setMessages(msgs);

    const conv = conversations.find((c) => c.id === convId);
    if (conv?.lead_id) {
      const leadData = await getLead(conv.lead_id);
      setLead(leadData);
    } else {
      setLead(null);
    }
  }

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !inputMessage.trim()) return;

    const text = inputMessage.trim();
    setInputMessage('');

    // Optimistic UI insert
    const tempMsg: SerstormMessage = {
      id: Math.random().toString(),
      conversation_id: selectedConv.id,
      wa_message_id: null,
      sender_type: 'human',
      author: 'Asesor SerStorm',
      content: text,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const res = await sendMessage(selectedConv.id, text);
    if (res.success) {
      setSelectedConv((prev) => (prev ? { ...prev, ai_enabled: false } : null));
    }
  };

  const handleToggleAi = async () => {
    if (!selectedConv) return;
    const newStatus = !selectedConv.ai_enabled;
    setSelectedConv({ ...selectedConv, ai_enabled: newStatus });
    await toggleAi(selectedConv.id, newStatus);
  };

  const handleTogglePause = async () => {
    const newStatus = !agentPaused;
    setAgentPaused(newStatus);
    await toggleAgentPaused('00000000-0000-0000-0000-000000000001', newStatus);
  };

  const connectionStatus = agency?.connection_status || agency?.business_hours?.connection_status || 'disconnected';
  const qrCode = agency?.qr_code || agency?.business_hours?.whatsapp_qr;

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden relative">
      <Sidebar
        agentPaused={agentPaused}
        onTogglePause={handleTogglePause}
        connectionStatus={connectionStatus}
        onOpenQrModal={() => setShowQrModal(true)}
      />

      {/* WhatsApp QR Modal Overlay if QR is pending */}
      {connectionStatus === 'qr_pending' && qrCode && showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto border border-indigo-500/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Vincular WhatsApp de SerStorm</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Abrí WhatsApp en el celular comercial de SerStorm ➔ <strong>Dispositivos Vinculados</strong> ➔ <strong>Vincular Dispositivo</strong> y escaneá este código QR:
              </p>
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="Código QR de WhatsApp"
                className="w-64 h-64 mx-auto rounded-lg"
              />
            </div>

            <p className="text-[11px] text-indigo-300 animate-pulse font-medium">
              ⏳ Esperando escaneo... (Esta pantalla se cerrará sola al conectar).
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors underline pt-1 block mx-auto"
            >
              Cerrar y ver CRM
            </button>
          </div>
        </div>
      )}

      {/* Conversations List Column */}
      <section className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Consultas WhatsApp</h2>
          <span className="text-xs bg-indigo-950 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded-full font-mono">
            {conversations.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {conversations.map((c) => {
            const isSelected = selectedConv?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected ? 'bg-indigo-600/15 border-l-2 border-indigo-500' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm text-slate-200">
                    {c.contact_name || c.whatsapp_jid.split('@')[0]}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.ai_enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {c.ai_enabled ? 'IA Activa' : 'Humano'}
                  </span>
                </div>
                <div className="flex items-center text-xs text-slate-400">
                  <Clock className="w-3 h-3 mr-1 text-slate-500" />
                  <span>{new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main Chat Column */}
      <main className="flex-1 flex flex-col bg-slate-950">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                  {selectedConv.contact_name ? selectedConv.contact_name[0].toUpperCase() : 'W'}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">
                    {selectedConv.contact_name || selectedConv.whatsapp_jid.split('@')[0]}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedConv.whatsapp_jid}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {connectionStatus === 'connected' ? (
                  <span className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WhatsApp Conectado (24/7)</span>
                  </span>
                ) : connectionStatus === 'qr_pending' ? (
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="flex items-center space-x-1.5 text-xs text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2.5 py-1 rounded-full hover:bg-amber-900/40 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Escanear Código QR</span>
                  </button>
                ) : (
                  <span className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/40 px-2.5 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span>WhatsApp Inactivo</span>
                  </span>
                )}

                <button
                  onClick={handleToggleAi}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedConv.ai_enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>{selectedConv.ai_enabled ? 'Pausar IA (Tomar control)' : 'Reactivar IA'}</span>
                </button>
              </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((m) => {
                const isClient = m.sender_type === 'client';
                const isAi = m.sender_type === 'ai';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center space-x-1 mb-1 text-[11px] text-slate-400">
                      {isAi ? (
                        <>
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                          <span className="text-indigo-400 font-medium">SerStorm AI</span>
                        </>
                      ) : isClient ? (
                        <>
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{m.author}</span>
                        </>
                      ) : (
                        <span className="text-emerald-400 font-medium">Asesor Humano</span>
                      )}
                      <span>•</span>
                      <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div
                      className={`max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isClient
                          ? 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60'
                          : isAi
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-600/20'
                          : 'bg-emerald-700 text-white rounded-tr-sm shadow-md shadow-emerald-700/20'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      {m.status === 'pending' && (
                        <span className="text-[10px] opacity-75 mt-1 block">Enviando vía WhatsApp...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center space-x-3">
              <input
                type="text"
                placeholder={
                  selectedConv.ai_enabled
                    ? 'Escribí un mensaje (al responder desactivarás la IA para este chat)...'
                    : 'Escribí tu mensaje como asesor...'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-1"
              >
                <span>Enviar</span>
                <Send className="w-4 h-4 ml-1" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Seleccioná una conversación para ver el historial
          </div>
        )}
      </main>

      {/* Lead Profile Column */}
      {selectedConv && (
        <aside className="w-72 border-l border-slate-800 bg-slate-900/60 p-5 overflow-y-auto">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Ficha de Lead B2B
          </h4>

          {lead ? (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Empresa / Proyecto</label>
                <div className="text-sm font-semibold text-slate-100">{lead.company_name || 'No especificado'}</div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Tipo de Negocio</label>
                <div className="text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/40 px-2 py-1 rounded inline-block">
                  {lead.entity_type ? ENTITY_TYPE_LABELS[lead.entity_type] : 'En calificación'}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Estado en Pipeline</label>
                <div className="text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-1 rounded inline-block">
                  {PIPELINE_STAGE_LABELS[lead.pipeline_stage]}
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Presupuesto Pauta Estimado</label>
                <div className="text-sm text-slate-200">{lead.budget_tier || 'Por indagar'}</div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-0.5">Dolor Principal</label>
                <div className="text-xs text-slate-300 bg-slate-800/80 p-2 rounded border border-slate-700/60">
                  {lead.primary_bottleneck || 'No especificado'}
                </div>
              </div>

              {lead.qualification_notes && (
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">Notas del Agente IA</label>
                  <p className="text-xs text-slate-300 bg-slate-800/50 p-2.5 rounded border border-slate-700/40 italic">
                    "{lead.qualification_notes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Sin datos de lead asociados.</p>
          )}
        </aside>
      )}
    </div>
  );
}
