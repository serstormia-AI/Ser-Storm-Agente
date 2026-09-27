import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://oaipqsrupiwkqvtcuwka.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haXBxc3J1cGl3a3F2dGN1d2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDY2NzEsImV4cCI6MjEwNTkyMjY3MX0.1PTOtewKuixIaINZQ-dneK2hMI3sWV21w-_V6HPXKz4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
