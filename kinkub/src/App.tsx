import { useEffect, useState, type CSSProperties } from "react";
import { showcaseSlides, type ShowcaseSlide } from "./content";
import CinematicIntro from "./components/CinematicIntro";
import Destinations from "./components/Destinations";
import Showcase from "./components/Showcase";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import TripDiscoveryPage from "./components/TripDiscoveryPage";
import TripLogin from "./components/TripLogin";
import { AuthCallback } from "./components/AuthCallback";
import { AccountPage } from "./components/AccountPage";
import { MyTripsPage } from "./components/MyTripsPage";
import { AdminPage } from "./components/AdminPage";
import { navigate } from "./lib/router";

type Route = "home" | "login" | "trips" | "callback" | "account" | "my-trips" | "admin";

function routeFromPath(pathname: string): Route {
  if (pathname.startsWith("/trips")) return "trips";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/auth/callback")) return "callback";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/my-trips")) return "my-trips";
  if (pathname.startsWith("/admin")) return "admin";
  return "home";
}

export default function App() {
  const [query, setQuery] = useState("");
  const [activeScene, setActiveScene] = useState(showcaseSlides[0]);
  const [route, setRoute] = useState<Route>(() => routeFromPath(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const changeScene = (scene: ShowcaseSlide) => setActiveScene(scene);

  if (route === "login") return <TripLogin onHome={() => navigate("/")} />;
  if (route === "callback") return <AuthCallback />;
  if (route === "account") return <AccountPage />;
  if (route === "my-trips") return <MyTripsPage />;
  if (route === "admin") return <AdminPage />;

  if (route === "trips") {
    return <TripDiscoveryPage />;
  }

  return (
    <div className="page">
      <a className="skip-link" href="#main">
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <CinematicIntro />

      <main id="main" className="site-main">
        <div className="home-scenery">
          <div
            key={activeScene.id}
            className="home-scenery__backdrop"
            style={{ "--scene-image": `url(${activeScene.backgroundImage})`, "--scene-tone": activeScene.backgroundTint } as CSSProperties}
            aria-hidden="true"
          />
          <SiteHeader
            query={query}
            onQueryChange={setQuery}
            onExploreTrips={() => navigate("/login?next=/trips")}
          />
          <Showcase onActiveChange={changeScene} />
          <section className="home-purpose" aria-labelledby="home-purpose-title">
            <div className="home-purpose__inner">
              <div className="home-purpose__intro">
                <div>
                  <h2 id="home-purpose-title">กินกับ — เที่ยวด้วยกัน อร่อยกว่า</h2>
                  <p>หา Buddy กลุ่มเล็กหรือไกด์ท้องถิ่น วางแพลนและคุยกันก่อนออกเดินทาง พร้อมมัดจำยืนยันนัดและรีวิวหลังจบทริป</p>
                </div>
                <div className="home-purpose__actions">
                  <button type="button" onClick={() => navigate("/login?next=/trips")}>หาเพื่อนเที่ยวหรือไกด์ <span aria-hidden="true">↗</span></button>
                  <a href="#destinations">เลือกจุดหมายก่อน</a>
                </div>
              </div>
              <ol className="home-purpose__steps">
                <li><span>01</span><h3>เลือกคนร่วมทาง</h3><p>ไปกับ Buddy กลุ่มเล็ก 2–3 คน หรือเลือกไกด์ตามสไตล์ทริป</p></li>
                <li><span>02</span><h3>วางแผนด้วยกัน</h3><p>จัดลำดับสถานที่ด้วยบล็อกแพลน แล้วคุยรายละเอียดผ่านแชท</p></li>
                <li><span>03</span><h3>ยืนยันนัดแล้วออกเที่ยว</h3><p>วางมัดจำตามเงื่อนไข ปิดทริปเมื่อจบ และรีวิวผู้ร่วมทาง</p></li>
              </ol>
            </div>
          </section>
          <Destinations query={query} onClear={() => setQuery("")} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
