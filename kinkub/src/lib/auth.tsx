import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Resolves true when Supabase sent a confirmation email (no session yet). */
  signUpWithEmail: (name: string, email: string, password: string, next: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export const MIN_PASSWORD = 8;

/** Supabase auth errors → Thai. Unknown codes get a generic message, never the raw English text. */
export function authErrorThai(error: unknown) {
  const code = (error as AuthError | null)?.code ?? "";
  const messages: Record<string, string> = {
    invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    email_not_confirmed: "ยังไม่ได้ยืนยันอีเมล เปิดลิงก์ในอีเมลที่เราส่งให้ก่อน",
    user_already_exists: "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบหรือรีเซ็ตรหัสผ่าน",
    email_exists: "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบหรือรีเซ็ตรหัสผ่าน",
    weak_password: `รหัสผ่านง่ายเกินไป ใช้อย่างน้อย ${MIN_PASSWORD} ตัวอักษร ผสมตัวอักษรและตัวเลข`,
    same_password: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม",
    signup_disabled: "ระบบปิดรับสมัครด้วยอีเมลชั่วคราว",
    email_provider_disabled: "ระบบปิดการเข้าสู่ระบบด้วยอีเมลชั่วคราว ใช้ Google แทน",
    over_email_send_rate_limit: "ส่งอีเมลบ่อยเกินไป รอสักครู่แล้วลองใหม่",
    over_request_rate_limit: "ลองหลายครั้งเกินไป รอสักครู่แล้วลองใหม่",
    validation_failed: "รูปแบบอีเมลหรือรหัสผ่านไม่ถูกต้อง",
    email_address_invalid: "ใช้อีเมลนี้ไม่ได้ ลองอีเมลอื่น",
    session_not_found: "ลิงก์หมดอายุ ขอรีเซ็ตรหัสผ่านใหม่อีกครั้ง",
  };
  return messages[code] ?? "ทำรายการไม่สำเร็จ ตรวจการเชื่อมต่อแล้วลองใหม่";
}

const callbackUrl = (next: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl(next) } });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string, next: string) => {
    if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    // full_name only feeds display_name in handle_new_user; role is never read from user metadata.
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: callbackUrl(next), data: { full_name: name } },
    });
    if (error) throw error;
    return !data.session;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset` });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
    const { error } = await supabase.auth.updateUser({ password });
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
    () => ({ session, profile, loading, suspended, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, signOut, refreshProfile }),
    [session, profile, loading, suspended, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, signOut, refreshProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
