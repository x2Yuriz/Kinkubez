import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "../lib/auth";
import { addFavorite, myFavoriteIds, removeFavorite, searchTrips, tripRatings, type TripRating, type TripRow, type TripType } from "../lib/api";
import { currentPath, navigate } from "../lib/router";
import { isSupabaseConfigured } from "../lib/supabase";
import TripDetail from "./TripDetail";

type RefineFilter = "all" | "verified" | "budget";
type Trip = TripRow & { host: string; hostInitial: string; date: string; dateValue: string; seatsLeft: number; verified: boolean; image: string };
type PinnedTrip = Trip & { lat: number; lon: number };

type Props = { destination: string; date: string; partySize: number };

const FALLBACK_IMAGE = "/images/chiangmai-temple.webp";

type Sample = [string, TripType, string, string, boolean, string, string, number, number, number, string, number, number];

/** Labelled sample trips, shown only when Supabase is not configured or unreachable. They cannot be booked. */
const sampleRows: TripRow[] = ([
  ["old-town-cafes", "buddy", "เดินเล่นเมืองเก่า แวะคาเฟ่ชิล ๆ", "พิม", true, "2026-10-26T10:00:00+07:00", "เมืองเก่า", 850, 3, 2, "/images/chiangmai-temple.webp", 18.7883, 98.9853],
  ["doi-suthep", "guide", "ดอยสุเทพ · วัดป่า · วิวเมือง", "ก้อง · ไกด์ท้องถิ่น", true, "2026-10-27T08:30:00+07:00", "ดอยสุเทพ", 1500, 8, 5, "https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=85", 18.8048, 98.9215],
  ["wu-lai-food", "buddy", "ตะลุยของอร่อยย่านวัวลาย", "มายด์", false, "2026-10-28T17:30:00+07:00", "วัวลาย", 600, 4, 2, "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=85", 18.7851, 99.0014],
  ["mae-rim", "guide", "แม่ริมวันเดียว · น้ำตกและสวนดอกไม้", "อ้อม · ไกด์ธรรมชาติ", true, "2026-10-29T07:00:00+07:00", "แม่ริม", 1950, 10, 5, "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=85", 18.9165, 98.9417],
] satisfies Sample[]).map(([id, type, title, host, approved, startsAt, area, price, capacity, taken, image, lat, lon]) => ({
  id: `sample-${id}`, organizer_id: "", type, title, description: "ทริปตัวอย่างสำหรับดูหน้าตาระบบ ยังจองไม่ได้", destination: "เชียงใหม่", area,
  starts_at: startsAt, ends_at: null, price_thb: price, capacity, seats_taken: taken, image_url: image, lat, lon,
  status: "published", is_sample: true, created_at: startsAt,
  organizer: { id: "", display_name: host, avatar_url: null, role: type, provider_status: approved ? "approved" : "pending", service_area: "เชียงใหม่" },
}));

const bangkokDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(iso));
const dayLabel = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
const timeLabel = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

function toTrip(row: TripRow): Trip {
  const host = row.organizer?.display_name || "ผู้จัดทริป";
  const start = new Date(row.starts_at);
  return {
    ...row, host, hostInitial: host.trim().charAt(0) || "?",
    date: `${dayLabel.format(start)} · ${timeLabel.format(start)}`, dateValue: bangkokDay(row.starts_at),
    seatsLeft: row.capacity - row.seats_taken,
    verified: row.organizer?.provider_status === "approved" || row.organizer?.role === "admin",
    image: row.image_url || FALLBACK_IMAGE,
  };
}

const hasPin = (trip: Trip): trip is PinnedTrip => trip.lat != null && trip.lon != null;

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
  visibleTrips: PinnedTrip[];
}) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    return () => { mapRef.current = null; };
  }, [map, mapRef]);
  useEffect(() => {
    if (selected && hasPin(selected)) map.flyTo([selected.lat, selected.lon], 14, { duration: 0.45 });
    else if (visibleTrips.length) {
      const bounds = L.latLngBounds(visibleTrips.map((trip) => L.latLng(trip.lat, trip.lon)));
      map.fitBounds(bounds, { padding: [58, 62], maxZoom: 12 });
    } else map.setView(cityCenters[destination] ?? cityCenters["เชียงใหม่"], 12);
  }, [destination, map, selected, visibleTrips]);
  return null;
}

