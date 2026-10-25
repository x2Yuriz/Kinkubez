// Database security tests: runs every migration in PGlite (WASM Postgres)
// against stubbed Supabase schemas, then exercises RLS, grants and RPCs as
// anon, traveler, buddy, guide and admin.
//
//   npm i --no-save @electric-sql/pglite && npm run test:db
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let PGlite;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch {
  console.error("Missing test dependency. Run: npm i --no-save @electric-sql/pglite");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrations = readdirSync(join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => readFileSync(join(root, "migrations", f), "utf8"));
const db = new PGlite();

let passed = 0;
const failures = [];
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const as = async (uid) => {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(uid ? "set role authenticated" : "set role anon");
};
const asSuper = () => as(null).then(() => db.exec("reset role"));
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const denied = async (sql, params = [], pattern) => {
  try {
    await db.query(sql, params);
  } catch (error) {
    if (pattern && !pattern.test(error.message)) throw new Error(`wrong error: ${error.message}`);
    return;
  }
  throw new Error(`expected failure: ${sql}`);
};

const ids = {
  admin: "a0000000-0000-4000-a000-000000000001",
  traveler: "a0000000-0000-4000-a000-000000000002",
  traveler2: "a0000000-0000-4000-a000-000000000003",
  buddy: "a0000000-0000-4000-a000-000000000004",
  guide: "a0000000-0000-4000-a000-000000000005",
};

// --- setup -------------------------------------------------------------------
await db.exec(readFileSync(join(root, "tests", "stubs.sql"), "utf8"));
for (const sql of migrations) await db.exec(sql);

await test("migrations are safe to rerun", async () => {
  for (const sql of migrations) await db.exec(sql);
});

for (const [name, id] of Object.entries(ids)) {
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)",
    [id, `${name}@test.invalid`, JSON.stringify({ full_name: name, role: "admin" })],
  );
}
// The first admin is bootstrapped by the owner in SQL (see README).
await db.query("update public.profiles set role = 'admin' where id = $1", [ids.admin]);

await test("signup creates traveler profile and ignores role in metadata", async () => {
  const [p] = await q("select role, display_name from public.profiles where id = $1", [ids.traveler]);
  assert(p.role === "traveler" && p.display_name === "traveler", JSON.stringify(p));
});

await test("packages content is seeded", async () => {
  await as(null);
  const rows = await q("select id from public.packages order by sort_order");
  assert(rows.length === 3, `got ${rows.length}`);
});

// --- self-escalation ---------------------------------------------------------
await test("traveler cannot change own role", async () => {
  await as(ids.traveler);
  await denied("update public.profiles set role = 'admin' where id = $1", [ids.traveler], /permission denied/);
  await denied("update public.profiles set provider_status = 'approved' where id = $1", [ids.traveler], /permission denied/);
  await denied("update public.profiles set is_suspended = false where id = $1", [ids.traveler], /permission denied/);
});

await test("traveler cannot request admin role or use retired provider RPCs", async () => {
  await as(ids.traveler);
  await denied("select public.request_provider_role('buddy')", [], /permission denied/);
  await denied("select public.submit_verification('admin', 'ชื่อ จริง', 'national_id', $1)", [[`${ids.traveler}/a.jpg`]],
    /invalid input value/);
  await as(ids.admin);
  await denied("select public.admin_review_provider_request($1, true, 'ok')", [ids.traveler], /permission denied/);
});

await test("traveler cannot call admin RPCs", async () => {
  await as(ids.traveler);
  await denied("select * from public.admin_list_users()", [], /ผู้ดูแลระบบ/);
  await denied("select public.admin_set_role($1, 'admin')", [ids.traveler], /ผู้ดูแลระบบ/);
});

await test("internal helpers are not callable by clients", async () => {
  await as(ids.traveler);
  await denied("select public.notify($1, 'x', 'x', 'x', null)", [ids.traveler], /permission denied/);
  await denied("select public.log_admin_action('x', 'x', null, '{}')", [], /permission denied/);
});

await test("traveler edits own profile only", async () => {
  await as(ids.traveler);
  await q("update public.profiles set display_name = 'นักเดินทาง', interests = '{คาเฟ่}' where id = $1", [ids.traveler]);
  const changed = await q("update public.profiles set display_name = 'hack' where id = $1 returning id", [ids.buddy]);
  assert(changed.length === 0, "updated another profile");
});

