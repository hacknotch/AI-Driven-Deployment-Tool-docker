import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/supabase-types';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

// Check if we have real Supabase credentials
const hasSupabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY;

if (!hasSupabaseConfig) {
  console.warn('⚠️  Supabase environment variables not found. Using placeholder values for development.');
  console.warn('   To enable Supabase features, set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
}

// Server-side Supabase client with service key for admin operations
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client-side compatible Supabase client for user operations
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);
