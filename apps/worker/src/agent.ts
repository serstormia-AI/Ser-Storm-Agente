import Anthropic from '@anthropic-ai/sdk';
import { SupabaseClient } from '@supabase/supabase-js';
import { SerstormConversation, SerstormLead, LeadEntityType, BudgetTier, PrimaryBottleneck, PipelineStage } from '@serstorm/shared';
import { dispatchN8nWebhook } from './webhooks';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MODEL_NAME = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

interface RunAgentParams {
  supabase: SupabaseClient;
  agencyId: string;
  conversation: SerstormConversation;
  lead: SerstormLead | null;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function runAgentTurn(params: RunAgentParams): Promise<string | null> {
  const { supabase, agencyId, conversation, lead, recentMessages } = params;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[Agent] ANTHROPIC_API_KEY is not configured in process.env');
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  // 1. Fetch Brain & Agency Config
  const { data: brain } = await supabase
    .from('agency_brains')
    .select('*')
    .eq('agency_id', agencyId)
    .single();

  const { data: agency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .single();

  const calendarUrl = agency?.audit_calendar_url || 'https://cal.com/serstorm/auditoria-estrategica';

  // 2. Build System Prompt
  const systemPrompt = `
Eres el Asistente Estratégico de Admisiones de SerStorm (https://serstorm.com/).
SerStorm es la agencia líder de marketing digital y tecnología especializada EXCLUSIVAMENTE en turismo, fundada por Pablo Diz (+15 años en el sector).

MISIÓN:
Conversar cordialmente con el prospecto turístico, comprender su negocio, validar si califica y agendar una Auditoría Estratégica Gratuita (30 minutos vía Google Meet) con Pablo Diz o su equipo.
NO vendas servicios con precios fijos por chat. Cada plan se cotiza a medida tras la auditoría.

CONOCIMIENTO DE SERSTORM:
- ${brain?.content || 'Marketing digital para hoteles, cabañas y agencias de viajes.'}
- Servicios clave: ${brain?.services || 'Performance Ads (Meta & Google), SEO Turístico, Web de Alta Conversión, Bots de WhatsApp para Hoteles.'}
- Políticas y Auditoría: ${brain?.policies || 'La auditoría de 30 min es 100% gratuita y sin compromiso.'}
- Enlace de agenda: ${calendarUrl}

DATOS DEL PROSPECTO ACTUAL:
- Nombre: ${lead?.name || 'Aún no proporcionado'}
- Empresa / Proyecto: ${lead?.company_name || 'Aún no proporcionado'}
- Tipo de negocio: ${lead?.entity_type || 'Desconocido'}
- Presupuesto mensual estimado: ${lead?.budget_tier || 'No especificado'}
- Cuello de botella principal: ${lead?.primary_bottleneck || 'No identificado'}
- Etapa del pipeline: ${lead?.pipeline_stage || 'new'}

REGLAS DE COMUNICACIÓN (WHATSAPP):
1. Mensajes muy breves y ágiles (2 a 4 líneas por mensaje).
2. Tono cercano, empático y profesional (argentino/neutro cálido).
3. Avanza de a UNA sola pregunta por turno.
4. Llama a las herramientas cuando el cliente te dé su información:
   - Usa "upsert_lead" para guardar nombre, empresa, tipo de negocio, presupuesto y dolor.
   - Usa "schedule_audit" si el cliente acepta coordinar la auditoría estratégica.
   - Usa "handoff_to_human" si el cliente pide hablar con una persona física.
5. NO alucines ni des precios mensuales garantizados.
`.trim();

  // 3. Define Tools
  const tools: Anthropic.Tool[] = [
    {
      name: 'upsert_lead',
      description: 'Guarda o actualiza la información recopilada del prospecto turístico (empresa, rubro, presupuesto, cuello de botella)',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre de contacto de la persona' },
          company_name: { type: 'string', description: 'Nombre del hotel, cabañas, agencia de viajes o empresa' },
          entity_type: {
            type: 'string',
            enum: ['hotel_boutique', 'hotel_resort', 'travel_agency', 'tour_operator', 'car_rental', 'tourism_other'],
            description: 'Tipo de negocio turístico',
          },
          budget_tier: {
            type: 'string',
            enum: ['under_1k', '1k_to_3k', '3k_to_10k', 'above_10k'],
            description: 'Rango mensual estimado de inversión en pauta/marketing en USD',
          },
          primary_bottleneck: {
            type: 'string',
            enum: ['high_ota_commissions', 'low_direct_bookings', 'seasonal_vacancy', 'lack_of_ad_strategy', 'outdated_brand_web', 'other'],
            description: 'Mayor desafío o problema que enfrenta el negocio',
          },
          website_or_social: { type: 'string', description: 'Sitio web o enlace a redes sociales' },
        },
      },
    },
    {
      name: 'qualify_lead',
      description: 'Actualiza la etapa de calificación del lead y agrega notas de evaluación',
      input_schema: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            enum: ['qualifying', 'qualified', 'lost'],
            description: 'Etapa del prospecto',
          },
          notes: { type: 'string', description: 'Resumen o notas de por qué califica o no' },
        },
        required: ['stage', 'notes'],
      },
    },
    {
      name: 'schedule_audit',
      description: 'Confirma el agendamiento de la auditoría estratégica gratuita con Pablo Diz y deriva a un asesor',
      input_schema: {
        type: 'object',
        properties: {
          datetime_str: { type: 'string', description: 'Fecha y hora acordada o preferencia horaria del cliente' },
          meeting_notes: { type: 'string', description: 'Detalles relevantes para la reunión' },
        },
        required: ['datetime_str'],
      },
    },
    {
      name: 'handoff_to_human',
      description: 'Pausa el agente de IA y deriva la conversación a un asesor humano del equipo de SerStorm',
      input_schema: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Razón de la derivación (solicitud del cliente, caso especial, etc.)' },
        },
        required: ['reason'],
      },
    },
  ];

  // 4. Format Messages
  const messages: Anthropic.MessageParam[] = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    let currentResponse = await anthropic.messages.create({
      model: MODEL_NAME,
      max_tokens: 600,
      system: systemPrompt,
      messages,
      tools,
    });

    let assistantReply = '';

    // Loop for tool calls (max 3 rounds)
    for (let round = 0; round < 3; round++) {
      const toolCalls = currentResponse.content.filter((c) => c.type === 'tool_use');

      // Extract text content
      for (const block of currentResponse.content) {
        if (block.type === 'text') {
          assistantReply += block.text;
        }
      }

      if (toolCalls.length === 0 || currentResponse.stop_reason !== 'tool_use') {
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const call of toolCalls) {
        const toolUse = call as Anthropic.ToolUseBlock;
        console.log(`[Agent Tool Call] ${toolUse.name}:`, JSON.stringify(toolUse.input));

        let resultPayload: any = { success: true };

        if (toolUse.name === 'upsert_lead') {
          const input = toolUse.input as any;
          if (lead?.id) {
            await supabase.from('serstorm_leads').update({
              ...input,
              updated_at: new Date().toISOString(),
            }).eq('id', lead.id);
          }
          resultPayload = { status: 'lead_updated', data: input };
        } else if (toolUse.name === 'qualify_lead') {
          const input = toolUse.input as { stage: PipelineStage; notes: string };
          if (lead?.id) {
            await supabase.from('serstorm_leads').update({
              pipeline_stage: input.stage,
              qualification_notes: input.notes,
              updated_at: new Date().toISOString(),
            }).eq('id', lead.id);

            if (input.stage === 'qualified') {
              dispatchN8nWebhook({
                event: 'lead_qualified',
                timestamp: new Date().toISOString(),
                lead: { id: lead.id, name: lead.name, company_name: lead.company_name, phone: lead.phone },
                conversation_id: conversation.id,
                metadata: { notes: input.notes },
              });
            }
          }
          resultPayload = { status: 'qualification_recorded' };
        } else if (toolUse.name === 'schedule_audit') {
          const input = toolUse.input as { datetime_str: string; meeting_notes?: string };
          if (lead?.id) {
            await supabase.from('serstorm_leads').update({
              pipeline_stage: 'audit_scheduled',
              audit_datetime: new Date().toISOString(), // or parsed
              qualification_notes: input.meeting_notes,
              updated_at: new Date().toISOString(),
            }).eq('id', lead.id);

            // Turn off AI to allow human advisor to follow up
            await supabase.from('serstorm_conversations').update({
              ai_enabled: false,
              updated_at: new Date().toISOString(),
            }).eq('id', conversation.id);

            dispatchN8nWebhook({
              event: 'audit_booked',
              timestamp: new Date().toISOString(),
              lead: { id: lead.id, name: lead.name, company_name: lead.company_name, phone: lead.phone },
              conversation_id: conversation.id,
              metadata: { datetime: input.datetime_str, notes: input.meeting_notes },
            });
          }
          resultPayload = { status: 'audit_scheduled_and_handed_off' };
        } else if (toolUse.name === 'handoff_to_human') {
          const input = toolUse.input as { reason: string };
          await supabase.from('serstorm_conversations').update({
            ai_enabled: false,
            updated_at: new Date().toISOString(),
          }).eq('id', conversation.id);

          dispatchN8nWebhook({
            event: 'human_handoff',
            timestamp: new Date().toISOString(),
            lead: { id: lead?.id, phone: lead?.phone },
            conversation_id: conversation.id,
            metadata: { reason: input.reason },
          });

          resultPayload = { status: 'ai_disabled_human_notified' };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(resultPayload),
        });
      }

      // Next turn with tool results
      messages.push({ role: 'assistant', content: currentResponse.content });
      messages.push({ role: 'user', content: toolResults });

      currentResponse = await anthropic.messages.create({
        model: MODEL_NAME,
        max_tokens: 600,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    return assistantReply.trim() || null;
  } catch (error: any) {
    console.error('[Agent] Claude API error:', error.message);
    return null;
  }
}
