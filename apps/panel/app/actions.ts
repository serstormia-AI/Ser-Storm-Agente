'use server';

import { createClient } from '@supabase/supabase-js';
import { PipelineStage, SerstormConversation, SerstormMessage, SerstormLead } from '@/lib/shared';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://placeholder-serstorm.supabase.co';

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-service-key';

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

