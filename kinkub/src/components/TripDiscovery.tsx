import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type TripType = "buddy" | "guide";
type RefineFilter = "all" | "verified" | "budget";
type Trip = {
  id: string;
  type: TripType;
  title: string;
  host: string;
  hostInitial: string;
  date: string;
  dateValue: string;
  area: string;
  price: number;
  availability: string;
  availableSeats: number;
  groupCapacity?: number;
  verified: boolean;
  image: string;
  lat: number;
  lon: number;
};

type Props = { destination: string; date: string; partySize: number };

const trips: Trip[] = [
  {
    id: "old-town-cafes", type: "buddy", title: "เดินเล่นเมืองเก่า แวะคาเฟ่ชิล ๆ",
    host: "พิม", hostInitial: "พ", date: "26 ต.ค. · 10:00", dateValue: "2026-10-26",
    area: "เมืองเก่า", price: 850, availability: "รับเพิ่ม 1 ที่", availableSeats: 1,
    verified: true, image: "/images/chiangmai-temple.webp",
    lat: 18.7883, lon: 98.9853,
  },
  {
    id: "doi-suthep", type: "guide", title: "ดอยสุเทพ · วัดป่า · วิวเมือง",
    host: "ก้อง · ไกด์ท้องถิ่น", hostInitial: "ก", date: "27 ต.ค. · 08:30", dateValue: "2026-10-27",
    area: "ดอยสุเทพ", price: 1500, availability: "เหลือ 3 ที่", availableSeats: 3, groupCapacity: 8,
    verified: true, image: "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=85",
    lat: 18.8048, lon: 98.9215,
  },
  {
    id: "wu-lai-food", type: "buddy", title: "ตะลุยของอร่อยย่านวัวลาย",
    host: "มายด์", hostInitial: "ม", date: "28 ต.ค. · 17:30", dateValue: "2026-10-28",
    area: "วัวลาย", price: 600, availability: "รับเพิ่ม 2 ที่", availableSeats: 2,
    verified: false, image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=85",
    lat: 18.7851, lon: 99.0014,
  },
  {
    id: "mae-rim", type: "guide", title: "แม่ริมวันเดียว · น้ำตกและสวนดอกไม้",
    host: "อ้อม · ไกด์ธรรมชาติ", hostInitial: "อ", date: "29 ต.ค. · 07:00", dateValue: "2026-10-29",
    area: "แม่ริม", price: 1950, availability: "เหลือ 5 ที่", availableSeats: 5, groupCapacity: 10,
    verified: true, image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=85",
    lat: 18.9165, lon: 98.9417,
  },
];

const cityCenters: Record<string, [number, number]> = {
  "เชียงใหม่": [18.7883, 98.9853],
  "ภูเก็ต": [7.9519, 98.3381],
  "กระบี่": [8.0863, 98.9063],
  "กรุงเทพฯ": [13.7563, 100.5018],
};

function MapViewport({
  selected,
  destination,
  mapRef,
  visibleTrips,
}: {
  selected: Trip | undefined;
  destination: string;
  mapRef: MutableRefObject<L.Map | null>;
  visibleTrips: Trip[];
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => { mapRef.current = null; };
  }, [map, mapRef]);
  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lon], 14, { duration: 0.45 });
    else if (visibleTrips.length) {
      const bounds = L.latLngBounds(visibleTrips.map((trip) => L.latLng(trip.lat, trip.lon)));
      map.fitBounds(bounds, { padding: [58, 62], maxZoom: 12 });
    } else map.setView(cityCenters[destination] ?? cityCenters["เชียงใหม่"], 12);
  }, [destination, map, selected, visibleTrips]);
  return null;
}

