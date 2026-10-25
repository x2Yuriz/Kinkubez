import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import {
  bookingHistory, bookingsForTrips, bookingStatusLabel, createTrip, deleteTrip, formatDateTime, formatTHB, getItinerary,
  IMAGE_TYPES, myBookings, myOrganizedTrips, myReviews, saveItinerary, setBookingStatus, submitReview, tripStatusLabel,
  updateTrip, uploadImage, type Booking, type BookingHistory, type BookingStatus, type ItineraryItem, type TripInput,
  type TripRow, type TripType,
} from "../lib/api";
import { isGoogleMapsUrl, normalizeMapsUrl, parseMapsCoords } from "../lib/maps";
import { DEFAULT_PROVINCE, PROVINCES, REGION_LABEL, REGIONS, toProvince } from "../lib/provinces";
import { ProductHeader, RequireAuth, StateMessage, useFlash } from "./ui";

type Flash = ReturnType<typeof useFlash>;

/** <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm". */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

// ---------------- Traveler ----------------

function HistoryList({ bookingId }: { bookingId: string }) {
  const [rows, setRows] = useState<BookingHistory[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { bookingHistory(bookingId).then(setRows).catch((e: Error) => setError(e.message)); }, [bookingId]);
  if (error) return <StateMessage tone="error" title="โหลดประวัติไม่ได้">{error}</StateMessage>;
  if (!rows) return <StateMessage tone="loading" title="กำลังโหลดประวัติ…" />;
  return (
    <ol className="kk-timeline">
      {rows.map((row) => (
        <li key={row.id}>
          <strong>{bookingStatusLabel[row.to_status]}</strong> <small className="kk-muted">{formatDateTime(row.created_at)}</small>
          {row.reason ? <p>{row.reason}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function ReviewForm({ userId, tripId, onDone, flash }: { userId: string; tripId: string; onDone: () => void; flash: Flash }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await submitReview(userId, tripId, rating, body.trim());
      flash.ok("ขอบคุณสำหรับรีวิว");
      onDone();
    } catch (error) {
      flash.fail((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="kk-form kk-form--inline" onSubmit={submit}>
      <fieldset className="kk-stars">
        <legend>ให้คะแนน</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value}>
            <input type="radio" name={`rating-${tripId}`} value={value} checked={rating === value} onChange={() => setRating(value)} />
            <span aria-hidden="true">{value <= rating ? "★" : "☆"}</span>
            <span className="kk-visually-hidden">{value} ดาว</span>
          </label>
        ))}
      </fieldset>
      <label>รีวิว<textarea rows={2} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="เล่าประสบการณ์สั้น ๆ" /></label>
      <button type="submit" className="kk-button" disabled={busy}>{busy ? "กำลังส่ง…" : "ส่งรีวิว"}</button>
    </form>
  );
}

function TravelerBookings({ userId, flash }: { userId: string; flash: Flash }) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([myBookings(userId), myReviews(userId)])
      .then(([rows, reviews]) => { setBookings(rows); setReviewed(new Set(reviews.map((r) => r.trip_id))); })
      .catch((e: Error) => setError(e.message));
  }, [userId]);
  useEffect(load, [load]);

  const cancel = async (booking: Booking) => {
    if (!window.confirm("ยืนยันยกเลิกการจองนี้?")) return;
    try {
      await setBookingStatus(booking.id, "cancelled", "ผู้จองยกเลิก");
      flash.ok("ยกเลิกการจองแล้ว");
      load();
    } catch (e) {
      flash.fail((e as Error).message);
    }
  };

  if (error) return <StateMessage tone="error" title="โหลดการจองไม่ได้">{error}</StateMessage>;
  if (!bookings) return <StateMessage tone="loading" title="กำลังโหลดการจอง…" />;
  if (!bookings.length) {
    return <StateMessage tone="empty" title="ยังไม่มีการจอง">ไปที่ “ค้นหาทริป” เพื่อเลือกทริปแรกของคุณ</StateMessage>;
  }
  return (
    <ul className="kk-cards">
      {bookings.map((booking) => (
        <li key={booking.id} className="kk-card">
          <div className="kk-card__top">
            <div>
              <strong>{booking.trip?.title ?? "ทริป"}</strong>
              <p className="kk-muted">{booking.trip ? `${booking.trip.destination} · ${formatDateTime(booking.trip.starts_at)}` : ""}</p>
            </div>
            <span className={`kk-status kk-status--${booking.status}`}>{bookingStatusLabel[booking.status]}</span>
          </div>
          <p>{booking.party_size} คน · {formatTHB(booking.total_price_thb)} <small className="kk-muted">(ชำระกับผู้จัดทริปโดยตรง ระบบไม่เก็บเงิน)</small></p>
          <div className="kk-actions">
            {(booking.status === "pending" || booking.status === "confirmed") && booking.trip && new Date(booking.trip.starts_at) > new Date()
              ? <button type="button" className="kk-button kk-button--ghost" onClick={() => cancel(booking)}>ยกเลิกการจอง</button> : null}
            <button type="button" className="kk-link-button" aria-expanded={openHistory === booking.id}
              onClick={() => setOpenHistory(openHistory === booking.id ? null : booking.id)}>ประวัติสถานะ</button>
          </div>
          {openHistory === booking.id ? <HistoryList bookingId={booking.id} /> : null}
          {booking.status === "completed" && !reviewed.has(booking.trip_id)
            ? <ReviewForm userId={userId} tripId={booking.trip_id} flash={flash} onDone={load} /> : null}
          {booking.status === "completed" && reviewed.has(booking.trip_id) ? <p className="kk-muted">✓ คุณรีวิวทริปนี้แล้ว</p> : null}
        </li>
      ))}
    </ul>
  );
}

