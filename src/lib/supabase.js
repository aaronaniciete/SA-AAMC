import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase env vars. Create a .env file (see .env.example) with " +
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — use the SAME values as your EMR project."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