await test("traveler profiles are private; providers are public", async () => {
  await as(ids.traveler2);
  const rows = await q("select id from public.profiles where id = $1", [ids.traveler]);
  assert(rows.length === 0, "saw a traveler profile");
  await denied("select is_suspended from public.profiles", [], /permission denied/);
});

// --- identity verification + provider onboarding ---------------------------------
const doc = (uid, file) => `${uid}/${file}`;
const upload = async (uid, file) => {
  await as(uid);
  await q("insert into storage.objects (bucket_id, name) values ('verification-docs', $1)", [doc(uid, file)]);
};
const submit = (kind, paths, type = "national_id") =>
  q("select * from public.submit_verification($1, 'ชื่อ นามสกุล', $2, $3, '')", [kind, type, paths]);

await test("verification: bucket is private, owner-folder uploads only", async () => {
  await upload(ids.buddy, "id-front.jpg");
  await as(ids.buddy);
  await denied("insert into storage.objects (bucket_id, name) values ('verification-docs', $1)", [doc(ids.traveler, "x.jpg")],
    /row-level security/);
  await denied("insert into storage.objects (bucket_id, name) values ('verification-docs', $1)", [doc(ids.buddy, "x.exe")],
    /row-level security/);
  await asSuper();
  const [bucket] = await q("select public from storage.buckets where id = 'verification-docs'");
  assert(bucket.public === false, "bucket is public");
});

await test("verification: submit rejects foreign, malformed or missing files", async () => {
  await as(ids.buddy);
  await denied("select public.submit_verification('buddy', 'ชื่อ นามสกุล', 'national_id', $1, '')",
    [[doc(ids.traveler, "a.jpg")]], /ไม่ถูกต้อง/);
  await denied("select public.submit_verification('buddy', 'ชื่อ นามสกุล', 'national_id', $1, '')",
    [[doc(ids.buddy, "../a.jpg")]], /ไม่ถูกต้อง/);
  await denied("select public.submit_verification('buddy', 'ชื่อ นามสกุล', 'national_id', $1, '')",
    [[doc(ids.buddy, "not-uploaded.jpg")]], /ไม่พบไฟล์/);
  await denied("select public.submit_verification('buddy', 'ชื่อ นามสกุล', 'national_id', $1, '')", [[]], /1–3/);
  await denied("select public.submit_verification('buddy', 'ชื่อ นามสกุล', 'tour_guide_license', $1, '')",
    [[doc(ids.buddy, "id-front.jpg")]], /มัคคุเทศก์/);
});

await test("verification: user cannot set identity status directly", async () => {
  await as(ids.traveler);
  await denied("update public.profiles set identity_status = 'approved' where id = $1", [ids.traveler], /permission denied/);
  await denied("insert into public.verification_requests (user_id, kind, legal_name, document_type) values ($1, 'identity', 'ชื่อ นามสกุล', 'passport')",
    [ids.traveler], /permission denied/);
});

let buddyRequest;
await test("verification: submit marks pending; requests and files stay private", async () => {
  await as(ids.buddy);
  [buddyRequest] = await submit("buddy", [doc(ids.buddy, "id-front.jpg")]);
  const [p] = await q("select identity_status, provider_status, requested_role, role from public.profiles where id = $1", [ids.buddy]);
  assert(p.identity_status === "pending" && p.provider_status === "pending" && p.requested_role === "buddy" && p.role === "traveler",
    JSON.stringify(p));
  await denied("select public.submit_verification('guide', 'ชื่อ นามสกุล', 'national_id', $1, '')",
    [[doc(ids.buddy, "id-front.jpg")]], /รอพิจารณา/);
  // Files under review cannot be removed or swapped by the owner.
  const removed = await q("delete from storage.objects where name = $1 returning id", [doc(ids.buddy, "id-front.jpg")]);
  assert(removed.length === 0, "owner deleted a pending document");
  await as(ids.traveler);
  assert((await q("select id from public.verification_requests")).length === 0, "saw others' requests");
  assert((await q("select id from storage.objects where bucket_id = 'verification-docs'")).length === 0, "saw others' documents");
  await denied("select public.admin_review_verification($1, true, '')", [buddyRequest.id], /ผู้ดูแลระบบ/);
  await denied("select * from public.admin_list_verifications()", [], /ผู้ดูแลระบบ/);
  await as(ids.buddy);
  await denied("select public.admin_review_verification($1, true, '')", [buddyRequest.id], /ผู้ดูแลระบบ/);
  // Audit stores the kind only, never the legal name or file paths.
  await asSuper();
  const [log] = await q("select details from public.audit_logs where action = 'submit_verification'");
  assert(JSON.stringify(log.details) === '{"kind": "buddy"}' || JSON.stringify(log.details) === '{"kind":"buddy"}', JSON.stringify(log.details));
});

