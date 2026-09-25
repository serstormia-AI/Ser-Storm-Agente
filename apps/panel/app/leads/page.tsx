'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { updateLeadStage, toggleAgentPaused, getLeads } from '../actions';
import { SerstormLead, PipelineStage, PIPELINE_STAGE_LABELS, ENTITY_TYPE_LABELS } from '@/lib/shared';
import { Building2, DollarSign, CalendarCheck, Phone, ArrowRight } from 'lucide-react';

const STAGES: PipelineStage[] = [
  'new',
  'qualifying',
  'qualified',
  'audit_scheduled',
  'won',
  'lost',
];

export default function LeadsPipelinePage() {
  const [leads, setLeads] = useState<SerstormLead[]>([]);
  const [agentPaused, setAgentPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadLeads() {
    const data = await getLeads();
    if (data) setLeads(data);
    setLoading(false);
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const handleMoveStage = async (leadId: string, currentStage: PipelineStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, pipeline_stage: nextStage } : l))
      );
      await updateLeadStage(leadId, nextStage);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar agentPaused={agentPaused} onTogglePause={() => setAgentPaused(!agentPaused)} />

      <main className="flex-1 flex flex-col p-6 overflow-x-auto bg-slate-950">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Pipeline de Leads Turísticos</h1>
            <p className="text-xs text-slate-400">Embudo comercial B2B para hoteles, agencias y operadoras</p>
          </div>
          <button
            onClick={loadLeads}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            Actualizar Tablero
          </button>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 flex space-x-4 min-w-[1100px] overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.pipeline_stage === stage);
            return (
              <div
                key={stage}
                className="w-72 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col max-h-full"
              >
                <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-slate-200">
                    {PIPELINE_STAGE_LABELS[stage]}
                  </h3>
                  <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-slate-800/90 border border-slate-700/60 rounded-xl p-3.5 shadow-sm hover:border-slate-600 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm text-slate-100">
                          {lead.company_name || lead.name || 'Prospecto sin nombre'}
                        </h4>
                        {lead.entity_type && (
                          <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 px-1.5 py-0.5 rounded">
                            {ENTITY_TYPE_LABELS[lead.entity_type]}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-400 mb-3">
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.budget_tier && (
                          <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                            <DollarSign className="w-3 h-3" />
                            <span>Pauta: {lead.budget_tier}</span>
                          </div>
                        )}
                        {lead.primary_bottleneck && (
                          <p className="text-[11px] text-slate-300 bg-slate-900/70 p-1.5 rounded">
                            {lead.primary_bottleneck}
                          </p>
                        )}
                      </div>

                      {stage !== 'won' && stage !== 'lost' && (
                        <button
                          onClick={() => handleMoveStage(lead.id, stage)}
                          className="w-full flex items-center justify-center space-x-1 py-1 rounded bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-medium transition"
                        >
                          <span>Avanzar Etapa</span>
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-600">
                      Sin prospectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
