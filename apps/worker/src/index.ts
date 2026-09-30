import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcodeTerminal from 'qrcode-terminal';
import { toDataURL } from 'qrcode';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { runAgentTurn } from './agent';
import { transcribeAudioBuffer } from './transcribe';
import { processDueFollowups } from './followups';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const AGENCY_SLUG = process.env.AGENCY_SLUG || 'serstorm';
const AGENT_DEBOUNCE_MS = parseInt(process.env.AGENT_DEBOUNCE_MS || '8000', 10);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Worker Fatal] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Memory stores for debounce, queues & deduplication
const debounceTimers = new Map<string, NodeJS.Timeout>();
const inFlightMessageIds = new Set<string>();
const recentlySentWaMsgIds = new Set<string>();
const recentlySentContents = new Map<string, number>();
const processedIncomingWaMsgIds = new Set<string>();
let agencyId: string = '00000000-0000-0000-0000-000000000001';

async function resolveAgency(): Promise<void> {
  const { data, error } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', AGENCY_SLUG)
    .single();

  if (data?.id) {
    agencyId = data.id;
    console.log(`[Worker] Agency resolved: ${AGENCY_SLUG} (${agencyId})`);
  } else {
    console.warn(`[Worker] Agency slug ${AGENCY_SLUG} not found, using fallback ${agencyId}`);
  }
}

const TRIGGER_STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'sin', 'sobre', 'que', 'mas', 'los', 'las', 'del', 'por', 'para', 'una', 'uno',
  'hola', 'buenas', 'buenos', 'dias', 'tardes', 'noches',
  'quiero', 'quisiera', 'queria', 'necesito', 'busco',
  'interesa', 'interesado', 'interesada', 'interese',
  'informacion', 'info', 'consulta', 'consultar', 'saber', 'precio', 'precios',
  'promo', 'promocion', 'oferta', 'anuncio', 'vi', 'el', 'sobre'
]);

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function distinctiveWords(triggerText: string): string[] {
  return [...new Set(normalizeWords(triggerText).filter((w) => w.length > 2 && !TRIGGER_STOPWORDS.has(w)))];
}

async function matchCampaign(
  agencyId: string,
  messageBody: string
): Promise<string | null> {
  let campaigns: any[] = [];
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, trigger_text, active')
      .eq('agency_id', agencyId)
      .eq('active', true);

    if (!error && data && data.length > 0) {
      campaigns = data;
    }
  } catch (_) {}

  if (campaigns.length === 0) {
    const { data: ag } = await supabase
      .from('agencies')
      .select('business_hours')
      .eq('id', agencyId)
      .single();
    campaigns = (ag?.business_hours?.campaigns || []).filter((c: any) => c.active !== false);
  }

  if (campaigns.length === 0) return null;

  const bodyLower = messageBody.toLowerCase();
  const bodyWords = new Set(normalizeWords(messageBody));

  const scored = campaigns
    .map((c) => {
      const own = distinctiveWords(c.trigger_text);
      return {
        id: c.id,
        own,
        hits: own.filter((w) => bodyWords.has(w)),
        exact: bodyLower.includes(c.trigger_text.toLowerCase()),
        triggerLength: c.trigger_text.length
      };
    })
    .filter((c) => c.hits.length > 0 || c.exact)
    .sort(
      (a, b) =>
        b.hits.length - a.hits.length ||
        Number(b.exact) - Number(a.exact) ||
        (b.own.length ? b.hits.length / b.own.length : 0) - (a.own.length ? a.hits.length / a.own.length : 0) ||
        b.triggerLength - a.triggerLength
    );

  const best = scored[0];
  if (!best) return null;
  return best.id;
}

