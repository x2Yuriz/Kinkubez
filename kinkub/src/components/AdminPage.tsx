import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  adminAuditLogs, adminListUsers, adminListVerifications, adminReports, adminResolveReport, adminReviewVerification, adminSetReviewHidden, adminSetRole,
  adminSetSuspended, adminSetTripStatus, adminTrips, allBookings, allReviews, bookingStatusLabel, formatDateTime, formatTHB,
  listPackages, providerStatusLabel, removeVerificationDocs, roleLabel, setBookingStatus, tripStatusLabel, updatePackage,
  verificationDocLabel, verificationDocUrl, verificationKindLabel, verificationRequestStatusLabel,
  type AdminUser, type AdminVerification, type AppRole, type AuditLog, type Booking, type BookingStatus, type PackageRow, type Report, type Review,
  type TripRow, type TripStatus, type VerificationRequestStatus,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import { ProductHeader, RequireAuth, StateMessage, useFlash } from "./ui";

type Flash = ReturnType<typeof useFlash>;
const TABS = [
  ["users", "ผู้ใช้และสิทธิ์"], ["verifications", "ยืนยันตัวตน"], ["trips", "ทริป"], ["bookings", "การจอง"], ["reviews", "รีวิว"],
  ["packages", "แพ็กเกจ"], ["reports", "รายงาน"], ["audit", "บันทึกการตรวจสอบ"],
] as const;
type Tab = (typeof TABS)[number][0];

/** Every privileged action needs a reason; it lands in audit_logs. */
const askReason = (label: string) => {
  const reason = window.prompt(`${label}\nเหตุผล (บันทึกใน audit log):`, "");
  return reason === null ? null : reason.trim();
};

/** Loads a list once and exposes reload; renders the Thai loading/error/empty states. */
function useList<T>(loader: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(() => { setError(""); loader().then(setRows).catch((e: Error) => setError(e.message)); }, [loader]);
  useEffect(reload, [reload]);
  const state = error ? <StateMessage tone="error" title="โหลดข้อมูลไม่ได้" action={<button type="button" className="kk-button" onClick={reload}>ลองใหม่</button>}>{error}</StateMessage>
    : !rows ? <StateMessage tone="loading" title="กำลังโหลด…" />
    : !rows.length ? <StateMessage tone="empty" title="ไม่มีข้อมูล" />
    : null;
  return { rows: rows ?? [], reload, state };
}

function act(flash: Flash, reload: () => void, task: () => Promise<unknown>, done: string) {
  task().then(() => { flash.ok(done); reload(); }).catch((e: Error) => flash.fail(e.message));
}

