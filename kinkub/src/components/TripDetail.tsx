import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import {
  createBooking, formatDateTime, formatTHB, getItinerary, submitReport, tripReviews,
  type ItineraryItem, type Review, type TripRow,
} from "../lib/api";
import { currentPath, navigate } from "../lib/router";
import { StateMessage } from "./ui";

type Props = { trip: TripRow; partySize: number; onClose: () => void; onBooked: () => void };

/** Trip detail + booking request. Capacity, price and eligibility are re-checked by create_booking in the database. */
export default function TripDetail({ trip, partySize, onClose, onBooked }: Props) {
  const { session, suspended } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[] | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const seatsLeft = trip.capacity - trip.seats_taken;
  const [size, setSize] = useState(Math.min(Math.max(partySize, 1), Math.max(seatsLeft, 1)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    Promise.all([getItinerary(trip.id), tripReviews(trip.id)])
      .then(([items, rows]) => { setItinerary(items); setReviews(rows); })
      .catch((error: Error) => setLoadError(error.message));
  }, [trip.id]);

  const isOwn = session?.user.id === trip.organizer_id;

  const book = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(currentPath())}`);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      await createBooking(trip.id, size, note.trim());
      setResult({ tone: "success", text: "ส่งคำขอจองแล้ว รอผู้จัดทริปยืนยัน ติดตามสถานะได้ที่ “ทริปของฉัน”" });
      onBooked();
    } catch (error) {
      setResult({ tone: "error", text: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const report = async () => {
    if (!session) {
      navigate(`/login?next=${encodeURIComponent(currentPath())}`);
      return;
    }
    const reason = window.prompt("แจ้งปัญหาทริปนี้ (เช่น ข้อมูลไม่ตรง เนื้อหาไม่เหมาะสม)", "");
    if (!reason?.trim()) return;
    try {
      await submitReport(session.user.id, "trip", trip.id, reason.trim());
      setResult({ tone: "success", text: "ส่งรายงานถึงผู้ดูแลแล้ว ขอบคุณที่ช่วยดูแลชุมชน" });
    } catch (error) {
      setResult({ tone: "error", text: (error as Error).message });
    }
  };

  return (
    <dialog ref={dialogRef} className="kk-dialog" aria-labelledby="trip-detail-title" onClose={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
      <div className="kk-dialog__body">
        <button type="button" className="kk-dialog__close" aria-label="ปิด" onClick={onClose}>×</button>
        {trip.image_url ? <img className="kk-dialog__image" src={trip.image_url} alt="" /> : null}
        <p className="kk-kicker">{trip.type === "buddy" ? "Buddy · กลุ่มเล็ก" : "ไกด์ท้องถิ่น"}{trip.is_sample ? " · ข้อมูลตัวอย่าง" : ""}</p>
        <h2 id="trip-detail-title">{trip.title}</h2>
        <p className="kk-muted">
          {trip.destination}{trip.area ? ` · ${trip.area}` : ""} · {formatDateTime(trip.starts_at)} · โดย {trip.organizer?.display_name || "ผู้จัดทริป"}
        </p>
        {trip.description ? <p className="kk-prose">{trip.description}</p> : null}

        <h3>แผนการเดินทาง</h3>
        {loadError ? <StateMessage tone="error" title="โหลดรายละเอียดไม่ได้">{loadError}</StateMessage>
          : !itinerary ? <StateMessage tone="loading" title="กำลังโหลด…" />
          : !itinerary.length ? <p className="kk-muted">ผู้จัดยังไม่ได้ใส่แผนการเดินทาง</p>
          : (
            <ol className="kk-timeline">
              {itinerary.map((item) => (
                <li key={item.id ?? item.position}><strong>{item.time_label ? `${item.time_label} · ` : ""}{item.title}</strong>{item.details ? <p>{item.details}</p> : null}</li>
              ))}
            </ol>
          )}

        <h3>รีวิว {reviews?.length ? `(${reviews.length})` : ""}</h3>
        {reviews && !reviews.length ? <p className="kk-muted">ยังไม่มีรีวิว รีวิวได้เฉพาะผู้ที่ร่วมทริปจนจบเท่านั้น</p> : null}
        {reviews?.length ? (
          <ul className="kk-list">
            {reviews.map((review) => (
              <li key={review.id}>
                <strong aria-label={`${review.rating} จาก 5 ดาว`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</strong> {review.reviewer_name || "ผู้ร่วมทริป"}
                {review.body ? <p>{review.body}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}

        <form className="kk-booking" onSubmit={book}>
          <div className="kk-booking__price">
            <strong>{formatTHB(trip.price_thb)}</strong><small> / คน</small>
            <span className="kk-muted">เหลือ {seatsLeft} ที่</span>
          </div>
          {isOwn ? <p className="kk-muted">นี่คือทริปของคุณ จัดการได้ที่ “ทริปของฉัน”</p> : seatsLeft <= 0 ? (
            <StateMessage tone="empty" title="ทริปนี้เต็มแล้ว" />
          ) : (
            <>
              <label>จำนวนคน
                <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
                  {Array.from({ length: Math.min(seatsLeft, 10) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} คน</option>)}
                </select>
              </label>
              <label>ข้อความถึงผู้จัด <small>(ไม่บังคับ)</small>
                <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <p className="kk-muted">รวม {formatTHB(trip.price_thb * size)} · ยังไม่มีการชำระเงินในระบบ</p>
              <button type="submit" className="kk-button" disabled={busy || suspended}>
                {busy ? "กำลังส่ง…" : session ? "ส่งคำขอจอง" : "เข้าสู่ระบบเพื่อจอง"}
              </button>
            </>
          )}
          {result ? <StateMessage tone={result.tone} title={result.tone === "success" ? "สำเร็จ" : "ทำรายการไม่สำเร็จ"}>{result.text}</StateMessage> : null}
        </form>
        <button type="button" className="kk-link-button" onClick={report}>รายงานทริปนี้</button>
      </div>
    </dialog>
  );
}
