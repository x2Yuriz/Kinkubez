import type { FormEvent, MouseEvent } from "react";

type Props = { onHome: () => void; onLogin: () => void };

export default function TripLogin({ onHome, onLogin }: Props) {
  const returnHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onHome();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin();
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
          <p className="trip-login-lede">เข้าสู่ระบบเพื่อเลือก Buddy กลุ่มเล็กหรือไกด์ท้องถิ่น</p>
          <form className="trip-login-form" onSubmit={submit}>
            <label htmlFor="trip-email">อีเมล</label>
            <input id="trip-email" type="email" placeholder="name@example.com" autoComplete="email" required />
            <label htmlFor="trip-password">รหัสผ่าน</label>
            <input id="trip-password" type="password" placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="current-password" minLength={8} required />
            <button type="submit">เข้าสู่ระบบและเลือกทริป <span aria-hidden="true">→</span></button>
          </form>
          <p className="trip-login-note">นี่คือตัวอย่างหน้าจอสำหรับพรีวิว การเข้าสู่ระบบยังไม่ได้เชื่อมกับบัญชีจริง</p>
        </div>
      </section>
    </main>
  );
}