function UsersTab({ flash, selfId }: { flash: Flash; selfId: string }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const loader = useCallback(() => adminListUsers(query), [query]);
  const { rows, reload, state } = useList<AdminUser>(loader);
  const submit = (event: FormEvent) => { event.preventDefault(); setQuery(search.trim()); };

  const setRole = (user: AdminUser, role: AppRole) => {
    const reason = askReason(`เปลี่ยน ${user.email} เป็น ${roleLabel[role]}`);
    if (reason !== null) act(flash, reload, () => adminSetRole(user.id, role, reason), "เปลี่ยนบทบาทแล้ว");
  };
  const suspend = (user: AdminUser) => {
    const reason = askReason(`${user.is_suspended ? "ยกเลิกระงับ" : "ระงับ"} ${user.email}`);
    if (reason !== null) act(flash, reload, () => adminSetSuspended(user.id, !user.is_suspended, reason), user.is_suspended ? "ยกเลิกการระงับแล้ว" : "ระงับบัญชีแล้ว");
  };

  return (
    <>
      <form className="kk-toolbar" role="search" onSubmit={submit}>
        <label className="kk-visually-hidden" htmlFor="user-search">ค้นหาผู้ใช้</label>
        <input id="user-search" type="search" placeholder="ค้นหาอีเมลหรือชื่อ" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button type="submit" className="kk-button">ค้นหา</button>
      </form>
      {state ?? (
        <div className="kk-table-wrap" tabIndex={0} aria-label="ตารางผู้ใช้">
          <table className="kk-table">
            <thead><tr><th>ผู้ใช้</th><th>บทบาท</th><th>คำขอผู้ให้บริการ</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.display_name || "—"}</strong><br /><small className="kk-muted">{user.email}</small></td>
                  <td>
                    <select aria-label={`บทบาทของ ${user.email}`} value={user.role} disabled={user.id === selfId}
                      onChange={(e) => setRole(user, e.target.value as AppRole)}>
                      {(Object.keys(roleLabel) as AppRole[]).map((role) => <option key={role} value={role}>{roleLabel[role]}</option>)}
                    </select>
                  </td>
                  <td>
                    {providerStatusLabel[user.provider_status]}{user.requested_role ? ` (${roleLabel[user.requested_role]})` : ""}
                    {user.provider_status === "pending" ? <><br /><small className="kk-muted">ตรวจที่แท็บยืนยันตัวตน</small></> : null}
                  </td>
                  <td>{user.is_suspended ? <span className="kk-status kk-status--rejected">ถูกระงับ</span> : <span className="kk-status kk-status--confirmed">ปกติ</span>}</td>
                  <td>{user.id === selfId ? <small className="kk-muted">บัญชีของคุณ</small>
                    : <button type="button" className="kk-link-button" onClick={() => suspend(user)}>{user.is_suspended ? "ยกเลิกระงับ" : "ระงับ"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const REQUEST_TONE: Record<VerificationRequestStatus, string> = { pending: "pending", approved: "confirmed", rejected: "rejected", withdrawn: "cancelled" };

/** Document review queue. Files are private; each view uses a 60-second signed URL and files are deleted after the decision. */
function VerificationsTab({ flash }: { flash: Flash }) {
  const [filter, setFilter] = useState<VerificationRequestStatus | "all">("pending");
  const loader = useCallback(() => adminListVerifications(filter === "all" ? null : filter), [filter]);
  const { rows, reload, state } = useList<AdminVerification>(loader);
  const [busy, setBusy] = useState("");

  const view = async (path: string) => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const win = window.open("", "_blank");
    if (win) win.opener = null;
    try {
      const url = await verificationDocUrl(path);
      if (win) win.location.href = url; else window.location.assign(url);
    } catch (error) {
      win?.close();
      flash.fail((error as Error).message);
    }
  };

  const decide = async (row: AdminVerification, approve: boolean) => {
    const reason = askReason(`${approve ? "อนุมัติ" : "ไม่อนุมัติ"}${verificationKindLabel[row.kind]} ของ ${row.email}${approve ? "" : " (ต้องระบุเหตุผล ผู้ใช้จะเห็นข้อความนี้)"}`);
    if (reason === null) return;
    if (!approve && !reason) { flash.fail("ระบุเหตุผลที่ไม่อนุมัติ"); return; }
    setBusy(row.id);
    try {
      const paths = await adminReviewVerification(row.id, approve, reason);
      try {
        await removeVerificationDocs(paths);
        flash.ok(approve ? "อนุมัติแล้ว และลบเอกสารแล้ว" : "ไม่อนุมัติ และลบเอกสารแล้ว");
      } catch {
        flash.fail("บันทึกผลแล้ว แต่ลบไฟล์เอกสารไม่สำเร็จ ลบเองใน Supabase Storage (verification-docs)");
      }
      reload();
    } catch (error) {
      flash.fail((error as Error).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="kk-toolbar">
        <label htmlFor="verify-filter">แสดง</label>
        <select id="verify-filter" value={filter} onChange={(e) => setFilter(e.target.value as VerificationRequestStatus | "all")}>
          <option value="pending">รอตรวจ</option>
          <option value="all">ทั้งหมด</option>
          <option value="approved">{verificationRequestStatusLabel.approved}</option>
          <option value="rejected">{verificationRequestStatusLabel.rejected}</option>
        </select>
      </div>
      {state ?? (
        <ul className="kk-cards">
          {rows.map((row) => (
            <li key={row.id} className="kk-card">
              <div className="kk-card__top">
                <strong>{verificationKindLabel[row.kind]} · {row.display_name || row.email}</strong>
                <span className={`kk-status kk-status--${REQUEST_TONE[row.status]}`}>{verificationRequestStatusLabel[row.status]}</span>
              </div>
              <p>
                {row.email} · บทบาทปัจจุบัน {roleLabel[row.role]}<br />
                ชื่อตามเอกสาร <strong>{row.legal_name}</strong> · {verificationDocLabel[row.document_type]}
              </p>
              {row.note ? <p className="kk-muted">หมายเหตุผู้ใช้: {row.note}</p> : null}
              {row.reviewer_note ? <p className="kk-muted">เหตุผลผู้ดูแล: {row.reviewer_note}</p> : null}
              <small className="kk-muted">ส่งเมื่อ {formatDateTime(row.created_at)}{row.reviewed_at ? ` · ตรวจเมื่อ ${formatDateTime(row.reviewed_at)}` : ""}</small>
              {row.status === "pending" ? (
                <>
                  <div className="kk-actions" aria-label="เอกสาร">
                    {row.document_paths.map((path, index) => (
                      <button key={path} type="button" className="kk-link-button" onClick={() => view(path)}>เปิดเอกสาร {index + 1}</button>
                    ))}
                  </div>
                  <div className="kk-actions">
                    <button type="button" className="kk-button" disabled={busy === row.id} onClick={() => decide(row, true)}>{busy === row.id ? "กำลังบันทึก…" : "อนุมัติ"}</button>
                    <button type="button" className="kk-button kk-button--ghost" disabled={busy === row.id} onClick={() => decide(row, false)}>ไม่อนุมัติ</button>
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TripsTab({ flash }: { flash: Flash }) {
  const { rows, reload, state } = useList<TripRow>(adminTrips);
  const change = (trip: TripRow, status: TripStatus) => {
    const reason = askReason(`เปลี่ยน “${trip.title}” เป็น ${tripStatusLabel[status]}`);
    if (reason !== null) act(flash, reload, () => adminSetTripStatus(trip.id, status, reason), "อัปเดตทริปแล้ว");
  };
  return state ?? (
    <div className="kk-table-wrap" tabIndex={0} aria-label="ตารางทริป">
      <table className="kk-table">
        <thead><tr><th>ทริป</th><th>ผู้จัด</th><th>วันที่</th><th>ที่นั่ง</th><th>สถานะ</th></tr></thead>
        <tbody>
          {rows.map((trip) => (
            <tr key={trip.id}>
              <td><strong>{trip.title}</strong>{trip.is_sample ? <span className="kk-chip">ตัวอย่าง</span> : null}<br /><small className="kk-muted">{trip.destination} · {formatTHB(trip.price_thb)}</small></td>
              <td>{trip.organizer?.display_name || "—"}</td>
              <td>{formatDateTime(trip.starts_at)}</td>
              <td>{trip.seats_taken}/{trip.capacity}</td>
              <td>
                <select aria-label={`สถานะ ${trip.title}`} value={trip.status} onChange={(e) => change(trip, e.target.value as TripStatus)}>
                  {(Object.keys(tripStatusLabel) as TripStatus[]).map((s) => <option key={s} value={s}>{tripStatusLabel[s]}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const nextStatuses: Partial<Record<BookingStatus, BookingStatus[]>> = { pending: ["confirmed", "rejected", "cancelled"], confirmed: ["completed", "cancelled"] };

function BookingsTab({ flash }: { flash: Flash }) {
  const { rows, reload, state } = useList<Booking>(allBookings);
  const change = (booking: Booking, status: BookingStatus) => {
    const reason = askReason(`เปลี่ยนการจองเป็น ${bookingStatusLabel[status]}`);
    if (reason !== null) act(flash, reload, () => setBookingStatus(booking.id, status, reason), "อัปเดตการจองแล้ว");
  };
  return state ?? (
    <div className="kk-table-wrap" tabIndex={0} aria-label="ตารางการจอง">
      <table className="kk-table">
        <thead><tr><th>ทริป</th><th>ผู้จอง</th><th>จำนวน</th><th>ยอด</th><th>สถานะ</th><th>เปลี่ยน</th></tr></thead>
        <tbody>
          {rows.map((booking) => (
            <tr key={booking.id}>
              <td>{booking.trip?.title ?? "—"}<br /><small className="kk-muted">{formatDateTime(booking.created_at)}</small></td>
              <td>{booking.traveler?.display_name || "—"}</td>
              <td>{booking.party_size}</td>
              <td>{formatTHB(booking.total_price_thb)}</td>
              <td><span className={`kk-status kk-status--${booking.status}`}>{bookingStatusLabel[booking.status]}</span></td>
              <td className="kk-actions">
                {nextStatuses[booking.status]?.map((s) => <button key={s} type="button" className="kk-link-button" onClick={() => change(booking, s)}>{bookingStatusLabel[s]}</button>) ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewsTab({ flash }: { flash: Flash }) {
  const { rows, reload, state } = useList<Review>(allReviews);
  const toggle = (review: Review) => {
    const reason = askReason(review.is_hidden ? "แสดงรีวิวนี้อีกครั้ง" : "ซ่อนรีวิวนี้");
    if (reason !== null) act(flash, reload, () => adminSetReviewHidden(review.id, !review.is_hidden, reason), review.is_hidden ? "แสดงรีวิวแล้ว" : "ซ่อนรีวิวแล้ว");
  };
  return state ?? (
    <ul className="kk-cards">
      {rows.map((review) => (
        <li key={review.id} className={`kk-card${review.is_hidden ? " is-muted" : ""}`}>
          <div className="kk-card__top">
            <strong>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)} · {review.reviewer_name || "ผู้ใช้"}</strong>
            <button type="button" className="kk-link-button" onClick={() => toggle(review)}>{review.is_hidden ? "แสดง" : "ซ่อน"}</button>
          </div>
          <p>{review.body || <span className="kk-muted">(ไม่มีข้อความ)</span>}</p>
          <small className="kk-muted">{formatDateTime(review.created_at)}{review.is_hidden ? " · ซ่อนอยู่" : ""}</small>
        </li>
      ))}
    </ul>
  );
}

function PackageEditor({ row, flash, reload }: { row: PackageRow; flash: Flash; reload: () => void }) {
  const [form, setForm] = useState(row);
  const save = (event: FormEvent) => {
    event.preventDefault();
    const { id: _id, ...input } = form;
    void _id;
    act(flash, reload, () => updatePackage(row.id, input), "บันทึกแพ็กเกจแล้ว");
  };
  return (
    <form className="kk-card kk-form" onSubmit={save} aria-label={`แพ็กเกจ ${row.title}`}>
      <div className="kk-form__grid">
        <label>ป้าย<input maxLength={30} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} /></label>
        <label>ราคา (บาท)<input type="number" min={0} max={500000} value={form.price_thb} onChange={(e) => setForm({ ...form, price_thb: Number(e.target.value) })} /></label>
        <label className="kk-span-2">ชื่อ<input required minLength={2} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="kk-span-2">รายละเอียด<input maxLength={200} value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} /></label>
        <label className="kk-check"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> เผยแพร่</label>
      </div>
      <button type="submit" className="kk-button">บันทึก</button>
    </form>
  );
}

function PackagesTab({ flash }: { flash: Flash }) {
  const { rows, reload, state } = useList<PackageRow>(listPackages);
  return state ?? <div className="kk-cards kk-cards--grid">{rows.map((row) => <PackageEditor key={row.id} row={row} flash={flash} reload={reload} />)}</div>;
}

function ReportsTab({ flash }: { flash: Flash }) {
  const { rows, reload, state } = useList<Report>(adminReports);
  const resolve = (report: Report, status: "resolved" | "dismissed") => {
    const note = askReason(status === "resolved" ? "ปิดรายงาน (ดำเนินการแล้ว)" : "ยกเลิกรายงาน");
    if (note !== null) act(flash, reload, () => adminResolveReport(report.id, status, note), "อัปเดตรายงานแล้ว");
  };
  const targetLabel = { trip: "ทริป", review: "รีวิว", profile: "โปรไฟล์" } as const;
  return state ?? (
    <ul className="kk-cards">
      {rows.map((report) => (
        <li key={report.id} className="kk-card">
          <div className="kk-card__top">
            <strong>{targetLabel[report.target_type]} · <code>{report.target_id.slice(0, 8)}</code></strong>
            <span className={`kk-status kk-status--${report.status === "open" ? "pending" : "completed"}`}>{report.status === "open" ? "รอตรวจ" : report.status === "resolved" ? "ดำเนินการแล้ว" : "ยกเลิก"}</span>
          </div>
          <p>{report.reason}</p>
          {report.resolution_note ? <p className="kk-muted">หมายเหตุ: {report.resolution_note}</p> : null}
          <small className="kk-muted">{formatDateTime(report.created_at)}</small>
          {report.status === "open" ? (
            <div className="kk-actions">
              <button type="button" className="kk-button" onClick={() => resolve(report, "resolved")}>ดำเนินการแล้ว</button>
              <button type="button" className="kk-button kk-button--ghost" onClick={() => resolve(report, "dismissed")}>ยกเลิกรายงาน</button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AuditTab() {
  const { rows, state } = useList<AuditLog>(adminAuditLogs);
  return state ?? (
    <div className="kk-table-wrap" tabIndex={0} aria-label="ตารางบันทึกการตรวจสอบ">
      <table className="kk-table">
        <thead><tr><th>เวลา</th><th>การกระทำ</th><th>เป้าหมาย</th><th>รายละเอียด</th></tr></thead>
        <tbody>
          {rows.map((log) => (
            <tr key={log.id}>
              <td>{formatDateTime(log.created_at)}</td>
              <td><code>{log.action}</code></td>
              <td>{log.target_table}{log.target_id ? <><br /><small className="kk-muted">{log.target_id.slice(0, 8)}</small></> : null}</td>
              <td><code className="kk-json">{JSON.stringify(log.details)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminContent() {
  const { session } = useAuth();
  const flash = useFlash();
  const [tab, setTab] = useState<Tab>("users");

  // Arrow-key navigation per the WAI-ARIA tabs pattern.
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex(([id]) => id === tab);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length][0];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className="kk-page">
      <div className="kk-page__head">
        <p className="kk-kicker">ผู้ดูแลระบบ</p>
        <h1>แผงควบคุม</h1>
        <p className="kk-muted">ทุกการเปลี่ยนแปลงทำผ่านฟังก์ชันฝั่งฐานข้อมูลที่ตรวจสิทธิ์ซ้ำ และบันทึกใน audit log</p>
      </div>
      {flash.node}
      <div className="kk-tabs" role="tablist" aria-label="หมวดผู้ดูแล" onKeyDown={onKey}>
        {TABS.map(([id, label]) => (
          <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="kk-tabpanel">
        {tab === "users" ? <UsersTab flash={flash} selfId={session?.user.id ?? ""} />
          : tab === "verifications" ? <VerificationsTab flash={flash} />
          : tab === "trips" ? <TripsTab flash={flash} />
          : tab === "bookings" ? <BookingsTab flash={flash} />
          : tab === "reviews" ? <ReviewsTab flash={flash} />
          : tab === "packages" ? <PackagesTab flash={flash} />
          : tab === "reports" ? <ReportsTab flash={flash} />
          : <AuditTab />}
      </section>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="trip-product-page">
      <ProductHeader current="admin" />
      <main className="kk-main">
        <RequireAuth admin><AdminContent /></RequireAuth>
      </main>
    </div>
  );
}
