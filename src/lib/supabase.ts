import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * NexusCA — Supabase client (Lovable Cloud).
 *
 * Lovable Cloud injects:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * We also accept VITE_SUPABASE_ANON_KEY as a fallback for projects connected
 * via the legacy external-Supabase flow.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient<Database>(
  url ?? "https://placeholder.supabase.co",
  anon ?? "public-anon-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);
