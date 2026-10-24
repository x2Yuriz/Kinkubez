import { useRef, useState, type FormEvent, type MouseEvent } from "react";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onExploreTrips: () => void;
};

const navigation = [
  { label: "หน้าแรก", href: "#main" },
  { label: "จุดหมายปลายทาง", href: "#destinations" },
  { label: "หาเพื่อนเที่ยว", href: "/login?next=/trips", action: "login" },
];

export default function SiteHeader({ query, onQueryChange, onExploreTrips }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, action?: string) => {
    setMenuOpen(false);
    if (action === "login") {
      event.preventDefault();
      onExploreTrips();
    }
  };

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <a className="wordmark" href="#main" aria-label="กินกับ KinKub หน้าแรก">
          กินกับ
          <span>KinKub · TRAVEL TOGETHER</span>
        </a>

        <nav className={`site-nav${menuOpen ? " is-open" : ""}`} aria-label="เมนูหลัก">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={(event) => handleNavigation(event, item.action)}>
              {item.label}
            </a>
          ))}
        </nav>

        <form className="site-search" role="search" onSubmit={submitSearch}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m12.7 12.7 4 4" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onQueryChange("");
            }}
            placeholder="ค้นหาจุดหมาย เช่น เชียงใหม่"
            aria-label="ค้นหาจุดหมายปลายทาง"
          />
          {query ? (
            <button
              className="site-search__clear"
              type="button"
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              aria-label="ล้างคำค้นหา"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          ) : null}
        </form>

        <button className="site-header__login" type="button" onClick={onExploreTrips}>
          เข้าสู่ระบบ
        </button>

        <button
          className={`menu-toggle${menuOpen ? " is-open" : ""}`}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle__lines" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="menu-toggle__label">เมนู</span>
        </button>
      </div>

      <div className="site-header__mobile" id="mobile-navigation" hidden={!menuOpen}>
        <nav className="site-nav site-nav--mobile" aria-label="เมนูหลักบนมือถือ">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} onClick={(event) => handleNavigation(event, item.action)}>
              {item.label}
            </a>
          ))}
          <button type="button" onClick={() => { setMenuOpen(false); onExploreTrips(); }}>
            เข้าสู่ระบบ
          </button>
        </nav>
      </div>
    </header>
  );
}
