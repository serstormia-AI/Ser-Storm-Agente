import axios from 'axios';
import { WebhookPayload } from '@serstorm/shared';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

export async function dispatchN8nWebhook(payload: WebhookPayload): Promise<void> {
  if (!N8N_WEBHOOK_URL) {
    console.log('[n8n Webhook] No N8N_WEBHOOK_URL configured, skipping dispatch');
    return;
  }

  try {
    console.log(`[n8n Webhook] Dispatching event: ${payload.event} for lead ${payload.lead.id || payload.conversation_id}`);
    await axios.post(N8N_WEBHOOK_URL, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SerStorm-Worker/1.0',
      },
    });
  } catch (error: any) {
    console.error(`[n8n Webhook] Failed to dispatch event ${payload.event}:`, error.message);
  }
}
