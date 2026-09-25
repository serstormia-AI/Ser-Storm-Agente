-- ============================================================================
-- SERSTORM AG: Supabase PostgreSQL Schema
-- Conversational AI Agent & CRM for SerStorm Digital Marketing
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Agencies (Multi-tenant ready, SerStorm as primary agency)
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'SerStorm Marketing Digital Turístico',
    slug TEXT NOT NULL UNIQUE DEFAULT 'serstorm',
    brand_color TEXT DEFAULT '#4F46E5',
    logo_url TEXT,
    audit_calendar_url TEXT DEFAULT 'https://cal.com/serstorm/auditoria-estrategica',
    business_hours JSONB DEFAULT '{
        "timezone": "America/Argentina/Buenos_Aires",
        "schedule": {
            "monday": {"open": "09:00", "close": "18:00", "active": true},
            "tuesday": {"open": "09:00", "close": "18:00", "active": true},
            "wednesday": {"open": "09:00", "close": "18:00", "active": true},
            "thursday": {"open": "09:00", "close": "18:00", "active": true},
            "friday": {"open": "09:00", "close": "18:00", "active": true},
            "saturday": {"open": "10:00", "close": "14:00", "active": false},
            "sunday": {"open": "10:00", "close": "14:00", "active": false}
        }
    }'::jsonb,
    agent_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Agency Brain (Prompt & Business Knowledge)
CREATE TABLE IF NOT EXISTS agency_brains (
    agency_id UUID PRIMARY KEY REFERENCES agencies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    services TEXT NOT NULL,
    tone TEXT NOT NULL,
    policies TEXT NOT NULL,
    handoff_rules TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Team Members
CREATE TABLE IF NOT EXISTS agency_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    auth_user_id UUID,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'advisor' CHECK (role IN ('admin', 'director', 'advisor')),
    specialty TEXT DEFAULT 'general' CHECK (specialty IN ('general', 'hoteles', 'agencias', 'performance_ads', 'desarrollo_web')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. B2B Tourism Leads
CREATE TABLE IF NOT EXISTS serstorm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    company_name TEXT,
    entity_type TEXT CHECK (entity_type IN ('hotel_boutique', 'hotel_resort', 'travel_agency', 'tour_operator', 'car_rental', 'tourism_other')),
    budget_tier TEXT CHECK (budget_tier IN ('under_1k', '1k_to_3k', '3k_to_10k', 'above_10k')),
    primary_bottleneck TEXT CHECK (primary_bottleneck IN ('high_ota_commissions', 'low_direct_bookings', 'seasonal_vacancy', 'lack_of_ad_strategy', 'outdated_brand_web', 'other')),
    website_or_social TEXT,
    pipeline_stage TEXT DEFAULT 'new' CHECK (pipeline_stage IN ('new', 'qualifying', 'qualified', 'audit_scheduled', 'proposal_sent', 'won', 'lost', 'human_needed')),
    qualification_notes TEXT,
    audit_datetime TIMESTAMPTZ,
    audit_meeting_url TEXT,
    assigned_advisor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Conversations
CREATE TABLE IF NOT EXISTS serstorm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES serstorm_leads(id) ON DELETE SET NULL,
    whatsapp_jid TEXT NOT NULL,
    contact_name TEXT,
    ai_enabled BOOLEAN DEFAULT TRUE,
    agent_mode TEXT DEFAULT 'standard' CHECK (agent_mode IN ('standard', 'cierre', 'paused')),
    agent_instructions TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count INT DEFAULT 0,
    assigned_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unq_agency_jid UNIQUE (agency_id, whatsapp_jid)
);

-- 6. Messages
CREATE TABLE IF NOT EXISTS serstorm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES serstorm_conversations(id) ON DELETE CASCADE,
    wa_message_id TEXT UNIQUE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'ai', 'human')),
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    simulate_typing BOOLEAN DEFAULT FALSE,
    audio_url TEXT,
    transcription TEXT,
    status TEXT DEFAULT 'delivered' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Followups
CREATE TABLE IF NOT EXISTS serstorm_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES serstorm_leads(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES serstorm_conversations(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
    message TEXT NOT NULL,
    kind TEXT DEFAULT 'internal' CHECK (kind IN ('internal', 'outbound')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Audit Events & Token Usage
CREATE TABLE IF NOT EXISTS serstorm_ai_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES serstorm_conversations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    tool_name TEXT,
    tool_input JSONB,
    tool_output JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_agency_stage ON serstorm_leads(agency_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON serstorm_leads(phone);
CREATE INDEX IF NOT EXISTS idx_conv_last_message ON serstorm_conversations(agency_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON serstorm_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_pending ON serstorm_messages(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_followups_due ON serstorm_followups(due_at) WHERE status = 'pending';

-- Initial Agency Seed
INSERT INTO agencies (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'SerStorm Marketing Digital Turístico', 'serstorm')
ON CONFLICT (slug) DO NOTHING;

-- Initial Brain Seed
INSERT INTO agency_brains (agency_id, content, services, tone, policies, handoff_rules)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'SerStorm es una agencia boutique de marketing digital y tecnología especializada exclusivamente en la industria turística (hoteles, resorts, cabañas, agencias de viajes emisivas y receptivas, operadores turísticos y rentadoras). Liderada por Pablo Diz (+15 años de experiencia en el sector turístico). La misión es convertir consultas en reservas confirmadas, reduciendo la dependencia asfixiante de las OTAs (Booking, Expedia) y acortando los ciclos de venta de agencias.',
    '1. Performance Ads (Meta & Google Ads enfocados en retorno y reservas directas). 2. Posicionamiento SEO Turístico. 3. Sitios Web de Alta Conversión (bonificados en planes integrales). 4. Conserjes Virtuales y Automatización de WhatsApp 24/7. 5. Auditoría Gratuita de Presencia Digital (Lead Magnet estrella).',
    'Profesional, empático, consultivo, enfocado en resultados de negocio. Habla el lenguaje del turismo (ocupación, temporada baja, tarifas, comisiones de OTAs). Mensajes directos, estilo WhatsApp (2 a 4 líneas), con una sola pregunta al final para mantener el dinamismo.',
    'La Auditoría Estratégica con Pablo Diz es 100% gratuita y sin compromiso (30 minutos vía Google Meet). Los planes mensuales de servicio se cotizan a medida tras la auditoría en base a los objetivos y presupuesto de pauta del cliente.',
    'Derivar a asesor humano cuando: 1. El cliente pide explícitamente hablar con una persona. 2. Se agenda con éxito la auditoría gratuita. 3. Surgen reclamos, dudas sobre pagos en curso o casos especiales fuera del alcance comercial.'
)
ON CONFLICT (agency_id) DO NOTHING;

-- RPC Function: Lead Metrics
CREATE OR REPLACE FUNCTION serstorm_lead_metrics(p_agency_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'total_leads', COUNT(*),
        'new_leads', COUNT(*) FILTER (WHERE pipeline_stage = 'new'),
        'qualified_leads', COUNT(*) FILTER (WHERE pipeline_stage = 'qualified'),
        'audits_scheduled', COUNT(*) FILTER (WHERE pipeline_stage = 'audit_scheduled'),
        'won', COUNT(*) FILTER (WHERE pipeline_stage = 'won'),
        'conversion_rate', CASE 
            WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE pipeline_stage IN ('qualified', 'audit_scheduled', 'won'))::numeric / COUNT(*)::numeric) * 100, 1)
            ELSE 0
        END
    )
    FROM serstorm_leads
    WHERE agency_id = p_agency_id;
$$;
