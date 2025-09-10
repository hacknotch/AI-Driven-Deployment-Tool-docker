import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/supabase-types';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY');
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
