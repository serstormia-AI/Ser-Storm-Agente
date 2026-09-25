import { SupabaseClient } from '@supabase/supabase-js';

export async function processDueFollowups(supabase: SupabaseClient, agencyId: string): Promise<void> {
  try {
    const nowIso = new Date().toISOString();
    const { data: followups, error } = await supabase
      .from('serstorm_followups')
      .select('id, conversation_id, lead_id, message, kind')
      .eq('agency_id', agencyId)
      .eq('status', 'pending')
      .lte('due_at', nowIso)
      .limit(10);

    if (error || !followups || followups.length === 0) {
      return;
    }

    console.log(`[Followups] Processing ${followups.length} due followup(s)`);

    for (const item of followups) {
      if (item.kind === 'outbound') {
        // Enqueue outbound message
        await supabase.from('serstorm_messages').insert({
          conversation_id: item.conversation_id,
          sender_type: 'ai',
          author: 'ai_followup',
          content: item.message,
          simulate_typing: true,
          status: 'pending',
        });
      }

      // Mark followup as sent
      await supabase
        .from('serstorm_followups')
        .update({ status: 'sent' })
        .eq('id', item.id);
    }
  } catch (err: any) {
    console.error('[Followups] Error processing followups:', err.message);
  }
}
