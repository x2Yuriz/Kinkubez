import { useState, type FormEvent } from "react";
import { authErrorThai, MIN_PASSWORD, useAuth } from "../lib/auth";
import { navigate } from "../lib/router";
import { StateMessage } from "./ui";

/** /auth/reset — the email link signs the user in (supabase-js exchanges the code), then they choose a new password. */
export function ResetPassword() {
  const { session, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) { setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      setDone(true);
    } catch (caught) {
      setError(authErrorThai(caught));
    } finally {
      setBusy(false);
    }
  };

  const again = <button type="button" className="kk-button" onClick={() => navigate("/login")}>ขอลิงก์ใหม่</button>;

  return (
    <main className="kk-center-page">
      {loading ? <StateMessage tone="loading" title="กำลังตรวจลิงก์…" />
        : done ? (
          <StateMessage tone="success" title="ตั้งรหัสผ่านใหม่แล้ว" action={<button type="button" className="kk-button" onClick={() => navigate("/trips")}>ไปที่ทริป</button>}>
            ครั้งต่อไปเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย
          </StateMessage>
        ) : !session ? (
          <StateMessage tone="error" title="ลิงก์ใช้ไม่ได้" action={again}>ลิงก์อาจหมดอายุ ถูกใช้ไปแล้ว หรือเปิดบนเบราว์เซอร์อื่น</StateMessage>
        ) : (
          <form className="kk-panel kk-form kk-reset" onSubmit={submit}>
            <h1>ตั้งรหัสผ่านใหม่</h1>
            <p className="kk-muted">สำหรับ {session.user.email}</p>
            <label>รหัสผ่านใหม่ <small>(อย่างน้อย {MIN_PASSWORD} ตัวอักษร)</small>
              <input type="password" required minLength={MIN_PASSWORD} maxLength={72} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label>ยืนยันรหัสผ่านใหม่
              <input type="password" required minLength={MIN_PASSWORD} maxLength={72} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            {error ? <p className="kk-form-error" role="alert">{error}</p> : null}
            <button type="submit" className="kk-button" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</button>
          </form>
        )}
    </main>
  );
}