// ---------------- Organizer ----------------

const emptyTrip = (type: TripType): TripInput => ({
  type, title: "", description: "", destination: DEFAULT_PROVINCE, province: DEFAULT_PROVINCE, area: "", meeting_point_url: null,
  starts_at: "", ends_at: null, price_thb: 1500, capacity: type === "buddy" ? 4 : 10, image_url: null, status: "draft",
});

function ItineraryEditor({ tripId, flash }: { tripId: string; flash: Flash }) {
  const [items, setItems] = useState<ItineraryItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getItinerary(tripId).then(setItems).catch((e: Error) => flash.fail(e.message)); }, [tripId]);

  if (!items) return <StateMessage tone="loading" title="กำลังโหลดแผนการเดินทาง…" />;
  const change = (index: number, patch: Partial<ItineraryItem>) => setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const save = async () => {
    setBusy(true);
    try {
      await saveItinerary(tripId, items.filter((item) => item.title.trim()));
      flash.ok("บันทึกแผนการเดินทางแล้ว");
    } catch (e) {
      flash.fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="kk-itinerary">
      <h4>แผนการเดินทาง</h4>
      {!items.length ? <p className="kk-muted">ยังไม่มีรายการ เพิ่มจุดแวะแรกได้เลย</p> : null}
      {items.map((item, index) => (
        <div key={index} className="kk-itinerary__row">
          <input aria-label={`เวลา จุดที่ ${index + 1}`} placeholder="09:00" maxLength={20} value={item.time_label} onChange={(e) => change(index, { time_label: e.target.value })} />
          <input aria-label={`ชื่อจุดที่ ${index + 1}`} placeholder="ชื่อจุดแวะ" maxLength={120} value={item.title} onChange={(e) => change(index, { title: e.target.value })} />
          <input aria-label={`รายละเอียด จุดที่ ${index + 1}`} placeholder="รายละเอียด" maxLength={1000} value={item.details} onChange={(e) => change(index, { details: e.target.value })} />
          <button type="button" className="kk-link-button" aria-label={`ลบจุดที่ ${index + 1}`} onClick={() => setItems(items.filter((_, i) => i !== index))}>ลบ</button>
        </div>
      ))}
      <div className="kk-actions">
        <button type="button" className="kk-button kk-button--ghost" disabled={items.length >= 30}
          onClick={() => setItems([...items, { time_label: "", title: "", details: "" }])}>+ เพิ่มจุดแวะ</button>
        <button type="button" className="kk-button" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึกแผน"}</button>
      </div>
    </div>
  );
}

