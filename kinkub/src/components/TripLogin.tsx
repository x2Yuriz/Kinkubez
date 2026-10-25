import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { authErrorThai, MIN_PASSWORD, useAuth } from "../lib/auth";
import { clearRememberedAuthNext, navigate, rememberAuthNext, safeNext } from "../lib/router";
import { isSupabaseConfigured } from "../lib/supabase";

type Props = { onHome: () => void };
type Mode = "signin" | "signup" | "forgot";

const COPY: Record<Mode, { title: string; lede: string; submit: string; busy: string }> = {
  signin: { title: "ไปต่อที่ทริปของคุณ", lede: "เข้าสู่ระบบเพื่อจองทริป บันทึกรายการโปรด และรีวิวหลังเที่ยว", submit: "เข้าสู่ระบบ", busy: "กำลังเข้าสู่ระบบ…" },
  signup: { title: "สร้างบัญชี KinKub", lede: "สมัครด้วยอีเมล หรือใช้บัญชี Google ก็ได้", submit: "สมัครสมาชิก", busy: "กำลังสร้างบัญชี…" },
  forgot: { title: "ลืมรหัสผ่าน", lede: "กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้", submit: "ส่งลิงก์ตั้งรหัสผ่านใหม่", busy: "กำลังส่ง…" },
};