await test("verification: admin sees pending documents; reject needs a reason", async () => {
  await as(ids.admin);
  const list = await q("select id, legal_name, document_paths, email from public.admin_list_verifications()");
  assert(list.length === 1 && list[0].document_paths.length === 1 && list[0].email === "buddy@test.invalid", JSON.stringify(list));
  assert((await q("select id from storage.objects where bucket_id = 'verification-docs'")).length === 1, "admin cannot read pending doc");
  await denied("select public.admin_review_verification($1, false, '')", [buddyRequest.id], /เหตุผล/);
  const removed = await q("delete from storage.objects where bucket_id = 'verification-docs' returning id");
  assert(removed.length === 0, "admin deleted a pending document");
});

await test("verification: admin approval grants buddy role and is audited; docs released", async () => {
  await as(ids.admin);
  const [{ admin_review_verification: paths }] = await q("select public.admin_review_verification($1, true, 'ok')", [buddyRequest.id]);
  assert(paths.length === 1, "paths not returned");
  const [p] = await q("select role, identity_status, identity_verified_at, provider_status from public.profiles where id = $1", [ids.buddy]);
  assert(p.role === "buddy" && p.identity_status === "approved" && p.identity_verified_at && p.provider_status === "approved", JSON.stringify(p));
  assert((await q("select id from storage.objects where bucket_id = 'verification-docs'")).length === 0, "admin still reads decided doc");
  await denied("select public.admin_review_verification($1, true, 'ok')", [buddyRequest.id], /รอพิจารณา/);
  await as(ids.buddy);
  const removed = await q("delete from storage.objects where name = $1 returning id", [doc(ids.buddy, "id-front.jpg")]);
  assert(removed.length === 1, "owner could not delete decided doc");
  const notes = await q("select kind from public.notifications where user_id = $1 and kind = 'verification_decision'", [ids.buddy]);
  assert(notes.length === 1, "not notified");
  await as(ids.admin);
  const logs = await q("select details from public.audit_logs where action = 'approve_verification'");
  assert(logs.length === 1 && logs[0].details.kind === "buddy", JSON.stringify(logs));
});

await test("verification: guide approved; rejection and withdrawal update status", async () => {
  await upload(ids.guide, "license.pdf");
  await as(ids.guide);
  const [g] = await submit("guide", [doc(ids.guide, "license.pdf")], "tour_guide_license");
  await upload(ids.traveler2, "passport.png");
  await as(ids.traveler2);
  const [t] = await submit("identity", [doc(ids.traveler2, "passport.png")], "passport");
  await upload(ids.traveler, "card.webp");
  await as(ids.traveler);
  const [w] = await submit("identity", [doc(ids.traveler, "card.webp")]);
  const [{ withdraw_verification: wp }] = await q("select public.withdraw_verification($1)", [w.id]);
  assert(wp.length === 1, "withdraw paths");
  const [tp] = await q("select identity_status from public.profiles where id = $1", [ids.traveler]);
  assert(tp.identity_status === "unverified", tp.identity_status);
  await as(ids.admin);
  await q("select public.admin_review_verification($1, true, 'ok')", [g.id]);
  await q("select public.admin_review_verification($1, false, 'ภาพไม่ชัด')", [t.id]);
  await as(ids.traveler2);
  const [t2] = await q("select identity_status, role from public.profiles where id = $1", [ids.traveler2]);
  assert(t2.identity_status === "rejected" && t2.role === "traveler", JSON.stringify(t2));
  const [mine] = await q("select status, reviewer_note, document_paths from public.verification_requests where id = $1", [t.id]);
  assert(mine.status === "rejected" && mine.reviewer_note === "ภาพไม่ชัด" && mine.document_paths.length === 0, JSON.stringify(mine));
  const roles = await q("select role from public.profiles where id in ($1, $2) order by role", [ids.buddy, ids.guide]);
  assert(roles.map((r) => r.role).join() === "buddy,guide", JSON.stringify(roles));
});

