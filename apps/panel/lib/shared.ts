export type LeadEntityType =
  | 'hotel_boutique'
  | 'hotel_resort'
  | 'travel_agency'
  | 'tour_operator'
  | 'car_rental'
  | 'tourism_other';

export type BudgetTier =
  | 'under_1k'
  | '1k_to_3k'
  | '3k_to_10k'
  | 'above_10k';

export type PrimaryBottleneck =
  | 'high_ota_commissions'
  | 'low_direct_bookings'
  | 'seasonal_vacancy'
  | 'lack_of_ad_strategy'
  | 'outdated_brand_web'
  | 'other';

export type PipelineStage =
  | 'new'
  | 'qualifying'
  | 'qualified'
  | 'audit_scheduled'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'human_needed';

export type AgentMode = 'standard' | 'cierre' | 'paused';

export interface SerstormLead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string | null;
  phone: string;
  email: string | null;
  company_name: string | null;
  entity_type: LeadEntityType | null;
  budget_tier: BudgetTier | null;
  primary_bottleneck: PrimaryBottleneck | null;
  website_or_social: string | null;
  pipeline_stage: PipelineStage;
  qualification_notes: string | null;
  audit_datetime: string | null;
  audit_meeting_url: string | null;
  assigned_advisor: string | null;
}

export interface SerstormConversation {
  id: string;
  lead_id: string | null;
  whatsapp_jid: string;
  contact_name: string | null;
  ai_enabled: boolean;
  agent_mode: AgentMode;
  agent_instructions: string | null;
  last_message_at: string;
  unread_count: number;
  assigned_to: string | null;
  created_at: string;
}

export interface SerstormMessage {
  id: string;
  conversation_id: string;
  wa_message_id: string | null;
  sender_type: 'client' | 'ai' | 'human';
  author: string;
  content: string;
  simulate_typing?: boolean;
  audio_url?: string | null;
  transcription?: string | null;
  created_at: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface AgencyBrain {
  agency_id: string;
  name: string;
  slug: string;
  content: string;
  services: string;
  tone: string;
  policies: string;
  handoff_rules: string;
  business_hours: {
    timezone: string;
    schedule: Record<string, { open: string; close: string; active: boolean }>;
  };
  agent_paused: boolean;
  audit_calendar_url: string;
}

export interface WebhookPayload {
  event: 'lead_qualified' | 'audit_booked' | 'human_handoff' | 'new_message';
  timestamp: string;
  lead: Partial<SerstormLead>;
  conversation_id: string;
  message?: string;
  metadata?: Record<string, any>;
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  new: 'Nuevo Lead',
  qualifying: 'En Calificación',
  qualified: 'Calificado',
  audit_scheduled: 'Auditoría Agendada',
  proposal_sent: 'Propuesta Enviada',
  won: 'Cliente Ganado',
  lost: 'No Califica / Perdido',
  human_needed: 'Requiere Asesor',
};

export const ENTITY_TYPE_LABELS: Record<LeadEntityType, string> = {
  hotel_boutique: 'Hotel Boutique / Cabañas',
  hotel_resort: 'Hotel / Resort Grande',
  travel_agency: 'Agencia de Viajes',
  tour_operator: 'Operador Mayorista',
  car_rental: 'Rentadora de Autos',
  tourism_other: 'Otro Servicio Turístico',
};