export default function TripLogin({ onHome }: Props) {
  const { session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState<"" | "google" | "email">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const params = new URLSearchParams(window.location.search);
  const destination = params.get("destination");
  const next = safeNext(params.get("next") ?? (destination ? `/trips?destination=${encodeURIComponent(destination)}` : null));

  // Already signed in: go straight back to where the visitor came from.
  useEffect(() => {
    if (!loading && session) {
      window.history.replaceState({}, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [loading, session, next]);

  const returnHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onHome();
  };

  const switchMode = (target: Mode) => {
    setMode(target);
    setError("");
    setNotice("");
    setForm((current) => ({ ...current, password: "", confirm: "" }));
  };

  const google = async () => {
    setBusy("google");
    setError("");
    try {
      rememberAuthNext(next);
      await signInWithGoogle(next);
    } catch {
      clearRememberedAuthNext();
      setError("เปิดหน้าเข้าสู่ระบบ Google ไม่สำเร็จ ลองอีกครั้ง");
      setBusy("");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const email = form.email.trim();
    if (mode === "signup" && form.password !== form.confirm) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    setBusy("email");
    try {
      if (mode === "signin") {
        await signInWithEmail(email, form.password);
        // The effect above redirects once the session arrives.
      } else if (mode === "signup") {
        const needsConfirm = await signUpWithEmail(form.name.trim(), email, form.password, next);
        if (needsConfirm) {
          setNotice(`ส่งลิงก์ยืนยันไปที่ ${email} แล้ว เปิดอีเมลบนเบราว์เซอร์นี้เพื่อยืนยันบัญชี (ถ้าไม่เห็น ลองดูในโฟลเดอร์สแปม)`);
          setForm({ name: "", email, password: "", confirm: "" });
        }
      } else {
        await sendPasswordReset(email);
        // Same message whether or not the email has an account, so the form can't be used to probe accounts.
        setNotice(`ถ้า ${email} มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว ลิงก์ใช้ได้ครั้งเดียว`);
      }
    } catch (caught) {
      setError(authErrorThai(caught));
    } finally {
      setBusy("");
    }
  };

  const copy = COPY[mode];
  const disabled = Boolean(busy) || loading;

  return (
    <main className="trip-login-page">
      <section className="trip-login-photo" aria-label="บรรยากาศเที่ยวเชียงใหม่">
        <a className="trip-login-brand" href="/" onClick={returnHome}>
          กินกับ <span>KinKub</span>
        </a>
        <div className="trip-login-photo__caption">
          <span>CHIANG MAI · NORTHERN THAILAND</span>
          <h1>การเดินทาง<br />เริ่มจากคนที่ใช่</h1>
          <p>เจอคนท้องถิ่น แบ่งปันเส้นทาง แล้วออกไปเห็นเมืองในมุมใหม่</p>
        </div>
      </section>
      <section className="trip-login-panel" aria-labelledby="trip-login-title">
        <a className="trip-login-back" href="/" onClick={returnHome}>← กลับหน้าแรก</a>
        <div className="trip-login-panel__content">
          <span className="trip-login-kicker">{mode === "signup" ? "สมาชิกใหม่" : "ยินดีต้อนรับกลับ"}</span>
          <h2 id="trip-login-title">{copy.title}</h2>
          <p className="trip-login-lede">{copy.lede}</p>
          {isSupabaseConfigured ? (
            <div className="trip-login-form">
              {mode !== "forgot" ? (
                <>
                  <button type="button" className="kk-google" onClick={google} disabled={disabled} aria-busy={busy === "google"}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
                      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
                      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
                      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
                    </svg>
                    {busy === "google" ? "กำลังไปที่ Google…" : mode === "signup" ? "สมัครด้วย Google" : "เข้าสู่ระบบด้วย Google"}
                  </button>
                  <p className="trip-login-or"><span>หรือใช้อีเมล</span></p>
                </>
              ) : null}

              <form className="trip-login-email" onSubmit={submit}>
                {mode === "signup" ? (
                  <>
                    <label htmlFor="login-name">ชื่อที่แสดง</label>
                    <input id="login-name" autoComplete="nickname" required minLength={2} maxLength={80} value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </>
                ) : null}
                <label htmlFor="login-email">อีเมล</label>
                <input id="login-email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={form.email}
                  placeholder="you@example.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {mode !== "forgot" ? (
                  <>
                    <div className="trip-login-label-row">
                      <label htmlFor="login-password">รหัสผ่าน</label>
                      {mode === "signin" ? <button type="button" className="trip-login-link" onClick={() => switchMode("forgot")}>ลืมรหัสผ่าน?</button> : null}
                    </div>
                    <input id="login-password" type="password" required minLength={mode === "signup" ? MIN_PASSWORD : 1} maxLength={72}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password}
                      aria-describedby={mode === "signup" ? "login-password-hint" : undefined}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} />
                    {mode === "signup" ? <small id="login-password-hint" className="trip-login-hint">อย่างน้อย {MIN_PASSWORD} ตัวอักษร</small> : null}
                  </>
                ) : null}
                {mode === "signup" ? (
                  <>
                    <label htmlFor="login-confirm">ยืนยันรหัสผ่าน</label>
                    <input id="login-confirm" type="password" required minLength={MIN_PASSWORD} maxLength={72} autoComplete="new-password"
                      value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                  </>
                ) : null}
                {error ? <p className="kk-form-error" role="alert">{error}</p> : null}
                {notice ? <p className="kk-form-ok" role="status">{notice}</p> : null}
                <button type="submit" disabled={disabled} aria-busy={busy === "email"}>
                  {busy === "email" ? copy.busy : copy.submit} <span aria-hidden="true">→</span>
                </button>
              </form>

              <p className="trip-login-switch">
                {mode === "signin" ? <>ยังไม่มีบัญชี? <button type="button" className="trip-login-link" onClick={() => switchMode("signup")}>สมัครสมาชิก</button></>
                  : mode === "signup" ? <>มีบัญชีแล้ว? <button type="button" className="trip-login-link" onClick={() => switchMode("signin")}>เข้าสู่ระบบ</button></>
                  : <button type="button" className="trip-login-link" onClick={() => switchMode("signin")}>← กลับไปเข้าสู่ระบบ</button>}
              </p>
              <button type="button" className="trip-login-skip" onClick={() => navigate(next)}>ดูทริปก่อนโดยไม่เข้าสู่ระบบ</button>
            </div>
          ) : (
            <div className="trip-login-form">
              <p className="kk-form-error" role="status">ยังไม่ได้เชื่อมต่อระบบบัญชี (Supabase) เจ้าของเว็บต้องตั้งค่าไฟล์ .env ก่อน ระหว่างนี้ดูทริปตัวอย่างได้</p>
              <button type="button" onClick={() => navigate(next)}>ดูทริปตัวอย่าง <span aria-hidden="true">→</span></button>
            </div>
          )}
          <p className="trip-login-note">รหัสผ่านถูกเข้ารหัสและเก็บโดย Supabase Auth ทีม KinKub มองไม่เห็นรหัสผ่านของคุณ ระบบยังไม่มีการชำระเงินออนไลน์</p>
        </div>
      </section>
    </main>
  );
}