function TripEditor({ userId, trip, allowedTypes, onSaved, onCancel, flash }: {
  userId: string; trip: TripRow | null; allowedTypes: TripType[]; onSaved: () => void; onCancel: () => void; flash: Flash;
}) {
  const [form, setForm] = useState<TripInput>(() => {
    if (!trip) return emptyTrip(allowedTypes[0]);
    const province = trip.province ?? toProvince(trip.destination) ?? DEFAULT_PROVINCE;
    return {
      type: trip.type, title: trip.title, description: trip.description, destination: province, province, area: trip.area,
      meeting_point_url: trip.meeting_point_url, starts_at: trip.starts_at, ends_at: trip.ends_at, price_thb: trip.price_thb,
      capacity: trip.capacity, image_url: trip.image_url, status: trip.status,
    };
  });
  const [busy, setBusy] = useState(false);
  const [mapsInput, setMapsInput] = useState(trip?.meeting_point_url ?? "");
  const set = (patch: Partial<TripInput>) => setForm((current) => ({ ...current, ...patch }));
  // Coordinates are read from the link by the database; this preview uses the same rules.
  const mapsUrl = mapsInput.trim() ? normalizeMapsUrl(mapsInput) : "";
  const mapsValid = !mapsUrl || isGoogleMapsUrl(mapsUrl);
  const mapsCoords = mapsUrl && mapsValid ? parseMapsCoords(mapsUrl) : null;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      set({ image_url: await uploadImage("trip-images", userId, file) });
      flash.ok("อัปโหลดรูปแล้ว อย่าลืมกดบันทึก");
    } catch (e) {
      flash.fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!mapsValid) {
      document.getElementById("trip-maps-url")?.focus();
      return;
    }
    const payload: TripInput = { ...form, destination: form.province ?? DEFAULT_PROVINCE, meeting_point_url: mapsUrl || null };
    setBusy(true);
    try {
      if (trip) {
        const { type: _type, ...editable } = payload;
        void _type;
        await updateTrip(trip.id, editable);
      } else {
        await createTrip(userId, payload);
      }
      flash.ok(trip ? "บันทึกทริปแล้ว" : "สร้างทริปแล้ว");
      onSaved();
    } catch (e) {
      flash.fail((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const maxCapacity = form.type === "buddy" ? 4 : 30;
  return (
    <form className="kk-form kk-panel" onSubmit={submit} aria-label={trip ? "แก้ไขทริป" : "สร้างทริปใหม่"}>
      <h3>{trip ? "แก้ไขทริป" : "สร้างทริปใหม่"}</h3>
      <div className="kk-form__grid">
        {!trip && allowedTypes.length > 1 ? (
          <label>ประเภท
            <select value={form.type} onChange={(e) => { const type = e.target.value as TripType; set({ type, capacity: Math.min(form.capacity, type === "buddy" ? 4 : 30) }); }}>
              <option value="buddy">Buddy (ไม่เกิน 4 คน)</option>
              <option value="guide">ไกด์ (ไม่เกิน 30 คน)</option>
            </select>
          </label>
        ) : null}
        <label className="kk-span-2">ชื่อทริป<input required minLength={3} maxLength={120} value={form.title} onChange={(e) => set({ title: e.target.value })} /></label>
        <label>จังหวัด
          <select required value={form.province ?? DEFAULT_PROVINCE} onChange={(e) => set({ province: e.target.value, destination: e.target.value })}>
            {REGIONS.map((region) => (
              <optgroup key={region} label={REGION_LABEL[region]}>
                {PROVINCES.filter((p) => p.region === region).map((p) => <option key={p.th} value={p.th}>{p.th}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label>ย่าน / ชื่อจุดนัด<input maxLength={80} placeholder="เช่น ประตูท่าแพ" value={form.area} onChange={(e) => set({ area: e.target.value })} /></label>
        <div className="kk-span-2 kk-maps-field">
          <label htmlFor="trip-maps-url">ลิงก์ Google Maps จุดนัดพบ <span className="kk-muted">(ไม่บังคับ)</span></label>
          <input id="trip-maps-url" type="url" inputMode="url" maxLength={500} autoComplete="off" spellCheck={false}
            placeholder="https://maps.app.goo.gl/… หรือ https://www.google.com/maps/…" value={mapsInput}
            aria-invalid={!mapsValid} aria-describedby="trip-maps-hint" onChange={(e) => setMapsInput(e.target.value)} />
          <p id="trip-maps-hint" className={mapsValid ? "kk-maps-field__hint" : "kk-form-error"} role={mapsValid ? undefined : "alert"}>
            {!mapsUrl ? "เปิด Google Maps → ปักหมุดจุดนัด → แชร์ → คัดลอกลิงก์ มาวางที่นี่ ไม่ต้องกรอกพิกัดเอง"
              : !mapsValid ? "ลิงก์นี้ไม่ใช่ Google Maps ใช้ลิงก์จาก google.com/maps หรือ maps.app.goo.gl"
              : mapsCoords ? `พบพิกัด ${mapsCoords.lat.toFixed(5)}, ${mapsCoords.lon.toFixed(5)} ทริปจะมีหมุดบนแผนที่`
              : "ไม่พบพิกัดในลิงก์นี้ (เช่น ลิงก์ย่อ) ทริปจะไม่มีหมุดบนแผนที่ แต่ผู้จองยังกดเปิดจุดนัดใน Google Maps ได้"}
          </p>
          {mapsUrl && mapsValid ? (
            <a className="kk-button kk-button--ghost kk-maps-field__open" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              ทดลองเปิดใน Google Maps <span aria-hidden="true">↗</span><span className="kk-visually-hidden"> (เปิดแท็บใหม่)</span>
            </a>
          ) : null}
        </div>
        <label>เริ่ม<input type="datetime-local" required value={toLocalInput(form.starts_at || null)} onChange={(e) => set({ starts_at: fromLocalInput(e.target.value) ?? "" })} /></label>
        <label>สิ้นสุด<input type="datetime-local" value={toLocalInput(form.ends_at)} onChange={(e) => set({ ends_at: fromLocalInput(e.target.value) })} /></label>
        <label>ราคา/คน (บาท)<input type="number" required min={0} max={200000} value={form.price_thb} onChange={(e) => set({ price_thb: Number(e.target.value) })} /></label>
        <label>จำนวนที่นั่ง<input type="number" required min={Math.max(1, trip?.seats_taken ?? 1)} max={maxCapacity} value={form.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} /></label>
        <label className="kk-span-2">รายละเอียด<textarea rows={4} maxLength={4000} value={form.description} onChange={(e) => set({ description: e.target.value })} /></label>
        <label>สถานะ
          <select value={form.status} onChange={(e) => set({ status: e.target.value as TripInput["status"] })}>
            <option value="draft">ฉบับร่าง (ยังไม่แสดง)</option>
            <option value="published">เผยแพร่</option>
            {trip ? <option value="cancelled">ยกเลิกทริป</option> : null}
          </select>
        </label>
        <div className="kk-upload">
          {form.image_url ? <img src={form.image_url} alt="" /> : null}
          <label className="kk-button kk-button--ghost">
            {form.image_url ? "เปลี่ยนรูปปก" : "อัปโหลดรูปปก"}
            <input type="file" accept={IMAGE_TYPES.join(",")} className="kk-visually-hidden" disabled={busy}
              onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <small className="kk-muted">JPG, PNG, WebP ไม่เกิน 5 MB</small>
        </div>
      </div>
      <div className="kk-actions">
        <button type="submit" className="kk-button" disabled={busy}>{busy ? "กำลังบันทึก…" : "บันทึกทริป"}</button>
        <button type="button" className="kk-button kk-button--ghost" onClick={onCancel}>ยกเลิก</button>
      </div>
    </form>
  );
}

const organizerActions: Partial<Record<BookingStatus, { status: BookingStatus; label: string }[]>> = {
  pending: [{ status: "confirmed", label: "ยืนยัน" }, { status: "rejected", label: "ปฏิเสธ" }],
  confirmed: [{ status: "completed", label: "ปิดทริป (จบแล้ว)" }, { status: "cancelled", label: "ยกเลิก" }],
};

function OrganizerTrips({ userId, allowedTypes, flash }: { userId: string; allowedTypes: TripType[]; flash: Flash }) {
  const [trips, setTrips] = useState<TripRow[] | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TripRow | "new" | null>(null);
  const [itineraryFor, setItineraryFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await myOrganizedTrips(userId);
      setTrips(rows);
      setBookings(rows.length ? await bookingsForTrips(rows.map((t) => t.id)) : []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId]);
  useEffect(() => { void load(); }, [load]);

  const changeBooking = async (booking: Booking, status: BookingStatus) => {
    const reason = status === "rejected" || status === "cancelled" ? window.prompt("เหตุผล (แจ้งผู้จอง)", "") : "";
    if (reason === null) return;
    try {
      await setBookingStatus(booking.id, status, reason);
      flash.ok(`อัปเดตเป็น “${bookingStatusLabel[status]}” แล้ว`);
      void load();
    } catch (e) {
      flash.fail((e as Error).message);
    }
  };

  const remove = async (trip: TripRow) => {
    if (!window.confirm(`ลบฉบับร่าง “${trip.title}”?`)) return;
    try {
      await deleteTrip(trip.id);
      flash.ok("ลบทริปแล้ว");
      void load();
    } catch (e) {
      flash.fail((e as Error).message);
    }
  };

  if (error) return <StateMessage tone="error" title="โหลดทริปที่คุณจัดไม่ได้">{error}</StateMessage>;
  if (!trips) return <StateMessage tone="loading" title="กำลังโหลดทริปที่คุณจัด…" />;

  return (
    <>
      {editing ? (
        <TripEditor userId={userId} trip={editing === "new" ? null : editing} allowedTypes={allowedTypes} flash={flash}
          onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />
      ) : (
        <button type="button" className="kk-button" onClick={() => setEditing("new")}>+ สร้างทริปใหม่</button>
      )}
      {!trips.length ? <StateMessage tone="empty" title="ยังไม่ได้สร้างทริป">เริ่มจากฉบับร่าง แล้วเผยแพร่เมื่อพร้อม</StateMessage> : (
        <ul className="kk-cards">
          {trips.map((trip) => {
            const tripBookings = bookings.filter((b) => b.trip_id === trip.id);
            return (
              <li key={trip.id} className="kk-card">
                <div className="kk-card__top">
                  <div>
                    <strong>{trip.title}</strong>
                    <p className="kk-muted">{trip.destination} · {formatDateTime(trip.starts_at)} · {formatTHB(trip.price_thb)}/คน</p>
                  </div>
                  <span className={`kk-status kk-status--${trip.status}`}>{tripStatusLabel[trip.status]}</span>
                </div>
                <p>จองแล้ว {trip.seats_taken}/{trip.capacity} ที่นั่ง</p>
                <div className="kk-actions">
                  <button type="button" className="kk-button kk-button--ghost" onClick={() => setEditing(trip)}>แก้ไข</button>
                  <button type="button" className="kk-link-button" aria-expanded={itineraryFor === trip.id}
                    onClick={() => setItineraryFor(itineraryFor === trip.id ? null : trip.id)}>แผนการเดินทาง</button>
                  {trip.status === "draft" && trip.seats_taken === 0 ? <button type="button" className="kk-link-button" onClick={() => remove(trip)}>ลบ</button> : null}
                </div>
                {itineraryFor === trip.id ? <ItineraryEditor tripId={trip.id} flash={flash} /> : null}
                {tripBookings.length ? (
                  <div className="kk-subtable">
                    <h4>คำขอจอง</h4>
                    <ul>
                      {tripBookings.map((booking) => (
                        <li key={booking.id}>
                          <span>{booking.traveler?.display_name || "ผู้จอง"} · {booking.party_size} คน{booking.note ? ` · “${booking.note}”` : ""}</span>
                          <span className={`kk-status kk-status--${booking.status}`}>{bookingStatusLabel[booking.status]}</span>
                          <span className="kk-actions">
                            {organizerActions[booking.status]?.map((action) => (
                              <button key={action.status} type="button" className="kk-link-button" onClick={() => changeBooking(booking, action.status)}>{action.label}</button>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function MyTripsContent() {
  const { session, profile, suspended } = useAuth();
  const flash = useFlash();
  if (!session || !profile) return null;
  const allowedTypes: TripType[] = profile.role === "admin" ? ["buddy", "guide"]
    : profile.provider_status === "approved" && (profile.role === "buddy" || profile.role === "guide") ? [profile.role] : [];

  return (
    <div className="kk-page">
      <div className="kk-page__head">
        <p className="kk-kicker">ทริปของฉัน</p>
        <h1>การจองและทริปที่คุณจัด</h1>
      </div>
      {flash.node}
      {suspended ? <StateMessage tone="denied" title="บัญชีถูกระงับ">ดูข้อมูลได้อย่างเดียว ทุกการแก้ไขจะถูกปฏิเสธ</StateMessage> : null}
      <section className="kk-section" aria-labelledby="bookings-title">
        <h2 id="bookings-title">การจองของฉัน</h2>
        <TravelerBookings userId={session.user.id} flash={flash} />
      </section>
      <section className="kk-section" aria-labelledby="organizer-title">
        <h2 id="organizer-title">ทริปที่ฉันจัด</h2>
        {allowedTypes.length ? <OrganizerTrips userId={session.user.id} allowedTypes={allowedTypes} flash={flash} />
          : <StateMessage tone="info" title="ยังสร้างทริปไม่ได้">ต้องได้รับอนุมัติเป็น Buddy หรือไกด์ก่อน ส่งคำขอได้ที่หน้า “บัญชี”</StateMessage>}
      </section>
    </div>
  );
}

export function MyTripsPage() {
  return (
    <div className="trip-product-page">
      <ProductHeader current="my-trips" />
      <main className="kk-main">
        <RequireAuth><MyTripsContent /></RequireAuth>
      </main>
    </div>
  );
}
