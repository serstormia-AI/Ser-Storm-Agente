'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { getMetrics } from '../actions';
import { Users, CalendarCheck, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState({
    total_leads: 0,
    new_leads: 0,
    qualified_leads: 0,
    audits_scheduled: 0,
    won: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMetrics();
      if (data) {
        setMetrics(data);
      }
      setLoading(false);
    }

    load();
  }, []);

  const cards = [
    { title: 'Total Leads Recibidos', value: metrics.total_leads, icon: Users, color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/40' },
    { title: 'Leads Calificados B2B', value: metrics.qualified_leads, icon: Sparkles, color: 'text-sky-400 bg-sky-950/60 border-sky-800/40' },
    { title: 'Auditorías Agendadas', value: metrics.audits_scheduled, icon: CalendarCheck, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40' },
    { title: 'Tasa de Conversión', value: `${metrics.conversion_rate}%`, icon: TrendingUp, color: 'text-amber-400 bg-amber-950/60 border-amber-800/40' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar agentPaused={false} onTogglePause={() => {}} />

      <main className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-950">
        <header className="mb-8">
          <h1 className="text-xl font-bold text-slate-100">Rendimiento del Agente & Métricas B2B</h1>
          <p className="text-xs text-slate-400">
            Medición de consultas turísticas atendidas, calificación comercial y agendamiento de auditorías con Pablo Diz.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{c.title}</span>
                  <div className={`p-2 rounded-lg border ${c.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">{c.value}</div>
              </div>
            );
          })}
        </div>

        {/* Funnel Preview */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 max-w-3xl">
          <h3 className="font-semibold text-sm text-slate-200 mb-4">Embudo de Conversión de Consultas</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>1. Contacto inicial WhatsApp</span>
                <span>{metrics.total_leads} prospectos (100%)</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>2. Calificados por rubro y presupuesto</span>
                <span>{metrics.qualified_leads} calificados</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.total_leads > 0 ? (metrics.qualified_leads / metrics.total_leads) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>3. Auditoría Estratégica Agendada (con Pablo Diz)</span>
                <span>{metrics.audits_scheduled} agendadas</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${metrics.total_leads > 0 ? (metrics.audits_scheduled / metrics.total_leads) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
