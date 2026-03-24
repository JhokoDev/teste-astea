import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: any = null;

// Use a Proxy to lazily initialize the Supabase client.
// This prevents the app from crashing on startup if environment variables are missing.
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
    }
    if (!client) {
      client = createClient(supabaseUrl, supabaseAnonKey);
    }
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
