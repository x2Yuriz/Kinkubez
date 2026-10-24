import { useState } from "react";
import CinematicIntro from "./components/CinematicIntro";
import Destinations from "./components/Destinations";
import Packages from "./components/Packages";
import Showcase from "./components/Showcase";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

export default function App() {
  const [query, setQuery] = useState("");

  return (
    <div className="page">
      <a className="skip-link" href="#main">
        ข้ามไปยังเนื้อหาหลัก
      </a>

      <CinematicIntro />

      <main id="main" className="site-main">
        <SiteHeader query={query} onQueryChange={setQuery} />
        <Showcase />
        <Destinations query={query} onClear={() => setQuery("")} />
        <Packages />
      </main>

      <SiteFooter />
    </div>
  );
}