await test("verification: admin cannot review own request", async () => {
  await as(ids.admin);
  await denied("select public.submit_verification('identity', 'ชื่อ นามสกุล', 'national_id', $1, '')",
    [[doc(ids.admin, "a.jpg")]], /ผู้ดูแลระบบ/);
  await asSuper();
  const [r] = await q("insert into public.verification_requests (user_id, kind, legal_name, document_type) values ($1, 'identity', 'ชื่อ นามสกุล', 'passport') returning id",
    [ids.admin]);
  await as(ids.admin);
  await denied("select public.admin_review_verification($1, true, 'ok')", [r.id], /ของตัวเอง/);
  await asSuper();
  await q("delete from public.verification_requests where id = $1", [r.id]);
});

await test("admin cannot change own role", async () => {
  await as(ids.admin);
  await denied("select public.admin_set_role($1, 'traveler')", [ids.admin], /ตัวเอง/);
});

// --- trips ---------------------------------------------------------------------
const future = "now() + interval '7 days'";
let buddyTrip, guideTrip;

await test("traveler cannot create trips", async () => {
  await as(ids.traveler);
  await denied(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity)
    values ($1, 'buddy', 'ทริป', 'เชียงใหม่', ${future}, 500, 3)`, [ids.traveler], /row-level security/);
});

await test("buddy creates buddy trip, not guide trip, max 4 seats", async () => {
  await as(ids.buddy);
  [{ id: buddyTrip }] = await q(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity, status)
    values ($1, 'buddy', 'คาเฟ่เมืองเก่า', 'เชียงใหม่', ${future}, 500, 3, 'published') returning id`, [ids.buddy]);
  await denied(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity)
    values ($1, 'guide', 'ไกด์', 'เชียงใหม่', ${future}, 500, 3)`, [ids.buddy], /row-level security/);
  await denied(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity)
    values ($1, 'buddy', 'ใหญ่ไป', 'เชียงใหม่', ${future}, 500, 8)`, [ids.buddy], /buddy_group_small/);
});

