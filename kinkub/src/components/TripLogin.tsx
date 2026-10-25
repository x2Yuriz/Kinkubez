import { useEffect, useState, type MouseEvent } from "react";
import { useAuth } from "../lib/auth";
import { navigate, safeNext } from "../lib/router";
import { isSupabaseConfigured } from "../lib/supabase";

type Props = { onHome: () => void };

export default function TripLogin({ onHome }: Props) {
  const { session, loading, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  const google = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle(next);
    } catch {
      setError("เปิดหน้าเข้าสู่ระบบ Google ไม่สำเร็จ ลองอีกครั้ง");
      setBusy(false);
    }
  };

  return (
    <main className="trip-login-page">
      <section className="trip-login-photo" aria-label="บรรยากาศเที่ยวเชียงใหม่">
        <a className="trip-login-brand" href="/" onClick={returnHome}>
          กินกับเว้ย <span>KinKub</span>
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
          <span className="trip-login-kicker">ยินดีต้อนรับกลับ</span>
          <h2 id="trip-login-title">ไปต่อที่ทริปของคุณ</h2>
          <p className="trip-login-lede">เข้าสู่ระบบเพื่อจองทริป บันทึกรายการโปรด และรีวิวหลังเที่ยว</p>
          {isSupabaseConfigured ? (
            <div className="trip-login-form">
              <button type="button" className="kk-google" onClick={google} disabled={busy || loading} aria-busy={busy}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z" />
                  <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
                  <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8l4-3Z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
                </svg>
                {busy ? "กำลังไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
              </button>
              {error ? <p className="kk-form-error" role="alert">{error}</p> : null}
              <button type="button" className="trip-login-skip" onClick={() => navigate(next)}>ดูทริปก่อนโดยไม่เข้าสู่ระบบ</button>
            </div>
          ) : (
            <div className="trip-login-form">
              <p className="kk-form-error" role="status">ยังไม่ได้เชื่อมต่อระบบบัญชี (Supabase) เจ้าของเว็บต้องตั้งค่าไฟล์ .env ก่อน ระหว่างนี้ดูทริปตัวอย่างได้</p>
              <button type="button" onClick={() => navigate(next)}>ดูทริปตัวอย่าง <span aria-hidden="true">→</span></button>
            </div>
          )}
          <p className="trip-login-note">เราใช้บัญชี Google เพื่อยืนยันตัวตนเท่านั้น ไม่เห็นรหัสผ่านของคุณ และระบบยังไม่มีการชำระเงินออนไลน์</p>
        </div>
      </section>
    </main>
  );
}
