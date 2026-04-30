import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ ATENÇÃO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados nas variáveis de ambiente!');
  console.warn('O sistema pode não funcionar corretamente até que essas variáveis sejam adicionadas.');
}

// Cliente admin (service role) — bypassa RLS, usar apenas no backend
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Cliente anon — para verificar tokens do usuário
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

export default supabaseAdmin;
