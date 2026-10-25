import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { isGoogleMapsConfigured, loadGoogleMaps, onMapsAuthFailure, type GoogleMapsLibs } from "../lib/googleMaps";

export type MapTrip = { id: string; title: string; lat: number; lon: number; price: string; buddy: boolean; detail: string };
export type TripMapHandle = { showTrip: (lat: number, lon: number) => void; recenter: () => void };

type Props = { province: string; trips: MapTrip[]; selectedId: string | null; onSelect: (id: string) => void; ref?: Ref<TripMapHandle> };
type Status = "loading" | "ready" | "error" | "auth" | "missing";

// Starting views; other provinces start on the whole country until a trip has a pin.
const cityCenters: Record<string, google.maps.LatLngLiteral> = {
  "เชียงใหม่": { lat: 18.7883, lng: 98.9853 },
  "ภูเก็ต": { lat: 7.9519, lng: 98.3381 },
  "กระบี่": { lat: 8.0863, lng: 98.9063 },
  "กรุงเทพมหานคร": { lat: 13.7563, lng: 100.5018 },
};
const provinceView = (province: string) =>
  cityCenters[province] ? { center: cityCenters[province], zoom: 12 } : { center: { lat: 13.2, lng: 101.0 }, zoom: 6 };

type PriceOverlay = google.maps.OverlayView & { el: HTMLButtonElement };

/** HTML price pins (no Map ID needed). Built lazily because OverlayView only exists after the API loads. */
function createOverlay(libs: GoogleMapsLibs, trip: MapTrip, onSelect: (id: string) => void): PriceOverlay {
  class Pin extends libs.maps.OverlayView {
    el = document.createElement("button");
    constructor(private position: google.maps.LatLngLiteral) {
      super();
      this.el.type = "button";
      this.el.addEventListener("click", () => onSelect(trip.id));
      libs.maps.OverlayView.preventMapHitsAndGesturesFrom(this.el);
    }
    onAdd() { this.getPanes()?.overlayMouseTarget.append(this.el); }
    draw() {
      const point = this.getProjection()?.fromLatLngToDivPixel(this.position);
      if (point) { this.el.style.left = `${point.x}px`; this.el.style.top = `${point.y}px`; }
    }
    onRemove() { this.el.remove(); }
  }
  return new Pin({ lat: trip.lat, lng: trip.lon });
}

