'use server';

import { createClient } from '@supabase/supabase-js';
import { PipelineStage, SerstormConversation, SerstormMessage, SerstormLead, Campaign } from '@/lib/shared';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://oaipqsrupiwkqvtcuwka.supabase.co';

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haXBxc3J1cGl3a3F2dGN1d2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NjY3MSwiZXhwIjoyMTA1OTIyNjcxfQ.1QVwA7TB_OvJhmC3wzN139SuvChkyYTZl6ArnDGKcbk';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function getConversations(): Promise<SerstormConversation[]> {
  const { data, error } = await supabaseAdmin
    .from('serstorm_conversations')
    .select('*')
    .not('whatsapp_jid', 'like', '%@newsletter%')
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('getConversations error:', error.message);
    return [];
  }
  return data || [];
}

export async function getMessages(conversationId: string): Promise<SerstormMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('serstorm_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getMessages error:', error.message);
    return [];
  }
  return data || [];
}

export async function getLead(leadId: string): Promise<SerstormLead | null> {
  const { data, error } = await supabaseAdmin
    .from('serstorm_leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error) return null;
  return data;
}

export async function getLeads(): Promise<SerstormLead[]> {
  const { data, error } = await supabaseAdmin
    .from('serstorm_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAgency(slug: string = 'serstorm') {
  const { data, error } = await supabaseAdmin
    .from('agencies')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data;
}

export async function getBrain(agencyId: string = '00000000-0000-0000-0000-000000000001') {
  const { data, error } = await supabaseAdmin
    .from('agency_brains')
    .select('*')
    .eq('agency_id', agencyId)
    .single();

  if (error) return null;
  return data;
}

export async function getMetrics() {
  const { data: leads } = await supabaseAdmin.from('serstorm_leads').select('pipeline_stage');
  if (!leads) return { total_leads: 0, new_leads: 0, qualified_leads: 0, audits_scheduled: 0, won: 0, conversion_rate: 0 };
  const total = leads.length;
  const qualified = leads.filter((l) => l.pipeline_stage === 'qualified').length;
  const audits = leads.filter((l) => l.pipeline_stage === 'audit_scheduled').length;
  const won = leads.filter((l) => l.pipeline_stage === 'won').length;
  return {
    total_leads: total,
    new_leads: leads.filter((l) => l.pipeline_stage === 'new').length,
    qualified_leads: qualified,
    audits_scheduled: audits,
    won,
    conversion_rate: total > 0 ? Math.round(((qualified + audits + won) / total) * 100) : 0,
  };
}

export async function sendMessage(conversationId: string, content: string) {
  if (!content.trim()) return { success: false, error: 'Empty message' };

  // 1. When an operator replies from the panel, immediately turn off AI for this conversation
  await supabaseAdmin
    .from('serstorm_conversations')
    .update({ ai_enabled: false, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  // 2. Enqueue outbound message for Baileys worker to dispatch
  const { data, error } = await supabaseAdmin
    .from('serstorm_messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'human',
      author: 'Asesor SerStorm',
      content: content.trim(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: data };
}

export async function toggleAi(conversationId: string, enabled: boolean) {
  const { error } = await supabaseAdmin
    .from('serstorm_conversations')
    .update({ ai_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) return { success: false, error: error.message };
  return { success: true, ai_enabled: enabled };
}

export async function toggleAgentPaused(agencyId: string, paused: boolean) {
  const { error } = await supabaseAdmin
    .from('agencies')
    .update({ agent_paused: paused, updated_at: new Date().toISOString() })
    .eq('id', agencyId);

  if (error) return { success: false, error: error.message };
  return { success: true, agent_paused: paused };
}

export async function updateLeadStage(leadId: string, stage: PipelineStage) {
  const { error } = await supabaseAdmin
    .from('serstorm_leads')
    .update({ pipeline_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateBrain(agencyId: string, fields: {
  content: string;
  services: string;
  tone: string;
  policies: string;
  handoff_rules: string;
}) {
  const { error } = await supabaseAdmin
    .from('agency_brains')
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq('agency_id', agencyId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function requestQrCode() {
  const { data: ag } = await supabaseAdmin
    .from('agencies')
    .select('business_hours')
    .eq('slug', 'serstorm')
    .single();

  const currentBh = ag?.business_hours || {};
  await supabaseAdmin
    .from('agencies')
    .update({
      business_hours: {
        ...currentBh,
        reset_auth: true,
        whatsapp_qr: null,
        connection_status: 'qr_pending',
      },
    })
    .eq('slug', 'serstorm');

  return { success: true };
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    agency_id: '00000000-0000-0000-0000-000000000001',
    name: 'Hoteles & Cabañas: Aumento de Reservas Directas',
    trigger_text: 'Hola, vi el anuncio sobre aumento de reservas directas para hoteles',
    context: 'Esta campaña está dirigida a dueños y directivos de hoteles, resorts y complejos de cabañas turísticas. El objetivo es resolver la dependencia y altas comisiones de Booking/Expedia/Airbnb (18% al 25%). Nuestro enfoque es auditoría estratégica gratuita de 30 minutos con Pablo Diz (+15 años de experiencia) para implementar motor de reservas propio y pauta en Meta/Google Ads que maximice el canal directo.',
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    agency_id: '00000000-0000-0000-0000-000000000001',
    name: 'Agencias de Viajes: Prospección & Automatización',
    trigger_text: 'Hola, me interesa la solución de marketing y automatización para agencias de viajes',
    context: 'Esta campaña está dirigida a dueños de agencias de viajes minoristas y tour operadores mayoristas. El dolor principal es el alto costo por lead en pauta digital y la pérdida de tiempo con consultas curiosas que no compran. Ofrecemos auditoría gratuita de 30 minutos con Pablo Diz para implementar embudos de prospección calificada y agentes de IA en WhatsApp que precalifican antes de pasar al asesor.',
    active: true,
    created_at: new Date().toISOString(),
  }
];

export async function getCampaigns(agencyId: string = '00000000-0000-0000-0000-000000000001'): Promise<Campaign[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (_) {}

  // Fallback to agencies.business_hours.campaigns
  const { data: ag } = await supabaseAdmin
    .from('agencies')
    .select('business_hours')
    .eq('id', agencyId)
    .single();

  const bh = ag?.business_hours || {};
  if (!bh.campaigns || bh.campaigns.length === 0) {
    await supabaseAdmin
      .from('agencies')
      .update({
        business_hours: { ...bh, campaigns: DEFAULT_CAMPAIGNS }
      })
      .eq('id', agencyId);
    return DEFAULT_CAMPAIGNS;
  }

  return bh.campaigns || [];
}

export async function createCampaign(data: {
  name: string;
  trigger_text: string;
  context: string;
  agency_id?: string;
}) {
  const agencyId = data.agency_id || '00000000-0000-0000-0000-000000000001';
  const newCamp: Campaign = {
    id: crypto.randomUUID(),
    agency_id: agencyId,
    name: data.name.trim(),
    trigger_text: data.trigger_text.trim(),
    context: data.context.trim(),
    active: true,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .insert(newCamp);
    if (!error) return { success: true, campaign: newCamp };
  } catch (_) {}

  const { data: ag } = await supabaseAdmin
    .from('agencies')
    .select('business_hours')
    .eq('id', agencyId)
    .single();

  const bh = ag?.business_hours || {};
  const campaigns: Campaign[] = bh.campaigns || [];
  campaigns.unshift(newCamp);

  await supabaseAdmin
    .from('agencies')
    .update({
      business_hours: { ...bh, campaigns }
    })
    .eq('id', agencyId);

  return { success: true, campaign: newCamp };
}

export async function updateCampaign(
  campaignId: string,
  fields: { name?: string; trigger_text?: string; context?: string; active?: boolean },
  agencyId: string = '00000000-0000-0000-0000-000000000001'
) {
  try {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update(fields)
      .eq('id', campaignId);
    if (!error) return { success: true };
  } catch (_) {}

  const { data: ag } = await supabaseAdmin
    .from('agencies')
    .select('business_hours')
    .eq('id', agencyId)
    .single();

  const bh = ag?.business_hours || {};
  const campaigns: Campaign[] = (bh.campaigns || []).map((c: Campaign) => {
    if (c.id === campaignId) {
      return { ...c, ...fields };
    }
    return c;
  });

  await supabaseAdmin
    .from('agencies')
    .update({
      business_hours: { ...bh, campaigns }
    })
    .eq('id', agencyId);

  return { success: true };
}

export async function toggleCampaignActive(
  campaignId: string,
  active: boolean,
  agencyId: string = '00000000-0000-0000-0000-000000000001'
) {
  return updateCampaign(campaignId, { active }, agencyId);
}

export async function deleteCampaign(
  campaignId: string,
  agencyId: string = '00000000-0000-0000-0000-000000000001'
) {
  try {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', campaignId);
    if (!error) return { success: true };
  } catch (_) {}

  const { data: ag } = await supabaseAdmin
    .from('agencies')
    .select('business_hours')
    .eq('id', agencyId)
    .single();

  const bh = ag?.business_hours || {};
  const campaigns: Campaign[] = (bh.campaigns || []).filter((c: Campaign) => c.id !== campaignId);

  await supabaseAdmin
    .from('agencies')
    .update({
      business_hours: { ...bh, campaigns }
    })
    .eq('id', agencyId);

  return { success: true };
}


