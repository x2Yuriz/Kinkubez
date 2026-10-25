import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { PROFILE_COLUMNS, type Profile } from "./api";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True while the stored session or profile is still loading. */
  loading: boolean;
  /** Suspended accounts keep their session but every write is blocked in the database. */
  suspended: boolean;
  signInWithGoogle: (next: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [suspended, setSuspended] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!supabase || !userId) {
      setProfile(null);
      setSuspended(false);
      return;
    }
    const [{ data }, { data: role }] = await Promise.all([
      supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle(),
      supabase.rpc("my_role"),
    ]);
    setProfile((data as Profile | null) ?? null);
    setSuspended(Boolean(data) && role === null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Defer the query so it never runs inside the auth lock.
      window.setTimeout(() => { void loadProfile(next?.user.id); }, 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async (next: string) => {
    if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSuspended(false);
  }, []);

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  const value = useMemo(
    () => ({ session, profile, loading, suspended, signInWithGoogle, signOut, refreshProfile }),
    [session, profile, loading, suspended, signInWithGoogle, signOut, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
