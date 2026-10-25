import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import {
  formatDateTime, IMAGE_TYPES, markNotificationsRead, myNotifications, myVerifications, removeVerificationDocs, roleLabel,
  submitVerification, updateProfile, uploadImage, uploadVerificationDoc, verificationDocLabel, verificationKindLabel,
  verificationRequestStatusLabel, verificationStatusLabel, VERIFICATION_TYPES, withdrawVerification,
  type AppNotification, type Profile, type VerificationDocType, type VerificationKind, type VerificationRequest, type VerificationStatus,
} from "../lib/api";
import { navigate } from "../lib/router";
import { Avatar, ProductHeader, RequireAuth, StateMessage, useFlash } from "./ui";

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

type Flash = ReturnType<typeof useFlash>;
const STATUS_TONE: Record<VerificationStatus, string> = { unverified: "cancelled", pending: "pending", approved: "confirmed", rejected: "rejected" };
const REQUEST_TONE: Record<VerificationRequest["status"], string> = { pending: "pending", approved: "confirmed", rejected: "rejected", withdrawn: "cancelled" };
const EMPTY_FORM = { kind: "" as VerificationKind | "", legalName: "", documentType: "national_id" as VerificationDocType, note: "", consent: false };

/** Identity check for travelers and provider applications; documents go to the private bucket and are deleted after review. */
function VerificationPanel({ profile, userId, suspended, flash, refreshProfile }: {
  profile: Profile; userId: string; suspended: boolean; flash: Flash; refreshProfile: () => Promise<unknown>;
}) {
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState<File[]>([]);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = () => { setLoadError(""); myVerifications().then(setRequests).catch((error: Error) => setLoadError(error.message)); };
  useEffect(load, []);

  const pending = requests?.filter((request) => request.status === "pending") ?? [];
  const providerPending = pending.some((request) => request.kind !== "identity");
  const kinds = (Object.keys(verificationKindLabel) as VerificationKind[]).filter((option) =>
    profile.role !== "admin"
    && (option === "identity"
      ? profile.identity_status !== "approved" && !pending.some((request) => request.kind === "identity")
      : profile.role !== option && !providerPending));
  const kind = form.kind && kinds.includes(form.kind) ? form.kind : kinds[0];
  const docTypes = (Object.keys(verificationDocLabel) as VerificationDocType[]).filter((type) => type !== "tour_guide_license" || kind === "guide");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    if (!files.length || files.length > 3) { flash.fail("แนบเอกสาร 1–3 ไฟล์"); return; }
    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) uploaded.push(await uploadVerificationDoc(userId, file));
      await submitVerification({ kind, legalName: form.legalName.trim(), documentType: form.documentType, paths: uploaded, note: form.note.trim() });
      setForm(EMPTY_FORM);
      setFiles([]);
      setFileKey((value) => value + 1);
      flash.ok("ส่งคำขอแล้ว ผู้ดูแลจะตรวจเอกสารและแจ้งผลทางการแจ้งเตือน");
      load();
      await refreshProfile();
    } catch (error) {
      // No request references these files, so remove them.
      await removeVerificationDocs(uploaded).catch(() => undefined);
      flash.fail((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (request: VerificationRequest) => {
    if (!window.confirm("ถอนคำขอนี้และลบเอกสารที่แนบไว้?")) return;
    try {
      const paths = await withdrawVerification(request.id);
      await removeVerificationDocs(paths).catch(() => undefined);
      flash.ok("ถอนคำขอแล้ว");
      load();
      await refreshProfile();
    } catch (error) {
      flash.fail((error as Error).message);
    }
  };

  const isProvider = profile.role === "buddy" || profile.role === "guide";

  return (
    <section className="kk-panel" aria-labelledby="verify-title">
      <div className="kk-panel__bar">
        <h2 id="verify-title">ยืนยันตัวตน</h2>
        <span className={`kk-status kk-status--${STATUS_TONE[profile.identity_status]}`}>{verificationStatusLabel[profile.identity_status]}</span>
      </div>
      {profile.identity_status === "approved" && profile.identity_verified_at
        ? <p className="kk-muted">ผู้ดูแลตรวจเอกสารแล้วเมื่อ {formatDateTime(profile.identity_verified_at)}</p>
        : <p className="kk-muted">สถานะจะเปลี่ยนเป็น “ยืนยันตัวตนแล้ว” หลังผู้ดูแลระบบตรวจเอกสารเท่านั้น Buddy และไกด์ต้องผ่านขั้นตอนนี้ก่อนเปิดทริป</p>}

      {isProvider ? (
        <StateMessage tone="success" title={`คุณเป็น${roleLabel[profile.role]}แล้ว`} action={<button type="button" className="kk-button" onClick={() => navigate("/my-trips")}>สร้างทริป</button>}>
          สร้างและจัดการทริปได้ที่หน้า “ทริปของฉัน”
        </StateMessage>
      ) : null}

      {loadError ? <StateMessage tone="error" title="โหลดคำขอไม่ได้" action={<button type="button" className="kk-button" onClick={load}>ลองใหม่</button>}>{loadError}</StateMessage>
        : !requests ? <StateMessage tone="loading" title="กำลังโหลดคำขอ…" />
        : requests.length ? (
          <ul className="kk-list" aria-label="คำขอของฉัน">
            {requests.map((request) => (
              <li key={request.id}>
                <strong>{verificationKindLabel[request.kind]}</strong>{" "}
                <span className={`kk-status kk-status--${REQUEST_TONE[request.status]}`}>{verificationRequestStatusLabel[request.status]}</span>
                <p>{verificationDocLabel[request.document_type]} · ส่งเมื่อ {formatDateTime(request.created_at)}</p>
                {request.reviewer_note ? <p>หมายเหตุจากผู้ดูแล: {request.reviewer_note}</p> : null}
                {request.status === "pending"
                  ? <button type="button" className="kk-link-button" disabled={suspended} onClick={() => withdraw(request)}>ถอนคำขอ</button> : null}
              </li>
            ))}
          </ul>
        ) : null}

      {profile.role === "admin" ? <p className="kk-muted">บัญชีผู้ดูแลระบบไม่ต้องยื่นคำขอ</p>
        : !requests || !kind ? null : (
          <form className="kk-form" onSubmit={submit}>
            <label>ประเภทคำขอ
              <select value={kind} onChange={(e) => setForm({ ...form, kind: e.target.value as VerificationKind, documentType: "national_id" })}>
                {kinds.map((option) => <option key={option} value={option}>{verificationKindLabel[option]}</option>)}
              </select>
            </label>
            {kind !== "identity" ? <small className="kk-muted">Buddy พาเที่ยวแบบเพื่อน (กลุ่มไม่เกิน 4 คน) ไกด์รับกลุ่มใหญ่ได้ถึง 30 คน เมื่ออนุมัติจะถือว่ายืนยันตัวตนแล้วด้วย</small> : null}
            <label>ชื่อ-นามสกุลตามเอกสาร
              <input value={form.legalName} required minLength={2} maxLength={120} autoComplete="name" onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </label>
            <label>ประเภทเอกสาร
              <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value as VerificationDocType })}>
                {docTypes.map((type) => <option key={type} value={type}>{verificationDocLabel[type]}</option>)}
              </select>
            </label>
            <label>ไฟล์เอกสาร <small>(1–3 ไฟล์ JPG, PNG, WebP หรือ PDF ไม่เกิน 5 MB)</small>
              <input key={fileKey} type="file" multiple required accept={VERIFICATION_TYPES.join(",")}
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </label>
            <small className="kk-muted">ปิดข้อมูลที่ไม่จำเป็นได้ (เช่น ศาสนา หมู่เลือด) แต่ต้องเห็นชื่อ รูปหน้า และวันหมดอายุชัดเจน</small>
            <label>หมายเหตุถึงผู้ดูแล <small>(ไม่บังคับ)</small>
              <textarea value={form.note} maxLength={500} rows={2} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
            <label className="kk-check">
              <input type="checkbox" required checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
              ยินยอมให้ผู้ดูแลระบบใช้เอกสารนี้เพื่อยืนยันตัวตนเท่านั้น เอกสารจะถูกลบหลังพิจารณาเสร็จ
            </label>
            <button type="submit" className="kk-button" disabled={busy || suspended}>{busy ? "กำลังส่งเอกสาร…" : "ส่งคำขอยืนยันตัวตน"}</button>
          </form>
        )}
    </section>
  );
}

