import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { navigate, safeNext } from "../lib/router";
import { StateMessage } from "./ui";

/** /auth/callback — supabase-js exchanges the PKCE code on load; we wait for the session then return to ?next=. */
export function AuthCallback() {
  const { session, loading } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const errorCode = params.get("error");
  const providerError = errorCode === "access_denied" ? "คุณยกเลิกการเข้าสู่ระบบ หรือไม่ได้อนุญาตให้ KinKub เข้าถึงบัญชี Google"
    : errorCode ? "Google หรือ Supabase ปฏิเสธคำขอ ตรวจการตั้งค่า Redirect URL แล้วลองใหม่" : null;
  const errorDetail = params.get("error_description");
  const next = safeNext(params.get("next"));
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (session) {
      window.history.replaceState({}, "", next);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [session, next]);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  const retry = <button type="button" className="kk-button" onClick={() => navigate(`/login?next=${encodeURIComponent(next)}`)}>ลองเข้าสู่ระบบอีกครั้ง</button>;

  return (
    <main className="kk-center-page">
      {providerError ? (
        <StateMessage tone="error" title="เข้าสู่ระบบด้วย Google ไม่สำเร็จ" action={retry}>
          {providerError}{errorDetail ? <><br /><small className="kk-muted">รายละเอียด: {errorDetail}</small></> : null}
        </StateMessage>
      ) : !loading && !session && timedOut ? (
        <StateMessage tone="error" title="ยืนยันตัวตนไม่สำเร็จ" action={retry}>ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว</StateMessage>
      ) : (
        <StateMessage tone="loading" title="กำลังยืนยันตัวตนกับ Google…" />
      )}
    </main>
  );
}
