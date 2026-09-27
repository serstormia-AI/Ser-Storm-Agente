import { createClient } from '@supabase/supabase-js';

const ACTIVE_SUPABASE_URL = 'https://oaipqsrupiwkqvtcuwka.supabase.co';
const ACTIVE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haXBxc3J1cGl3a3F2dGN1d2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NjY3MSwiZXhwIjoyMTA1OTIyNjcxfQ.1QVwA7TB_OvJhmC3wzN139SuvChkyYTZl6ArnDGKcbk';

const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl =
  rawUrl && !rawUrl.includes('placeholder') && !rawUrl.includes('your-supabase-project')
    ? rawUrl
    : ACTIVE_SUPABASE_URL;

const rawKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabaseKey =
  rawKey && !rawKey.includes('placeholder') && !rawKey.includes('your_')
    ? rawKey
    : ACTIVE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