async function startBaileysWorker() {
  await resolveAgency();

  const authDir = path.resolve(process.cwd(), 'auth', AGENCY_SLUG);

  // Check if reset_auth was requested by the CRM panel
  const { data: agCheck } = await supabase
    .from('agencies')
    .select('business_hours')
    .eq('id', agencyId)
    .single();

  if (agCheck?.business_hours?.reset_auth) {
    console.log('[Worker] 🔄 Flag reset_auth activo: limpiando credenciales para nuevo QR...');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    const currentBh = agCheck.business_hours || {};
    delete currentBh.reset_auth;
    await supabase
      .from('agencies')
      .update({
        business_hours: {
          ...currentBh,
          whatsapp_qr: null,
          connection_status: 'qr_pending',
        },
      })
      .eq('id', agencyId);
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[Baileys] Using version v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['SerStorm CRM', 'Chrome', '120.0.0'],
    generateHighQualityLinkPreview: true,
  });

  sock.ev.on('creds.update', saveCreds);

  async function updateAgencyConnection(status: 'qr_pending' | 'connected' | 'disconnected', qrDataUrl: string | null = null) {
    try {
      // 1. Try dedicated columns
      const { error } = await supabase
        .from('agencies')
        .update({ qr_code: qrDataUrl, connection_status: status })
        .eq('id', agencyId);

      if (error) {
        // 2. Fallback to business_hours JSONB if columns don't exist yet
        const { data: ag } = await supabase
          .from('agencies')
          .select('business_hours')
          .eq('id', agencyId)
          .single();
        const currentBh = ag?.business_hours || {};
        await supabase
          .from('agencies')
          .update({
            business_hours: {
              ...currentBh,
              whatsapp_qr: qrDataUrl,
              connection_status: status,
            },
          })
          .eq('id', agencyId);
      }
      console.log(`[Worker] Estado de conexión actualizado: ${status}`);
    } catch (err: any) {
      console.error('[Worker] Error sincronizando estado de conexión:', err.message);
    }
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n======================================================');
      console.log('  ESCANEÁ ESTE CÓDIGO QR CON EL WHATSAPP DE SERSTORM  ');
      console.log('  (O escanéalo directo desde el Panel CRM en Vercel)  ');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });

      try {
        const dataUrl = await toDataURL(qr, { margin: 2, width: 320 });
        await updateAgencyConnection('qr_pending', dataUrl);
      } catch (e: any) {
        console.error('[Worker QR Error]', e.message);
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[Baileys] Connection closed (code: ${statusCode}). Reconnect: ${shouldReconnect}`);

      await updateAgencyConnection('disconnected', null);

      if (shouldReconnect) {
        setTimeout(startBaileysWorker, 5000);
      } else {
        console.error('[Baileys] Logged out. Delete auth folder and scan again.');
      }
    } else if (connection === 'open') {
      console.log('✅ [Baileys] ¡Conexión exitosa a WhatsApp! Modo Coexistencia Activo.');
      await updateAgencyConnection('connected', null);
    }
  });

  // Handle incoming & outgoing messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return; // Ignore historical message sync

    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith('@g.us') || jid.endsWith('@newsletter') || jid.includes('broadcast')) continue;

      const isFromMe = !!msg.key.fromMe;
      const waMsgId = msg.key.id;

      if (waMsgId) {
        if (processedIncomingWaMsgIds.has(waMsgId)) {
          console.log(`[Deduplication] Mensaje entrante ${waMsgId} ya procesado previamente. Ignorando.`);
          continue;
        }
        processedIncomingWaMsgIds.add(waMsgId);
        if (processedIncomingWaMsgIds.size > 1000) {
          const oldest = processedIncomingWaMsgIds.values().next().value;
          if (oldest) processedIncomingWaMsgIds.delete(oldest);
        }
      }

      // Extract message text or voice note
      let content = msg.message?.conversation ||
                    msg.message?.extendedTextMessage?.text ||
                    '';
      let audioUrl: string | null = null;
      let transcription: string | null = null;

      const isAudio = !!msg.message?.audioMessage;
      if (isAudio) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {});
          transcription = await transcribeAudioBuffer(buffer as Buffer, msg.message?.audioMessage?.mimetype || 'audio/ogg');
          content = transcription ? `[Audio del cliente]: "${transcription}"` : '[Audio de voz sin transcripción]';
        } catch (e: any) {
          console.error('[Audio Download Error]', e.message);
          content = '[Audio no descargable]';
        }
      }

      if (!content.trim()) continue;

      // 1. Get or create Conversation & Contact
      let { data: conv } = await supabase
        .from('serstorm_conversations')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('whatsapp_jid', jid)
        .single();

      if (!conv) {
        // Create new Lead first
        const phone = jid.split('@')[0];
        const { data: newLead } = await supabase
          .from('serstorm_leads')
          .insert({
            agency_id: agencyId,
            phone,
            name: msg.pushName || `Contacto ${phone.slice(-4)}`,
            pipeline_stage: 'new',
          })
          .select()
          .single();

        const matchedCampaignId = !isFromMe ? await matchCampaign(agencyId, content) : null;
        if (matchedCampaignId) {
          console.log(`[Campaign Match] Nuevo lead vinculado a campaña ${matchedCampaignId}`);
        }

        const convPayload: any = {
          agency_id: agencyId,
          whatsapp_jid: jid,
          contact_name: msg.pushName || null,
          lead_id: newLead?.id || null,
          ai_enabled: true,
          last_message_at: new Date().toISOString(),
        };

        if (matchedCampaignId) {
          convPayload.campaign_id = matchedCampaignId;
        }

        let { data: newConv, error: insertErr } = await supabase
          .from('serstorm_conversations')
          .insert(convPayload)
          .select()
          .single();

        if (insertErr && insertErr.message?.includes('campaign_id')) {
          delete convPayload.campaign_id;
          const { data: fallbackConv } = await supabase
            .from('serstorm_conversations')
            .insert(convPayload)
            .select()
            .single();
          newConv = fallbackConv;
        }

        conv = newConv;
      } else {
        let updatedCampaignId = conv.campaign_id;
        if (!isFromMe && !conv.campaign_id) {
          const matched = await matchCampaign(agencyId, content);
          if (matched) {
            updatedCampaignId = matched;
            console.log(`[Campaign Match] Conversación existente vinculada a campaña ${matched}`);
          }
        }

        const updatePayload: any = {
          last_message_at: new Date().toISOString(),
          contact_name: msg.pushName || conv.contact_name,
        };
        if (updatedCampaignId) {
          updatePayload.campaign_id = updatedCampaignId;
        }

        const { error: updateErr } = await supabase
          .from('serstorm_conversations')
          .update(updatePayload)
          .eq('id', conv.id);

        if (updateErr && updateErr.message?.includes('campaign_id')) {
          delete updatePayload.campaign_id;
          await supabase
            .from('serstorm_conversations')
            .update(updatePayload)
            .eq('id', conv.id);
        }

        conv.campaign_id = updatedCampaignId;
      }

      // 2. Coexistence Check: If human operator sent message from phone
      if (isFromMe) {
        // Check if this is an echo of an outbound message already dispatched by our worker
        const contentKey = `${jid}:${content.trim()}`;
        const sentTimestamp = recentlySentContents.get(contentKey);
        const isEchoOfOutbound =
          (waMsgId && recentlySentWaMsgIds.has(waMsgId)) ||
          (sentTimestamp && Date.now() - sentTimestamp < 25000);

        if (isEchoOfOutbound) {
          if (waMsgId) recentlySentWaMsgIds.delete(waMsgId);
          console.log(`[Coexistence] Echo detectado de mensaje propio saliente en ${jid}. No se duplica en BD.`);
          continue;
        }

        console.log(`[Coexistence] Human operator replied from phone on ${jid}. Disabling AI.`);
        if (debounceTimers.has(jid)) {
          clearTimeout(debounceTimers.get(jid)!);
          debounceTimers.delete(jid);
        }

        await supabase
          .from('serstorm_conversations')
          .update({ ai_enabled: false })
          .eq('id', conv.id);

        await supabase.from('serstorm_messages').insert({
          conversation_id: conv.id,
          wa_message_id: waMsgId,
          sender_type: 'human',
          author: 'operator_phone',
          content,
          status: 'sent',
        });
        continue;
      }

      // 3. Insert Client message
      await supabase.from('serstorm_messages').insert({
        conversation_id: conv.id,
        wa_message_id: waMsgId,
        sender_type: 'client',
        author: conv.contact_name || 'Cliente',
        content,
        audio_url: audioUrl,
        transcription: transcription,
        status: 'delivered',
      });

      // 4. Debounce and schedule AI turn if enabled
      if (conv.ai_enabled) {
        if (debounceTimers.has(jid)) {
          clearTimeout(debounceTimers.get(jid)!);
        }

        console.log(`[Debounce] Message received from ${jid}. Waiting ${AGENT_DEBOUNCE_MS}ms for multi-bubble burst.`);

        const timer = setTimeout(async () => {
          debounceTimers.delete(jid);

          // Re-fetch conversation to check if AI is still enabled
          const { data: freshConv } = await supabase
            .from('serstorm_conversations')
            .select('*')
            .eq('id', conv!.id)
            .single();

          const { data: agency } = await supabase
            .from('agencies')
            .select('agent_paused')
            .eq('id', agencyId)
            .single();

          if (!freshConv?.ai_enabled || agency?.agent_paused) {
            console.log(`[Agent Skipped] AI disabled or agency paused for ${jid}`);
            return;
          }

          // Fetch Lead & Recent Messages
          const { data: lead } = freshConv.lead_id
            ? await supabase.from('serstorm_leads').select('*').eq('id', freshConv.lead_id).single()
            : { data: null };

          const { data: messagesHistory } = await supabase
            .from('serstorm_messages')
            .select('sender_type, content')
            .eq('conversation_id', freshConv.id)
            .order('created_at', { ascending: false })
            .limit(10);

          const formattedHistory = (messagesHistory || [])
            .reverse()
            .map((m) => ({
              role: (m.sender_type === 'client' ? 'user' : 'assistant') as 'user' | 'assistant',
              content: m.content,
            }));

          console.log(`[Agent] Generating AI reply for ${jid}...`);
          const replyText = await runAgentTurn({
            supabase,
            agencyId,
            conversation: freshConv,
            lead: lead || null,
            recentMessages: formattedHistory,
          });

          if (replyText) {
            const { data: existingPending } = await supabase
              .from('serstorm_messages')
              .select('id')
              .eq('conversation_id', freshConv.id)
              .eq('status', 'pending')
              .limit(1);

            if (!existingPending || existingPending.length === 0) {
              await supabase.from('serstorm_messages').insert({
                conversation_id: freshConv.id,
                sender_type: 'ai',
                author: 'SerStorm AI',
                content: replyText,
                simulate_typing: true,
                status: 'pending',
              });
            } else {
              console.log(`[Agent Skip Insert] Ya existe un mensaje pendiente para ${jid}. Evitando duplicación.`);
            }
          }
        }, AGENT_DEBOUNCE_MS);

        debounceTimers.set(jid, timer);
      }
    }
  });

  // Check every 3 seconds for reset_auth request from CRM panel
  const resetCheckInterval = setInterval(async () => {
    try {
      const { data: ag } = await supabase
        .from('agencies')
        .select('business_hours')
        .eq('id', agencyId)
        .single();

      if (ag?.business_hours?.reset_auth) {
        console.log('[Worker] 🔄 Solicitud de nuevo QR recibida desde el CRM Panel.');
        clearInterval(resetCheckInterval);
        const currentBh = ag.business_hours || {};
        delete currentBh.reset_auth;
        await supabase
          .from('agencies')
          .update({
            business_hours: {
              ...currentBh,
              whatsapp_qr: null,
              connection_status: 'qr_pending',
            },
          })
          .eq('id', agencyId);

        try {
          sock.end(undefined);
        } catch (_) {}

        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
        setTimeout(startBaileysWorker, 1500);
      }
    } catch (_) {}
  }, 3000);

  // Outbound Dispatch Loop (Self-scheduling with lock and in-flight tracking to prevent duplicates)
  let isDispatchingOutbound = false;

  async function processOutboundQueue() {
    if (isDispatchingOutbound) return;
    isDispatchingOutbound = true;

    try {
      const { data: rawPending, error } = await supabase
        .from('serstorm_messages')
        .select('id, conversation_id, content, simulate_typing, serstorm_conversations!inner(whatsapp_jid)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error) {
        console.error('[Outbound Error fetching pending messages]', error.message);
        return;
      }

      const pendingMessages = (rawPending || []).filter((m: any) => !inFlightMessageIds.has(m.id));

      for (const msg of pendingMessages as any[]) {
        const targetJid = msg.serstorm_conversations?.whatsapp_jid;
        if (!targetJid) continue;

        // Mark as in-flight immediately to prevent any concurrent processing
        inFlightMessageIds.add(msg.id);

        try {
          if (msg.simulate_typing) {
            // Simulate presence typing (1.8s to 3.5s)
            await sock.sendPresenceUpdate('composing', targetJid);
            const delay = Math.min(3500, Math.max(1800, msg.content.length * 40));
            await new Promise((r) => setTimeout(r, delay));
            await sock.sendPresenceUpdate('paused', targetJid);
          }

          const sentResult = await sock.sendMessage(targetJid, { text: msg.content });
          const sentWaId = sentResult?.key?.id;

          if (sentWaId) {
            recentlySentWaMsgIds.add(sentWaId);
            if (recentlySentWaMsgIds.size > 300) {
              const oldest = recentlySentWaMsgIds.values().next().value;
              if (oldest) recentlySentWaMsgIds.delete(oldest);
            }
          }

          const contentKey = `${targetJid}:${msg.content.trim()}`;
          recentlySentContents.set(contentKey, Date.now());

          await supabase
            .from('serstorm_messages')
            .update({
              status: 'sent',
              ...(sentWaId ? { wa_message_id: sentWaId } : {}),
            })
            .eq('id', msg.id);

          console.log(`[Outbound] Message sent to ${targetJid} (ID: ${msg.id})`);
        } catch (sendErr: any) {
          console.error(`[Outbound Error sending message ${msg.id}]`, sendErr.message);
          await supabase
            .from('serstorm_messages')
            .update({ status: 'failed' })
            .eq('id', msg.id);
        } finally {
          inFlightMessageIds.delete(msg.id);
        }
      }
    } catch (e: any) {
      console.error('[Outbound Error]', e.message);
    } finally {
      isDispatchingOutbound = false;
      setTimeout(processOutboundQueue, 2500);
    }
  }

  // Start Outbound Dispatch Loop
  setTimeout(processOutboundQueue, 3000);

  // Followups Check Loop (Polls every 30 seconds)
  setInterval(async () => {
    await processDueFollowups(supabase, agencyId);
  }, 30000);
}

startBaileysWorker().catch((err) => {
  console.error('[Worker Fatal Error]', err);
});
