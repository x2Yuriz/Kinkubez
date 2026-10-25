import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { roleLabel } from "../lib/api";
import { currentPath, navigate } from "../lib/router";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Tone = "loading" | "error" | "empty" | "success" | "denied" | "info";

export function StateMessage({ tone, title, children, action }: { tone: Tone; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={`kk-state kk-state--${tone}`} role={tone === "error" || tone === "denied" ? "alert" : "status"} aria-live="polite">
      <span className="kk-state__mark" aria-hidden="true">
        {tone === "loading" ? <i className="kk-spinner" /> : tone === "error" ? "!" : tone === "denied" ? "⦸" : tone === "success" ? "✓" : "·"}
      </span>
      <div>
        <strong>{title}</strong>
        {children ? <p>{children}</p> : null}
        {action}
      </div>
    </div>
  );
}

export function Link({ to, className, children, current }: { to: string; className?: string; children: ReactNode; current?: boolean }) {
  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} className={[className, current ? "is-current" : ""].filter(Boolean).join(" ") || undefined} aria-current={current ? "page" : undefined} onClick={go}>
      {children}
    </a>
  );
}

export function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return url ? (
    <img className="kk-avatar" src={url} alt="" width={size} height={size} referrerPolicy="no-referrer" />
  ) : (
    <span className="kk-avatar" style={{ width: size, height: size }} aria-hidden="true">{initial}</span>
  );
}

function ProfileMenu() {
  const { session, profile, signOut, suspended } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase || !session) return;
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)
      .then(({ count }) => setUnread(count ?? 0));
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!session) {
    return (
      <button type="button" className="kk-header-login" onClick={() => navigate(`/login?next=${encodeURIComponent(currentPath())}`)}>
        เข้าสู่ระบบ
      </button>
    );
  }

  const name = profile?.display_name || session.user.email || "บัญชีของฉัน";
  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div className="trip-product-profile kk-profile" ref={ref}>
      <button type="button" className="kk-profile__trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Avatar name={name} url={profile?.avatar_url} />
        <span className="kk-profile__name">{name}</span>
        {unread ? <b className="kk-badge" aria-label={`${unread} การแจ้งเตือนใหม่`}>{unread}</b> : null}
        <i aria-hidden="true">⌄</i>
      </button>
      {open ? (
        <div className="kk-profile__menu" role="menu">
          <p className="kk-profile__role">{profile ? roleLabel[profile.role] : ""}{suspended ? " · ถูกระงับ" : ""}</p>
          <button type="button" role="menuitem" onClick={() => go("/account")}>บัญชีและการแจ้งเตือน{unread ? ` (${unread})` : ""}</button>
          <button type="button" role="menuitem" onClick={() => go("/my-trips")}>ทริปของฉัน</button>
          {profile?.role === "admin" && !suspended ? <button type="button" role="menuitem" onClick={() => go("/admin")}>แผงผู้ดูแลระบบ</button> : null}
          <button type="button" role="menuitem" onClick={async () => { setOpen(false); await signOut(); navigate("/"); }}>ออกจากระบบ</button>
        </div>
      ) : null}
    </div>
  );
}

export function ProductHeader({ current }: { current: "trips" | "my-trips" | "account" | "admin" }) {
  const { profile, suspended } = useAuth();
  return (
    <header className="trip-product-header">
      <Link to="/" className="trip-product-brand">
        <span className="trip-product-brand__symbol" aria-hidden="true">↗</span>
        <span className="trip-product-brand__copy">กินกับ<small>KinKub</small></span>
      </Link>
      <nav className="trip-product-nav" aria-label="เมนูสมาชิก">
        <Link to="/">หน้าแรก</Link>
        <Link to="/trips" current={current === "trips"}>ค้นหาทริป</Link>
        <Link to="/my-trips" current={current === "my-trips"}>ทริปของฉัน</Link>
        {profile?.role === "admin" && !suspended ? <Link to="/admin" current={current === "admin"}>ผู้ดูแล</Link> : null}
      </nav>
      {isSupabaseConfigured ? <ProfileMenu /> : <span className="kk-chip">โหมดตัวอย่าง</span>}
    </header>
  );
}

/** Wraps member-only pages: shows a Thai loading/denied state, or redirects to login with ?next=. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { session, profile, loading, suspended } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!loading && isSupabaseConfigured && !session && !redirected.current) {
      redirected.current = true;
      window.history.replaceState({}, "", `/login?next=${encodeURIComponent(currentPath())}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }, [loading, session]);

  if (!isSupabaseConfigured) {
    return (
      <StateMessage tone="info" title="ยังไม่ได้เชื่อมต่อ Supabase">
        หน้านี้ต้องใช้บัญชีจริง เจ้าของระบบต้องตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ในไฟล์ .env ก่อน (ดู README)
      </StateMessage>
    );
  }
  if (loading || (session && !profile)) return <StateMessage tone="loading" title="กำลังโหลดบัญชีของคุณ…" />;
  if (!session) return <StateMessage tone="loading" title="กำลังพาไปหน้าเข้าสู่ระบบ…" />;
  if (admin && (profile?.role !== "admin" || suspended)) {
    return (
      <StateMessage tone="denied" title="ไม่มีสิทธิ์เข้าถึงหน้านี้" action={<button type="button" className="kk-button" onClick={() => navigate("/trips")}>กลับไปค้นหาทริป</button>}>
        หน้านี้สำหรับผู้ดูแลระบบเท่านั้น
      </StateMessage>
    );
  }
  return <>{children}</>;
}

/** One-line feedback after an action. */
export function useFlash() {
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);
  const node = flash ? <div className={`kk-flash kk-flash--${flash.tone}`} role={flash.tone === "error" ? "alert" : "status"}>{flash.text}</div> : null;
  return { node, ok: (text: string) => setFlash({ tone: "success", text }), fail: (text: string) => setFlash({ tone: "error", text }) };
}