await test("organizer cannot set seats or impersonate", async () => {
  await as(ids.buddy);
  await denied("update public.trips set seats_taken = 0 where id = $1", [buddyTrip], /permission denied/);
  await denied(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity)
    values ($1, 'buddy', 'ปลอม', 'เชียงใหม่', ${future}, 500, 3)`, [ids.guide], /row-level security/);
});

await test("guide creates draft; draft hidden from others", async () => {
  await as(ids.guide);
  [{ id: guideTrip }] = await q(`insert into public.trips (organizer_id, type, title, destination, starts_at, price_thb, capacity)
    values ($1, 'guide', 'ดอยสุเทพ', 'เชียงใหม่', ${future}, 1500, 8) returning id`, [ids.guide]);
  await q("select * from public.save_itinerary($1, $2)", [guideTrip, JSON.stringify([{ title: "นัดเจอ", time_label: "08:00" }])]);
  await as(null);
  assert((await q("select id from public.trips where id = $1", [guideTrip])).length === 0, "anon saw draft");
  await as(ids.buddy);
  await denied("select * from public.save_itinerary($1, '[]')", [guideTrip], /ไม่มีสิทธิ์/);
  await as(ids.guide);
  await q("update public.trips set status = 'published' where id = $1", [guideTrip]);
  await denied("update public.trips set status = 'completed' where id = $1", [guideTrip], /หลังจากทริปเริ่ม/);
});

await test("anon reads published trips but cannot book", async () => {
  await as(null);
  assert((await q("select id from public.trips where id = $1", [buddyTrip])).length === 1, "missing trip");
  await denied("select public.create_booking($1, 1)", [buddyTrip], /permission denied/);
  await denied("select * from public.bookings", [], /permission denied/);
});

// --- bookings ------------------------------------------------------------------
let booking1;
await test("booking takes server price and holds seats", async () => {
  await as(ids.traveler);
  [booking1] = await q("select * from public.create_booking($1, 2, 'สวัสดี')", [buddyTrip]);
  assert(booking1.unit_price_thb === 500 && booking1.total_price_thb === 1000, JSON.stringify(booking1));
  const [t] = await q("select seats_taken from public.trips where id = $1", [buddyTrip]);
  assert(t.seats_taken === 2, `seats ${t.seats_taken}`);
});

await test("duplicate, over-capacity, own-trip and direct inserts are rejected", async () => {
  await as(ids.traveler);
  await denied("select public.create_booking($1, 1)", [buddyTrip], /มีการจอง/);
  await denied("insert into public.bookings (trip_id, traveler_id, party_size, unit_price_thb) values ($1, $2, 1, 0)",
    [guideTrip, ids.traveler], /permission denied/);
  await as(ids.traveler2);
  await denied("select public.create_booking($1, 2)", [buddyTrip], /ที่นั่งไม่พอ/);
  await as(ids.buddy);
  await denied("select public.create_booking($1, 1)", [buddyTrip], /ตัวเอง/);
});

await test("traveler cannot confirm own booking; organizer can", async () => {
  await as(ids.traveler);
  await denied("select public.set_booking_status($1, 'confirmed')", [booking1.id], /ไม่มีสิทธิ์/);
  await as(ids.buddy);
  await q("select public.set_booking_status($1, 'confirmed')", [booking1.id]);
  await denied("select public.set_booking_status($1, 'pending')", [booking1.id], /เปลี่ยนสถานะ/);
});

await test("bookings visible only to parties and admin", async () => {
  await as(ids.traveler2);
  assert((await q("select id from public.bookings")).length === 0, "stranger saw booking");
  await as(ids.guide);
  assert((await q("select id from public.bookings where id = $1", [booking1.id])).length === 0, "other organizer saw booking");
  await as(ids.admin);
  assert((await q("select id from public.bookings where id = $1", [booking1.id])).length === 1, "admin blind");
});

await test("organizer sees traveler profile after booking; history + notifications written", async () => {
  await as(ids.buddy);
  assert((await q("select id from public.profiles where id = $1", [ids.traveler])).length === 1, "organizer blind");
  const history = await q("select to_status from public.booking_status_history where booking_id = $1 order by id", [booking1.id]);
  assert(history.map((h) => h.to_status).join() === "pending,confirmed", JSON.stringify(history));
  await as(ids.traveler);
  const notes = await q("select kind from public.notifications");
  assert(notes.some((n) => n.kind === "booking_updated"), "no notification");
  await denied("insert into public.notifications (user_id, kind, title) values ($1, 'x', 'x')", [ids.traveler], /permission denied/);
  await denied("update public.notifications set title = 'x'", [], /permission denied/);
  await q("select public.mark_notifications_read()");
});

await test("traveler cancel releases seats", async () => {
  await as(ids.traveler2);
  const [b] = await q("select * from public.create_booking($1, 1)", [buddyTrip]);
  await q("select public.set_booking_status($1, 'cancelled', 'เปลี่ยนแผน')", [b.id]);
  const [t] = await q("select seats_taken from public.trips where id = $1", [buddyTrip]);
  assert(t.seats_taken === 2, `seats ${t.seats_taken}`);
});

// --- reviews -------------------------------------------------------------------
await test("review requires a completed booking; one per trip", async () => {
  await as(ids.traveler);
  await denied("insert into public.reviews (trip_id, reviewer_id, rating) values ($1, $2, 5)", [buddyTrip, ids.traveler], /row-level security/);
  // Time travel: move the trip into the past, bypassing triggers as owner.
  await asSuper();
  await db.exec("set session_replication_role = replica");
  await db.query("update public.trips set starts_at = now() - interval '1 hour' where id = $1", [buddyTrip]);
  await db.exec("set session_replication_role = origin");
  await as(ids.buddy);
  await q("select public.set_booking_status($1, 'completed')", [booking1.id]);
  await as(ids.traveler);
  await q("insert into public.reviews (trip_id, reviewer_id, rating, body) values ($1, $2, 5, 'สนุกมาก')", [buddyTrip, ids.traveler]);
  await denied("insert into public.reviews (trip_id, reviewer_id, rating) values ($1, $2, 4)", [buddyTrip, ids.traveler], /duplicate key/);
  await denied("update public.reviews set is_hidden = false", [], /permission denied/);
  await as(ids.traveler2);
  await denied("insert into public.reviews (trip_id, reviewer_id, rating) values ($1, $2, 1)", [buddyTrip, ids.traveler2], /row-level security/);
  await denied("insert into public.reviews (trip_id, reviewer_id, rating) values ($1, $2, 1)", [buddyTrip, ids.traveler], /row-level security/);
});

await test("admin hides review; public no longer sees it; action audited", async () => {
  await as(ids.admin);
  const [r] = await q("select id from public.reviews where trip_id = $1", [buddyTrip]);
  await q("select public.admin_set_review_hidden($1, true, 'spam')", [r.id]);
  await as(null);
  assert((await q("select id from public.reviews where id = $1", [r.id])).length === 0, "hidden review visible");
  await as(ids.admin);
  const logs = await q("select action, details from public.audit_logs order by id");
  assert(logs.some((l) => l.action === "hide_review"), "not audited");
  assert(logs.some((l) => l.action === "approve_verification"), "approval not audited");
});

// --- favorites, reports, audit ----------------------------------------------------
await test("favorites are private", async () => {
  await as(ids.traveler);
  await q("insert into public.favorites (user_id, trip_id) values ($1, $2)", [ids.traveler, guideTrip]);
  await denied("insert into public.favorites (user_id, trip_id) values ($1, $2)", [ids.traveler2, guideTrip], /row-level security/);
  await as(ids.traveler2);
  assert((await q("select * from public.favorites")).length === 0, "saw others' favorites");
});

await test("reports: own insert, admin resolves", async () => {
  await as(ids.traveler2);
  const [rep] = await q("insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'trip', $2, 'ข้อมูลไม่ตรง') returning id",
    [ids.traveler2, guideTrip]);
  await as(ids.traveler);
  assert((await q("select id from public.reports")).length === 0, "saw others' report");
  await denied("select public.admin_resolve_report($1, 'resolved')", [rep.id], /ผู้ดูแลระบบ/);
  await as(ids.admin);
  await q("select public.admin_resolve_report($1, 'resolved', 'แก้แล้ว')", [rep.id]);
});

await test("audit logs: admin-only read, nobody writes", async () => {
  await as(ids.traveler);
  assert((await q("select id from public.audit_logs")).length === 0, "traveler read audit");
  await as(ids.admin);
  await denied("insert into public.audit_logs (action, target_table) values ('x', 'x')", [], /permission denied/);
  await denied("delete from public.audit_logs", [], /permission denied/);
});

await test("admin package edit is audited; non-admin cannot edit", async () => {
  await as(ids.traveler);
  const changed = await q("update public.packages set price_thb = 1 returning id");
  assert(changed.length === 0, "traveler edited package");
  await as(ids.admin);
  await q("update public.packages set price_thb = 6200 where id = 'chiang-mai-plan'");
  const logs = await q("select id from public.audit_logs where action = 'package_update'");
  assert(logs.length === 1, "package edit not audited");
});

await test("suspended user loses access", async () => {
  await as(ids.admin);
  await q("select public.admin_set_suspended($1, true, 'abuse')", [ids.traveler2]);
  await as(ids.traveler2);
  await denied("select public.create_booking($1, 1)", [guideTrip], /ระงับ/);
  const changed = await q("update public.profiles set bio = 'x' where id = $1 returning id", [ids.traveler2]);
  assert(changed.length === 0, "suspended user edited profile");
});

await test("admin cancels trip: open bookings settled, organizer notified", async () => {
  await as(ids.traveler);
  const [b] = await q("select * from public.create_booking($1, 1)", [guideTrip]);
  await as(ids.admin);
  await q("select public.admin_set_trip_status($1, 'cancelled', 'ผิดเงื่อนไข')", [guideTrip]);
  await as(ids.traveler);
  const [after] = await q("select status from public.bookings where id = $1", [b.id]);
  assert(after.status === "cancelled", after.status);
  await as(ids.guide);
  await denied("update public.trips set title = 'แก้' where id = $1", [guideTrip], /ปิดแล้ว/);
});

// --- storage -------------------------------------------------------------------
await test("storage: owner folder, image extensions, providers only for trip images", async () => {
  await as(ids.traveler);
  await q("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${ids.traveler}/me.webp`]);
  await denied("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${ids.buddy}/me.webp`], /row-level security/);
  await denied("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${ids.traveler}/x.svg`], /row-level security/);
  await denied("insert into storage.objects (bucket_id, name) values ('trip-images', $1)", [`${ids.traveler}/t.jpg`], /row-level security/);
  await as(ids.guide);
  await q("insert into storage.objects (bucket_id, name) values ('trip-images', $1)", [`${ids.guide}/t.jpg`]);
  await asSuper();
  const [bucket] = await q("select file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars'");
  assert(bucket.file_size_limit === 2097152n || Number(bucket.file_size_limit) === 2097152, "size limit");
});

await asSuper();
console.log(`${passed} passed, ${failures.length} failed`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
process.exit(failures.length ? 1 : 0);
