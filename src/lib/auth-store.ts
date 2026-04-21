import { create } from "zustand";
import { supabase, supabaseConfigured } from "./supabase";
import type { AppRole, Profile } from "./database.types";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  initialized: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function loadProfileAndRole(userId: string) {
  const [profileRes, roleRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  const profile = (profileRes.data as Profile | null) ?? null;
  const roleRow = roleRes.data as { role: AppRole } | null;
  const role: AppRole = roleRow?.role ?? profile?.role ?? "customer";
  return { profile, role };
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  role: null,
  loading: true,
  initialized: false,

  init: () => {
    if (!supabaseConfigured) {
      set({ loading: false, initialized: true });
      return () => {};
    }

    // 1) Subscribe FIRST so we never miss an event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        // Defer Supabase calls so we don't deadlock the auth callback.
        setTimeout(async () => {
          const { profile, role } = await loadProfileAndRole(session.user.id);
          set({ profile, role });
        }, 0);
      } else {
        set({ profile: null, role: null });
      }
    });

    // 2) Then check existing session.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        const { profile, role } = await loadProfileAndRole(session.user.id);
        set({ profile, role });
      }
      set({ loading: false, initialized: true });
    });

    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!supabaseConfigured) {
      return { error: "Supabase is not connected. See README for setup." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, role: null });
  },

  refreshProfile: async () => {
    const u = get().user;
    if (!u) return;
    const { profile, role } = await loadProfileAndRole(u.id);
    set({ profile, role });
  },
}));
