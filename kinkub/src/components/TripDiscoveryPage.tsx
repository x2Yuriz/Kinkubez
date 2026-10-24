import { useState, type FormEvent, type MouseEvent } from "react";
import { destinations } from "../content";
import TripDiscovery from "./TripDiscovery";

type Props = { onHome: () => void };

const heroScenes = [
  { key: "left", image: "/images/bangkok-golden.webp", english: "BANGKOK", name: "กรุงเทพฯ", note: "เมืองเก่า · วัฒนธรรม" },
  { key: "main", image: "/images/chiangmai-temple.webp", english: "CHIANG MAI", name: "เชียงใหม่", note: "เมืองเก่า ธรรมชาติ และผู้คนที่คุณยังไม่เคยเจอ" },
  { key: "right", image: "/images/phuket-beach.webp", english: "PHUKET", name: "ภูเก็ต", note: "ทะเล · slow travel" },
];

export default function TripDiscoveryPage({ onHome }: Props) {
  const [destination, setDestination] = useState("เชียงใหม่");
  const [date, setDate] = useState("");
  const [partySize, setPartySize] = useState("1");

  const returnHome = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onHome();
  };

  const searchTrips = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document.getElementById("trip-discovery")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="trip-product-page">
      <a className="skip-link" href="#trip-discovery">ข้ามไปยังรายการทริป</a>
      <header className="trip-product-header">
        <a className="trip-product-brand" href="/" onClick={returnHome} aria-label="เที่ยวไทย กลับหน้าแรก">
          <span className="trip-product-brand__symbol" aria-hidden="true">↗</span>
          <span className="trip-product-brand__copy">เที่ยวไทย<small>THAILAND TRAVEL</small></span>
        </a>
        <nav className="trip-product-nav" aria-label="เมนูสมาชิก">
          <a href="/" onClick={returnHome}>หน้าแรก</a>
          <a className="is-current" href="#trip-discovery">ค้นหาทริป</a>
          <button type="button" onClick={() => document.getElementById("trip-discovery")?.scrollIntoView({ behavior: "smooth" })}>แพลนของฉัน</button>
          <button type="button" onClick={() => document.getElementById("trip-discovery")?.scrollIntoView({ behavior: "smooth" })}>ข้อความ</button>
        </nav>
        <div className="trip-product-profile"><span>น</span> นลิน <i aria-hidden="true">⌄</i></div>
      </header>

      <main className="trip-discovery-main">
        <section className="trip-hero-collage" aria-label="บรรยากาศจุดหมายปลายทาง">
          {heroScenes.map((scene) => (
            <article className={`trip-hero-scene trip-hero-scene--${scene.key}`} key={scene.key} style={{ backgroundImage: `url(${scene.image})` }}>
              <div className="trip-hero-scene__copy"><span>{scene.english}</span><strong>{scene.name}</strong>{scene.key === "main" ? <small>{scene.note}</small> : null}</div>
              {scene.key === "main" ? <span className="trip-hero-tag">4 ทริปกำลังเปิดรับ</span> : null}
            </article>
          ))}
          <div className="trip-hero-dots" aria-hidden="true"><i /><i /><i /></div>
        </section>

        <form className="trip-search-panel" onSubmit={searchTrips}>
          <label className="trip-search-field trip-search-field--destination"><span>จุดหมายที่อยากไป</span>
            <select value={destination} onChange={(event) => setDestination(event.target.value)} aria-label="เลือกจุดหมาย">
              {destinations.map((place) => <option key={place.id} value={place.name}>{place.name}</option>)}
            </select>
          </label>
          <label className="trip-search-field"><span>วันเดินทาง</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="เลือกวันเดินทาง" /></label>
          <label className="trip-search-field"><span>จำนวนคน</span><select value={partySize} onChange={(event) => setPartySize(event.target.value)} aria-label="เลือกจำนวนคน"><option value="1">1 คน</option><option value="2">2 คน</option><option value="3">3 คน</option><option value="4">4 คน</option></select></label>
          <button className="trip-search-submit" type="submit">ค้นหาทริป <span aria-hidden="true">→</span></button>
        </form>

        <TripDiscovery destination={destination} date={date} partySize={Number(partySize)} />
      </main>
    </div>
  );
}