export default function TripMap({ province, trips, selectedId, onSelect, ref }: Props) {
  const [status, setStatus] = useState<Status>(isGoogleMapsConfigured ? "loading" : "missing");
  const [attempt, setAttempt] = useState(0);
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const libsRef = useRef<GoogleMapsLibs | null>(null);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const pinsRef = useRef(new Map<string, PriceOverlay>());
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useImperativeHandle(ref, () => ({
    showTrip: (lat, lon) => { mapRef.current?.panTo({ lat, lng: lon }); mapRef.current?.setZoom(14); },
    recenter: () => { const view = provinceView(province); mapRef.current?.setCenter(view.center); mapRef.current?.setZoom(view.zoom); },
  }), [province]);

  useEffect(() => onMapsAuthFailure(() => setStatus("auth")), []);

  useEffect(() => {
    if (!isGoogleMapsConfigured || mapRef.current) return;
    let active = true;
    setStatus("loading");
    loadGoogleMaps().then((libs) => {
      if (!active || !elRef.current) return;
      libsRef.current = libs;
      const view = provinceView(province);
      mapRef.current = new libs.maps.Map(elRef.current, {
        center: view.center, zoom: view.zoom,
        gestureHandling: "cooperative", clickableIcons: false,
        mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        zoomControl: true, zoomControlOptions: { position: libs.core.ControlPosition.RIGHT_BOTTOM },
        fullscreenControlOptions: { position: libs.core.ControlPosition.RIGHT_BOTTOM },
      });
      infoRef.current = new libs.maps.InfoWindow({ pixelOffset: new libs.core.Size(0, -40) });
      setStatus((current) => current === "auth" ? current : "ready");
    }).catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
    // province is only the starting view; later changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // One pin per trip with coordinates.
  useEffect(() => {
    const map = mapRef.current;
    const libs = libsRef.current;
    if (status !== "ready" || !map || !libs) return;
    const pins = pinsRef.current;
    pins.forEach((pin) => pin.setMap(null));
    pins.clear();
    for (const trip of trips) {
      const pin = createOverlay(libs, trip, (id) => selectRef.current(id));
      pin.el.className = `trip-price-pin trip-price-pin--gmap${trip.buddy ? " is-buddy" : ""}`;
      pin.el.textContent = trip.price;
      pin.el.title = `${trip.title} · ${trip.price}`;
      pin.el.setAttribute("aria-label", `${trip.title} ราคา ${trip.price} ต่อคน`);
      pin.setMap(map);
      pins.set(trip.id, pin);
    }
    return () => { pins.forEach((pin) => pin.setMap(null)); pins.clear(); };
  }, [status, trips]);

  // Selected pin + info window.
  useEffect(() => {
    if (status !== "ready") return;
    pinsRef.current.forEach((pin, id) => {
      pin.el.classList.toggle("is-active", id === selectedId);
      pin.el.setAttribute("aria-pressed", String(id === selectedId));
    });
    const info = infoRef.current;
    const trip = trips.find((item) => item.id === selectedId);
    if (!info) return;
    if (!trip) { info.close(); return; }
    const content = document.createElement("div");
    content.className = "trip-finder__info";
    const title = document.createElement("strong");
    title.textContent = trip.title;
    const detail = document.createElement("span");
    detail.textContent = trip.detail;
    content.append(title, detail);
    info.setContent(content);
    info.setPosition({ lat: trip.lat, lng: trip.lon });
    info.open({ map: mapRef.current, shouldFocus: false });
  }, [selectedId, status, trips]);

  // Viewport: selected trip, else fit all pins, else the province.
  useEffect(() => {
    const map = mapRef.current;
    const libs = libsRef.current;
    if (status !== "ready" || !map || !libs) return;
    const trip = trips.find((item) => item.id === selectedId);
    if (trip) {
      map.panTo({ lat: trip.lat, lng: trip.lon });
      map.setZoom(14);
    } else if (trips.length) {
      const bounds = new libs.core.LatLngBounds();
      trips.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lon }));
      map.fitBounds(bounds, { top: 70, right: 60, bottom: 60, left: 60 });
      libs.core.event.addListenerOnce(map, "idle", () => { if ((map.getZoom() ?? 0) > 12) map.setZoom(12); });
    } else {
      const view = provinceView(province);
      map.setCenter(view.center);
      map.setZoom(view.zoom);
    }
  }, [province, selectedId, status, trips]);

  return (
    <>
      <div ref={elRef} className="trip-finder__gmap" />
      {status === "loading" ? (
        <div className="trip-finder__map-state" role="status" aria-busy="true">
          <span className="kk-spinner" aria-hidden="true" />
          <strong>กำลังโหลด Google Maps…</strong>
        </div>
      ) : status === "missing" ? (
        <div className="trip-finder__map-state" role="status">
          <strong>ยังไม่ได้ตั้งค่า Google Maps</strong>
          <span>เจ้าของเว็บต้องใส่ <code>VITE_GOOGLE_MAPS_API_KEY</code> ใน <code>.env.local</code> และใน Environment Variables ของ Vercel แล้วเปิดใช้ Maps JavaScript API</span>
          <span>ระหว่างนี้ยังดูรายการทริปและเปิดจุดนัดใน Google Maps จากรายละเอียดทริปได้ตามปกติ</span>
        </div>
      ) : status === "auth" ? (
        <div className="trip-finder__map-state" role="alert">
          <strong>Google Maps ไม่อนุญาตให้ใช้คีย์นี้</strong>
          <span>ตรวจสอบว่าเปิด Maps JavaScript API ตั้งค่า Billing แล้ว และอนุญาตโดเมนนี้ใน HTTP referrers ของคีย์</span>
        </div>
      ) : status === "error" ? (
        <div className="trip-finder__map-state" role="alert">
          <strong>โหลดแผนที่ไม่สำเร็จ</strong>
          <span>ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง</span>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>ลองใหม่</button>
        </div>
      ) : null}
    </>
  );
}
