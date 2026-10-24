import { useEffect, useState } from "react";
import CinematicIntro from "./components/CinematicIntro";
import Destinations from "./components/Destinations";
import Packages from "./components/Packages";
import Showcase from "./components/Showcase";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import TripDiscoveryPage from "./components/TripDiscoveryPage";
import TripLogin from "./components/TripLogin";

type Route = "home" | "login" | "trips";

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith("/trips")) return "trips";
  if (pathname.startsWith("/login")) return "login";
  return "home";
}

export default function App() {
  const [query, setQuery] = useState("");
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(routeFromPath(path));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (route === "login") {
    return <TripLogin onHome={() => navigate("/")} onLogin={() => navigate("/trips")} />;
  }

  if (route === "trips") {
    return <TripDiscoveryPage onHome={() => navigate("/")} />;
  }

  return (
    <div className="page">
      <a className="skip-link" href="#main">
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <CinematicIntro />

      <main id="main" className="site-main">
        <SiteHeader
          query={query}
          onQueryChange={setQuery}
          onExploreTrips={() => navigate("/login?next=/trips")}
        />
        <Showcase />
        <Destinations query={query} onClear={() => setQuery("")} />
        <section className="trip-entry" aria-labelledby="trip-entry-title">
          <div className="trip-entry__copy">
            <p className="trip-entry__location">ออกเดินทางแบบที่เป็นคุณ</p>
            <h2 id="trip-entry-title">มีที่อยากไปแล้ว ขาดแค่คนร่วมทาง?</h2>
            <p>เจอ Buddy กลุ่มเล็ก หรือเลือกไกด์ท้องถิ่นที่ใช่สำหรับทริปนี้</p>
          </div>
          <button type="button" onClick={() => navigate("/login?next=/trips")}>
            เริ่มหาเพื่อนเที่ยว
            <span aria-hidden="true">↗</span>
          </button>
        </section>
        <Packages />
      </main>

      <SiteFooter />
    </div>
  );
}