export default function TripDiscovery({ destination, date, partySize }: Props) {
  const [type, setType] = useState<TripType | "all">("all");
  const [refine, setRefine] = useState<RefineFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const mapRef = useRef<L.Map | null>(null);

  const visibleTrips = useMemo(() => trips.filter((trip) =>
    destination === "เชียงใหม่" &&
    (type === "all" || trip.type === type) &&
    (refine !== "verified" || trip.verified) &&
    (refine !== "budget" || trip.price <= 2000) &&
    (!date || trip.dateValue === date) &&
    trip.availableSeats >= partySize,
  ), [date, destination, partySize, refine, type]);
  const selected = visibleTrips.find((trip) => trip.id === selectedId);

  useEffect(() => {
    if (selectedId && !visibleTrips.some((trip) => trip.id === selectedId)) setSelectedId(null);
  }, [date, destination, partySize, refine, selectedId, type, visibleTrips]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const toggleSaved = (trip: Trip) => {
    setSavedIds((current) => current.includes(trip.id)
      ? current.filter((id) => id !== trip.id)
      : [...current, trip.id]);
  };

  return (
    <section className="trip-finder" id="trip-discovery" aria-labelledby="trip-finder-title">
      <div className="trip-finder__inner">
        <div className="section-heading trip-finder__heading">
          <div>
            <p className="eyebrow"><span className="eyebrow__line" /> FIND YOUR PEOPLE</p>
            <h2 id="trip-finder-title">หาเพื่อนร่วมทางใน{destination}</h2>
            <p>เลือกทริปที่ใช่ แล้วเริ่มวางแผนไปด้วยกัน</p>
          </div>
          <div className="trip-finder__heading-actions">
            <button className="trip-finder__change-place" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>เปลี่ยนจุดหมาย <span>↗</span></button>
            <button className="trip-finder__create" type="button" onClick={() => showNotice("หน้าเริ่มสร้างทริปกำลังเตรียมไว้")}>＋ สร้างทริป</button>
          </div>
        </div>

        <div className="trip-finder__type-picker" role="group" aria-label="เลือกวิธีเที่ยว">
          <div className="trip-finder__type-title"><strong>อยากไปกับใคร?</strong><small>เปลี่ยนตัวเลือกได้ทุกเมื่อ</small></div>
          <div className="trip-finder__type-options">
            {([
              { id: "all", label: "ทั้งหมด", note: "Buddy และไกด์" },
              { id: "buddy", label: "เพื่อนเที่ยว (Buddy)", note: "กลุ่มเล็ก 2–3 คน" },
              { id: "guide", label: "ไกด์ท้องถิ่น", note: "ทริปส่วนตัวหรือกลุ่ม" },
            ] as const).map((option) => (
              <button type="button" key={option.id} className={`trip-finder__type-choice${type === option.id ? " is-active" : ""}`} aria-pressed={type === option.id} onClick={() => setType(option.id)}>
                <strong>{option.label}</strong><small>{option.note}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="trip-finder__toolbar" role="group" aria-label="กรองทริปเพิ่มเติม">
          <span>กรองเพิ่ม</span>
          {([
            { id: "all", label: "ทั้งหมด" },
            { id: "verified", label: "ยืนยันตัวตนแล้ว" },
            { id: "budget", label: "ไม่เกิน ฿2,000" },
          ] as const).map((option) => (
            <button type="button" key={option.id} className={refine === option.id ? "is-active" : ""} aria-pressed={refine === option.id} onClick={() => setRefine(option.id)}>{option.label}</button>
          ))}
          <small>แผนที่และรายการเชื่อมกัน</small>
        </div>

        <div className="trip-finder__layout">
          <div className="trip-finder__results">
            <div className="trip-finder__results-head">
              <strong>ทริปที่กำลังเปิดรับ <span>· {visibleTrips.length} รายการ</span></strong>
              <span>เรียงตามใกล้พื้นที่</span>
            </div>
            {visibleTrips.length ? (
              <div className="trip-finder__grid">
                {visibleTrips.map((trip) => (
                  <article className={`trip-card${selectedId === trip.id ? " is-selected" : ""}`} key={trip.id}>
                    <button type="button" className="trip-card__select" onClick={() => setSelectedId(trip.id)} aria-pressed={selectedId === trip.id} aria-label={`เลือก ${trip.title}`}>
                      <span className="trip-card__image" style={{ backgroundImage: `url("${trip.image}")` }} role="img" aria-label={trip.title} />
                      <span className="trip-card__type">{trip.type === "buddy" ? "Buddy · กลุ่มเล็ก" : `ไกด์ · รับ ${trip.groupCapacity} คน`}</span>
                      {selectedId === trip.id ? <span className="trip-card__selected">เลือกแล้ว</span> : null}
                      <span className="trip-card__body">
                        <span className="trip-card__host"><span className="trip-card__avatar">{trip.hostInitial}</span>{trip.host}<span className="trip-card__verified">{trip.verified ? "✓ ยืนยันแล้ว" : "ยืนยันบางส่วน"}</span></span>
                        <strong className="trip-card__title">{trip.title}</strong>
                        <span className="trip-card__details">{trip.date}　·　{trip.area}</span>
                        <span className="trip-card__bottom"><span className="trip-card__price">฿{trip.price.toLocaleString("th-TH")}<small> / คน</small></span><span className="trip-card__availability">{trip.availability}</span></span>
                      </span>
                    </button>
                    <button type="button" className={`trip-card__favorite${savedIds.includes(trip.id) ? " is-saved" : ""}`} aria-label={savedIds.includes(trip.id) ? "นำออกจากรายการบันทึก" : "บันทึกทริป"} aria-pressed={savedIds.includes(trip.id)} onClick={() => toggleSaved(trip)}>{savedIds.includes(trip.id) ? "♥" : "♡"}</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="trip-finder__empty" role="status">
                <strong>{destination === "เชียงใหม่" ? "ยังไม่เจอทริปตามตัวกรองนี้" : `ยังไม่มีทริปใน${destination}`}</strong>
                <span>{destination === "เชียงใหม่" ? "ลองเปลี่ยนวัน จำนวนคน หรือล้างตัวกรอง" : "เปลี่ยนจุดหมายเพื่อดูทริปที่เปิดรับอยู่"}</span>
                <button type="button" onClick={() => { setType("all"); setRefine("all"); }}>ดูทริปทั้งหมด</button>
              </div>
            )}
            {selected ? (
              <div className="trip-finder__selection" role="status" aria-live="polite">
                <span className="trip-finder__selection-mark" aria-hidden="true">✓</span>
                <span className="trip-finder__selection-copy"><small>ทริปที่เลือก</small><strong>{selected.title}</strong><small>{selected.type === "buddy" ? "Buddy · กลุ่มเล็ก" : "ไกด์ท้องถิ่น"} · {selected.verified ? "ยืนยันตัวตนแล้ว" : "ยืนยันตัวตนบางส่วน"}</small></span>
                <strong className="trip-finder__selection-price">฿{selected.price.toLocaleString("th-TH")} / คน</strong>
                <button type="button" onClick={() => { mapRef.current?.flyTo([selected.lat, selected.lon], 14, { duration: .45 }); window.document.querySelector(".trip-finder__map")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>ดูตำแหน่ง <span>→</span></button>
              </div>
            ) : null}
            <div className="trip-finder__bottom-note"><span><strong>ไม่เจอทริปที่ใช่?</strong> สร้างแพลน แล้วชวนคนมาออกเดินทางด้วยกัน</span><button type="button" onClick={() => showNotice("หน้าเริ่มสร้างทริปกำลังเตรียมไว้")}>＋ สร้างทริป</button></div>
          </div>

          <div className="trip-finder__map" aria-label={`แผนที่ทริปใน${destination}`}>
            <div className="trip-finder__map-heading">
              <span className="trip-finder__map-label"><strong>{destination}</strong> · {visibleTrips.length} ทริปในพื้นที่</span>
              <button type="button" onClick={() => mapRef.current?.setView(cityCenters[destination] ?? cityCenters["เชียงใหม่"], 12)}>⌖　ค้นหาบริเวณนี้</button>
            </div>
            <MapContainer key={destination} center={cityCenters[destination] ?? cityCenters["เชียงใหม่"]} zoom={12} scrollWheelZoom={false} zoomControl={false} className="trip-finder__leaflet-map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ZoomControl position="bottomright" />
              <MapViewport selected={selected} destination={destination} mapRef={mapRef} visibleTrips={visibleTrips} />
              {visibleTrips.map((trip) => {
                const icon = L.divIcon({
                  className: "trip-price-pin-wrap",
                  html: `<span class="trip-price-pin ${trip.type === "buddy" ? "is-buddy" : ""} ${selectedId === trip.id ? "is-active" : ""}">฿${trip.price.toLocaleString("th-TH")}</span>`,
                  iconSize: [94, 38],
                  iconAnchor: [47, 36],
                });
                return (
                  <Marker key={trip.id} position={[trip.lat, trip.lon]} icon={icon} title={`${trip.title} · ฿${trip.price.toLocaleString("th-TH")}`} eventHandlers={{ click: () => setSelectedId(trip.id) }}>
                    <Popup><strong>{trip.title}</strong><br />฿{trip.price.toLocaleString("th-TH")} / คน · {trip.type === "buddy" ? "Buddy กลุ่มเล็ก" : "ทริปไกด์"}</Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            <div className="trip-finder__map-legend"><span><i />ทริปไกด์</span><span><i className="is-buddy" />Buddy กลุ่มเล็ก</span></div>
          </div>
        </div>
        {notice ? <div className="trip-finder__notice" role="status">{notice}</div> : null}
      </div>
    </section>
  );
}