function AccountContent() {
  const { profile, session, suspended, refreshProfile } = useAuth();
  const flash = useFlash();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    display_name: profile?.display_name ?? "",
    bio: profile?.bio ?? "",
    interests: profile?.interests.join(", ") ?? "",
    languages: profile?.languages.join(", ") ?? "",
    service_area: profile?.service_area ?? "",
  });
  const [notes, setNotes] = useState<AppNotification[] | null>(null);
  const [notesError, setNotesError] = useState("");

  useEffect(() => {
    myNotifications().then(setNotes).catch((error: Error) => setNotesError(error.message));
  }, []);

  if (!profile || !session) return null;
  const userId = session.user.id;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfile(userId, {
        display_name: form.display_name.trim(),
        bio: form.bio.trim(),
        interests: splitList(form.interests),
        languages: splitList(form.languages),
        service_area: form.service_area.trim(),
      });
      await refreshProfile();
      flash.ok("บันทึกโปรไฟล์แล้ว");
    } catch (error) {
      flash.fail((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage("avatars", userId, file);
      await updateProfile(userId, { avatar_url: url });
      await refreshProfile();
      flash.ok("เปลี่ยนรูปโปรไฟล์แล้ว");
    } catch (error) {
      flash.fail((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const readAll = async () => {
    try {
      await markNotificationsRead();
      setNotes((current) => current?.map((note) => ({ ...note, read_at: note.read_at ?? new Date().toISOString() })) ?? null);
    } catch (error) {
      flash.fail((error as Error).message);
    }
  };

  const unread = notes?.filter((note) => !note.read_at).length ?? 0;

  return (
    <div className="kk-page">
      <div className="kk-page__head">
        <p className="kk-kicker">บัญชีของฉัน</p>
        <h1>สวัสดี {profile.display_name || "นักเดินทาง"}</h1>
        <p className="kk-muted">{session.user.email} · {roleLabel[profile.role]}</p>
      </div>
      {flash.node}
      {suspended ? <StateMessage tone="denied" title="บัญชีนี้ถูกระงับชั่วคราว">คุณยังดูข้อมูลได้ แต่แก้ไขหรือจองไม่ได้ ติดต่อผู้ดูแลระบบหากคิดว่าผิดพลาด</StateMessage> : null}

      <div className="kk-grid-2">
        <section className="kk-panel" aria-labelledby="profile-title">
          <h2 id="profile-title">โปรไฟล์</h2>
          <div className="kk-avatar-row">
            <Avatar name={profile.display_name || "?"} url={profile.avatar_url} size={64} />
            <label className="kk-button kk-button--ghost">
              {uploading ? "กำลังอัปโหลด…" : "เปลี่ยนรูป"}
              <input type="file" accept={IMAGE_TYPES.join(",")} className="kk-visually-hidden" disabled={uploading || suspended}
                onChange={(event) => { void changeAvatar(event.target.files?.[0]); event.target.value = ""; }} />
            </label>
            <small className="kk-muted">JPG, PNG, WebP ไม่เกิน 2 MB</small>
          </div>
          <form className="kk-form" onSubmit={save}>
            <label>ชื่อที่แสดง<input value={form.display_name} maxLength={80} required onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
            <label>แนะนำตัว<textarea value={form.bio} maxLength={1000} rows={3} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
            <label>ความสนใจ <small>(คั่นด้วยจุลภาค)</small><input value={form.interests} placeholder="สตรีทฟู้ด, คาเฟ่, ธรรมชาติ" onChange={(e) => setForm({ ...form, interests: e.target.value })} /></label>
            <label>ภาษาที่ใช้ได้ <small>(คั่นด้วยจุลภาค)</small><input value={form.languages} placeholder="ไทย, English" onChange={(e) => setForm({ ...form, languages: e.target.value })} /></label>
            <label>พื้นที่ให้บริการ<input value={form.service_area} maxLength={120} placeholder="เชียงใหม่" onChange={(e) => setForm({ ...form, service_area: e.target.value })} /></label>
            <button type="submit" className="kk-button" disabled={saving || suspended}>{saving ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}</button>
          </form>
        </section>

        <div className="kk-stack">
          <VerificationPanel profile={profile} userId={userId} suspended={suspended} flash={flash} refreshProfile={refreshProfile} />

          <section className="kk-panel" aria-labelledby="notes-title">
            <div className="kk-panel__bar">
              <h2 id="notes-title">การแจ้งเตือน {unread ? <b className="kk-badge">{unread}</b> : null}</h2>
              {unread ? <button type="button" className="kk-link-button" onClick={readAll}>อ่านทั้งหมด</button> : null}
            </div>
            {notesError ? <StateMessage tone="error" title="โหลดการแจ้งเตือนไม่ได้">{notesError}</StateMessage>
              : !notes ? <StateMessage tone="loading" title="กำลังโหลด…" />
              : !notes.length ? <StateMessage tone="empty" title="ยังไม่มีการแจ้งเตือน">เมื่อมีการจองหรือผลพิจารณา จะแสดงที่นี่</StateMessage>
              : (
                <ul className="kk-list">
                  {notes.map((note) => (
                    <li key={note.id} className={note.read_at ? "" : "is-unread"}>
                      <strong>{note.title}</strong>
                      {note.body ? <p>{note.body}</p> : null}
                      <small className="kk-muted">{formatDateTime(note.created_at)}</small>
                      {note.link ? <button type="button" className="kk-link-button" onClick={() => navigate(note.link!)}>ดูรายละเอียด</button> : null}
                    </li>
                  ))}
                </ul>
              )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function AccountPage() {
  return (
    <div className="trip-product-page">
      <ProductHeader current="account" />
      <main className="kk-main">
        <RequireAuth><AccountContent /></RequireAuth>
      </main>
    </div>
  );
}
