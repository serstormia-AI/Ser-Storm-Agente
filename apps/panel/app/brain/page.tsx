'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { updateBrain, getBrain } from '../actions';
import { Save, CheckCircle2 } from 'lucide-react';

export default function BrainEditorPage() {
  const [content, setContent] = useState('');
  const [services, setServices] = useState('');
  const [tone, setTone] = useState('');
  const [policies, setPolicies] = useState('');
  const [handoffRules, setHandoffRules] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBrain() {
      const data = await getBrain('00000000-0000-0000-0000-000000000001');
      if (data) {
        setContent(data.content || '');
        setServices(data.services || '');
        setTone(data.tone || '');
        setPolicies(data.policies || '');
        setHandoffRules(data.handoff_rules || '');
      }
    }
    loadBrain();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateBrain('00000000-0000-0000-0000-000000000001', {
      content,
      services,
      tone,
      policies,
      handoff_rules: handoffRules,
    });
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar agentPaused={false} onTogglePause={() => {}} />

      <main className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-950">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Cerebro de la Agencia (Prompt & Conocimiento)</h1>
            <p className="text-xs text-slate-400">
              Modificá las instrucciones y reglas comerciales del agente IA en tiempo real sin reiniciar el worker.
            </p>
          </div>
          {saved && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardado exitosamente</span>
            </div>
          )}
        </header>

        <form onSubmit={handleSave} className="space-y-6 max-w-4xl pb-12">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              1. Posicionamiento y Misión de SerStorm
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Quiénes somos, experiencia de Pablo Diz (+15 años), sector turístico y objetivo de la conversación.
            </p>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              2. Servicios Clave y Propuesta de Valor
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Performance Meta/Google Ads, SEO, Sitios Web bonificados, Conserjes Virtuales para hoteles y agencias.
            </p>
            <textarea
              rows={4}
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              3. Tono, Estilo y Dosificación en WhatsApp
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Párrafos cortos (2 a 4 líneas), tono consultivo, una sola pregunta por turno, empatía turística.
            </p>
            <textarea
              rows={3}
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              4. Políticas y Oferta de Auditoría Gratuita
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Condiciones de la videollamada estratégica de 30 min con Pablo Diz (100% gratuita, sin compromiso).
            </p>
            <textarea
              rows={3}
              value={policies}
              onChange={(e) => setPolicies(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-2">
            <label className="text-sm font-semibold text-slate-200 block">
              5. Reglas de Derivación a Humano (Handoff)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Criterios exactos en los que el bot debe pausarse y notificar al equipo comercial.
            </p>
            <textarea
              rows={3}
              value={handoffRules}
              onChange={(e) => setHandoffRules(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/30 flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios del Cerebro'}</span>
          </button>
        </form>
      </main>
    </div>
  );
}