export default function TripDiscovery({ destination, date, partySize }: Props) {
  const { session } = useAuth();
  const [type, setType] = useState<TripType | "all">("all");
  const [refine, setRefine] = useState<RefineFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState<TripRow[] | null>(isSupabaseConfigured ? null : sampleRows);
  const [ratings, setRatings] = useState(new Map<string, TripRating>());
  const [loadError, setLoadError] = useState("");
  const [detail, setDetail] = useState<Trip | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const mapRef = useRef<L.Map | null>(null);
  const noticeTimer = useRef(0);

  // Live search; RLS only exposes published trips to the public.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    setRows(null);
    setLoadError("");
    const from = date ? new Date(`${date}T00:00:00+07:00`) : null;
    searchTrips({
      destination,
      type: type === "all" ? undefined : type,
      minSeats: partySize,
      maxPrice: refine === "budget" ? 2000 : undefined,
      from: from?.toISOString(),
      to: from ? new Date(from.getTime() + 86_400_000).toISOString() : undefined,
    }).then(async (found) => {
      if (!active) return;
      setRows(found);
      const rated = await tripRatings(found.map((trip) => trip.id)).catch(() => new Map<string, TripRating>());
      if (active) setRatings(rated);
    }).catch((error: Error) => {
      if (!active) return;
      setLoadError(error.message);
      setRows(sampleRows);
    });
    return () => { active = false; };
  }, [date, destination, partySize, refine, type, reloadKey]);

  useEffect(() => {
    if (!session) { setSavedIds([]); return; }
    myFavoriteIds(session.user.id).then(setSavedIds).catch(() => undefined);
  }, [session]);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const usingSamples = !!rows?.length && rows === sampleRows;
  const visibleTrips = useMemo(() => (rows ?? []).map(toTrip).filter((trip) =>
    // Live rows are filtered by the query; samples are filtered here.
    (!trip.is_sample || rows !== sampleRows || (
      trip.destination === destination &&
      (type === "all" || trip.type === type) &&
      (refine !== "budget" || trip.price_thb <= 2000) &&
      (!date || trip.dateValue === date) &&
      trip.seatsLeft >= partySize)) &&
    (refine !== "verified" || trip.verified),
  ), [date, destination, partySize, refine, rows, type]);
  const pinnedTrips = useMemo(() => visibleTrips.filter(hasPin), [visibleTrips]);
  const selected = visibleTrips.find((trip) => trip.id === selectedId);
  const filtered = type !== "all" || refine !== "all" || !!date;

  useEffect(() => {
    if (selectedId && !visibleTrips.some((trip) => trip.id === selectedId)) setSelectedId(null);
  }, [selectedId, visibleTrips]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), 3200);
  };

  const flipSaved = (id: string, saved: boolean) =>
    setSavedIds((current) => saved ? current.filter((item) => item !== id) : [...current, id]);

  const toggleSaved = async (trip: Trip) => {
    const saved = savedIds.includes(trip.id);
    if (trip.is_sample && usingSamples) return flipSaved(trip.id, saved);
    if (!session) return navigate(`/login?next=${encodeURIComponent(currentPath())}`);
    flipSaved(trip.id, saved);
    try {
      if (saved) await removeFavorite(session.user.id, trip.id);
      else await addFavorite(session.user.id, trip.id);
      showNotice(saved ? "นำออกจากรายการโปรดแล้ว" : "บันทึกในรายการโปรดแล้ว");
    } catch (error) {
      flipSaved(trip.id, !saved);
      showNotice((error as Error).message);
    }
  };

  const openDetail = (trip: Trip) => {
    if (usingSamples) showNotice("นี่คือทริปตัวอย่าง ยังจองไม่ได้ เมื่อเชื่อมต่อฐานข้อมูลแล้วจะเห็นทริปจริง");
    else setDetail(trip);
  };

  const createTrip = () => navigate(session ? "/my-trips" : "/login?next=/my-trips");
  const availability = (trip: Trip) =>
    trip.seatsLeft <= 0 ? "เต็มแล้ว" : trip.type === "buddy" ? `รับเพิ่ม ${trip.seatsLeft} ที่` : `เหลือ ${trip.seatsLeft} ที่`;
  const price = (trip: Trip) => `฿${trip.price_thb.toLocaleString("th-TH")}`;

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
            <button className="trip-finder__create" type="button" onClick={createTrip}>＋ สร้างทริป</button>
          </div>
        </div>

        <div className="trip-finder__type-picker" role="group" aria-label="เลือกวิธีเที่ยว">
          <div className="trip-finder__type-title"><strong>อยากไปกับใคร?</strong><small>เปลี่ยนตัวเลือกได้ทุกเมื่อ</small></div>
          <div className="trip-finder__type-options">
            {([
              { id: "all", label: "ทั้งหมด", note: "Buddy และไกด์" },
              { id: "buddy", label: "เพื่อนเที่ยว (Buddy)", note: "กลุ่มเล็กไม่เกิน 4 คน" },
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
              <strong>ทริปที่กำลังเปิดรับ <span>· {rows ? `${visibleTrips.length} รายการ` : "กำลังโหลด…"}</span></strong>
              {usingSamples ? <span className="kk-chip">ข้อมูลตัวอย่าง · จองไม่ได้</span> : <span>เรียงตามวันเดินทาง</span>}
            </div>
            {loadError ? (
              <p className="kk-form-error" role="alert">
                เชื่อมต่อฐานข้อมูลไม่ได้ จึงแสดงทริปตัวอย่างแทน ({loadError}){" "}
                <button type="button" className="kk-link-button" onClick={() => setReloadKey((key) => key + 1)}>ลองใหม่</button>
              </p>
            ) : null}
            {!rows ? (
              <div className="trip-finder__empty" role="status" aria-busy="true">
                <span className="kk-spinner" aria-hidden="true" />
                <strong>กำลังค้นหาทริป…</strong>
              </div>
            ) : visibleTrips.length ? (
              <div className="trip-finder__grid">
                {visibleTrips.map((trip) => {
                  const saved = savedIds.includes(trip.id);
                  const rating = ratings.get(trip.id);
                  return (
                    <article className={`trip-card${selectedId === trip.id ? " is-selected" : ""}`} key={trip.id}>
                      <button type="button" className="trip-card__select" onClick={() => setSelectedId(trip.id)} aria-pressed={selectedId === trip.id} aria-label={`เลือก ${trip.title}`}>
                        <span className="trip-card__image" style={{ backgroundImage: `url("${trip.image}")` }} role="img" aria-label={trip.title} />
                        <span className="trip-card__type">{trip.type === "buddy" ? "Buddy · กลุ่มเล็ก" : `ไกด์ · รับ ${trip.capacity} คน`}{trip.is_sample ? " · ตัวอย่าง" : ""}</span>
                        {selectedId === trip.id ? <span className="trip-card__selected">เลือกแล้ว</span> : null}
                        <span className="trip-card__body">
                          <span className="trip-card__host"><span className="trip-card__avatar">{trip.hostInitial}</span>{trip.host}<span className="trip-card__verified">{trip.verified ? "✓ ยืนยันแล้ว" : "ยืนยันบางส่วน"}</span></span>
                          <strong className="trip-card__title">{trip.title}</strong>
                          <span className="trip-card__details">{trip.date}　·　{trip.area || trip.destination}{rating ? `　·　★ ${Number(rating.rating).toFixed(1)} (${rating.review_count})` : ""}</span>
                          <span className="trip-card__bottom"><span className="trip-card__price">{price(trip)}<small> / คน</small></span><span className="trip-card__availability">{availability(trip)}</span></span>
                        </span>
                      </button>
                      <button type="button" className={`trip-card__favorite${saved ? " is-saved" : ""}`} aria-label={saved ? "นำออกจากรายการโปรด" : "บันทึกทริป"} aria-pressed={saved} onClick={() => void toggleSaved(trip)}>{saved ? "♥" : "♡"}</button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="trip-finder__empty" role="status">
                <strong>{filtered ? "ยังไม่เจอทริปตามตัวกรองนี้" : `ยังไม่มีทริปใน${destination}`}</strong>
                <span>{filtered ? "ลองเปลี่ยนวัน จำนวนคน หรือล้างตัวกรอง" : "เปลี่ยนจุดหมาย หรือสร้างทริปแรกของพื้นที่นี้"}</span>
                <button type="button" onClick={() => { setType("all"); setRefine("all"); }}>ดูทริปทั้งหมด</button>
              </div>
            )}
            {selected ? (
              <div className="trip-finder__selection" role="status" aria-live="polite">
                <span className="trip-finder__selection-mark" aria-hidden="true">✓</span>
                <span className="trip-finder__selection-copy"><small>ทริปที่เลือก</small><strong>{selected.title}</strong><small>{selected.type === "buddy" ? "Buddy · กลุ่มเล็ก" : "ไกด์ท้องถิ่น"} · {selected.verified ? "ยืนยันตัวตนแล้ว" : "ยืนยันตัวตนบางส่วน"}</small></span>
                <strong className="trip-finder__selection-price">{price(selected)} / คน</strong>
                <span className="trip-finder__selection-actions">
                  {hasPin(selected) ? (
                    <button type="button" className="is-quiet" onClick={() => { mapRef.current?.flyTo([selected.lat, selected.lon], 14, { duration: .45 }); window.document.querySelector(".trip-finder__map")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>ดูตำแหน่ง</button>
                  ) : null}
                  <button type="button" onClick={() => openDetail(selected)}>{usingSamples ? "รายละเอียด" : "รายละเอียด · จอง"} <span>→</span></button>
                </span>
              </div>
            ) : null}
            <div className="trip-finder__bottom-note"><span><strong>ไม่เจอทริปที่ใช่?</strong> สร้างแพลน แล้วชวนคนมาออกเดินทางด้วยกัน</span><button type="button" onClick={createTrip}>＋ สร้างทริป</button></div>
          </div>

          <div className="trip-finder__map" aria-label={`แผนที่ทริปใน${destination}`}>
            <div className="trip-finder__map-heading">
              <span className="trip-finder__map-label"><strong>{destination}</strong> · {pinnedTrips.length} ทริปในพื้นที่</span>
              <button type="button" onClick={() => mapRef.current?.setView(cityCenters[destination] ?? cityCenters["เชียงใหม่"], 12)}>⌖　ค้นหาบริเวณนี้</button>
            </div>
            <MapContainer key={destination} center={cityCenters[destination] ?? cityCenters["เชียงใหม่"]} zoom={12} scrollWheelZoom={false} zoomControl={false} className="trip-finder__leaflet-map">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ZoomControl position="bottomright" />
              <MapViewport selected={selected} destination={destination} mapRef={mapRef} visibleTrips={pinnedTrips} />
              {pinnedTrips.map((trip) => {
                const icon = L.divIcon({
                  className: "trip-price-pin-wrap",
                  html: `<span class="trip-price-pin ${trip.type === "buddy" ? "is-buddy" : ""} ${selectedId === trip.id ? "is-active" : ""}">${price(trip)}</span>`,
                  iconSize: [94, 38],
                  iconAnchor: [47, 36],
                });
                return (
                  <Marker key={trip.id} position={[trip.lat, trip.lon]} icon={icon} title={`${trip.title} · ${price(trip)}`} eventHandlers={{ click: () => setSelectedId(trip.id) }}>
                    <Popup><strong>{trip.title}</strong><br />{price(trip)} / คน · {trip.type === "buddy" ? "Buddy กลุ่มเล็ก" : "ทริปไกด์"}</Popup>
                  </Marker>
                );
              })}
            </MapContainer>
            <div className="trip-finder__map-legend"><span><i />ทริปไกด์</span><span><i className="is-buddy" />Buddy กลุ่มเล็ก</span></div>
          </div>
        </div>
        {notice ? <div className="trip-finder__notice" role="status">{notice}</div> : null}
        {detail ? <TripDetail trip={detail} partySize={partySize} onClose={() => setDetail(null)} onBooked={() => setReloadKey((key) => key + 1)} /> : null}
      </div>
    </section>
  );
}
